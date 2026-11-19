# Bird friend for Claude Code

A pixel-art blue tit that lives above the Claude Code prompt and reacts to what's happening in the session.

- **Idle:** it perches and blinks.
- **You type:** it steps from foot to foot.
- **Claude thinks:** it flies, flapping its wing.
- **Claude writes:** it talks, opening and closing its beak.
- **Claude runs a command:** it hops.
- **Claude asks you a question:** it sits above the question with a `?`, flapping its wing.
- **A subagent starts:** an egg hatches beside it, then the chick stands by until the subagents are done.
- **You interrupt Claude:** a red burst flashes over its head.
- **Nothing happens for 5 minutes:** it falls asleep, `z z Z`.

## Requirements

- A Claude Code build that supports mods (hooks modules). A build without them won't load the bird.
- A terminal font with Unicode 13 sextant characters (`🬀`…`🬻`) for the default style. Without them you'll see boxes; `/blue-tit classic` uses plain half-blocks instead.

## Install

1. Clone this repository where Claude Code can load it:

   ```sh
   git clone https://github.com/AntoineAndo/bird-friend-claude-code.git ~/.claude/mods/blue-tit
   ```

2. Tell Claude Code to load it by adding this to the `env` block of `~/.claude/settings.json`:

   ```json
   "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/.claude/mods/blue-tit" }
   ```

   If `CLAUDE_CODE_PLUGIN_DIRS` is already set, add this folder to it with a `:` separator.

3. Start a new Claude Code session. The bird appears above the prompt.

## Update

```sh
cd ~/.claude/mods/blue-tit && git pull
```

A running session reloads the mod on its own.

## Commands

| Command | Effect |
| --- | --- |
| `/blue-tit` | Hide the bird, or bring it back |
| `/blue-tit small` | Default style, drawn with sextant characters |
| `/blue-tit classic` | Larger style, drawn with half-block characters |

`ctrl+x ctrl+a` collapses the band above the prompt too.

## Uninstall

Remove the `CLAUDE_CODE_PLUGIN_DIRS` entry from `~/.claude/settings.json`, then delete `~/.claude/mods/blue-tit`.

## Working on it

The drawings live in `hooks/art.ts` and the behavior in `hooks/register.tsx`. Run `node preview/build.mjs preview.html` to rebuild `preview.html`, a page showing every animation with the terminal's own colors and timing. Run `claude plugin test .` for the tests. `SUMMARY.md` has the full story: how each state is wired, the constraints of drawing in a terminal, and how the bird came to be.
