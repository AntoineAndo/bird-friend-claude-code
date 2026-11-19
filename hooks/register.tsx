import { atom, read, update } from 'claude-code'
import type { AgentStatus, CoreEngineInterface, ElementConstructor, Register, TextProps, Timer } from 'claude-code'

import type { BlueTitStyle, ChickLayer, Pose } from '../types'
import {
  AGENT_CHECK_MS,
  BLINK_MS,
  HATCH_MS,
  INTERRUPTED_MS,
  LISTENING_MS,
  SHAPES,
  STEPS,
  SLEEP_AFTER_MS,
  WAKE_MS,
  blinkGapMs,
  chickStepCount,
  frameGrid,
  stepCount,
  stepMs,
  toCells,
  toCss,
} from './art'
import type { Cell, ChickFrame } from './art'

const isShown = atom({ plugin: 'blue-tit', key: 'isShown' } as const, true, {
  shape: 'is-shown-4',
})
const style = atom({ plugin: 'blue-tit', key: 'style' } as const, 'small', {
  shape: 'style-3',
})
const isBlinking = atom({ plugin: 'blue-tit', key: 'isBlinking' } as const, false)
const isChickBlinking = atom({ plugin: 'blue-tit', key: 'isChickBlinking' } as const, false)
const shownPose = atom({ plugin: 'blue-tit', key: 'pose' } as const, 'idle')
const step = atom({ plugin: 'blue-tit', key: 'step' } as const, 0)
const shownChick = atom({ plugin: 'blue-tit', key: 'chick' } as const, 'none')
const chickStep = atom({ plugin: 'blue-tit', key: 'chickStep' } as const, 0)

type Run = { text: string; color?: string; backgroundColor?: string }
type TextElement = ElementConstructor<TextProps>

const GLYPHS: Record<BlueTitStyle, (bits: number) => string> = {
  classic: bits => [' ', '▀', '▄', '█'][bits] ?? ' ',
  small: bits => {
    if (bits === 0) return ' '
    if (bits === 63) return '█'
    if (bits === 21) return '▌'
    if (bits === 42) return '▐'

    return String.fromCodePoint(0x1fb00 + bits - 1 - (bits > 21 ? 1 : 0) - (bits > 42 ? 1 : 0))
  },
}

const toRun = (cell: Cell, birdStyle: BlueTitStyle): Run =>
  cell.front === undefined
    ? { text: ' ' }
    : { text: GLYPHS[birdStyle](cell.bits), color: toCss(cell.front), backgroundColor: toCss(cell.back) }

const toRows = (birdStyle: BlueTitStyle, pose: Pose, isEyeClosed: boolean, poseStep: number, chick?: ChickFrame) =>
  toCells(frameGrid(birdStyle, pose, isEyeClosed, poseStep, chick), SHAPES[birdStyle]).map(cells =>
    cells
      .map(cell => toRun(cell, birdStyle))
      .reduce<Run[]>((runs, run) => {
        const last = runs.at(-1)

        if (last && last.color === run.color && last.backgroundColor === run.backgroundColor) {
          last.text += run.text
          return runs
        }

        return [...runs, run]
      }, []),
  )

const DRAWINGS = new Map<string, Run[][]>()

const drawingOf = (birdStyle: BlueTitStyle, storedPose: Pose, isEyeClosed: boolean, poseStep: number, chick?: ChickFrame) => {
  const pose = storedPose in STEPS ? storedPose : 'idle'
  const shownStep = poseStep % stepCount(birdStyle, pose)
  const shownChickFrame = chick && { ...chick, step: chick.step % chickStepCount(birdStyle, chick.layer) }
  const key = [birdStyle, pose, isEyeClosed, shownStep, shownChickFrame?.layer, shownChickFrame?.step, shownChickFrame?.isEyeClosed].join('/')
  const cached = DRAWINGS.get(key)

  if (cached) return cached

  const rows = toRows(birdStyle, pose, isEyeClosed, shownStep, shownChickFrame)
  DRAWINGS.set(key, rows)

  return rows
}

const toLines = (Text: TextElement, rows: Run[][]) =>
  rows.map(runs => (
    <Text>
      {runs.map(run => (
        <Text color={run.color} backgroundColor={run.backgroundColor}>
          {run.text}
        </Text>
      ))}
    </Text>
  ))

const isStyle = (value: string): value is BlueTitStyle => value === 'small' || value === 'classic'

