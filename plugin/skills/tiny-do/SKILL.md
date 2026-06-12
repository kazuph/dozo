---
name: tiny-do
description: Lightweight task start - requirements deep-dive, codebase exploration, git wt worktree, t-wada TDD implementation
argument-hint: <task description or spec>
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, TodoWrite, Task, AskUserQuestion
---

# /dozo-plugin:tiny-do

<command-name>tiny-do</command-name>

小さなタスクをサクッと始める軽量タスク開始コマンド。
要件深掘り → コードベース探索 → worktree作成 → TDD実装 → `/dozo-plugin:tiny-done` で完了。

**ALL checkpoints must be passed before task completion. Do NOT split into separate PRs, report partial progress, or defer remaining checkpoints to "next time". This is a single continuous flow that ends with `/dozo-plugin:tiny-done`.**

## doとの違い

| | do | tiny-do |
|---|---|---|
| 要件深掘り | 3ラウンドインタビュー | 3ラウンドインタビュー（同じ） |
| コードベース探索 | 2-3 explorer agents | 2-3 explorer agents（同じ） |
| Architecture提案 | 1案おすすめ + Codex相談 + Review Agent助言 | 1案おすすめ + Review Agent助言 |
| worktree | git wtで作る | git wtで作る |
| REPORT.md | 作る | **作らない** |
| TDD | サブエージェント並列 | サブエージェント並列（同じ） |
| 完了 | → `/dozo-plugin:done`（フルレビュー） | → `/dozo-plugin:tiny-done`（スクショ確認） |

**本質的な違い: Codex・REPORT.md・npx dozoを使わない。レビューエージェントは助言モードでプランニング時のみ使用。レビューの厚みが軽い。**

## Arguments

$ARGUMENTS = やってほしいこと、仕様の説明

---

## ☑ 0. スコープゲート（tiny適性チェック）

**tiny-doは小さなタスク専用。以下に該当する場合はフルの `/dozo-plugin:do` を使うべき。**

$ARGUMENTS の内容を分析し、以下のいずれかに該当する場合は**即座にユーザーに通知**する:

| 判定基準 | 例 |
|---------|-----|
| 変更ファイルが5つ以上になりそう | 新機能追加、大規模リファクタ |
| 複数のコンポーネント/レイヤーにまたがる | フロント+バックエンド+DB |
| 新しいアーキテクチャパターンの導入 | 状態管理の刷新、認証基盤の追加 |
| 要件が曖昧で深いインタビューが必要 | 「○○を改善して」のような抽象的な依頼 |
| Codexレビューやレビューエージェントが必要なリスク | セキュリティ変更、決済系、データ移行 |

**該当する場合のAskUserQuestion:**

```
Question: "This task seems too large for tiny-do. The scope includes [specific reason]. Would you like to use /do instead for full review support?"
Header: "Scope Check"
Options:
  1. "Use /do (Recommended)" - Full review with Codex, review agents, REPORT.md, npx dozo
  2. "Continue with tiny-do" - I understand the scope is small enough
  3. "Let me narrow the scope" - I'll reduce what I'm asking for
```

**ユーザーが「Continue with tiny-do」を選んだ場合のみ続行。**
**ユーザーが「Use /do」を選んだ場合、`/dozo-plugin:do` にリダイレクトする。**

---

## ☑ 1. 要件深掘り（AskUserQuestion）

**ユーザーの要求を勝手に解釈しない。doと同じ深さで確認する。**

AskUserQuestionで以下を確認:

**Round 1: User Story & Scope**
- What problem does this solve?
- Who is the target user?
- What is the expected outcome?
- What is NOT in scope?

**Round 2: Functional Requirements (based on Round 1)**
- What are the specific actions users will take?
- What data inputs/outputs are needed?
- What are the edge cases?
- What validation rules apply?

**Round 3: Technical Constraints (based on Round 1-2)**
- Are there performance requirements?
- Are there existing patterns to follow?
- What dependencies are involved?
- Are there security considerations?

曖昧さが解消されたら次に進む。

---

## ☑ 2. コードベース探索

**実装前に既存コードベースを深く理解する。**

Launch 2-3 code-explorer agents in parallel, each targeting a different aspect:

```
Agent 1: "Find features similar to [requested feature] and trace through their implementation comprehensively. Return a list of 5-10 key files."
Agent 2: "Map the architecture and abstractions for [feature area], tracing through the code comprehensively. Return a list of 5-10 key files."
Agent 3: "Identify UI patterns, testing approaches, or extension points relevant to [feature]. Return a list of 5-10 key files."
```

**After agents return:**
1. Read ALL key files identified by agents to build deep understanding
2. Summarize patterns, conventions, and architectural decisions found
3. Use these findings to inform the implementation approach

---

## ☑ 3. Architecture提案（1案おすすめ）

**コードベース探索の結果を元に、最適な実装アプローチを1案提案する。**

提案に含める内容:
- 選択した手法とその理由
- 変更対象のファイル一覧
- トレードオフ（メリット/デメリット）
- 実装の順序

**AskUserQuestionでユーザーに確認:**

