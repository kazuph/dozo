---
name: do
description: Task Start - worktree creation, planning, and review preparation in dozo
argument-hint: <task description>
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, TodoWrite, Task, AskUserQuestion
---

# Task Start Command

Receive requests for tasks to be done, set up the work environment, and create a plan.

**Role: You are the Project Manager (PM) interviewing the Product Owner (user).**

**ALL checkpoints must be passed before task completion. Do NOT split into separate PRs, report partial progress, or defer remaining checkpoints to "next time". This is a single continuous flow that ends with `/dozo-plugin:done`.**

## ☑ 1. Interactive Discovery (REQUIRED)

Before any implementation, conduct a structured interview with the user to fully understand requirements.

### 1-1. Development Approach Question

**Use AskUserQuestion tool** to ask about development approach:

```
Question: "How would you like to organize this work?"
Header: "Approach"
Options:
  1. "Use worktree (Recommended)" - Create isolated branch in separate directory using git wt. Clean separation, easy cleanup.
  2. "Work in current branch" - Make changes directly in current branch. Simpler for small changes.
  3. "Create new branch only" - Create branch but work in main directory. Middle ground.
```

### 1-1a. Tool Installation Check (If worktree selected)

**If user selects worktree approach, check required tools:**

```bash
# Check if git-wt is installed
git wt --version
# Check if direnv is installed
which direnv
# Check if dotenvx is installed
which dotenvx || npx @dotenvx/dotenvx --version
```

**If git-wt is not installed, display error and require installation:**

```
git-wt is required for worktree management. Please install it:

  brew install k1LoW/tap/git-wt
```

**Do NOT proceed with standard git worktree as fallback. git-wt is mandatory.**

**Recommended Tool Stack:**

| Tool | Purpose | Install |
|------|---------|---------|
| **git-wt** | Git worktree manager | `brew install k1LoW/tap/git-wt` |
| **direnv** | Auto-load environment variables per directory | `brew install direnv` |
| **dotenvx** | Encrypted .env file management | `npm install -g @dotenvx/dotenvx` |

**Why this stack:**
- **git-wt**: Manages worktrees with auto hooks (npm install etc). Uses project-local `.worktree/` directory.
- **direnv**: Parent directory `.envrc` is inherited by child directories, so worktrees in `.worktree/` inherit project root's `.envrc`.
- **dotenvx**: `.env` is encrypted and committed to git, decrypted only in memory at runtime
- **Combined**: `.envrc` with `DOTENV_PRIVATE_KEY` auto-decrypts `.env` in all worktrees (no file copying needed)

### 1-2. Specification Deep-Dive (PM Interview)

**As Project Manager, drill down into specifications with multiple rounds of questions.**

```
┌─────────────────────────────────────────────────────────────────┐
│  PM Interview Protocol (Iterative Questioning)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Round 1: User Story & Scope                                    │
│    - What problem does this solve?                              │
│    - Who is the target user?                                    │
│    - What is the expected outcome?                              │
│    - What is NOT in scope?                                      │
│                                                                 │
│  Round 2: Functional Requirements (based on Round 1)            │
│    - What are the specific actions users will take?             │
│    - What data inputs/outputs are needed?                       │
│    - What are the edge cases?                                   │
│    - What validation rules apply?                               │
│                                                                 │
│  Round 3: Technical Constraints (based on Round 1-2)            │
│    - Are there performance requirements?                        │
│    - Are there existing patterns to follow?                     │
│    - What dependencies are involved?                            │
│    - Are there security considerations?                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Use AskUserQuestion tool iteratively:**

1. First, ask 2-3 questions about user story and scope
2. Based on answers, formulate 2-3 follow-up questions about functional details
3. Based on answers, ask about technical constraints and preferences
4. Summarize understanding and confirm before proceeding

**Example question flow:**

```
Round 1 Example:
Q1: "What specific problem are you trying to solve?"
Q2: "Who will use this feature and in what context?"
Q3: "What does success look like for this feature?"

