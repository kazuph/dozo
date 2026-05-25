#!/usr/bin/env bash
set -u

usage() {
  cat <<'USAGE'
Usage:
  watch-exit-notify.sh [options] -- <command...>

Options:
  --label TEXT        Short task label.
  --message TEXT      Custom notification prefix.
  --target TARGET     auto, tmux, or herdr. Default: auto.
  --pane PANE_ID      Override target pane id.
  --sleep SECONDS     Delay before sending Enter. Default: 0.2.
  --include-output    Include all stdout/stderr output in the notification.
  --tail-lines N      Include the last N output lines in the notification.
  --log-file PATH     Capture command output to PATH for tail notification.
  --dry-run           Print notification instead of sending it.
  --help              Show this help.
USAGE
}

label="task"
message=""
target="auto"
pane=""
enter_sleep="0.2"
include_output=0
tail_lines=0
log_file=""
output_log=""
dry_run=0

find_bin() {
  local name="$1"
  if builtin command -v "$name" >/dev/null 2>&1; then
    builtin command -v "$name"
    return 0
  fi
  local candidate
  for candidate in "$HOME/.local/bin/$name" "/opt/homebrew/bin/$name" "/usr/local/bin/$name" "/usr/bin/$name"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --label)
      label="${2:-}"
      shift 2
      ;;
    --message)
      message="${2:-}"
      shift 2
      ;;
    --target)
      target="${2:-}"
      shift 2
      ;;
    --pane)
      pane="${2:-}"
      shift 2
      ;;
    --sleep)
      enter_sleep="${2:-}"
      shift 2
      ;;
    --include-output)
      include_output=1
      shift
      ;;
    --tail-lines)
      tail_lines="${2:-}"
      shift 2
      ;;
    --log-file)
      log_file="${2:-}"
      shift 2
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ $# -eq 0 ]]; then
  echo "No command provided." >&2
  usage >&2
  exit 2
fi

case "$target" in
  auto|tmux|herdr) ;;
  *)
    echo "Unsupported --target: $target" >&2
    exit 2
    ;;
esac

case "$tail_lines" in
  ''|*[!0-9]*)
    echo "Invalid --tail-lines: $tail_lines" >&2
    exit 2
    ;;
esac

if [[ -n "$log_file" ]]; then
  output_log="$log_file"
  : > "$output_log"
elif [[ "$include_output" -eq 1 || "$tail_lines" -gt 0 ]]; then
  temp_dir="${TMPDIR:-/tmp}"
  output_log="$(mktemp "${temp_dir%/}/exit-notifier.XXXXXX")"
fi

start_epoch="$(date +%s)"
notified=0
command_status=0
child_pid=""

resolve_target() {
  if [[ "$target" == "tmux" || "$target" == "auto" ]]; then
    if [[ -n "${pane:-}" && "$target" == "tmux" ]]; then
      printf 'tmux\t%s\n' "$pane"
      return 0
    fi
    if [[ -n "${TMUX_PANE:-}" ]]; then
      local tmux_bin
      if tmux_bin="$(find_bin tmux)"; then
        if "$tmux_bin" display-message -p -t "$TMUX_PANE" '#{pane_id}' >/dev/null 2>&1; then
          printf 'tmux\t%s\n' "$TMUX_PANE"
          return 0
        fi
      fi
    fi
  fi

  if [[ "$target" == "herdr" || "$target" == "auto" ]]; then
    if [[ -n "${pane:-}" ]]; then
      printf 'herdr\t%s\n' "$pane"
      return 0
    fi
    if [[ -n "${HERDR_PANE_ID:-}" ]]; then
      local herdr_bin
      if herdr_bin="$(find_bin herdr)"; then
        local current_pane
        if current_pane="$("$herdr_bin" pane current 2>/dev/null)"; then
          printf 'herdr\t%s\n' "$current_pane"
          return 0
        fi
        if "$herdr_bin" pane get "$HERDR_PANE_ID" >/dev/null 2>&1; then
          printf 'herdr\t%s\n' "$HERDR_PANE_ID"
          return 0
        fi
      fi
    fi
  fi

  return 1
}

send_notification() {
  local status="$1"
  local signal_name="${2:-}"

  if [[ "$notified" -eq 1 ]]; then
    return 0
  fi
  notified=1

  local end_epoch elapsed outcome prefix line resolved kind target_pane
  end_epoch="$(date +%s)"
  elapsed="$((end_epoch - start_epoch))s"

  if [[ "$status" -eq 0 ]]; then
    outcome="success"
  else
    outcome="failed"
  fi

  if [[ -n "$signal_name" ]]; then
    outcome="interrupted:${signal_name}"
  fi

  prefix="$message"
  if [[ -z "$prefix" ]]; then
    prefix="# [exit-notifier]"
  fi

  line="${prefix} ${label}: ${outcome} exit=${status} elapsed=${elapsed}"
  if [[ -n "${output_log:-}" && -s "$output_log" ]]; then
    local output_text output_heading
    if [[ "$include_output" -eq 1 ]]; then
      output_heading="# [exit-notifier output] all stdout/stderr log=${output_log}"
      output_text="$(sed 's/^/# | /' "$output_log")"
    elif [[ "$tail_lines" -gt 0 ]]; then
      output_heading="# [exit-notifier output] last ${tail_lines} lines log=${output_log}"
      output_text="$(tail -n "$tail_lines" "$output_log" 2>/dev/null | sed 's/^/# | /')"
    else
      output_text=""
    fi
    if [[ -n "$output_text" ]]; then
      line="${line}"$'\n'"${output_heading}"$'\n'"${output_text}"
    fi
  fi

  if ! resolved="$(resolve_target)"; then
    echo "$line (notification skipped: not inside tmux/herdr)" >&2
    return 0
  fi

  kind="${resolved%%$'\t'*}"
  target_pane="${resolved#*$'\t'}"

  if [[ "$dry_run" -eq 1 ]]; then
    echo "DRY-RUN ${kind} pane=${target_pane}: ${line}"
    return 0
  fi

  case "$kind" in
    tmux)
      "$(find_bin tmux)" send-keys -t "$target_pane" "$line"
      sleep "$enter_sleep"
      "$(find_bin tmux)" send-keys -t "$target_pane" Enter
      ;;
    herdr)
      "$(find_bin herdr)" pane send-text "$target_pane" "$line"
      sleep "$enter_sleep"
      "$(find_bin herdr)" pane send-keys "$target_pane" Enter
      ;;
  esac
}

on_exit() {
  local status="$?"
  send_notification "$status"
  exit "$status"
}

on_signal() {
  local sig="$1"
  local status="$2"
  if [[ -n "${child_pid:-}" ]] && kill -0 "$child_pid" >/dev/null 2>&1; then
    kill "-$sig" "$child_pid" >/dev/null 2>&1 || true
  fi
  send_notification "$status" "$sig"
  trap - EXIT
  if [[ -n "${child_pid:-}" ]]; then
    wait "$child_pid" >/dev/null 2>&1 || true
  fi
  exit "$status"
}

trap on_exit EXIT
trap 'on_signal INT 130' INT
trap 'on_signal TERM 143' TERM
trap 'on_signal HUP 129' HUP

set +u
if [[ -n "${output_log:-}" ]]; then
  tee_bin="$(find_bin tee)"
  "$@" > >("$tee_bin" -a "$output_log") 2>&1 &
else
  "$@" &
fi
child_pid="$!"
set -u
wait "$child_pid"
command_status="$?"
child_pid=""
exit "$command_status"
