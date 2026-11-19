import type { AgentInfo, PromptEditInput, PromptEditResult } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const BAND = {
  plugin: 'blue-tit',
  component: 'AbovePrompt',
  surface: 'terminal',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 19 },
    view: {},
  },
} as const

const runBlueTit = (args: string) =>
  ({
    command: 'blue-tit',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  }) as const

const SEXTANT = /[\u{1FB00}-\u{1FB3B}]/u

test('the small blue tit sits above the prompt and stays after prompts', async ($, on) => {
  on('prompt.submit', (_, e) => ({ text: e.text }))

  await $.prompt.submit({ text: 'hello', wait: false, origin: { kind: 'composer' } })

  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: SEXTANT })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Tsee-tsee|\/blue-tit/ })).toBeUndefined()
  await ui.unmount()
})

test('/blue-tit classic switches to half blocks', async $ => {
  expect((await $.command.run(runBlueTit('classic'))).text).toBe('The blue tit is drawn in classic style.')

  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: SEXTANT })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /▀/ })).toBeDefined()
  await ui.unmount()
})

test('/blue-tit hides the bird and brings it back', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  expect((await $.command.run(runBlueTit(''))).text).toBe('The blue tit flew away.')
  const hidden = await $.ui.mount(BAND)
  expect(await hidden.find({ type: 'Text', text: SEXTANT })).toBeUndefined()
  expect((await hidden.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await hidden.unmount()

  expect((await $.command.run(runBlueTit(''))).text).toBe('The blue tit is back.')
  const shown = await $.ui.mount(BAND)
  expect(await shown.find({ type: 'Text', text: SEXTANT })).toBeDefined()
  await shown.unmount()
})

test('the bird yields to a survey', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true } })
  expect(await ui.find({ type: 'Text', text: SEXTANT })).toBeUndefined()
  await ui.unmount()
})

