import type { BlueTitStyle, ChickLayer, Pose } from '../types'

export type Pixel = readonly [x: number, y: number, key: string]
export type CellShape = { columns: number; rows: number }
export type Cell = { front?: string; back?: string; bits: number; isConflict: boolean }

export const PALETTE: Record<string, readonly [number, number, number]> = {
  c: [88, 135, 195],
  D: [35, 62, 105],
  N: [25, 35, 80],
  W: [250, 250, 250],
  E: [0, 0, 0],
  e: [0, 0, 0],
  g: [100, 110, 40],
  y: [247, 208, 30],
  K: [115, 110, 105],
  R: [255, 40, 40],
  S: [165, 85, 50],
}

export const toCss = (key: string | undefined) => {
  const rgb = key === undefined ? undefined : PALETTE[key]

  return rgb && `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
}

export const SHAPES: Record<BlueTitStyle, CellShape> = {
  small: { columns: 2, rows: 3 },
  classic: { columns: 1, rows: 2 },
}

export const BIRDS: Record<BlueTitStyle, readonly string[]> = {
  small: [
    '.................................',
    '.................................',
    '.................................',
    '.................................',
    '.................................',
    '.................................',
    '....................cccccc.......',
    '..................ccccccccW......',
    '..................ccWWWWWWWW.....',
    '................NNNNNNEENWNNKK...',
    '..............ggNNWWWWEEWWNNK....',
    '............gggggNWWWWWWWWWN.....',
    '..........ggggggggNNNNNNNNNyy....',
    '..........ggggggggggyyyyyyyyy....',
    '.........cWWggggggggyyyyyyyyy....',
    '........ccccWcggccccyyyyyyyyy....',
    '........cccccWccccyyyyyyyyyy.....',
    '........DDccccccyyyyyyyyyyy......',
    '......DDDD...yyyyyyyyyyyyy.......',
    '.....DDDD.......yyyyyyyyy........',
    '...DDDDD..........KK..KK.........',
    '...DDD............KKK.KKK........',
    '.................................',
    '.................................',
  ],
  classic: [
    '............cccc....',
    '...........cccccc...',
    '..........WWWWWWWW..',
    '.........NNNNNWENNKK',
    '........gNWWWWEEWNK.',
    '.......gggNWWWWWWWN.',
    '......ggggNNNNNNNNy.',
    '.....gggggggyyyyyyy.',
    '....cWgggggggyyyyyy.',
    '....ccWggggcyyyyyyy.',
    '...ccccWcccyyyyyyy..',
    '...DDccccyyyyyyyyy..',
    '..DDD..yyyyyyyyyy...',
    '.DDD.....yyyyyyy....',
    'DDD........K..K.....',
    'DD.........KK.KK....',
  ],
}

const overlay = (rows: readonly string[]): Pixel[] =>
  rows.flatMap((row, y) => [...row].flatMap((key, x): Pixel[] => (key === ' ' ? [] : [[x, y, key]])))

export const POSES: Record<Pose, Record<BlueTitStyle, readonly Pixel[]>> = {
  idle: { small: [], classic: [] },
  listening: {
    small: [],
    classic: [
      [14, 3, 'E'],
      [15, 4, 'W'],
    ],
  },
  thinking: {
    small: overlay([
      '.................................',
      '.................................',
      '.................................',
      '.................................',
      '.................................',
      '.................................',
      '....................cccccc.......',
      '..................cccccccc.......',
      '...........ggggg..ccWWWWWWWW.....',
      '........ggggggggNNNNNNEENWNNKK...',
      '....DDDDDgggggggNNWWWWEEWWNNK....',
      'DDDDDDDDggggyyyyyNWWWWWWWWN......',
      'DDDDDDDDyyyyyyyyyyNNWWWWNN.......',
      '..DDDDD.yyyyyyyyyyyyNWWNN........',
      '.........yyyyyyyyyyyNNNN.........',
      '...........yWWWWWWyy.............',
      '.................................',
      '.................................',
      '.................................',
      '.................................',
      '.................................',
      '.................................',
      '.................................',
      '.................................',
    ]),
    classic: [],
  },
  writing: { small: [], classic: [] },
  interrupted: { small: [], classic: [] },
  sleeping: {
    small: [
      [22, 9, 'N'],
      [23, 9, 'N'],
      [22, 10, 'W'],
      [23, 10, 'W'],
      ...overlay([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '    DDDD',
        ' DDDDD',
        'DDDDD  ..',
        '   .....          ..  ..',
        '   ...            ... ...',
      ]),
    ],
    classic: [],
  },
  running: { small: [], classic: [] },
  asking: {
    small: overlay([
      '                           yyyy',
      '                          yy  yy',
      '                             yy',
      '                            yy',
      '',
      '                            yy',
    ]),
    classic: [],
  },
}

const HOP_ROWS = 3

const HOPPED: readonly Pixel[] = [
  ...overlay([...BIRDS.small.slice(HOP_ROWS), ...BIRDS.small.slice(0, HOP_ROWS)]),
  [18, 18, '.'],
  [19, 18, '.'],
  [20, 18, '.'],
  [22, 18, '.'],
  [23, 18, '.'],
  [24, 18, '.'],
]

const STARTLE = overlay([
  '',
  '',
  '                  R   R    R',
  '                  R   R    R',
  '                   R  R   R',
  '              R               R',
  '               RR           RR',
])

const SMALL_Z = overlay([
  '',
  '',
  '                     WWW',
  '                       W',
  '                      W',
  '                     WWW',
])

const MIDDLE_Z = overlay([
  '',
  '                         WWW',
  '                           W',
  '                          W',
  '                         WWW',
])

const BIG_Z = overlay([
  '                             WWWW',
  '                               W',
  '                              W',
  '                             WWWW',
])

const overlayAt = (left: number, top: number, rows: readonly string[]): Pixel[] =>
  overlay(rows).map(([x, y, key]) => [x + left, y + top, key])

const EGG_LEFT = 31

const EGG_BOTTOM = [
  ' WWWWWWWW',
  ' WWWWWWWW',
  ' WWWWSWWW',
  '  WWSWWW',
  '   WWWW',
]

const WHOLE_EGG = ['    WW', '   WWWW', '  WWWWWW', '  WWWWWW', ...EGG_BOTTOM]

const EGG = overlayAt(EGG_LEFT, 12, WHOLE_EGG)

const EGG_MOVED_LEFT = overlayAt(EGG_LEFT - 1, 12, WHOLE_EGG)

const EGG_MOVED_RIGHT = overlayAt(EGG_LEFT + 1, 12, WHOLE_EGG)

const CRACK = overlayAt(EGG_LEFT, 15, [
  '',
  '    KK',
])

const WIDE_CRACK = overlayAt(EGG_LEFT, 15, [
  '    K K',
  '   K KK',
  '   K',
])

const EGG_POPPING = overlayAt(EGG_LEFT, 8, [
  '       WW',
  '      WWWW',
  '      W WW',
  '',
  '',
  '',
  '   cccc',
  '  WyWWyW',
  ...EGG_BOTTOM,
])

const CHICK = overlayAt(EGG_LEFT, 10, [
  '    yccc',
  '   yycccc',
  '  KyeNNNN',
  '   yyyyyy',
  '   yyyyyy',
  '  WyWWyW',
  ...EGG_BOTTOM,
])

const STANDING_CHICK = overlayAt(EGG_LEFT, 16, [
  '    yccc',
  '   yycccc',
  '  KyeyNNND',
  '   yyyyyyDD',
  '   yyyyyyDD',
  '     K K',
])

const CHIRP = overlayAt(EGG_LEFT, 11, [
  '  K',
  '  .',
  '  K',
])

const WING_SPREAD = overlay([
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '        NN',
  '  DDDDDDNNNNNN  .',
  ' cccDDDDDNNNNNNN',
  ' cccccccDDDDDDNNN',
  ' cccccccccccccccyyy',
  '  cccccccccyyyyyyyyy',
  '   cccccc ccyyyyyyyy',
  '     ccc    cyyyyyyy',
  '           yyyyyyy',
  '          yyyyyy',
])

const WING_UP = overlay([
  '               DDDDD',
  '              DDDDDDDD',
  '             DDDcccc',
  '            DDccccccNNN',
  '            DDcccccNNNNNN',
  '            DcgggcNNNNN',
  '            DggggcNN',
  '            Dgyygc',
  '            Dgyygg',
  '             yyy',
  '             yyy',
  '             yyy',
])

const WING_LEVEL = overlay([
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '        DDDDDDDD',
  '      DDcccccccc',
  '        cccccccc',
])

const WING_DOWN = overlay([
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '          cccccc',
  '        cccccccc',
  '        cccccccc',
  '         ccccccc',
  '         ccccccc',
  '          DDcccc',
  '          DDDDDD',
])

export const STEPS: Record<Pose, Record<BlueTitStyle, readonly (readonly Pixel[])[]>> = {
  idle: { small: [], classic: [] },
  listening: {
    small: [
      [
        [22, 21, '.'],
        [23, 21, '.'],
        [24, 21, '.'],
      ],
      [
        [18, 21, '.'],
        [19, 21, '.'],
        [20, 21, '.'],
      ],
    ],
    classic: [
      [
        [15, 14, 'K'],
        [14, 15, '.'],
        [15, 15, '.'],
      ],
      [
        [12, 14, 'K'],
        [11, 15, '.'],
        [12, 15, '.'],
      ],
    ],
  },
  thinking: {
    small: [WING_UP, WING_LEVEL, WING_DOWN, WING_LEVEL],
    classic: [],
  },
  writing: {
    small: [
      [],
      [
        [28, 10, '.'],
        [28, 11, 'K'],
      ],
    ],
    classic: [],
  },
  interrupted: {
    small: [STARTLE, []],
    classic: [],
  },
  sleeping: {
    small: [SMALL_Z, [...SMALL_Z, ...MIDDLE_Z], [...SMALL_Z, ...MIDDLE_Z, ...BIG_Z], []],
    classic: [],
  },
  running: {
    small: [[], [], HOPPED],
    classic: [],
  },
  asking: {
    small: [WING_SPREAD, [], WING_SPREAD, [], [], [], [], [], []],
    classic: [],
  },
}

export const CHICK_STEPS: Record<ChickLayer, Record<BlueTitStyle, readonly (readonly Pixel[])[]>> = {
  hatching: {
    small: [
      EGG,
      EGG_MOVED_LEFT,
      EGG,
      EGG_MOVED_RIGHT,
      [...EGG, ...CRACK],
      [...EGG, ...WIDE_CRACK],
      EGG_POPPING,
      CHICK,
      [...CHICK, ...CHIRP],
      CHICK,
      [...CHICK, ...CHIRP],
      CHICK,
      [...CHICK, ...CHIRP],
      CHICK,
    ],
    classic: [],
  },
  standing: {
    small: [STANDING_CHICK],
    classic: [],
  },
}

export const stepCount = (birdStyle: BlueTitStyle, pose: Pose) => Math.max(1, STEPS[pose][birdStyle].length)

export const chickStepCount = (birdStyle: BlueTitStyle, layer: ChickLayer) =>
  Math.max(1, CHICK_STEPS[layer][birdStyle].length)

export const POSE_NAMES: Record<Pose, string> = {
  idle: 'Idle',
  listening: 'You are typing',
  thinking: 'Claude is thinking',
  writing: 'Claude is writing a reply',
  interrupted: 'Interrupted',
  sleeping: 'Asleep',
  running: 'Running a command',
  asking: 'Needs you',
}

export const CHICK_NAMES: Record<ChickLayer, string> = {
  hatching: 'A subagent starts',
  standing: 'Subagents at work',
}

export const BLINK_MS = 150
export const BLINK_GAP_MIN_MS = 1000
export const BLINK_GAP_MAX_MS = 6000
export const LISTENING_MS = 1500
export const INTERRUPTED_MS = 2500
export const WAKE_MS = 1000
export const SLEEP_AFTER_MS = 5 * 60 * 1000
export const AGENT_CHECK_MS = 30 * 1000
export const STEP_MS = 300
export const FLAP_MS = 200
export const BEAK_MIN_MS = 50
export const BEAK_MAX_MS = 150
export const STARTLE_MS = 250
export const SLEEP_MS = 700
export const HOP_MS = 150
export const ASK_MS = 120
export const HATCH_MS = 200

export const stepMsRange = (pose: Pose): readonly [min: number, max: number] => {
  if (pose === 'thinking') return [FLAP_MS, FLAP_MS]
  if (pose === 'writing') return [BEAK_MIN_MS, BEAK_MAX_MS]
  if (pose === 'interrupted') return [STARTLE_MS, STARTLE_MS]
  if (pose === 'sleeping') return [SLEEP_MS, SLEEP_MS]
  if (pose === 'running') return [HOP_MS, HOP_MS]
  if (pose === 'asking') return [ASK_MS, ASK_MS]

  return [STEP_MS, STEP_MS]
}

export const stepMs = (pose: Pose) => {
  const [min, max] = stepMsRange(pose)

  return min + Math.random() * (max - min)
}

export const blinkGapMs = () => BLINK_GAP_MIN_MS + Math.random() * (BLINK_GAP_MAX_MS - BLINK_GAP_MIN_MS)

export const withPixels = (grid: readonly string[], pixels: readonly Pixel[]) => {
  const width = Math.max(...grid.map(row => row.length), ...pixels.map(([x]) => x + 1))

  return grid.map((row, y) =>
    Array.from(
      { length: width },
      (_, x) => pixels.findLast(([px, py]) => px === x && py === y)?.[2] ?? row[x] ?? '.',
    ).join(''),
  )
}

const closeParentEyes = (grid: readonly string[]) => {
  const lineRow = grid.findIndex(row => row.includes('E'))

  return grid.map((row, index) => row.replaceAll('E', index === lineRow ? 'N' : 'W'))
}

const closeChickEyes = (grid: readonly string[]) => grid.map(row => row.replaceAll('e', 'y'))

const poseWidth = (birdStyle: BlueTitStyle, pose: Pose) =>
  Math.max(
    ...BIRDS[birdStyle].map(row => row.length),
    ...[POSES[pose][birdStyle], ...STEPS[pose][birdStyle]].flat().map(([x]) => x + 1),
  )

const chickWidth = (birdStyle: BlueTitStyle) =>
  Math.max(0, ...Object.values(CHICK_STEPS).flatMap(layer => layer[birdStyle].flat().map(([x]) => x + 1)))

export type ChickFrame = { layer: ChickLayer; step: number; isEyeClosed: boolean }

export const frameGrid = (birdStyle: BlueTitStyle, pose: Pose, isEyeClosed: boolean, step = 0, chick?: ChickFrame) => {
  const width = Math.max(poseWidth(birdStyle, pose), chick ? chickWidth(birdStyle) : 0)
  const posed = withPixels(BIRDS[birdStyle], [
    ...POSES[pose][birdStyle],
    ...(STEPS[pose][birdStyle][step] ?? []),
    ...(chick ? (CHICK_STEPS[chick.layer][birdStyle][chick.step] ?? []) : []),
  ]).map(row => row.padEnd(width, '.'))
  const parentPosed = isEyeClosed ? closeParentEyes(posed) : posed

  return chick?.isEyeClosed ? closeChickEyes(parentPosed) : parentPosed
}

export const toCells = (grid: readonly string[], shape: CellShape): Cell[][] => {
  const width = Math.max(...grid.map(row => row.length))
  const pixel = (x: number, y: number) => grid[y]?.[x] ?? '.'

  return Array.from({ length: Math.ceil(grid.length / shape.rows) }, (_, row) =>
    Array.from({ length: Math.ceil(width / shape.columns) }, (_, column) => {
      const pixels = Array.from({ length: shape.columns * shape.rows }, (_, index) =>
        pixel(column * shape.columns + (index % shape.columns), row * shape.rows + Math.floor(index / shape.columns)),
      )
      const front = pixels.find(key => key !== '.')
      const back = front === undefined ? undefined : pixels.find(key => key !== front)
      const bits = pixels.reduce((sum, key, index) => (key === front ? sum | (1 << index) : sum), 0)

      return {
        front,
        back: back === '.' ? undefined : back,
        bits,
        isConflict: new Set(pixels).size > 2,
      }
    }),
  )
}
