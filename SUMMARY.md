# Blue tit for Claude Code

A pixel-art blue tit that lives above the Claude Code prompt, built as a Claude Code mod (the hooks plugin API).

## Where things are

| What | Path |
| --- | --- |
| The mod every session loads | `~/.claude/mods/blue-tit/` |
| The art: drawings, palette, poses, timing, cell packing | `~/.claude/mods/blue-tit/hooks/art.ts` |
| Its behavior: hooks, timers, terminal glyphs | `~/.claude/mods/blue-tit/hooks/register.tsx` |
| Preview page builder | `~/.claude/mods/blue-tit/preview/build.mjs` |
| Preview page (all states, animated) | `~/Documents/dev/blue-tit/preview.html` |
| Its state contract | `~/.claude/mods/blue-tit/types/index.d.ts` |
| Its tests | `~/.claude/mods/blue-tit/tests/blue-tit.test.tsx` |
| Unused welcome-screen patch | `~/.claude/mods/blue-tit/welcome-patch.js` (kept out of the repository) |
| What loads it everywhere | `"env": { "CLAUDE_CODE_PLUGIN_DIRS": "/Users/antoine.ando/.claude/mods/blue-tit" }` in `~/.claude/settings.json` |
| Optional blue Clawd theme | `~/.claude/themes/blue-tit.json` (pick "Blue tit" in `/theme`) |
| First session's copy (no longer needed) | `~/.claude/dev-mods/a1892b3d-7474-4a68-bf77-afb05a042355/blue-tit/` |
| Scratch work (drafts, previews, scripts) | `/tmp/bluetit-scratch/` |
| Git repository | `~/.claude/mods/blue-tit/` (branch `main`, `.claude-plugin/types/` ignored), to be pushed to `https://github.com/AntoineAndo/bird-friend-claude-code.git` |

## What it does now

- Draws the bird in the band just above the prompt input, in every session and every worktree, all the time.
- The bird stands alone in the band, with no text beside it.
- Steps aside while Claude Code shows a survey in that band.
- **Blinking, in every state but asleep:** every 1 to 6 seconds the eye closes for 150 ms. A chick, when there is one, blinks on its own timer, not with its parent.
- **Idle:** the base pose.
- **You're typing:** the bird lifts one foot, then the other, every 300 ms, and keeps blinking. It stands still again 1.5 s after the last keystroke, or right away when you send the prompt.
- **Claude is working on a turn:** the bird flies level, two cells higher than where it perches, its wing going up, level, down, level, every 200 ms. Its feet are tucked and it keeps blinking. It perches again when the turn ends (answer, interrupt, error or refusal). Subagent turns don't make it fly, and flying wins over typing.
- **Claude is writing the answer:** while answer text streams in, the bird perches and talks: its beak opens and closes, each frame a random 50–150 ms. It flies again when thinking or a tool call comes, or when the step ends. Talking wins over flying.
- **Claude runs a command:** while a Bash call of the main loop runs, the bird hops in place (two frames on the ground, one 3 rows up with its feet shorter, 150 ms each). Several at once keep it hopping until the last ends.
- **Claude asks you a question:** while an `AskUserQuestion` dialog is open, the bird sits above the question instead of in the band, which Claude Code hides during dialogs. A yellow `?` stands in front of its head, and it spreads its wing level to the left twice, then rests it for 5 frames, 120 ms each. It keeps blinking, and `/blue-tit` hides it there too. Checked live in a real question dialog.
- **A subagent starts:** on a subagent's first turn, foreground or background, an egg appears in front of the bird and hatches once. It rocks a pixel left and right, cracks and pops its top, and a yellow chick comes out with a blue cap sloping back and a navy stripe behind its eye, then chirps three times: 14 frames, 200 ms each, 2.8 s in all. Another subagent starting meanwhile plays the hatch again from the start. A later turn of the same subagent (a follow-up message) doesn't hatch again.
- **Subagents are working:** after the hatch, a small round hatchling stands at the bird's feet, blinking on its own, until the last subagent's turn ends. As a safety net, the agent list is checked every 30 s while the chick is out, so a subagent whose turn end never arrives still lets the chick go. The bird doesn't fall asleep while one works.
- **The chick is a layer of its own:** the egg and the hatchling are drawn beside whatever the bird is doing, with their own frame timer, so the bird keeps flying, talking, hopping or asking while the chick hatches or stands by. That includes above the question dialog. The band is 21 columns wide while the chick is out, 17 otherwise.
- **You interrupt a turn:** a red burst over the head blinks on and off every 250 ms for 2.5 s.
- **Nothing happens for 5 minutes:** no typing and no turn running, the bird lies down asleep: eyes shut, no feet, a flat tail, and `z z Z` rising one letter every 700 ms. The next keystroke, prompt or turn wakes it with the red burst for 1 s.
- **Which wins:** for the bird, interrupted, then asking, then writing, then running, then flying, then typing, then asleep, then idle. For the chick, which is drawn alongside, the hatch, then the standing chick, then none.
- **The eye:** a navy line with a 1-row black eye under its front part. When the eye closes, the black eye turns white and the line stays whole.