Round 2 Example (based on Round 1 answers):
Q4: "You mentioned X - what happens when Y?"
Q5: "Should the system handle Z case?"
Q6: "What error messages should users see?"

Round 3 Example (based on Round 1-2 answers):
Q7: "Should we follow the existing pattern in [file] or try something different?"
Q8: "Given the requirements, I see two approaches: A or B. Which do you prefer?"
```

### 1-2a. Codebase Exploration (REQUIRED before architecture design)

**Before designing architecture, deeply understand the existing codebase.**

Launch 2-3 code-explorer agents in parallel, each targeting a different aspect:

```
Agent 1: "Find features similar to [requested feature] and trace through their implementation comprehensively. Return a list of 5-10 key files."
Agent 2: "Map the architecture and abstractions for [feature area], tracing through the code comprehensively. Return a list of 5-10 key files."
Agent 3: "Identify UI patterns, testing approaches, or extension points relevant to [feature]. Return a list of 5-10 key files."
```

**After agents return:**
1. Read ALL key files identified by agents to build deep understanding
2. Summarize patterns, conventions, and architectural decisions found
3. Use these findings to inform the Architecture proposal (1-3)

**Why this matters:**
- Prevents reinventing patterns that already exist in the codebase
- Ensures new code integrates seamlessly with existing conventions
- Discovers reusable utilities and abstractions
- Architecture proposals are grounded in actual codebase reality

### 1-3. Architecture & Implementation Approach (1 Recommended + Codex Review)

**After understanding requirements AND codebase, design the best implementation approach and present it.**

**Design the recommended approach considering:**
- Maximum reuse of existing code and patterns found in codebase exploration
- Pragmatic balance of speed and quality
- Specific files to create/modify
- Trade-offs (pros/cons)

**Codex Review (if codex skill is available):**

Before presenting to user, consult Codex for a second opinion on the proposed approach:

```
Use codex skill to ask:
"Review this implementation plan for [feature]:
- Approach: [summary]
- Files to modify: [list]
- Trade-offs: [list]

Is this the right approach? Any risks or better alternatives?"
```

Incorporate Codex feedback into the final proposal.

**Review Agent Advisory (設計助言):**

After drafting the approach, consult Review Agents in advisory mode for proactive feedback.
Launch applicable agents in parallel with the Agent tool:

```
# Code & Security の観点で助言をもらう
Agent(subagent_type="dozo-plugin:review-code-security", prompt="以下の設計案に助言してください：\n[設計案の要約]\n[変更ファイル一覧]\n[トレードオフ]")

# E2E の観点で助言をもらう（テストに影響する変更の場合）
Agent(subagent_type="dozo-plugin:review-e2e", prompt="以下の設計案にE2E観点で助言してください：\n[設計案の要約]")

# UI/UX の観点で助言をもらう（UI変更がある場合のみ）
Agent(subagent_type="dozo-plugin:review-ui-ux", prompt="以下のUI設計案に助言してください：\n[設計案の要約]")
```

Incorporate Review Agent advisory feedback into the proposal.
If Critical/High issues are raised, revise the approach before presenting to user.

**Present to user with AskUserQuestion:**

```
Question: "Based on codebase analysis (and Codex review), here is the recommended approach:"
Header: "Architecture"
Options:
  1. "[Approach] - [Summary] (Recommended)" - [Rationale]. Trade-off: [X]
  2. "Let me explain more" - Need more context before deciding
  3. "I have a different idea" - Want to suggest alternative
```

**Only proceed to implementation after user confirms approach.**

### 1-4. Record Q&A in REPORT.md (REQUIRED)

**All questions asked and answers received MUST be recorded in REPORT.md.**

After completing the interview, add the following section to REPORT.md:

```markdown
## Requirements Discovery (Q&A Log)

