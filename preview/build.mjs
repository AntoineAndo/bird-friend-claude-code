import { writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import {
  BLINK_GAP_MAX_MS,
  BLINK_GAP_MIN_MS,
  BLINK_MS,
  CHICK_NAMES,
  HATCH_MS,
  LISTENING_MS,
  PALETTE,
  POSES,
  POSE_NAMES,
  SHAPES,
  chickStepCount,
  frameGrid,
  stepCount,
  stepMsRange,
  toCells,
  toCss,
} from '../hooks/art.ts'

const output = process.argv[2] ?? join(homedir(), 'Documents/dev/blue-tit/preview.html')
const styles = ['small']

const EYES = [
  ['open', false, false],
  ['closed', true, false],
  ['chick', false, true],
  ['both', true, true],
]

const ROWS = [
  ...Object.keys(POSES).map(pose => ({ pose })),
  { pose: 'idle', chick: 'hatching' },
  { pose: 'idle', chick: 'standing' },
  { pose: 'thinking', chick: 'standing' },
  { pose: 'writing', chick: 'hatching' },
  { pose: 'running', chick: 'standing' },
  { pose: 'asking', chick: 'standing' },
  { pose: 'sleeping', chick: 'standing' },
]

const nameOf = ({ pose, chick }) => {
  if (chick === undefined) return POSE_NAMES[pose]
  if (pose === 'idle') return CHICK_NAMES[chick]

  return `${POSE_NAMES[pose]}, ${CHICK_NAMES[chick].toLowerCase()}`
}

const states = ROWS.map(({ pose, chick }) => ({
  pose: chick === undefined ? pose : `${pose} + ${chick}`,
  name: nameOf({ pose, chick }),
  styles: styles.map(birdStyle => {
    const chickSteps = chick === undefined ? 1 : chickStepCount(birdStyle, chick)

    return {
      style: birdStyle,
      shape: SHAPES[birdStyle],
      stepCount: stepCount(birdStyle, pose),
      stepMsRange: stepMsRange(pose),
      chickStepCount: chick === undefined ? 0 : chickSteps,
      chickStepMs: HATCH_MS,
      frames: Object.fromEntries(
        EYES.filter(([, , isChickEyeClosed]) => chick !== undefined || !isChickEyeClosed).flatMap(
          ([eyes, isEyeClosed, isChickEyeClosed]) =>
            Array.from({ length: stepCount(birdStyle, pose) }, (_, step) =>
              Array.from({ length: chickSteps }, (_, chickStep) => [
                `${eyes}-${step}-${chickStep}`,
                frameGrid(
                  birdStyle,
                  pose,
                  isEyeClosed,
                  step,
                  chick && { layer: chick, step: chickStep, isEyeClosed: isChickEyeClosed },
                ),
              ]),
            ).flat(),
        ),
      ),
    }
  }),
}))

const data = {
  builtAt: new Date().toISOString(),
  palette: Object.fromEntries(Object.keys(PALETTE).map(key => [key, toCss(key)])),
  timing: { blinkMs: BLINK_MS, blinkGapMinMs: BLINK_GAP_MIN_MS, blinkGapMaxMs: BLINK_GAP_MAX_MS, listeningMs: LISTENING_MS },
  states,
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Blue tit states</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 28px; background: #f4f5f7; color: #1d1f24; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .lead { margin: 0 0 16px; color: #5b616e; font-size: 14px; }
  .controls { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; background: #fff; border: 1px solid #e3e6eb; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; position: sticky; top: 0; z-index: 1; }
  .controls label { display: flex; gap: 6px; align-items: center; }
  .controls button { font: inherit; padding: 4px 10px; border-radius: 6px; border: 1px solid #c8cdd6; background: #fff; cursor: pointer; }
  table { border-collapse: separate; border-spacing: 14px; margin-left: -14px; }
  th { text-align: left; font-size: 13px; color: #5b616e; font-weight: 600; }
  th.state { font-size: 15px; color: #1d1f24; white-space: nowrap; padding-right: 8px; vertical-align: top; padding-top: 18px; }
  td { background: #fff; border: 1px solid #e3e6eb; border-radius: 12px; padding: 14px; vertical-align: top; }
  .stage { border-radius: 8px; padding: 16px; display: flex; justify-content: center; align-items: center; min-width: 260px; min-height: 150px; }
  .stage.dark { background: #1e1e1e; }
  .stage.light { background: #ffffff; outline: 1px solid #e3e6eb; }
  .stills { display: grid; grid-template-columns: repeat(4, max-content); gap: 14px; margin-top: 12px; align-items: end; }
  .still { text-align: center; font-size: 11px; color: #8a909c; }
  .still.stage { flex-direction: column; gap: 4px; }
  .still canvas { display: block; margin: 0 auto 4px; }
  .badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-top: 10px; }
  .badge.ok { background: #e3f4e8; color: #1f7a3a; }
  .badge.bad { background: #fde7e7; color: #b42318; }
  .meta { font-size: 11px; color: #8a909c; margin-top: 6px; }
  .planned { margin-top: 28px; }
  .planned h2 { font-size: 16px; margin: 0 0 8px; }
  .planned table td { padding: 8px 12px; font-size: 13px; }
  canvas { image-rendering: pixelated; }
</style>
</head>
<body>
<h1>Blue tit states</h1>
<p class="lead">Every state of the small bird, animated the way the terminal shows it: one character cell holds 2×3 pixels and at most two colors. Built from <code>~/.claude/mods/blue-tit/hooks/art.ts</code> at <span id="built"></span>.</p>
<div class="controls">
  <label>Background <select id="bg"><option value="dark">Dark terminal</option><option value="light">Light terminal</option></select></label>
  <label>Cell width <input id="scale" type="range" min="6" max="24" value="12"> <span id="scaleValue"></span>px</label>
  <label><input id="cellGrid" type="checkbox"> Show cell grid</label>
  <label><input id="conflicts" type="checkbox" checked> Highlight 3-color cells</label>
  <label><input id="raw" type="checkbox"> Raw pixels (ignore the 2-color limit)</label>
  <label><input id="paused" type="checkbox"> Pause</label>
  <button id="blinkNow">Blink all now</button>
</div>
<table id="states"></table>
<div class="planned">
  <h2>Empty grid</h2>
  <div id="emptyGrid"></div>
</div>
<div class="planned">
  <h2>Not drawn yet</h2>
  <table>
    <tr><td><b>Reading / searching</b></td><td>tool.call Read, Grep, Glob</td><td>Leans forward, eye shifts</td></tr>
    <tr><td><b>Editing files</b></td><td>tool.call Edit, Write</td><td>Pecks</td></tr>
    <tr><td><b>On the web</b></td><td>tool.call WebFetch, WebSearch</td><td>Looks into the distance</td></tr>
    <tr><td><b>Turn finished</b></td><td>turn.complete reason answer</td><td>Happy hop for ~2 s</td></tr>
    <tr><td><b>Error</b></td><td>turn.complete reason error</td><td>Ruffled for ~2 s</td></tr>
  </table>
</div>
<script>
const DATA = ${JSON.stringify(data)};
const toCells = ${toCells.toString()};
const $ = id => document.getElementById(id);
const cellsOf = (entry, frameName) => {
  entry.cells = entry.cells || {};
  entry.cells[frameName] = entry.cells[frameName] || toCells(entry.frames[frameName], entry.shape);
  return entry.cells[frameName];
};
document.getElementById('built').textContent = new Date(DATA.builtAt).toLocaleString();

const settings = () => ({
  bg: $('bg').value,
  cellWidth: Number($('scale').value),
  cellGrid: $('cellGrid').checked,
  conflicts: $('conflicts').checked,
  raw: $('raw').checked,
});

function draw(canvas, entry, frameName) {
  const { cellWidth, cellGrid, conflicts, raw, bg } = settings();
  const { shape } = entry;
  const frame = { grid: entry.frames[frameName], cells: cellsOf(entry, frameName) };
  const cellHeight = cellWidth * 2;
  const columns = frame.cells[0].length;
  const rows = frame.cells.length;
  const pixelWidth = cellWidth / shape.columns;
  const pixelHeight = cellHeight / shape.rows;
  canvas.width = columns * cellWidth;
  canvas.height = rows * cellHeight;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  frame.cells.forEach((cellRow, row) => cellRow.forEach((cell, column) => {
    for (let index = 0; index < shape.columns * shape.rows; index++) {
      const px = column * shape.columns + (index % shape.columns);
      const py = row * shape.rows + Math.floor(index / shape.columns);
      const key = raw ? (frame.grid[py] || '')[px] : (cell.front === undefined ? undefined : ((cell.bits >> index) & 1 ? cell.front : cell.back));
      const color = key && DATA.palette[key];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(px * pixelWidth, py * pixelHeight, Math.ceil(pixelWidth), Math.ceil(pixelHeight));
    }
    if (conflicts && cell.isConflict) {
      ctx.strokeStyle = '#ff3b30';
      ctx.lineWidth = 2;
      ctx.strokeRect(column * cellWidth + 1, row * cellHeight + 1, cellWidth - 2, cellHeight - 2);
    }
  }));

  if (cellGrid) {
    ctx.strokeStyle = bg === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    for (let column = 0; column <= columns; column++) { ctx.beginPath(); ctx.moveTo(column * cellWidth + 0.5, 0); ctx.lineTo(column * cellWidth + 0.5, canvas.height); ctx.stroke(); }
    for (let row = 0; row <= rows; row++) { ctx.beginPath(); ctx.moveTo(0, row * cellHeight + 0.5); ctx.lineTo(canvas.width, row * cellHeight + 0.5); ctx.stroke(); }
  }
}

const live = [];

function build() {
  const table = $('states');
  table.innerHTML = '';
  live.length = 0;
  const head = document.createElement('tr');
  head.innerHTML = '<th></th>' + DATA.states[0].styles.map(entry => '<th>' + entry.style + ' (' + entry.shape.columns + '×' + entry.shape.rows + ' pixels per cell)</th>').join('');
  table.appendChild(head);

  for (const state of DATA.states) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.className = 'state';
    th.innerHTML = state.name + '<div class="meta">' + state.pose + '</div>';
    tr.appendChild(th);

    for (const entry of state.styles) {
      const td = document.createElement('td');
      const stage = document.createElement('div');
      stage.className = 'stage ' + settings().bg;
      const canvas = document.createElement('canvas');
      stage.appendChild(canvas);
      td.appendChild(stage);

      const stillsRow = document.createElement('div');
      stillsRow.className = 'stills';
      const lastChickStep = Math.max(0, entry.chickStepCount - 1);
      const stills = [
        ...(entry.chickStepCount > 1
          ? Array.from({ length: entry.chickStepCount }, (_, chickStep) => ['open-0-' + chickStep, 'frame ' + (chickStep + 1)])
          : entry.stepCount > 1
            ? Array.from({ length: entry.stepCount }, (_, step) => ['open-' + step + '-0', 'frame ' + (step + 1)])
            : [['open-0-0', 'eyes open']]),
        ['closed-0-' + lastChickStep, 'eyes closed'],
        ...(entry.chickStepCount > 0 ? [['chick-0-' + lastChickStep, 'chick eyes closed']] : []),
      ];
      for (const [frameName, caption] of stills) {
        const still = document.createElement('div');
        still.className = 'still stage ' + settings().bg;
        still.style.minWidth = '0'; still.style.minHeight = '0'; still.style.padding = '8px';
        const small = document.createElement('canvas');
        still.appendChild(small);
        const label = document.createElement('div');
        label.textContent = caption;
        label.style.color = settings().bg === 'dark' ? '#9aa0aa' : '#8a909c';
        still.appendChild(label);
        stillsRow.appendChild(still);
        draw(small, entry, frameName);
        small.style.width = (small.width / 2) + 'px';
        small.style.height = (small.height / 2) + 'px';
      }
      td.appendChild(stillsRow);

      const conflictCount = Object.keys(entry.frames).filter(frameName => /^(open|closed)-/.test(frameName)).reduce((sum, frameName) => sum + cellsOf(entry, frameName).flat().filter(cell => cell.isConflict).length, 0);
      const badge = document.createElement('span');
      badge.className = 'badge ' + (conflictCount ? 'bad' : 'ok');
      badge.textContent = conflictCount ? conflictCount + ' cell(s) need 3 colors' : 'every cell fits in 2 colors';
      td.appendChild(badge);

      const cells = cellsOf(entry, 'open-0-0');
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = cells[0].length + ' columns × ' + cells.length + ' rows in the terminal' + (entry.stepCount > 1 ? ', next frame every ' + (entry.stepMsRange[0] === entry.stepMsRange[1] ? entry.stepMsRange[0] : entry.stepMsRange[0] + '–' + entry.stepMsRange[1]) + ' ms' : '') + (entry.chickStepCount > 1 ? ', next chick frame every ' + entry.chickStepMs + ' ms (looped here, played once in the terminal)' : '');
      td.appendChild(meta);

      tr.appendChild(td);
      const now = performance.now();
      const item = { canvas, entry, isClosed: false, isChickClosed: false, step: 0, chickStep: 0, nextBlinkAt: now + gap(), nextChickBlinkAt: now + gap(), nextStepAt: now + stepGap(entry), nextChickStepAt: now + entry.chickStepMs };
      live.push(item);
      draw(canvas, entry, 'open-0-0');
    }
    table.appendChild(tr);
  }

  buildEmptyGrid();
}

function buildEmptyGrid() {
  const { cellWidth, bg } = settings();
  const entry = DATA.states[0].styles[0];
  const { shape } = entry;
  const columns = cellsOf(entry, 'open-0-0')[0].length;
  const rows = cellsOf(entry, 'open-0-0').length;
  const cellHeight = cellWidth * 2;
  const pixelWidth = cellWidth / shape.columns;
  const pixelHeight = cellHeight / shape.rows;
  const container = $('emptyGrid');
  container.innerHTML = '';
  const stage = document.createElement('div');
  stage.className = 'stage ' + bg;
  stage.style.display = 'inline-flex';
  const canvas = document.createElement('canvas');
  canvas.width = columns * cellWidth + 1;
  canvas.height = rows * cellHeight + 1;
  const ctx = canvas.getContext('2d');
  const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  ctx.lineWidth = 1;
  ctx.strokeStyle = bg === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  for (let x = 0; x <= columns * shape.columns; x++) if (x % shape.columns) line(x * pixelWidth + 0.5, 0, x * pixelWidth + 0.5, canvas.height);
  for (let y = 0; y <= rows * shape.rows; y++) if (y % shape.rows) line(0, y * pixelHeight + 0.5, canvas.width, y * pixelHeight + 0.5);
  ctx.strokeStyle = bg === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  for (let column = 0; column <= columns; column++) line(column * cellWidth + 0.5, 0, column * cellWidth + 0.5, canvas.height);
  for (let row = 0; row <= rows; row++) line(0, row * cellHeight + 0.5, canvas.width, row * cellHeight + 0.5);
  stage.appendChild(canvas);
  container.appendChild(stage);
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = columns + ' columns × ' + rows + ' rows of cells, ' + (columns * shape.columns) + ' × ' + (rows * shape.rows) + ' pixels; thick lines are cells, thin lines are pixels';
  container.appendChild(meta);
}

const gap = () => DATA.timing.blinkGapMinMs + Math.random() * (DATA.timing.blinkGapMaxMs - DATA.timing.blinkGapMinMs);
const stepGap = entry => entry.stepMsRange[0] + Math.random() * (entry.stepMsRange[1] - entry.stepMsRange[0]);

const eyesOf = item => (item.isClosed ? (item.isChickClosed ? 'both' : 'closed') : (item.isChickClosed ? 'chick' : 'open'));

function tick(now) {
  if (!$('paused').checked) {
    for (const item of live) {
      let isChanged = false;
      if (!item.isClosed && now >= item.nextBlinkAt) {
        item.isClosed = true;
        item.openAt = now + DATA.timing.blinkMs;
        isChanged = true;
      } else if (item.isClosed && now >= item.openAt) {
        item.isClosed = false;
        item.nextBlinkAt = now + gap();
        isChanged = true;
      }
      if (item.entry.chickStepCount > 0 && !item.isChickClosed && now >= item.nextChickBlinkAt) {
        item.isChickClosed = true;
        item.chickOpenAt = now + DATA.timing.blinkMs;
        isChanged = true;
      } else if (item.isChickClosed && now >= item.chickOpenAt) {
        item.isChickClosed = false;
        item.nextChickBlinkAt = now + gap();
        isChanged = true;
      }
      if (item.entry.stepCount > 1 && now >= item.nextStepAt) {
        item.step = (item.step + 1) % item.entry.stepCount;
        item.nextStepAt = now + stepGap(item.entry);
        isChanged = true;
      }
      if (item.entry.chickStepCount > 1 && now >= item.nextChickStepAt) {
        item.chickStep = (item.chickStep + 1) % item.entry.chickStepCount;
        item.nextChickStepAt = now + item.entry.chickStepMs;
        isChanged = true;
      }
      if (isChanged) draw(item.canvas, item.entry, eyesOf(item) + '-' + item.step + '-' + item.chickStep);
    }
  }
  requestAnimationFrame(tick);
}

$('blinkNow').addEventListener('click', () => { const now = performance.now(); live.forEach(item => { item.isClosed = false; item.isChickClosed = false; item.nextBlinkAt = now; item.nextChickBlinkAt = now; }); });
for (const id of ['bg', 'scale', 'cellGrid', 'conflicts', 'raw']) $(id).addEventListener('input', () => { $('scaleValue').textContent = $('scale').value; build(); });
$('scaleValue').textContent = $('scale').value;
build();
requestAnimationFrame(tick);
</script>
</body>
</html>
`

writeFileSync(output, html)
console.log(`Wrote ${output}`)
