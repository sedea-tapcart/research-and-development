---
name: create-pr
description: >-
 Inline coding-session procedure to open a GitHub PR or emit an outsider handoff
 prompt from a reviewed implementation branch. Evaluates repo class and authorization
 (inline gh vs outsider handoff vs prompt fallback). Executed by the active
 coding-session agent only — not spawned, no warmUpRules.
inputs:
  targetPlanPath:
    type: string
    description: Absolute PR plan path, when plan-anchored.
    required: false
  targetPlanSlug:
    type: string
    description: PR plan slug, when plan-anchored.
    required: false
  worktreePath:
    type: string
    description: Absolute worktree path for the target repository.
    required: true
  worktreeName:
    type: string
    description: Branch to create the PR from.
    required: true
  baseRef:
    type: string
    description: Base ref for the PR, usually origin/main.
    required: true
  repoUrl:
    type: string
    description: Git remote URL for the repository.
    required: false
  diffSummary:
    type: object
    description: Summary of commits, files, and changes from coding-session.
    required: false
  prePrReviewRecommendation:
    type: string
    description: Recommendation from pre-pr-review. Must be go.
    required: true
  prePrReviewFlags:
    type: array
    description: Non-blocking flags from pre-pr-review.
    required: false
    default: []
  followUpsAppended:
    type: array
    description: Follow-up bullets appended to the PR plan by pre-pr-review.
    required: false
    default: []
  ledgerParent:
    type: string
    description: Ledger parent slug/path copied from coding-session.
    required: false
  upstreamSkill:
    type: string
    description: Invoker skill — must be coding-session when inline.
    required: false
---

# Create PR

**Inline context schema (not spawn).** The frontmatter **`inputs`** map describes values **`coding-session`** passes in prose or handoff on the **same lane**. Mission Control does **not** spawn **`create-pr`** via **`AGENT_RUN_REQUEST_V1`**. Do **not** treat **`inputs`** as a spawn contract.

**Lane requirement (no separate warm-up).** This skill has **no** frontmatter **`warmUpRules`** by design. Run it **only** on the active **`coding-session`** lane after that session has loaded ship rules (**`20_efficient-pr-shipping`**, **`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`**, **`skills/README.md`**, dev-process) and **`pre-pr-review`** has returned `recommendation: "go"`. Do **not** start a standalone Mission Control session on **`create-pr`** alone — context will be incomplete.

### Standalone dispatch (stop immediately)

If Mission Control opened a session whose only intent is **`create-pr`** / *open a PR* with **no** active **`coding-session`** context (`worktreePath`, `worktreeName`, `baseRef`, pre-PR **go**, PR plan when anchored):

1. **Stop** — do not run gates or **`gh pr create`**.
2. Tell the developer **`create-pr`** is **inline-only** on the **`coding-session`** lane.
3. Direct them to open or return to **`coding-session`** (detached phrase, snapshot, or **`plan and deliver`** ship path) and complete the ship chain through **`pre-pr-review`** → inline **`create-pr`** on clean **go** in [`coding-session/SKILL.md`](../coding-session/SKILL.md).

**Execution owner:** the active **coding-session agent** runs this skill inline. Do **not** spawn a separate PR-creating child lane. The coding-session lane has worktree, worktree name ref, diff, PR plan, pre-PR review outputs, and developer approvals needed to open a PR safely.

**Required upstream context:** `prePrReviewRecommendation: "go"`; `worktreePath`, `worktreeName`, `baseRef`; optional `targetPlanPath` / `targetPlanSlug`; `diffSummary` and pre-PR flags when available. If context is missing, recover on **`coding-session`** before running this procedure.