### Development Approach
- **Q**: How would you like to organize this work?
- **A**: [User's answer]

### User Story & Scope
- **Q**: [Question 1]
- **A**: [Answer 1]

- **Q**: [Question 2]
- **A**: [Answer 2]

### Functional Requirements
- **Q**: [Question 3]
- **A**: [Answer 3]

### Architecture Decision
- **Q**: [Implementation approach question]
- **A**: [User's choice and reasoning]

### Key Decisions Summary
| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Development approach | worktree / current branch | [reason] |
| Architecture | [chosen approach] | [reason] |
| [Other key decision] | [choice] | [reason] |
```

**Why this matters:**
- Preserves context for future sessions (after compact)
- Documents requirements for review
- Enables traceability of decisions
- Helps when resuming work

### 1-5. Project Type Auto-Detection

**Automatically detect the project type to select appropriate implementation and verification strategies.**

Run the following detection script:

```bash
# --- Project Type Auto-Detection ---
PROJECT_TYPE="unknown"
HAS_WEB=false
HAS_BACKEND=false
HAS_MOBILE=false

# 1. Check package.json for web dependencies
if [ -f package.json ]; then
  if grep -qE '"(react|vue|svelte|next|nuxt|@angular/core|solid-js|astro)"' package.json 2>/dev/null; then
    HAS_WEB=true
  fi
  # 2. Check package.json for mobile dependencies
  if grep -qE '"(expo|react-native|@expo/cli)"' package.json 2>/dev/null; then
    HAS_MOBILE=true
  fi
  # 3. Check package.json for backend-only dependencies
  if grep -qE '"(express|fastify|koa|hapi|@nestjs/core|hono)"' package.json 2>/dev/null; then
    HAS_BACKEND=true
  fi
fi

# 4. Check for frontend source files
if find src/ -name '*.tsx' -o -name '*.vue' -o -name '*.svelte' 2>/dev/null | head -1 | grep -q .; then
  HAS_WEB=true
fi

# 5. Check for mobile project markers
if [ -f Podfile ] || ls *.xcodeproj 1>/dev/null 2>&1 || [ -f android/build.gradle ] || [ -f pubspec.yaml ]; then
  HAS_MOBILE=true
fi
if [ -f app.json ] && grep -q '"expo"' app.json 2>/dev/null; then
  HAS_MOBILE=true
fi

# 6. Check for backend project markers
if [ -f go.mod ] || [ -f Cargo.toml ]; then
  HAS_BACKEND=true
fi
if [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  if [ "$HAS_WEB" = false ]; then
    HAS_BACKEND=true
  fi
fi

# 7. Determine project type (priority: mobile > fullstack > web > backend)
if [ "$HAS_MOBILE" = true ]; then
  PROJECT_TYPE="mobile"
elif [ "$HAS_WEB" = true ] && [ "$HAS_BACKEND" = true ]; then
  PROJECT_TYPE="fullstack"
elif [ "$HAS_WEB" = true ]; then
  PROJECT_TYPE="web"
elif [ "$HAS_BACKEND" = true ]; then
  PROJECT_TYPE="backend"
fi

echo "Detected project type: $PROJECT_TYPE"
```

**If detection result is `unknown`:**

Use AskUserQuestion to ask the user:

```
Question: "Could not auto-detect the project type. What type of project is this?"
Header: "Project Type"
Options:
  1. "Web" - Frontend web application (React, Vue, Svelte, etc.)
  2. "Backend" - API server, CLI tool, or backend service
  3. "Mobile" - Mobile app (React Native, Expo, Flutter, native)
  4. "Fullstack" - Both frontend and backend in one repo
```

**Record the detected type in REPORT.md header:**

Add the following line to the REPORT.md header (after `Status:`):

```markdown
Project-Type: <web|backend|mobile|fullstack>
```

## Important: Subagents Required

**To prevent context exhaustion, the following tasks MUST be executed by subagents (Task tool):**

| Task | Reason | Subagent |
|------|------|-----------------|
| webapp-testing | Context explosion from screenshot Read | `subagent_type: "general-purpose"` |
| artifact-proof | Exhaustion from image/video processing | `subagent_type: "general-purpose"` |
| E2E test execution | Context consumption from long logs | `subagent_type: "general-purpose"` |

```
When webapp-testing is executed directly in the main thread:
   → Read screenshots → Context exhaustion → compact triggered
   → Forgets /done content → Reports "Implementation complete!"
   → Rejection → Infinite loop
```

**Correct approach:**
```
Launch subagent with Task tool
→ Execute webapp-testing within subagent
→ Subagent summarizes results and returns
→ Main thread context is preserved
```

## Arguments

$ARGUMENTS = Request text for what to do, specification explanation, etc.

## When Receiving Feedback from dozo (YAML format)

When `/do` is called with YAML-formatted feedback from dozo (after user submits review), follow this flow:

### Detecting dozo Feedback

If $ARGUMENTS contains YAML with `file:`, `mode:`, `comments:` fields, this is dozo feedback:

```yaml
file: REPORT.md
mode: view
summary: |
  Overall feedback from user
comments:
  - id: 1
    lines: "10-15"
    comment: "Fix this logic"
```

### Processing Flow

1. **Parse feedback and register in TodoList**
   - Each comment becomes a todo item
   - Summary becomes overall context

2. **Apply mandatory rules (previously checkbox items)**
   - **Delegate to sub-agents**: ALL implementation MUST be delegated to subagents via Task tool
   - **Update screenshots/videos**: ALL visual evidence MUST be updated after changes
   - **Require user approval**: FORBIDDEN to mark tasks complete without explicit user approval
   - **Probe requirements**: Before implementation, deeply clarify any ambiguous feedback using AskUserQuestion

3. **Implementation loop**
   ```
   For each feedback item:
     1. Clarify if needed (AskUserQuestion)
     2. Delegate implementation (Task tool with subagent)
     3. Verify with webapp-testing
     4. Collect evidence with artifact-proof
     5. Mark todo as completed (after user approval)
   ```

4. **Final verification**
   - Run /dozo-plugin:done to open report in dozo for user review
   - Get explicit user approval before completing

### Example

```
/do
file: .artifacts/auth/REPORT.md
mode: view
summary: |
  Overall looks good, but fix the login button position
comments:
  - id: 1
    lines: "45-50"
    comment: "Move button to the right side"
```

This triggers:
1. Register "Move login button to right side" as todo
2. Ask clarifying question if needed ("Should it align with the form or the header?")
3. Delegate fix to webapp-impl subagent
4. Update screenshots showing new position
5. Wait for user approval

## When Resuming a Task

**At session startup / after compact, check existing worktrees before creating new ones.**

```bash
# Check worktrees in progress (引数なしで一覧表示)
git wt
# ⚠️ `git wt list` は禁止！（"list" というworktreeが作成されてしまう）
# ✅ `git wt`（引数なし）または `git worktree list` を使う

# Move to worktree
cd .worktree/<branch-name>

# Check progress
cat .artifacts/<feature=branch_name>/REPORT.md
```

**Check TODOs in REPORT.md and resume work from incomplete items.**
**If user adds new requests during the session, ALWAYS add them to TodoList immediately.**

### Report Location

```
<worktree>/.artifacts/<feature=branch_name>/REPORT.md
```

- `<worktree>` = Directory created by git wt (e.g., `.worktree/feature-auth/`)
- `<feature=branch_name>` = part after removing prefix from branch name (e.g., `feature/auth` → `auth`)

### TodoList Management (CRITICAL)

When the user adds new requests/tasks during the session:
1. **IMMEDIATELY add them to TodoList** - do not delay
2. TodoList is the contract with the user - never skip this step
3. Update todo status in real-time as you work
4. Mark tasks complete ONLY after user approval

## ☑ 2. Work Environment Setup (For New Tasks)

### 2-1. Git Repository Verification

First, verify that the current project is a git repository.

```bash
# Execute at project root
git rev-parse --show-toplevel
```

Next, create a worktree for the task. Branch name is automatically generated appropriately from the request content.

### 2-2. worktree Naming Convention

| Type | Branch Name | Example |
|------|-----------|-----|
| New feature | `feature/<feature=branch_name>` | `feature/auth`, `feature/events` |
| Bug fix | `fix/<content>` | `fix/login-error`, `fix/validation` |
| Refactoring | `refactor/<target>` | `refactor/api-client` |
| Documentation | `docs/<target>` | `docs/readme` |

```bash
# Create worktree with git wt (required)
git wt <branch-name>

# git-wt automatically:
# - Creates worktree in .worktree/<branch-name>
# - Runs hooks (npm install, etc. if configured)

# Move to worktree
cd .worktree/<branch-name>
```

**git-wt Configuration (.gitconfig):**

> **Note:** git-wtは**プロジェクトローカルな.worktree/**に配置する設計です。

```bash
# 設定方法
git config --global wt.basedir ".worktree"
git config --global wt.copyignored true
git config --global --add wt.hook "npm install || pnpm install || yarn install || true"
```

**ディレクトリ構造:**
```
myproject/
├── .worktree/
│   ├── feature-auth/      ← git wt feature-auth で作成
│   └── fix-bug/           ← git wt fix-bug で作成
├── .envrc                 ← プロジェクトルートで環境変数設定（direnv）
└── src/
```

direnvは親ディレクトリの`.envrc`を継承するため、プロジェクトルートに環境変数を設定しておけば、`.worktree/`内のworktreeも同じ環境変数が自動適用されます。

### 2-3. .gitignore Configuration

**Important:** Exclude `.artifacts` and `.envrc` from commit targets.

```bash
# Add to project root .gitignore (only if not already present)
for pattern in ".artifacts" ".envrc"; do
  if ! grep -q "^\\$pattern\$" .gitignore 2>/dev/null; then
    echo "$pattern" >> .gitignore
  fi
done
```

**Reason:**
- `.artifacts/` - Evidence (screenshots/videos) excluded to prevent repository bloat
- `.envrc` - Contains `DOTENV_PRIVATE_KEY` for decryption

### 2-4. Environment Setup (direnv + dotenvx)

**Recommended: Set up encrypted environment variables**

```bash
# 1. Initialize dotenvx encryption (if .env exists and not yet encrypted)
dotenvx encrypt
# This generates .env.keys with DOTENV_PRIVATE_KEY

# 2. Create .envrc with the key from .env.keys, then delete .env.keys
cat > .envrc << 'EOF'
# Decrypt .env at runtime (file stays encrypted on disk)
export DOTENV_PRIVATE_KEY="<copy-key-from-.env.keys-then-delete-file>"
eval "$(dotenvx decrypt --stdout --format shell 2>/dev/null)" || dotenv_if_exists
EOF

# 3. Delete .env.keys (no longer needed - key is in .envrc)
rm .env.keys

# 4. Allow direnv
direnv allow
```

**How it works with git-wt worktrees:**

```
myproject/                    # Project root
├── .envrc                    # DOTENV_PRIVATE_KEY
├── .env                      # Encrypted (git commit OK)
└── .worktree/
    └── feature-auth/         # Worktree created by git wt
        └── .env              # ← Auto-decrypted via parent .envrc
```

- `.env` is always encrypted on disk, decrypted only in memory at runtime
- direnv automatically inherits `.envrc` from parent directories
- git-wt worktrees get environment variables without copying any files
- To add/modify env vars: use `dotenvx set KEY="value"` (auto re-encrypts)

**When you want to commit specific evidence:**

Even if included in `.gitignore`, you can explicitly add with `git add --force`:

```bash
# Force add specific files
git add --force .artifacts/<feature>/images/important-screenshot.png
git add --force .artifacts/<feature>/REPORT.md

# Use Git LFS for videos
git lfs track "*.mp4" "*.webm"
git add .gitattributes
git add --force .artifacts/<feature>/videos/demo.mp4
```

The recommended approach is to exclude by default and explicitly commit only what's needed.

## ☑ 3. Planning

### 3-1. Deliverables Directory Preparation

Create `.artifacts/<feature=branch_name>/` directory within the worktree.

**Directory Structure:**
```
<worktree>/                   # e.g., .worktree/feature-auth/
└── .artifacts/
    └── <feature=branch_name>/       # e.g., auth (from feature/auth)
        ├── REPORT.md         # Plan, progress, and evidence links
        ├── images/           # Screenshots
        └── videos/           # Video files
```

```bash
mkdir -p .artifacts/<feature=branch_name>/{images,videos}
```

### 3-2. Planning (REPORT.md)

Create `.artifacts/<feature=branch_name>/REPORT.md` and write the plan in the following format:

```markdown
# <Task Name>

Created: YYYY-MM-DD
Branch: <branch-name>
Status: In Progress

## Overview

<Summary of request content>

## Progress

| Date | Content | Status |
|------|------|------|
| YYYY-MM-DD | Planning | Completed |
| YYYY-MM-DD | API Implementation | In Progress |

## PLAN

### TODO

Each step MUST include "Purpose" and "Impact" (step listing without context is prohibited):

```
### Step 1: <Step Name>
**Purpose**: <What this step achieves>
**Impact**: <What improves / what problem this solves>

- [ ] Specific task...
```

Bad example (PROHIBITED) - no context on why:
```
- [ ] Add validation to the form
```

Good example - purpose and impact included:
```
### Step 1: Form Validation
**Purpose**: Prevent users from submitting incomplete data
**Impact**: Reduces support tickets from invalid submissions by catching errors at input time

- [ ] Add required field validation to email and name inputs
- [ ] Show inline error messages on blur
```

#### Mermaid Diagram Rules

**Development workflow visualization is unnecessary** - PLANのステップをmermaidで可視化する必要はない（箇条書きで十分）。
Mermaid diagrams should only be used when visual representation adds value that text cannot convey:
- **Data flow**: How data moves between APIs/components, before/after changes
- **Data structure before/after**: API response or DB schema changes
- **Architecture changes**: How component relationships change

#### Implementation Tasks

- [ ] <Specific task 1>
- [ ] <Specific task 2>
- [ ] <Specific task 3>
- [ ] Execute build and type check

#### Verification TODOs (select based on Project-Type)

**Web:**
- [ ] Start development server
- [ ] Verify operation with webapp-testing (Playwright screenshots)

**Backend:**
- [ ] Write integration tests (use project's test framework: jest/vitest/pytest/go test/cargo test)
- [ ] Run full test suite and collect coverage report
- [ ] Verify API endpoints respond correctly

**Mobile:**
- [ ] Write Maestro E2E flow for implemented feature
- [ ] Run Maestro flow and take screenshots on simulator/device
- [ ] Verify UI renders correctly on target screen sizes

**Fullstack (both Web + Backend):**
- [ ] Start both frontend dev server and backend API server
- [ ] Verify frontend with webapp-testing
- [ ] Run backend test suite and collect coverage

#### Common
- [ ] Collect evidence with artifact-proof
- [ ] Complete report with /done (review in dozo)

### Completion Criteria

- [ ] Implementation completed
- [ ] Build successful
- [ ] Operation verified
- [ ] Evidence (screenshots/videos) collected
- [ ] Reviewed in dozo

## Test Results

### Unit Tests
- `tests/unit/xxx.test.ts`: PASS/FAIL

### Integration Tests
- `tests/integration/xxx.test.ts`: PASS/FAIL

### E2E Tests
- `tests/e2e/xxx.spec.ts`: PASS/FAIL

## Technical Notes

<Add notes and observations during implementation>

## Evidence

<Add links to evidence collected with artifact-proof>
```

### 3-3. Reflection to TodoWrite

Reflect the above PLAN to the TodoWrite tool as well. This visualizes progress.

## ☑ 4. Implementation

### 4-1. t-wada TDD Cycle (MANDATORY)

**All implementation MUST follow the t-wada TDD cycle. Writing implementation before tests is prohibited.**

```
RED:    Write test expressing expected behavior -> Run -> Confirm FAIL (red)
GREEN:  Write minimum implementation to PASS (green)
Refactor: Refactor while keeping tests passing
```

**Subagents must be instructed to follow this cycle explicitly.** Include TDD instructions in every subagent prompt.

### 4-2. Parallel Implementation with Subagents

**After planning, implementation MUST be executed with subagents (Task tool).**

The main thread should focus on the director role and proceed with the following flow:

```
┌─────────────────────────────────────────────────────────────────┐
│  Main Thread (Director)                                         │
│                                                                 │
│  1. Planning completed                                          │
│  2. Classify tasks by dependencies                              │
│     ├─ Independent tasks → Launch subagents in parallel         │
│     └─ Dependent tasks → Launch after previous completion       │
│  3. Integrate results from each subagent                        │
│  4. Proceed to /dozo-plugin:done                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Example of Parallel Execution:**

```
# Launch 3 independent component implementations in parallel
Task(subagent_type="dozo-plugin:webapp-impl", prompt="Implement HeaderComponent...")
Task(subagent_type="dozo-plugin:webapp-impl", prompt="Implement SidebarComponent...")
Task(subagent_type="dozo-plugin:webapp-impl", prompt="Implement FooterComponent...")
```

**Subagent Selection Criteria:**

| Task Type | subagent_type | Project Types | Notes |
|-----------|---------------|---------------|------|
| Web UI Implementation | `dozo-plugin:webapp-impl` | web, fullstack | General frontend with zero-tolerance policy |
| Backend Implementation | `dozo-plugin:backend-impl` | backend, fullstack | API/service implementation |
| Mobile Implementation | `dozo-plugin:mobile-impl` | mobile | Mobile app implementation |
| Expo/RN Implementation | `expo-app-maker` | mobile | Expo/React Native specific |
| Code Investigation | `Explore` | ALL | Understanding existing code |
| Design Review | `Plan` | ALL | Architecture review |
| Web Verification | `general-purpose` + webapp-testing skill | web, fullstack | Browser-based verification |
| Backend Verification | `general-purpose` + backend-testing skill | backend, fullstack | Test suite execution, API verification |
| Mobile Verification | `general-purpose` + mobile-testing skill | mobile | Maestro MCP E2E flows |
| Evidence Collection | `general-purpose` + artifact-proof skill | ALL | Completion report preparation |

### 4-3. Confirm Action Guidelines Focused on Deliverables

**Display important notes:**

```
+---------------------------------------------------------------+
|  Task Start                                                   |
+---------------------------------------------------------------+
|                                                               |
|  Current location: $WORKTREE_PATH                             |
|  Branch: <branch-name>                                        |
|                                                               |
|  Implementation completion is only 1/3 of the work            |
|                                                               |
|  Completion criteria:                                         |
|    1/3: Implementation complete                               |
|    2/3: Build, start, and operation verification complete     |
|    3/3: Review in dozo → User approval                       |
|                                                               |
|  Tools to use:                                                |
|    - dozo: Browser-based review tool                         |
|    - webapp-testing: Browser operation and verification       |
|    - artifact-proof: Evidence collection                      |
|                                                               |
+---------------------------------------------------------------+
```

## ☑ 5. Execute /dozo-plugin:done (MANDATORY)

**After implementation is complete, you MUST execute `/dozo-plugin:done` to proceed to the review flow.**

This is NOT optional. Implementation without review is incomplete.

```
Implementation done
  ↓
Execute /dozo-plugin:done
  ↓
done handles: build → verification → review agents → report → dozo
  ↓
User approval
  ↓
Task complete
```

**Do NOT:**
- Report "implementation complete" without executing /done
- Create a separate PR before /done review
- Defer /done to "next time" or "another session"

## E2E Test Policy (CRITICAL - Read Before Implementation)

**E2E tests will be strictly reviewed by the review-e2e agent at /done. Implementing without understanding these rules will result in rejection and rework.**

### Absolute Prohibitions

| Category | Prohibited | Reason |
|----------|-----------|--------|
| **Mocks** | `jest.fn`, `vi.fn`, `sinon.*`, `mock`, `Mock` | Fake behavior hides real bugs |
| **Network intercepts** | `route.fulfill`, `page.route`, `nock`, `msw` | Must test real API |
| **Time mocks** | `useFakeTimers`, `clock.*`, `setSystemTime` | Must test real timing |
| **DB mocks** | `mockPrisma`, `mockFirestore`, `mockDatabase` | Must use real emulator |
| **Auth shortcuts** | `loginAs`, `signInAs`, `setAuthToken`, `setSession` | Must go through UI |
| **Direct API calls** | `fetch()`, `axios.*` in tests (except setup) | UI operations only |
| **localStorage/sessionStorage direct manipulation** | `localStorage.setItem` in tests | Must use UI |

### goto Restrictions

```
Allowed:
   - page.goto('/') or page.goto(baseUrl)  // First navigation only
   - page.goto('http://localhost:9099')     // Emulator switch (Firebase etc.)
   - page.goto(process.env.MAILPIT_URL)    // Emulator switch

Prohibited:
   - page.goto('/dashboard')  // After initial navigation - use UI clicks
   - page.goto('/settings')   // After initial navigation - use UI clicks
```

### Required Patterns

| Pattern | Requirement |
|---------|-------------|
| **Navigation** | After first goto, ALL navigation must be via UI clicks |
| **Authentication** | Must go through actual login form (UI flow) |
| **Data creation** | Use seed data or create via UI operations |
| **Waiting** | Use element/state-based waits, NOT `sleep` or `waitForTimeout` |
| **Assertions** | Include DB/record change assertions, not just UI checks |

### Dependency Injection (DI)

```
Correct DI:
   - Firebase Emulator (localhost:9099)
   - Mailpit (localhost:8025)
   - Environment variable switching

Wrong approach:
   - Mocking Firebase in code
   - Stubbing email sending
   - In-memory database replacement
```

### Example: Good vs Bad E2E Test

```typescript
// BAD - Will be rejected at review
test('user can view dashboard', async () => {
  await page.goto('/dashboard');  // NG: Direct navigation
  localStorage.setItem('token', 'fake-token');  // NG: Auth shortcut
  await expect(page.locator('.dashboard')).toBeVisible();
});

// GOOD - Will pass review
test('user can view dashboard', async () => {
  await page.goto('/');  // OK: Initial navigation
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');  // OK: UI flow
  await expect(page.locator('.dashboard')).toBeVisible();

  // Assert DB state changed
  const user = await db.query('SELECT * FROM users WHERE email = ?', ['test@example.com']);
  expect(user.last_login).toBeTruthy();
});
```

**Understanding this policy before writing E2E tests prevents 90% of rejections at review.**

## Prohibited Actions

- **Direct work on main branch prohibited** - Always create a worktree before starting work
- Starting implementation without a plan
- Working on main branch without creating a worktree
- Forgetting to collect evidence
- Reporting completion without executing /done
- Writing code directly in the main thread (causes context exhaustion)
- Only declaring "will implement" without launching subagents
- Executing parallelizable tasks sequentially (reduced efficiency)
- **Writing E2E tests without reading the E2E Test Policy above**
- **Using mocks, stubs, or shortcuts in E2E tests**
- **Splitting work into multiple PRs before completing all checkpoints**

## PR Creation Flow (Reference)

Follow the project's CLAUDE.md for PR creation target (develop / main).

```bash
# 1. After completing work in worktree
cd .worktree/<branch-name>

# 2. Commit (after executing /done)
git add .
git commit -m "feat: <content>"

# 3. Push
git push -u origin <branch-name>

# 4. Create PR (follow project settings)
gh pr create --base <target-branch> --head <branch-name>

# 5. After merge, remove worktree
git wt -d <branch-name>
# Or: git worktree remove .worktree/<branch-name>
```

**Note**: Some projects prohibit AI from creating PRs directly to main. Check the project's CLAUDE.md.

## Example

```
/do Add a login button that navigates to /login when clicked
```

This will:
1. Create a worktree with `feature/add-login-button` branch using git wt
2. Write the plan to `.worktree/feature-add-login-button/.artifacts/add-login-button/REPORT.md`
3. Register TODOs in TodoWrite
4. Display deliverable-focused action guidelines
5. After implementation, execute `/dozo-plugin:done` for review