test('the idle bird blinks every few seconds, then opens its eyes again', async ($, on) => {
  const clock = mock.clock(on)
  on('command.register', () => ({ value: { command: 'blue-tit' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount(BAND)
  const eyeRow = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const open = await eyeRow()
  let blinks = 0

  for (let elapsed = 0; elapsed < 6100; elapsed += 50) {
    await clock.advance(50)

    if ((await eyeRow()) !== open) {
      blinks += 1
      await clock.advance(150)
      expect(await eyeRow()).toBe(open)
    }
  }

  expect(blinks).toBeGreaterThan(0)
  await ui.unmount()
})

test('the bird blinks while Claude works too', async ($, on) => {
  const clock = mock.clock(on)
  on('command.register', () => ({ value: { command: 'blue-tit' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true } })
  const eyeRow = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const open = await eyeRow()
  let blinks = 0

  for (let elapsed = 0; elapsed < 6100; elapsed += 50) {
    await clock.advance(50)

    if ((await eyeRow()) !== open) {
      blinks += 1
    }
  }

  expect(blinks).toBeGreaterThan(0)
  await ui.unmount()
})

type PromptWithEdit = Engine['prompt'] & { edit: (e: PromptEditInput) => Promise<PromptEditResult> }

const typeKey = ($: Engine, text: string) =>
  ($.prompt as PromptWithEdit).edit({
    origin: { kind: 'composer' },
    text,
    cursor: text.length,
    start: text.length,
    end: text.length,
    inputText: 'a',
  })

test('the bird steps from foot to foot while you type, then stands still again', async ($, on) => {
  const clock = mock.clock(on)
  on('prompt.edit', (_, e) => ({ text: e.text + e.inputText, cursor: e.cursor + 1 }))

  const ui = await $.ui.mount(BAND)
  const bird = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const idle = await bird()

  await typeKey($, '')
  await clock.settle()
  const firstStep = await bird()
  expect(firstStep).not.toBe(idle)

  await clock.advance(300)
  const secondStep = await bird()
  expect(secondStep).not.toBe(firstStep)
  expect(secondStep).not.toBe(idle)

  await clock.advance(300)
  expect(await bird()).toBe(firstStep)

  await clock.advance(400)
  await typeKey($, 'a')
  await clock.advance(1000)
  expect(await bird()).not.toBe(idle)

  await clock.advance(600)
  expect(await bird()).toBe(idle)
  await ui.unmount()
})

test('sending the prompt ends the listening pose at once', async ($, on) => {
  mock.clock(on)
  on('prompt.edit', (_, e) => ({ text: e.text + e.inputText, cursor: e.cursor + 1 }))
  on('prompt.submit', (_, e) => ({ text: e.text }))

  const ui = await $.ui.mount(BAND)
  const bird = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const idle = await bird()

  await typeKey($, '')
  await $.prompt.submit({ text: 'a', wait: false, origin: { kind: 'composer' } })
  expect(await bird()).toBe(idle)
  await ui.unmount()
})

const completeTurn = (turnId: string, agentId?: string) =>
  ({ answer: '', durationMs: 1, isAborted: false, reason: 'answer', turnId, agentId }) as const

test('the bird flies while Claude works on a turn, flapping its wing, then perches again', async ($, on) => {
  const clock = mock.clock(on)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  const ui = await $.ui.mount(BAND)
  const bird = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const idle = await bird()

  await $.turn.start({ text: 'hello', turnId: 'turn-1' })
  await clock.settle()
  const wingUp = await bird()
  expect(wingUp).not.toBe(idle)

  await clock.advance(200)
  const wingLevel = await bird()
  expect(wingLevel).not.toBe(wingUp)

  await clock.advance(200)
  const wingDown = await bird()
  expect(wingDown).not.toBe(wingLevel)
  expect(wingDown).not.toBe(wingUp)

  await clock.advance(200)
  expect(await bird()).toBe(wingLevel)

  await clock.advance(200)
  expect(await bird()).toBe(wingUp)

  await $.turn.complete(completeTurn('turn-1'))
  expect(await bird()).toBe(idle)
  await ui.unmount()
})

test('a chick hatches when a subagent starts, then stands by the bird until the last one ends', async ($, on) => {
  const clock = mock.clock(on)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  const ui = await $.ui.mount(BAND)
  const bird = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const idle = await bird()

  await $.turn.start({ text: 'look around', turnId: 'turn-2', agentId: 'agent-1' })
  await clock.settle()
  const hatching = new Set<string>()
  for (let elapsed = 0; elapsed < 2800; elapsed += 200) {
    hatching.add(await bird())
    await clock.advance(200)
  }
  expect(hatching.has(idle)).toBe(false)
  expect(hatching.size).toBeGreaterThan(5)

  await clock.advance(200)
  const chick = await bird()
  expect(chick).not.toBe(idle)
  expect(hatching.has(chick)).toBe(false)
  await clock.advance(1000)
  expect(await bird()).toBe(chick)

  await $.turn.start({ text: 'look further', turnId: 'turn-5', agentId: 'agent-2' })
  await clock.settle()
  expect(hatching.has(await bird())).toBe(true)
  await clock.advance(3000)
  expect(await bird()).toBe(chick)

  await $.turn.complete(completeTurn('turn-2', 'agent-1'))
  expect(await bird()).toBe(chick)
  await $.turn.complete(completeTurn('turn-5', 'agent-2'))
  expect(await bird()).toBe(idle)

  await $.turn.start({ text: 'one more thing', turnId: 'turn-6', agentId: 'agent-1' })
  await clock.settle()
  expect(await bird()).toBe(chick)
  await $.turn.complete(completeTurn('turn-6', 'agent-1'))
  expect(await bird()).toBe(idle)
  await ui.unmount()
})

test('the chick hatches beside the bird while it hops for a command', async ($, on) => {
  const clock = mock.clock(on)
  let bird = async () => ''
  const hopping = new Set<string>()
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', async () => {
    await $.turn.start({ text: 'look around', turnId: 'turn-8', agentId: 'agent-5' })
    for (let elapsed = 0; elapsed < 4000; elapsed += 50) {
      hopping.add(await bird())
      await clock.advance(50)
    }

    return { deny: 'not run in tests' }
  })

  const ui = await $.ui.mount(BAND)
  bird = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const idle = await bird()

  await $.tool.call({ tool: 'Bash', command: 'sleep 4' })
  const chick = await bird()

  expect(hopping.size).toBeGreaterThan(10)
  expect(hopping.has(chick)).toBe(true)
  expect(chick).not.toBe(idle)
  await ui.unmount()
})

test('the bird keeps flying with a chick standing beside it while a subagent works', async ($, on) => {
  const clock = mock.clock(on)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))

  const ui = await $.ui.mount(BAND)
  const bird = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const wingBeats = async () => {
    const frames = new Set<string>()
    for (let elapsed = 0; elapsed < 800; elapsed += 200) {
      frames.add(await bird())
      await clock.advance(200)
    }

    return frames
  }

  await $.turn.start({ text: 'hello', turnId: 'turn-11' })
  await clock.settle()
  const flying = await wingBeats()

  await $.turn.start({ text: 'look around', turnId: 'turn-12', agentId: 'agent-8' })
  await clock.advance(3000)
  const flyingWithChick = await wingBeats()

  expect(flying.size).toBe(3)
  expect(flyingWithChick.size).toBe(3)
  expect([...flyingWithChick].some(frame => flying.has(frame))).toBe(false)
  await ui.unmount()
})

test('the chick stands above the question dialog too while a subagent works', async ($, on) => {
  const clock = mock.clock(on)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('ui.render', { component: 'AskUserQuestion' }, () => ({ type: 'engine', ref: 0 }) as const)

  const birdAbove = async () => {
    const dialog = await $.ui.mount(QUESTION)
    const text = (await dialog.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
    await dialog.unmount()

    return text
  }
  const alone = await birdAbove()

  await $.turn.start({ text: 'look around', turnId: 'turn-13', agentId: 'agent-9' })
  await clock.advance(3000)

  expect(await birdAbove()).not.toBe(alone)
})

test('the chick leaves once the agent list shows its subagent ended, even without a turn end', async ($, on) => {
  const clock = mock.clock(on)
  const running = (id: string): AgentInfo => ({ id, description: 'look around', type: 'Explore', status: 'running' })
  let agents: AgentInfo[] = [running('agent-6'), running('agent-7')]
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('agent.list', () => ({ value: agents }))

  const ui = await $.ui.mount(BAND)
  const bird = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const idle = await bird()

  await $.turn.start({ text: 'look around', turnId: 'turn-9', agentId: 'agent-6' })
  await $.turn.start({ text: 'look further', turnId: 'turn-10', agentId: 'agent-7' })
  await clock.advance(3000)
  const chick = await bird()
  expect(chick).not.toBe(idle)

  await clock.advance(30000)
  expect(await bird()).toBe(chick)

  agents = [{ ...running('agent-6'), status: 'completed' }]
  await clock.advance(30000)
  expect(await bird()).toBe(idle)
  await ui.unmount()
})

test('the chick blinks on its own, not with its parent', async ($, on) => {
  const clock = mock.clock(on)
  on('command.register', () => ({ value: { command: 'blue-tit' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'look around', turnId: 'turn-7', agentId: 'agent-3' })
  await clock.advance(3000)

  const ui = await $.ui.mount(BAND)
  const frames = new Set<string>()
  for (let elapsed = 0; elapsed < 30000; elapsed += 50) {
    frames.add((await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|'))
    await clock.advance(50)
  }

  expect(frames.size).toBeGreaterThanOrEqual(3)
  await ui.unmount()
})

test('the bird perches and talks while the answer streams in, then flies on', async ($, on) => {
  const clock = mock.clock(on)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('turn.step', async function* (_, e) {
    yield { kind: 'text', index: 0, text: 'Hello' } as const
    yield { kind: 'stop', stopReason: 'end_turn', usage: null } as const

    return { turnId: e.turnId, index: e.index, answer: 'Hello', toolUses: [], stopReason: 'end_turn', usage: null } as const
  })

  const ui = await $.ui.mount(BAND)
  const bird = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const idle = await bird()

  await $.turn.start({ text: 'hello', turnId: 'turn-3' })
  await clock.settle()
  const flying = await bird()

  const stream = $.turn.step({ turnId: 'turn-3', index: 0, model: 'test', messageCount: 1 })
  expect((await stream.next()).value).toEqual({ kind: 'text', index: 0, text: 'Hello' })
  const talking = new Set<string>()
  for (let elapsed = 0; elapsed < 900; elapsed += 50) {
    talking.add(await bird())
    await clock.advance(50)
  }
  expect(talking.has(flying)).toBe(false)
  expect(talking.has(idle)).toBe(true)
  expect(talking.size).toBe(2)

  await stream.next()
  expect(await bird()).toBe(flying)
  expect((await stream.next()).done).toBe(true)

  await $.turn.complete(completeTurn('turn-3'))
  expect(await bird()).toBe(idle)
  await ui.unmount()
})

test('interrupting a turn startles the bird for a moment', async ($, on) => {
  const clock = mock.clock(on)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  const ui = await $.ui.mount(BAND)
  const bird = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const idle = await bird()

  await $.turn.start({ text: 'hello', turnId: 'turn-4' })
  await $.turn.complete({ ...completeTurn('turn-4'), reason: 'aborted', isAborted: true })
  expect(await bird()).not.toBe(idle)

  await clock.advance(2600)
  expect(await bird()).toBe(idle)
  await ui.unmount()
})

test('the bird hops while a command runs', async ($, on) => {
  const clock = mock.clock(on)
  const hopping = new Set<string>()
  let bird = async () => ''

  on('tool.call', async () => {
    for (let elapsed = 0; elapsed < 900; elapsed += 50) {
      hopping.add(await bird())
      await clock.advance(50)
    }

    return { deny: 'not run in tests' }
  })

  const ui = await $.ui.mount(BAND)
  bird = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const idle = await bird()

  await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(hopping.has(idle)).toBe(true)
  expect(hopping.size).toBe(2)
  expect(await bird()).toBe(idle)
  await ui.unmount()
})

const QUESTION = {
  plugin: 'blue-tit',
  component: 'AskUserQuestion',
  surface: 'terminal',
  props: { tool: 'AskUserQuestion', questions: [] as unknown[] },
} as const

test('the bird flaps its wing under a ? above a question that waits for you', async ($, on) => {
  const clock = mock.clock(on)
  const asking = new Set<string>()
  let hasDialog = false
  let idle = ''

  on('ui.render', { component: 'AskUserQuestion' }, () => ({ type: 'engine', ref: 0 }) as const)
  on('tool.call', async () => {
    const dialog = await $.ui.mount(QUESTION)
    hasDialog = (await dialog.find({ type: 'engine' })) !== undefined

    for (let elapsed = 0; elapsed < 1200; elapsed += 40) {
      asking.add((await dialog.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|'))
      await clock.advance(40)
    }
    await dialog.unmount()

    return { deny: 'not run in tests' }
  })

  const band = await $.ui.mount(BAND)
  idle = (await band.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  await band.unmount()

  await $.tool.call({ tool: 'AskUserQuestion', questions: [] })
  expect(hasDialog).toBe(true)
  expect(asking.has(idle)).toBe(false)
  expect(asking.has('')).toBe(false)
  expect(asking.size).toBe(2)
})

test('a hidden bird leaves the question dialog alone', async ($, on) => {
  on('ui.render', { component: 'AskUserQuestion' }, () => ({ type: 'engine', ref: 0 }) as const)

  await $.command.run(runBlueTit(''))
  const dialog = await $.ui.mount(QUESTION)
  expect(await dialog.find({ type: 'Text', text: SEXTANT })).toBeUndefined()
  expect(await dialog.find({ type: 'engine' })).toBeDefined()
  await dialog.unmount()
})

test('the bird falls asleep after five quiet minutes and wakes with a start', async ($, on) => {
  const clock = mock.clock(on)
  on('command.register', () => ({ value: { command: 'blue-tit' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.edit', (_, e) => ({ text: e.text + e.inputText, cursor: e.cursor + 1 }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount(BAND)
  const bird = async () => (await ui.findAll({ type: 'Text', text: SEXTANT })).map(found => found.text).join('|')
  const awake = await bird()

  await clock.advance(4 * 60 * 1000)
  const afterFourMinutes = await bird()

  await clock.advance(60 * 1000 + 100)
  const asleep = new Set<string>()
  for (let elapsed = 0; elapsed < 2800; elapsed += 700) {
    asleep.add(await bird())
    await clock.advance(700)
  }
  expect(asleep.has(awake)).toBe(false)
  expect(asleep.has(afterFourMinutes)).toBe(false)
  expect(asleep.size).toBe(4)

  await typeKey($, '')
  await clock.settle()
  expect(asleep.has(await bird())).toBe(false)
  await ui.unmount()
})
