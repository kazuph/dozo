---
name: exit-notifier
description: Wrap long-running shell tasks so their exit and captured output are reported back into the current tmux or Herdr pane. Use when the user asks for background job completion notifications, interrupted job notices, or a tmux/herdr task watcher that sends results back to the active agent pane.
allowed-tools: Bash, Read
---

# Exit Notifier

Notify the current tmux or Herdr pane when a long-running command exits.

This skill exists for cases where a background command can finish while the agent is no longer actively watching it. It does not rely on app-level background notifications. Instead, it sends a completion message into the terminal pane that launched the watcher.

## When To Use

Use this skill when:

- A task is launched in the background and the user expects a completion notice.
- A command may fail, be interrupted, or exit while the agent is working elsewhere.
- The command output matters after exit, such as `npx reviw` review summaries.
- The current shell is inside tmux or Herdr.

Do not use this skill when the shell is not inside tmux or Herdr; the helper will refuse to notify unless a supported pane target is available.

## Helper

Use the bundled helper:

```bash
~/.claude/skills/exit-notifier/scripts/watch-exit-notify.sh --include-output --label "short task name" -- <command...>
```

The helper:

1. Runs the command.
2. Captures its exit code and elapsed time.
3. When `--include-output` is used, captures all stdout/stderr and sends it back in the notification.
4. For tmux: sends text, sleeps, then sends Enter.
5. For Herdr: sends text with `herdr pane send-text`, sleeps, then sends Enter with `herdr pane send-keys`.
6. Forwards INT/TERM/HUP to the wrapped command and reports the interruption.
7. Exits with the wrapped command's exit code.

## tmux Behavior

The helper targets `$TMUX_PANE` by default.

Equivalent primitive:

```bash
tmux send-keys -t "$TMUX_PANE" "# [exit-notifier] label: success exit=0 elapsed=12s"
sleep 0.2
tmux send-keys -t "$TMUX_PANE" Enter
```

The sleep before Enter is mandatory. Without it, Enter can arrive before the text is fully placed in the target prompt.

## Herdr Behavior

The helper targets `$HERDR_PANE_ID` by default. It never falls back to the focused pane.

When available, it uses `herdr pane current`, which validates the calling pane from `$HERDR_PANE_ID`. On older Herdr builds, it validates `$HERDR_PANE_ID` with `herdr pane get "$HERDR_PANE_ID"` and then uses that exact id.

Equivalent primitive:

```bash
herdr pane get "$HERDR_PANE_ID" >/dev/null
herdr pane send-text "$HERDR_PANE_ID" "# [exit-notifier] label: success exit=0 elapsed=12s"
sleep 0.2
herdr pane send-keys "$HERDR_PANE_ID" Enter
```

Herdr command reference verified:

- `herdr pane current` validates and prints `$HERDR_PANE_ID`; it fails instead of falling back to the focused pane
- `herdr pane get <pane_id>`
- `herdr pane send-text <pane_id> <text>`
- `herdr pane send-keys <pane_id> <key> [key ...]`
- `herdr pane list`
- `herdr pane read <pane_id> [--source visible|recent|recent-unwrapped] [--lines N]`

## Recommended Background Pattern

```bash
nohup ~/.claude/skills/exit-notifier/scripts/watch-exit-notify.sh \
  --include-output \
  --label "npx reviw REPORT.md" \
  -- npx reviw REPORT.md \
  > /tmp/reviw-background.log 2>&1 &
```

The terminal pane receives a completion line and captured output when the watched command exits.

## Options

```bash
watch-exit-notify.sh \
  [--label TEXT] \
  [--message TEXT] \
  [--target auto|tmux|herdr] \
  [--pane PANE_ID] \
  [--sleep SECONDS] \
  [--include-output] \
  [--tail-lines N] \
  [--log-file PATH] \
  [--dry-run] \
  -- <command...>
```

- `--label`: short task name included in the notification.
- `--message`: custom prefix; status, exit code, and elapsed time are appended.
- `--target`: defaults to `auto`, preferring tmux when `$TMUX_PANE` exists, then Herdr when `$HERDR_PANE_ID` exists.
- `--pane`: override detected target pane. Use only after checking the target pane; this intentionally bypasses the current-pane safety check.
- `--sleep`: delay before sending Enter. Default: `0.2`.
- `--include-output`: send all stdout/stderr captured before exit. Output lines are prefixed with `# | ` so a shell pane will not execute them.
- `--tail-lines`: send only the last N output lines.
- `--log-file`: write captured output to this file instead of a temporary log file.
- `--dry-run`: print the notification command instead of sending it.

## Verification

Check syntax:

```bash
bash -n ~/.claude/skills/exit-notifier/scripts/watch-exit-notify.sh
```

Dry-run with output capture:

```bash
~/.claude/skills/exit-notifier/scripts/watch-exit-notify.sh \
  --dry-run \
  --include-output \
  --label test \
  -- bash -lc 'echo stdout; echo stderr >&2; exit 3'
```

Herdr smoke test in a non-current scratch pane:

```bash
herdr pane list
~/.claude/skills/exit-notifier/scripts/watch-exit-notify.sh --target herdr --pane <scratch-pane-id> --label smoke -- true
herdr pane read <scratch-pane-id> --lines 20
```

tmux smoke test:

```bash
~/.claude/skills/exit-notifier/scripts/watch-exit-notify.sh --target tmux --pane "$TMUX_PANE" --label smoke -- true
```
