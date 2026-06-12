#!/usr/bin/env bash
# PostToolUse hook (matcher: Write|Edit)
# テストファイル書き込み後にファイル内容をスキャンしてモックパターンを検出・警告

INPUT=$(cat)

# jqの場所を特定
JQ=/usr/bin/jq
if [ ! -x "$JQ" ]; then
  JQ=/opt/homebrew/bin/jq
fi
if [ ! -x "$JQ" ]; then
  exit 0
fi

FILE_PATH=$(printf '%s' "$INPUT" | "$JQ" -r '.tool_input.file_path // empty' 2>/dev/null || true)

# FILE_PATHが取れなければスキップ
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# テストファイルでなければスキップ
if ! printf '%s' "$FILE_PATH" | grep -qE '\.(test|spec|e2e)\.(ts|tsx|js|jsx)$|__tests__/'; then
  exit 0
fi

# ファイルが存在しない場合はスキップ
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# モックパターン定義
MOCK_PATTERNS='jest\.fn|jest\.mock|jest\.spyOn|vi\.fn|vi\.mock|vi\.spyOn|sinon\.|\.stub\(|createMock|mockReturnValue|mockResolvedValue|mockImplementation|mockRejectedValue|nock\(|setupServer|fake[A-Z]'

# ファイル内容をスキャンしてモックパターン検出
if grep -qE "$MOCK_PATTERNS" "$FILE_PATH" 2>/dev/null; then
  DETECTED=$(grep -oE "$MOCK_PATTERNS" "$FILE_PATH" | sort -u | head -5 | tr '\n' ', ' | sed 's/,$//')
  LINE_EXAMPLES=$(grep -nE "$MOCK_PATTERNS" "$FILE_PATH" | head -3 | sed 's/"/\\"/g' | tr '\n' ' | ' | sed 's/ | $//')
  BASENAME=$(basename "$FILE_PATH")

  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "[dozo-plugin] テストファイル ${BASENAME} にモックパターンを検出: ${DETECTED}\n\n該当箇所: ${LINE_EXAMPLES}\n\nこのテストはレビューで却下されます。モック/スタブを削除し、実サーバー + Playwright に書き直してください。"
  }
}
EOF
  exit 0
fi

exit 0