## Iterating on the animations

**Small only from now on:** new art is drawn for the small style only. The classic drawings stay in `art.ts` as they are, but are no longer updated or shown on the preview page.

1. **Edit the art:** change `~/.claude/mods/blue-tit/hooks/art.ts`. A new state is a new entry in `POSES` (pixel edits on the base drawing) plus its name in `POSE_NAMES`. A state that moves also gets frames in `STEPS` (more pixel edits on top of the pose, one list per frame), and its frame time in `stepMsRange` (a min–max range; `stepMs` picks a fresh time for each frame). Edits are either `[x, y, key]` lists or `overlay([...])` drawings, where a space keeps the base pixel; the last edit of a pixel wins. A pixel past the right edge widens that frame (`overlayAt(left, top, rows)` places a drawing at an offset), so one pose can grow without changing the others; every frame of a pose is padded to its widest, so the drawing never shifts. Keep a widened scene a whole cell (2 pixels) clear of the bird, so it can move a pixel either way without sharing a cell with it. The chick layer lives in `CHICK_STEPS` (`hatching` and `standing`, named in `CHICK_NAMES`), drawn in cols 31–41 where no pose of the bird reaches, so it can sit next to any of them.
2. **Rebuild the page:** run `node ~/.claude/mods/blue-tit/preview/build.mjs`, then refresh `~/Documents/dev/blue-tit/preview.html`. To rebuild on every save, use `node --watch-path ~/.claude/mods/blue-tit/hooks ~/.claude/mods/blue-tit/preview/build.mjs`.
3. **Read the page:** it shows every state of the small bird, then the chick layer with the idle bird and in combinations (flying, talking, hopping, asking, asleep), animated and blinking live with the mod's own timing, plus the open and closed frames. The page loops the hatch, which the terminal plays once. It gets each frame's grid from `frameGrid` and packs the cells in the browser with `art.ts`'s own `toCells`, so the combined rows don't bloat it. It draws each terminal cell with at most two colors, at the terminal's cell proportions. Cells that would need three colors get a red outline, and "Raw pixels" shows what you drew before the limit is applied.
4. **Wire it into the mod:** add the pose's name to `Pose` in `types/index.d.ts` and to `currentPose` in `register.tsx`, at its place in the priority order (drawings are built on first use). Then add the hook or timer that turns it on and off. The terminal picks up the change the next time the mod reloads.

### Commands

| Command | Effect |
| --- | --- |
| `/blue-tit` | Hide the bird, or bring it back |
| `/blue-tit small` | Default drawing: 17 columns × 8 rows (33 × 24 pixels; the left 2 pixels were added for the flying tail, the top 6 rows and the right 3 pixels for the red burst, the `z z Z` and the hop), sextant characters; 21 columns while the chick is out |
| `/blue-tit classic` | Larger drawing: 20 columns × 8 rows, half-block characters |