**Post-PR lifecycle:** merge checks, After-deploy **`deploy-walk`**, and inline **`plan-reconcile`** are owned by **`coding-session`** ([Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate), [After deploy deploy-walk handoff](../coding-session/SKILL.md#after-deploy-deploy-walk-handoff), [Plan-reconcile handoff (inline)](../coding-session/SKILL.md#plan-reconcile-handoff-inline)) — not this skill.

**Worktree removal ownership (binding).** **Do not remove worktrees you do not own.** Opening a PR does **not** grant cleanup on other worktrees. **`git worktree remove`**, **`git worktree prune`**, and **`sedea_remove_worktree_folder`** apply **only** to **this pass’s** **`WORKTREE_ROOT`** when rule **0** § *Worktree ownership* and rule **20** § *Worktree removal ownership (binding)* preconditions hold. **`git worktree list` is read-only** when ownership is unclear — **stop; do not remove**.

## Structured choice (Mission Control)

Gates use **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act* on the **`coding-session`** lane — **preferred:** recap + modal in one message. **Act** (`gh pr create`, plan follow-up append) only after the developer selects — **except** on the **outsider-handoff** route (no `gh pr create`; emit prompt and open [Post-outsider-handoff gate](../coding-session/SKILL.md#post-outsider-handoff-gate) on the same turn).

## Relationship to rule 20 (`gh pr create`)

**`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** forbids **`gh pr create`** on planning, Squad Leader, **`pre-pr-review`**, and other non-ship lanes. **Exception:** the active **`coding-session`** agent **while executing this skill inline** on the **inline GitHub** route after pre-PR clean **`go`** (auto path) or exceptional Create-PR gate may call `gh pr create` when gates pass and push/creation is authorized. **Outsider repos** never use this exception — see **## PR route evaluation** below.

## Gate

Before choosing a PR route:

1. Verify `prePrReviewRecommendation` is exactly `go`. If not, stop; PR creation is blocked until review passes.
2. Verify `worktreePath`, `worktreeName`, and `baseRef` are present.
3. Verify the worktree name ref matches `worktreeName` (`git branch --show-current`).
4. Verify the committed diff exists: `git diff <baseRef>...HEAD` is non-empty.
5. Resolve **`repoUrl`** when omitted: `git -C "$worktreePath" remote get-url origin`.

## PR route evaluation

After shared gates pass, choose **exactly one** route. Evaluate in order:

| Order | Route | When | `prCreationMode` |
|-------|-------|------|------------------|
| 1 | **Outsider handoff** | [Outsider repo](#outsider-repos-mandatory-handoff) | `outsider-handoff` |
| 2 | **Inline GitHub create** | Not an outsider repo **and** push/PR creation authorized | `inline` |
| 3 | **Prompt fallback** | Not an outsider repo **and** push/PR creation **not** authorized | `prompt-fallback` |

### Outsider repos (mandatory handoff)

Classify as an **outsider repo** when **`worktreePath`** or **`repoUrl`** matches any of:

| Repo | Path segment | Remote slug |
|------|--------------|-------------|
| **tapcart-push** | `tapcart-push` | `tapcartinc/tapcart-push` |
| **tapcart-merchant-dashboard** | `tapcart-merchant-dashboard` | `tapcartinc/tapcart-merchant-dashboard` |

See **`.cursor/rules/push-monorepo-submodules.mdc`** on the hosting repo. Sedea agents **cannot** open PRs on these repositories from Mission Control — the developer engages an **outsider** (external agent outside Sedea) to create the GitHub PR.

**On outsider repos:**

- **Forbidden:** `gh pr create` and any GitHub PR API/MCP call that creates, drafts, or reopens a PR — even when push is authorized.
- **Required:** emit the [Outsider PR handoff prompt](#outsider-pr-handoff-prompt) in a copy/paste-safe fence.
- Set `promptEmitted: true`, `prCreationMode: outsider-handoff`, `remainingTasks` to include *outsider creates PR on GitHub*.
- **Same turn:** open [Post-outsider-handoff gate](../coding-session/SKILL.md#post-outsider-handoff-gate) — not [Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate).

### Inline GitHub create (default)

When route **2** applies:

1. Verify the worktree is pushed or push it only if **`coding-session`** explicitly authorized push.
2. When authorized, run `gh pr create` per rule **20** § *Comprehensive PR descriptions*.
3. Set `prCreationMode: inline`, `prUrl`, `prNumber`, `shipPhase: pr-open`, `rowStatus: open`.
4. **Same turn:** open [Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate).

If push is not authorized on a non-outsider repo, use route **3** instead — do not call `gh pr create`.

### Prompt fallback (push not authorized)

When route **3** applies on a **non-outsider** repo, generate a copy-paste prompt for a future **`coding-session`** ship pass or authorized PR opener. Gather:

1. **Current worktree name ref**: `git branch --show-current`
2. **Integration line**: from `git merge-base` / tracking parent (e.g. `main`).
3. **Repo URL**: `git remote get-url origin`
4. **Changes summary**: `git diff <base>...HEAD` plus session context — **reviewer-complete** per rule **20** § *Comprehensive PR descriptions*.

Print inside a fenced code block using the template in [Outsider PR handoff prompt](#outsider-pr-handoff-prompt) but address the **next authorized PR creator** (not necessarily an outsider).

Set `prCreationMode: prompt-fallback`, `promptEmitted: true`, `continuationStatus: active`, `remainingTasks` including *push and authorize PR creation*.

## Outsider PR handoff prompt

When route **1** (or route **3** with the same template) applies, gather:

1. **Worktree name ref** — `git branch --show-current`
2. **Integration line** — merge-base / tracking parent (e.g. `main`)
3. **Repo URL** — `git remote get-url origin`
4. **Changes summary** — `git diff <baseRef>...HEAD` plus **`diffSummary`** and session context
5. **Pre-PR review** — recommendation, flags, proposed follow-ups (and whether appended)
6. **Plan lineage** — `targetPlanPath` / `targetPlanSlug` when plan-anchored
7. **Verify steps** — from plan §5 / applicable Project rules when known

Print inside a fenced code block (default ` ```text … ``` `):

```
You are the outsider — an external agent outside Sedea Mission Control. Create a GitHub pull request for the branch already pushed by the developer.

Repository: <repo-url>
Branch (worktree name): `<worktree-name>`
Integration line (base): `<integration-line>`

Pre-PR review: go (Sedea pre-pr-review completed on the implementation lane).

Use past tense for the PR title.

PR description — verify against the diff; use bullets proportional to PR size but do not omit reasoning:

- Why this slice / motivation (enough that a reviewer can tell intent vs mistake)
- What changed (behaviour, APIs, schema, config)
- Not in this PR (deferrals, parent scope left out on purpose)
- Plan lineage (if applicable): <targetPlanPath or slug>
- Pre-PR flags (if any): <prePrReviewFlags>
- Proposed follow-ups (if any; note whether appended): <followUpsAppended or proposed list>
- Intentional non-changes (if any)
- How to verify (tests or observable behaviour)

After opening the PR, return the PR URL to the developer so they can continue the Sedea ship chain (pr-review, merge, After deploy).
```

State in one recap line that the developer should paste this prompt to their **outsider** agent and resume **`coding-session`** when the PR URL is known.

## Result contract

Merge these fields into **`coding-session`** `outputs` via **`## Completion (inline)`**:

- `targetPlanPath`
- `targetPlanSlug`
- `worktreePath`
- `worktreeName`
- `baseRef`
- `repoUrl`
- `prCreationMode` — `inline` | `outsider-handoff` | `prompt-fallback`
- `prUrl`
- `prNumber`
- `promptEmitted`
- `remainingTasks`
- `shipPhase` — `pr-open` when PR created; `implementing` when outsider/prompt handoff pending
- `rowStatus` — `open` when PR exists; `blocked` when handoff blocked
- `blockedReason` — when `rowStatus: blocked`
- `prState` — `open` | `merged` | `closed` | `unknown` when known
- `reviewState` — when queried on this pass
- `continuationStatus` — `active` when PR open or prompt emitted; `partial` when blocked

Set `continuationStatus`:

- `active` when a PR URL/number is created and post-create-pr gates remain on **`coding-session`**.
- `active` when an outsider or fallback prompt was emitted but the developer still must create the PR.
- `active` when push or PR creation is blocked by missing authorization.

## Mission Control section 8 sync (via coding-session)

**`create-pr`** is **not** a separate child terminal. After inline completion, the invoker **must** merge these fields into the next **`coding-session`** **`AGENT_RESULT_RESPONSE_V1`** **`outputs`** (or re-emit updated terminal on that lane):

| Field | When |
|-------|------|
| `targetPlanPath` | Always when plan-anchored |
| `shipPhase` | `pr-open` when PR created; `implementing` when outsider/prompt handoff pending |
| `rowStatus` | `open` when PR exists; `blocked` when handoff blocked |
| `prUrl` / `prNumber` | When PR created |
| `prCreationMode` | Always |
| `remainingTasks` / `blockedReason` | When applicable |

**Forbidden:** nudging manual **Ship recap** on the Squad Leader dispatch. Host sync delivers §8 updates from **`coding-session`** terminals only.

| Outcome | `shipPhase` | Key `outputs` |
|---------|-------------|---------------|
| PR created (inline) | `pr-open` | `targetPlanPath`, `prUrl`, `prNumber`, `prCreationMode: inline` |
| Outsider handoff | `implementing` | `targetPlanPath`, `promptEmitted`, `prCreationMode: outsider-handoff`, `remainingTasks` |
| Blocked / deferred | `implementing` or `blocked` | `targetPlanPath`, `remainingTasks`, `blockedReason` |

## Completion (inline)

Report on the **same `coding-session` lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1` from this procedure alone.

Required fields (prose to invoker / merged into **`coding-session`** `outputs`):

- All keys from **## Result contract**
- One-line summary: PR opened (`prUrl`), outsider prompt emitted, or blocked reason

**Handback:**

- **Inline route** — open [Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate) on the **same assistant turn**.
- **Outsider-handoff route** — open [Post-outsider-handoff gate](../coding-session/SKILL.md#post-outsider-handoff-gate) on the **same assistant turn**.
- **Prompt-fallback route** — recap only; re-open ship cut-point or defer per developer message unless they return with PR URL.

Do **not** auto-start inline **`pr-review`**, inline **`deploy-walk`**, or **`plan-reconcile`** from this skill.