```
Question: "Based on codebase analysis, here is the recommended approach:"
Header: "Architecture"
Options:
  1. "[Approach] - [Summary] (Recommended)" - [Rationale]. Trade-off: [X]
  2. "Let me explain more" - Need more context before deciding
  3. "I have a different idea" - Want to suggest alternative
```

**Review Agent Advisory (設計助言):**

Architecture提案をユーザーに見せる前に、Review Agentから助言をもらう。
該当するものだけ並列で起動:

```
# Code & Security 助言（常に）
Agent(subagent_type="dozo-plugin:review-code-security", prompt="以下の設計案に助言してください：\n[設計案の要約]\n[変更ファイル一覧]")

# E2E 助言（テストに影響する変更の場合）
Agent(subagent_type="dozo-plugin:review-e2e", prompt="以下の設計案にE2E観点で助言してください：\n[設計案の要約]")

# UI/UX 助言（UI変更がある場合のみ）
Agent(subagent_type="dozo-plugin:review-ui-ux", prompt="以下のUI設計案に助言してください：\n[設計案の要約]")
```

Critical/High指摘があれば設計案を修正してからユーザーに提示する。

**ユーザー確認後に実装に進む。**

---

## ☑ 4. Worktree作成

```bash
# git-wtが必要
git wt --version || echo "ERROR: git-wt required. Install: brew install k1LoW/tap/git-wt"

# worktree作成
git wt <branch-name>

# 移動
cd .worktree/<branch-name>
```

### ブランチ命名規則

| Type | Branch Name | Example |
|------|-----------|---------|
| New feature | `feature/<name>` | `feature/login-button` |
| Bug fix | `fix/<name>` | `fix/validation-error` |
| Refactoring | `refactor/<name>` | `refactor/api-client` |

---

## ☑ 5. プロジェクトタイプ検出

```bash
PROJECT_TYPE="unknown"
if [ -f package.json ] && grep -qE '"(react|vue|svelte|next|nuxt|@angular/core|solid-js|astro)"' package.json 2>/dev/null; then
  PROJECT_TYPE="web"
elif [ -f Podfile ] || [ -f pubspec.yaml ] || ([ -f app.json ] && grep -q '"expo"' app.json 2>/dev/null); then
  PROJECT_TYPE="mobile"
elif [ -f go.mod ] || [ -f Cargo.toml ] || [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  PROJECT_TYPE="backend"
elif [ -f package.json ] && grep -qE '"(express|fastify|koa|hapi|@nestjs/core|hono)"' package.json 2>/dev/null; then
  PROJECT_TYPE="backend"
else
  PROJECT_TYPE="web"
fi
echo "Project type: $PROJECT_TYPE"
```

---

## ☑ 6. t-wada TDD実装

**テスト駆動開発のサイクルを厳守する。実装してからテストを書くのは禁止。**

### TDDサイクル

```
RED:    期待する動作をテストに書く → 実行 → FAIL（赤）を確認
GREEN:  最小限の実装でテストをPASS（緑）にする
Refactor: テストが通ったままリファクタリング
```

### テスト種別（プロジェクトタイプ別）

| Project Type | Test Framework | Test Location |
|-------------|---------------|---------------|
| web | Playwright (E2E) | `e2e/features/<feature>/` |
| backend | vitest/jest/pytest/go test/cargo test | `tests/` or framework default |
| mobile | Maestro E2E flow | `.maestro/` |

### 実装はサブエージェントで

**コンテキスト保護のため、実装はTask toolでサブエージェントに委譲する。**

サブエージェントには以下を明示的に指示する:
- t-wada TDDサイクル厳守（テスト先行）
- Mock / Stub 禁止（DI経由のエミュレータのみ許可）
- curl / 手動APIコール禁止（テストフレームワークを使う）

### 絶対禁止

- Mock / Stub（DI経由のローカルエミュレータのみ許可）
- curl / 手動APIコール（テストフレームワークを使う）
- 実装後テスト（テストを先に書く）
- 証拠なし完了報告

---

## ☑ 7. Execute /dozo-plugin:tiny-done (MANDATORY)

**実装完了後、必ず `/dozo-plugin:tiny-done` を実行してスクショ・動画確認に進む。**

```
Implementation done
  ↓
Execute /dozo-plugin:tiny-done
  ↓
tiny-done handles: screenshot/video capture → open → user approval
  ↓
Task complete
```

**Do NOT:**
- Report "implementation complete" without executing /tiny-done
- Defer /tiny-done to "next time" or "another session"
- Skip screenshot/video verification

---

## セッション復帰

中断後にセッションを再開した場合:

```bash
# worktreeの確認（引数なしで一覧表示）
git wt
# ⚠️ `git wt list` は禁止！（"list" というworktreeが作成されてしまう）
# ✅ `git wt`（引数なし）または `git worktree list` を使う

# worktreeに移動
cd .worktree/<branch-name>
# TodoListで進捗確認 → 未完了タスクから再開
```

---

## 禁止事項

- REPORT.mdを作成する
- artifact-proof skillを使う
- npx dozoを起動する
- codexスキルを使う
- テストを書かずに実装する
- 要件深掘りをスキップする
- コードベース探索をスキップする
- スクショ確認をスキップする（/tiny-done必須）
