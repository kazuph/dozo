#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash)
# "git wt list" の誤用を検出してブロックする
# git wt list は "list" というworktreeを作成してしまうため

INPUT=$(cat)

COMMAND=$(printf '%s' "$INPUT" | /usr/bin/jq -r '.tool_input.command // empty' 2>/dev/null || true)

# jqが使えない場合はhomebrew版を試す
if [ -z "$COMMAND" ]; then
  COMMAND=$(printf '%s' "$INPUT" | /opt/homebrew/bin/jq -r '.tool_input.command // empty' 2>/dev/null || true)
fi

# COMMANDが取れなければスキップ
if [ -z "$COMMAND" ]; then
  exit 0
fi

# "git wt list" または "git wt -l" パターンを検出
if printf '%s' "$COMMAND" | grep -qE 'git\s+wt\s+(list|-l)\b'; then
  cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "[dozo-plugin] \"git wt list\" は間違いです。\"list\" という名前のworktreeが作成されてしまいます。\n\nworktree一覧を表示するには:\n  ✅ git wt（引数なし）\n  ✅ git worktree list\n\n❌ git wt list（\"list\" worktreeが作られる）\n❌ git wt -l"
  }
}
EOF
  exit 0
fi

exit 0