let stopListening: Timer | undefined
let stopStartle: Timer | undefined
let stopHatching: Timer | undefined
let fallAsleep: Timer | undefined
let nextStep: Timer | undefined
let nextChickStep: Timer | undefined
let nextAgentCheck: Timer | undefined
let isListeningNow = false
let isThinkingNow = false
let isWritingNow = false
let isStartledNow = false
let isSleepingNow = false
let isHatchingNow = false
let runningCommands = 0
let openQuestions = 0
const workingAgents = new Set<string>()
const hatchedAgents = new Set<string>()
const listedAgents = new Set<string>()
let poseNow: Pose = 'idle'
let stepNow = 0
let chickNow: ChickLayer | 'none' = 'none'
let chickStepNow = 0

type StateDollar = Pick<CoreEngineInterface, 'state'>
type TimerDollar = Pick<CoreEngineInterface, 'state' | 'clock'>
type AgentDollar = Pick<CoreEngineInterface, 'state' | 'clock' | 'agent'>

const ENDED_AGENT: readonly AgentStatus[] = ['idle', 'completed', 'failed', 'killed']

const currentPose = (): Pose => {
  if (isStartledNow) return 'interrupted'
  if (openQuestions > 0) return 'asking'
  if (isWritingNow) return 'writing'
  if (runningCommands > 0) return 'running'
  if (isThinkingNow) return 'thinking'
  if (isListeningNow) return 'listening'

  return isSleepingNow ? 'sleeping' : 'idle'
}

const currentChick = (): ChickLayer | 'none' => {
  if (isHatchingNow) return 'hatching'

  return workingAgents.size > 0 ? 'standing' : 'none'
}

function scheduleStep($: TimerDollar, pose: Pose) {
  nextStep = $.clock.after(stepMs(pose), () => {
    stepNow += 1
    void update($, step, () => stepNow)
    scheduleStep($, pose)
  })
}

function showPose($: TimerDollar, pose: Pose) {
  poseNow = pose
  nextStep?.cancel()
  stepNow = 0
  void update($, step, () => 0)
  if (pose !== 'idle') scheduleStep($, pose)
  void update($, shownPose, () => pose)
}

function scheduleChickStep($: TimerDollar, chick: ChickLayer) {
  if (chickStepNow + 1 >= chickStepCount('small', chick)) return

  nextChickStep = $.clock.after(HATCH_MS, () => {
    chickStepNow += 1
    void update($, chickStep, () => chickStepNow)
    scheduleChickStep($, chick)
  })
}

function showChick($: TimerDollar, chick: ChickLayer | 'none') {
  chickNow = chick
  nextChickStep?.cancel()
  chickStepNow = 0
  void update($, chickStep, () => 0)
  if (chick !== 'none') scheduleChickStep($, chick)
  void update($, shownChick, () => chick)
}

function refresh($: TimerDollar) {
  const pose = currentPose()
  const chick = currentChick()

  if (pose !== poseNow) showPose($, pose)
  if (chick !== chickNow) showChick($, chick)
}

function startle($: TimerDollar, ms: number) {
  stopStartle?.cancel()
  isStartledNow = true
  refresh($)
  stopStartle = $.clock.after(ms, () => {
    isStartledNow = false
    refresh($)
  })
}

function hatch($: TimerDollar) {
  stopHatching?.cancel()
  isHatchingNow = true
  showChick($, 'hatching')
  stopHatching = $.clock.after(chickStepCount('small', 'hatching') * HATCH_MS, () => {
    isHatchingNow = false
    refresh($)
  })
}

async function checkAgents($: AgentDollar) {
  const agents = await $.agent.list().catch(() => undefined)

  if (agents) {
    for (const id of workingAgents) {
      const agent = agents.find(listed => listed.id === id)

      if (agent) listedAgents.add(id)
      if (agent ? ENDED_AGENT.includes(agent.status) : listedAgents.has(id)) workingAgents.delete(id)
    }
  }
  refresh($)
  scheduleSleep($)
  scheduleAgentCheck($)
}

function scheduleAgentCheck($: AgentDollar) {
  if (nextAgentCheck !== undefined || workingAgents.size === 0) return

  nextAgentCheck = $.clock.after(AGENT_CHECK_MS, () => {
    nextAgentCheck = undefined
    void checkAgents($)
  })
}

function scheduleSleep($: TimerDollar) {
  fallAsleep?.cancel()
  if (isThinkingNow || workingAgents.size > 0) return

  fallAsleep = $.clock.after(SLEEP_AFTER_MS, () => {
    isSleepingNow = true
    refresh($)
  })
}