`ctrl+x ctrl+a` (Claude Code's own shortcut) collapses the band too.

## How it works

- **Pixel art in a terminal:** each drawing is a grid of letters, one per pixel (`c` cap blue, `W` white, `N` navy stripe, `E` eye, `e` chick eye (black, closes to yellow), `g` olive back, `y` yellow, `D` dark tail, `K` grey beak and legs, `R` red burst, `S` brown egg speckles, `.` transparent).
  - **Classic** packs 1×2 pixels per character (`▀` `▄` `█`), with a foreground and a background color.
  - **Small** packs 2×3 pixels per character with sextants (`🬀`…`🬻`, Unicode 13), so its pixels are a third of the size. A cell can only have two colors, so the small drawing was hand-tuned so no cell needs three.
- **The band:** a `ui.render` hook on the `AbovePrompt` component draws the tree. Values in `$.state` (`isShown`, `style`, `isBlinking`, `isChickBlinking`, `pose`, `step`, `chick`, `chickStep`) redraw it when they change. A stored pose the code no longer knows, left from an older version, draws as idle until `session.start` writes the current one.
- **Which pose shows:** the module keeps one variable per activity (typing, flying, writing, commands running, open questions, startled, asleep) and writes the winner to `pose` whenever it changes; `refresh` does the same for the chick layer (`chick`: `hatching`, `standing` or `none`). `session.start`, which also runs on every reload, writes it afresh so a pose from before a reload can't stick.
- **Blink:** two `$.clock.after` loops started at `session.start` flip `isBlinking` for the parent and `isChickBlinking` for the chick, each with its own random gaps, whatever the state. Each loop opens the eyes before waiting, so a reload mid-blink can't leave them shut. A drawing exists for each combination of the two eyes, and the preview page blinks them separately too. The closed eye is derived from any drawing: the black eye pixels in the line's row turn navy, the ones below turn white, and a chick's `e` eye turns yellow.
- **Shared art:** `art.ts` holds everything about the drawings. Both `register.tsx` and the preview builder import it, so the page always shows exactly what the terminal draws.
- **Frames:** whenever the shown pose changes, a `$.clock.after` loop restarts from frame 0 and bumps `step` at that pose's frame time. The chick layer has its own loop on `chickStep` at `HATCH_MS`, which stops on the hatch's last frame instead of looping. A drawing is built the first time a combination of pose, frame, eyes and chick frame is shown, then cached.
- **Listening:** a `prompt.edit` hook (each keystroke) passes the edit on at once and turns typing on, restarting a 1.5 s timer. A `prompt.submit` hook ends it. Its two frames are the two foot positions in `STEPS.listening`.
- **Thinking:** `turn.start` and `turn.complete` hooks on the main loop (`agentId` absent) turn flying on and off. The flying bird is a full drawing of its own in `POSES.thinking`, and its wing positions are `STEPS`.
- **Writing:** a streaming `turn.step` hook (an async generator) passes every chunk on unchanged and turns writing on for `text` chunks, off for `thinking`, `tool` and `stop` chunks and when the stream ends. `stepMsRange(pose)` gives each pose a min–max frame time; `stepMs` picks a fresh one for every frame.
- **Running:** a `tool.call` hook matched on `Bash` counts the main loop's running commands around `await next(e)`.
- **Subagents:** the `turn.start` and `turn.complete` hooks keep the ids of the loops with a turn running (`agentId` set) in `workingAgents`, so several at once keep the chick until the last ends. `hatchedAgents` remembers every id that has had a turn, and a new one calls `hatch`, which shows the hatch from frame 0 and sets `isHatchingNow` for `chickStepCount('small', 'hatching') * HATCH_MS`. Since the chick is a layer, nothing the bird does can hide the hatch. `scheduleSleep` is held while `workingAgents` is not empty. While it isn't, `checkAgents` reads `$.agent.list()` every `AGENT_CHECK_MS` (30 s) and drops an id whose agent shows as `idle`, `completed`, `failed` or `killed`, or that has left the list after being in it (`listedAgents`). Ids never listed, such as workflow agents, wait for their turn end; a failing list call changes nothing. Workflow agents and the engine's own forks (compaction, memory) carry an `agentId` too, so they hatch a chick as well.
- **Asking:** a `tool.call` hook matched on `AskUserQuestion` counts open questions around `await next(e)`, from any loop, since the dialog is the call. That makes `asking` the shown pose, so the frame loop runs at its timing. A `ui.render` hook on the `AskUserQuestion` component draws the asking bird's rows, with the chick layer when a subagent works, then the engine's own dialog (`await next(e)`), in one column. The engine requires its node exactly once, with nothing below it, and allows up to 12 rows of the mod's own (the bird takes 8).
- **Why only questions:** Claude Code hides the band above the prompt while any dialog is open, which we checked live with a question. The permission dialog is drawn by the engine alone (a mod can only add one line of text under it). Plan approval and MCP input requests have no place a mod can draw. And here `classic.PermissionRequest` never reaches the mod, because the `cc-plugin-sec-default` plugin runs first and passes the event on past it.
- **Interrupted and asleep:** `turn.complete` with reason `aborted` startles the bird for `INTERRUPTED_MS`. A `SLEEP_AFTER_MS` timer restarts on every keystroke, prompt and turn end, and is held while a turn runs; activity while asleep wakes the bird with a `WAKE_MS` startle.
- **Checks:** `claude plugin validate ~/.claude/mods/blue-tit`, `claude plugin test ~/.claude/mods/blue-tit` (21 tests, using a mock clock for the blink, the chick's own blink, the hatch beside the hopping bird, the chick beside the flying bird and above the question dialog, the agent list safety net, listening, flying, talking, hopping, asking, startle and sleep timers) and a type check with `tsc -p ~/.claude/mods/blue-tit --noEmit`. TypeScript isn't installed in the mod folder, and `npx tsc` there fetches an unrelated package, so use a `tsc` from a project that has it (for example `~/Documents/jeancaisse/node_modules/.bin/tsc`).

## How we got here

1. **Replacing Clawd on the welcome screen** was the first ask. Findings:
   - **No official way to change the shape:** the mascot is hard-coded in the Claude Code binary, and no setting, theme or mod hook can replace it.
   - **Colors only:** a custom theme can recolor it through `clawd_body` and `clawd_background`. That's where `~/.claude/themes/blue-tit.json` comes from.
   - **Patching tool:** people who swap it patch the program. The usual tool is `tweakcc`, whose `adhoc-patch --script` runs a JavaScript patch over Claude Code's code. Its built-in options can only hide Clawd.
   - **The attempt:** we wrote `welcome-patch.js`, which draws the small bird in place of Clawd, and dry-ran it successfully on the extracted code.
   - **Blocked:** Claude Code's auto-mode safety check refused to let the session modify Claude Code itself, so the backup and the patch were run by hand. The patch process was killed with SIGKILL (exit 137). The likely cause is Jamf Protect, the company security agent; memory was plentiful.
   - **Result:** the program was never changed, and the backup was deleted. Patching would need IT's OK, and would have to be redone after every Claude Code update.
2. **The bird itself:**
   - **Design:** the first drafts were hand-drawn. An HTML comparison page showed five alternatives.
   - **Cross-stitch:** we switched to your cross-stitch pattern, read stitch by stitch from the image (stitch pitch 17.4 px, colors matched to a palette), then flipped to face right.
   - **Size:** shrunk from 26×12 to a medium 20×8 (now `classic`), then repacked with sextants into 14×6 (now `small`), keeping the classic look.
3. **Where it lives:**
   - **Above the prompt:** first shown only until the first message, then always.
   - **In the chat:** we moved it there: `/blue-tit` drew it as that command's output row, a bird was posted at session start, and one opened each reply.
   - **Back above the prompt:** you chose that. Posting in the chat had problems: the row text carries a `blue-tit:` prefix, and `isFirstOfReply` is true after every tool call.
4. **Everywhere:** the mod was copied to `~/.claude/mods/blue-tit` and loaded through `CLAUDE_CODE_PLUGIN_DIRS`.
5. **Animation:**
   - blinking at idle, then the listening pose
   - blinking made the default for every state
   - the art moved into `art.ts`, with a preview page built from it
   - typing: the look-down pose replaced by stepping feet, tried on the preview page first
   - thinking: a level flying bird flapping its wing, redrawn from your sketches (wing up, far wing, tail, belly, throat), then wired to the turn
   - the eye: a navy line over a 1-row black eye, the only pixels that blink; the drawing widened to 30 pixels for a longer flying tail
   - writing a reply: the beak opening and closing, wired to the streamed answer text
   - the drawing grown twice by 3 rows on top (and 3 pixels on the right) for the red burst; every existing frame moved down by whole cells, so none changed
   - interrupted (red burst), asleep (lying down with `z z Z`) and running a command (hop) drawn on the preview page, then wired in together, with one `pose` value and a fixed priority order
   - the song and the command hint beside the bird removed, so the band shows the bird alone
   - needs you (pose `asking`, spread wing and `!`) drawn on the preview page, the wing redrawn from your sketch, then wired to permission prompts, questions, plan approval and MCP requests; once the band turned out to be hidden during dialogs, moved above the question dialog, its only spot a mod can draw in
   - subagents (pose `hatching`, a chick hatching from an egg in front of the bird) drawn on the preview page, the first pose wider than the others, then wired to subagent turns
   - the asking `!` replaced by a `?`
   - subagent working (pose `chick`, the idle bird with a standing hatchling) drawn on the preview page from your sketch, then wired: the hatch plays once per new subagent, then the chick stands by until the last one ends
   - the chick made a layer of its own (`CHICK_STEPS`), so the bird keeps flying, talking, hopping, asking or sleeping while the chick hatches or stands by, the question dialog included
   - the flying bird moved up two cells (6 pixels), wing positions included, its raised wing now reaching the top row, and the hatched chick's cap filled in so every cell fits in two colors

## Ideas for more states

The mod can see these, so each could get its own animation:

| State | Signal | Suggested animation |
| --- | --- | --- |
| Idle ✅ | no turn running | base pose, blinks every 1–6 s like every state |
| Typing ✅ | `prompt.edit` | lifts its feet in turn |
| Sleeping ✅ | no typing and no turn for 5 min | lies down, eyes closed, `z z Z`, wakes with the red burst |
| Thinking ✅ | `turn.start` to `turn.complete`, main loop | flies level, flapping its wing |
| Writing a reply ✅ | `turn.step` text chunks | beak opens and closes |
| Reading / searching | `tool.call` Read (this build has no Grep or Glob tool; searches run through Bash, which already makes the bird hop) | leans forward, eye shifts |
| Editing files | `tool.call` Edit, Write | pecks |
| Running commands ✅ | `tool.call` Bash, main loop | hops in place |
| On the web | `tool.call` WebFetch, WebSearch | looks into the distance |
| A subagent starts ✅ | a subagent's first `turn.start` (`agentId` set); `tool.call` Agent resolves at once for background agents | chick layer `hatching`, played once beside whatever the bird is doing: an egg in front of the bird rocks a pixel left and right, cracks, pops its top and a yellow chick comes out, with a blue cap sloping to the back of its head and a navy stripe behind its eye, then chirps three times (14 frames, 200 ms each, 21 columns wide). Every cell fits in two colors since row 11 cols 36–37 of the chick's head turned blue. |
| Subagents working ✅ | a subagent's own `turn.start` to `turn.complete`, once its hatch has played | chick layer `standing`, beside whatever the bird is doing: a small round hatchling standing at the bird's feet, redrawn from your sketch: a blue cap, a navy stripe behind the eye, a yellow body, a dark tail and two little legs, still and blinking on its own timer. Every cell fits in two colors. |
| Asking you a question ✅ | `tool.call` and `ui.render` on `AskUserQuestion` | drawn above the question dialog: a yellow `?` in front of the head, the wing spread level to the left twice, then folded for 5 frames (120 ms each) |
| Turn finished | `turn.complete` reason `answer` | happy hop for ~2 s |
| Interrupted ✅ | `turn.complete` reason `aborted` | red burst blinking for 2.5 s |
| Error | `turn.complete` reason `error` | ruffled for ~2 s |

**Constraints to remember:**
- **Redraw rate:** the band redraws at most about 10 times a second, so 3–5 fps is the sweet spot.
- **No `Raster`:** `Raster` + `$.ui.blit` can't draw sextants, which sit outside Unicode's Basic Multilingual Plane.
- **Two colors per cell:** every new small frame must keep each 2×3 cell at two colors or fewer, and an empty pixel counts as one of them. Moving pixels in steps of 2 horizontally or 3 vertically keeps that alignment.
- **Ways around it:** swap a color for a near twin where three meet (the eye draws the line above it black, not navy), or change a neighbor in the same cell. The mod API's `Image` element would draw real pixels with no limit, but only in kitty, Ghostty and iTerm2 3.5+ (fullscreen rendering); other terminals show its fallback text.

## Turning it off

- **For now:** run `/blue-tit` to hide it.
- **For good:** remove the `CLAUDE_CODE_PLUGIN_DIRS` line from `~/.claude/settings.json`, then delete `~/.claude/mods/blue-tit/` if you like.