function noteActivity($: TimerDollar) {
  if (isSleepingNow) {
    isSleepingNow = false
    startle($, WAKE_MS)
  }
  scheduleSleep($)
}

function setListening($: TimerDollar, value: boolean) {
  isListeningNow = value
  refresh($)
}

const readChick = async ($: StateDollar): Promise<ChickFrame | undefined> => {
  const chick = await read($, shownChick)

  return chick === 'none'
    ? undefined
    : { layer: chick, step: await read($, chickStep), isEyeClosed: await read($, isChickBlinking) }
}

export const register: Register = on => {
  on('prompt.edit', ($, e, next) => {
    noteActivity($)
    stopListening?.cancel()
    setListening($, true)
    stopListening = $.clock.after(LISTENING_MS, () => setListening($, false))

    return next(e)
  })

  on('prompt.submit', ($, e, next) => {
    noteActivity($)
    stopListening?.cancel()
    setListening($, false)

    return next(e)
  })

  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined) {
      isThinkingNow = true
      noteActivity($)
      refresh($)
    } else {
      workingAgents.add(e.agentId)
      if (!hatchedAgents.has(e.agentId)) {
        hatchedAgents.add(e.agentId)
        hatch($)
      }
      refresh($)
      scheduleSleep($)
      scheduleAgentCheck($)
    }

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)

    try {
      for await (const chunk of next(e)) {
        if (chunk.kind === 'text') isWritingNow = true
        else if (chunk.kind === 'thinking' || chunk.kind === 'tool' || chunk.kind === 'stop') isWritingNow = false
        refresh($)
        yield chunk
      }
    } finally {
      isWritingNow = false
      refresh($)
    }
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)

    runningCommands += 1
    refresh($)
    try {
      return await next(e)
    } finally {
      runningCommands -= 1
      refresh($)
    }
  })

  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    openQuestions += 1
    refresh($)
    try {
      return await next(e)
    } finally {
      openQuestions -= 1
      refresh($)
    }
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      isWritingNow = false
      isThinkingNow = false
      if (e.reason === 'aborted') startle($, INTERRUPTED_MS)
      refresh($)
      scheduleSleep($)
    } else {
      workingAgents.delete(e.agentId)
      refresh($)
      scheduleSleep($)
    }

    return next(e)
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'blue-tit',
      description: 'Show or hide the blue tit above the prompt, or pick its style',
      argumentHint: '[small|classic]',
    })

    const scheduleBlink = (setClosed: (isClosed: boolean) => void): void => {
      setClosed(false)
      $.clock.after(blinkGapMs(), () => {
        setClosed(true)
        $.clock.after(BLINK_MS, () => scheduleBlink(setClosed))
      })
    }
    scheduleBlink(isClosed => void update($, isBlinking, () => isClosed))
    scheduleBlink(isClosed => void update($, isChickBlinking, () => isClosed))
    showPose($, currentPose())
    showChick($, currentChick())
    scheduleSleep($)

    return next(e)
  })

  on('command.run', { command: 'blue-tit' }, async ($, e) => {
    const choice = e.args.trim()

    if (isStyle(choice)) {
      await update($, style, () => choice)
      await update($, isShown, () => true)

      return { text: `The blue tit is drawn in ${choice} style.` }
    }

    if (choice !== '') {
      return { text: 'Use /blue-tit to show or hide the bird, or /blue-tit small|classic to pick its style.' }
    }

    const wasShown = await read($, isShown)
    await update($, isShown, () => !wasShown)

    return { text: wasShown ? 'The blue tit flew away.' : 'The blue tit is back.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isShown))) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const rows = drawingOf(
      await read($, style),
      await read($, shownPose),
      await read($, isBlinking),
      await read($, step),
      await readChick($),
    )

    return <Box flexDirection="column">{toLines(Text, rows)}</Box>
  })

  on('ui.render', { component: 'AskUserQuestion' }, async ($, e, next) => {
    const dialog = await next(e)

    if (!(await read($, isShown))) return dialog

    const { Box, Text } = $.ui.resolve(e)
    const rows = drawingOf(
      await read($, style),
      'asking',
      await read($, isBlinking),
      await read($, step),
      await readChick($),
    )

    return (
      <Box flexDirection="column">
        {toLines(Text, rows)}
        {dialog}
      </Box>
    )
  })
}
