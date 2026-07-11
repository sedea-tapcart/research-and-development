---
name: plan-reconcile
description: >-
 Inline coding-session procedure for plan-state.mjs reconcile (PR-tracked archival),
 archive candidates, follow-ups triage, and post-ship workspace cleanup. Executed by
 the active coding-session agent only — not spawned, no warmUpRules.
designation:
  allowed: Post-ship plan hygiene; archive candidates; stale workspace cleanup fallback
  forbidden: New feature implementation; worktree product edits; dispatch resolution
inputs:
  targetPlanPath:
    type: string
    description: Absolute PR plan path that may be reconciled after PR merge and deploy verification.
    required: false
  targetPlanSlug:
    type: string
    description: PR plan slug that may be reconciled after PR merge and deploy verification.
    required: false
  prUrl:
    type: string
    description: Merged PR URL associated with the plan.
    required: false
  prNumber:
    type: number
    description: Merged PR number associated with the plan.
    required: false
  prState:
    type: string
    description: PR state from coding-session; must be merged for inline reconcile from ship chain.
    required: false
  deployStatus:
    type: string
    description: Deploy status from deploy-walk; must be done for inline reconcile from ship chain.
    required: false
  deployTodoStatus:
    type: string
    description: deploy-test-plan-verified todo status; must be done for inline reconcile from ship chain.
    required: false
  ledgerParent:
    type: string
    description: Ledger parent slug/path copied from coding-session.
    required: false
  upstreamSkill:
    type: string
    description: Invoker skill — must be coding-session when inline.
    required: false
---

# Plan reconcile

## Warm-up manifest (inline)

Per [`.sedea/centers/sedea/docs/lane-manifest-contract.md`](.sedea/centers/sedea/docs/lane-manifest-contract.md) and **`../README.md`** § *Inline-only*. **No** frontmatter **`warmUpRules`** or **`laneRules`** — runs on the active **`coding-session`** lane whose **`effectiveWarmUp`** already loaded ship rules. **No `alwaysApply` frontmatter flip.**

### Inherited from invoker (`coding-session`)

| Source | Paths (via parent lane) |
|--------|-------------------------|
| Parent **`skillWarmUp`** | `plan.mdc`, `skills/README.md`, `development-process.md`, rule **20** (parent omits rule **30** from frontmatter — see README cap table) |
| Parent **`laneRules`** | Rule **2**, rule **6**, rule **20**, `coding-session/SKILL.md` |
| This skill | Procedure body only — no separate spawn warm-up |

**Lane requirement (no separate warm-up).** Run **only** on the active **`coding-session`** lane after that session has loaded ship rules. Do **not** start a standalone Mission Control session on **`plan-reconcile`** alone — context will be incomplete.

### Standalone dispatch (stop immediately)

If Mission Control opened a session whose only intent is **`plan-reconcile`** / *plan reconcile* with **no** active **`coding-session`** context:

1. **Stop** — do not run **`plan-state.mjs`** reconcile mutations.
2. Tell the developer **`plan-reconcile`** is **inline-only** on the **`coding-session`** lane.
3. Direct them to open or return to **`coding-session`** with the PR plan (or post-ship context) — see [`coding-session/SKILL.md`](../coding-session/SKILL.md) § *Plan-reconcile handoff (inline)* and § *Stale worktree detection (detect-only)*.

**Execution owner:** the active **coding-session agent** runs this skill inline. Do **not** spawn a separate reconcile child lane.

Script-backed flow: **`plan-state.mjs`** owns YAML and file moves; the agent decides **which** archive candidates to take (and how to route **follow-ups**) by surfacing choices via structured choice (below).

## Structured choice (Mission Control)

Dry-run reports, archive candidates, and follow-up triage use **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act* — recap + modal in **one turn** when practical. **Act** (`plan-state.mjs archive`, file moves) is after the developer selects.

## Session orientation table (binding)

Give developers a **consistent state snapshot** during inline reconcile so they can re-orient after reload or parallel work.

**When required:** At every **Mandatory gate** below — render as the **first block** in `display.markdown` (before dry-run report, candidate list, or cleanup JSON). **Forbidden:** omitting the table and substituting scattered one-liners on modal gates.

**Table shape (markdown):**

| Field | Value |
|-------|-------|
| Plan | `<slug>` @ `<path>` or — |
| Worktree | `<worktreePath>` from inline context or — |
| Branch | `<worktreeName>` from inline context or — |
| PR | `<url>` (#N) or — |
| Ship phase | parent `shipPhase` when inline on **`coding-session`**, or `reconcile` |
| Deploy scope | — (reconcile does not own deploy walk) |
| Review | — (reconcile does not own PR triage) |

**Population rules:** Same as [`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/coding-session/SKILL.md`](../coding-session/SKILL.md) § *Session orientation table (binding)* — use inline context; never invent paths or PR numbers.

**Mandatory gates (this skill):** [Approve PR-tracked reconcile mutations gate](#approve-pr-tracked-reconcile-mutations-gate-binding); [Archive candidates gate](#archive-candidates-gate-binding); [Follow-ups triage gate](#follow-ups-triage-gate-binding); [Post-ship workspace cleanup gate](#post-ship-workspace-cleanup-gate-binding); [Inline closure gate](#inline-closure-gate-binding).

## Checkpoint turn UX (skill-local)

Under Checkpoint trust (`trustLevel: checkpoint`), auto-advance scripted happy-path steps; emit structured choice only at **USER_CHECKPOINT** markers in this section, implicit external-wait surfaces, or exception paths. **No cross-skill inheritance** — gate defaults here apply only to **`plan-reconcile`**; other ship-chain skills document their own markers.

**Real-dispatch test loop (binding):** After merge, run one full inline **`plan-reconcile`** on a **`coding-session`** Checkpoint dispatch through [Approve PR-tracked reconcile mutations gate](#approve-pr-tracked-reconcile-mutations-gate-binding), [Archive candidates gate](#archive-candidates-gate-binding), and [Inline closure gate](#inline-closure-gate-binding) — collect a developer verdict before the parent phase advances **`hosting-repo-rules`** PR 7 — per **Ship-chain skills UX** § *Single-concern strategy*.

Marker syntax: [`.sedea/centers/sedea/docs/user-checkpoint-marker-syntax.md`](.sedea/centers/sedea/docs/user-checkpoint-marker-syntax.md).

| Step | Checkpoint behavior | Gate |
|------|---------------------|------|
| **1** — Preview reconcile (dry-run) | Auto-advance | exception: script failure → stop with recap |
| **1b** — Approve PR-tracked reconcile mutations | **Gate** when dry-run reports **`archived`** or mutation-worthy entries | [Approve PR-tracked reconcile mutations gate](#approve-pr-tracked-reconcile-mutations-gate-binding) |
| **2** — Run list-candidates | Auto-advance (read-only JSON) | exception: script failure |
| **3** — Present candidates + flagged | **Gate** when merged candidate or flagged lists are non-empty | [Archive candidates gate](#archive-candidates-gate-binding) |
| **3.5** — Follow-ups triage | **Gate** per plan with non-empty **`## Follow-ups`** | [Follow-ups triage gate](#follow-ups-triage-gate-binding) |
| **4** — Archive selected plans | Auto-advance after developer selection | exception: non-zero **`archive`** exit |
| **5** — Post-ship workspace cleanup | **Gate** when **`detect-stale-workspaces`** returns candidates | [Post-ship workspace cleanup gate](#post-ship-workspace-cleanup-gate-binding) |
| **6** — End state summary | Auto-advance recap prose only | — |
| **Inline closure** (inline on **`coding-session`**) | **Gate** — mandatory developer pick before **`## Completion (inline)`** handback | [Inline closure gate](#inline-closure-gate-binding) |

### Approve PR-tracked reconcile mutations gate (binding)

When step **1** dry-run reports entries in the **`archived`** bucket (or other mutation-worthy PR-tracked rows), open structured choice **before** non-dry-run **`reconcile`**. **Forbidden:** running **`plan-state.mjs reconcile`** without authorization on the **same turn** as this modal. **Forbidden:** prose-only mutation handoff.

Put the session orientation table and dry-run report summary in **`display.markdown`**.

USER_CHECKPOINT — approve PR-tracked reconcile mutations before running non-dry-run reconcile.

| Option id | Label (brief) | Act |
|-----------|---------------|-----|
| `approve-reconcile-mutations` | Approve PR-tracked reconcile mutations | On the **developer's response turn**, run non-dry-run **`reconcile`**; continue to step **2** |
| `skip-pr-tracked-reconcile` | Skip PR-tracked reconcile this pass | Continue to read-only **`list-candidates`** only — no non-dry-run **`reconcile`** |
| `review-flagged-first` | Review flagged entries first | Recap **`flagged`** bucket; re-open this gate after review |
| `abort-reconcile` | Abort reconcile | Stop with `continuationStatus: "active"`; no archive mutations |
| `more-details` | More details for option _ | Elaborate; re-open this gate |

- **`defaultOptionId: approve-reconcile-mutations`** when dry-run **`archived`** entries are expected and no flagged blockers need review.
- **Next-step resolution:** Auto-advance through step **1** dry-run on the happy path — no `USER_CHECKPOINT` until this gate when mutations are required.

When dry-run reports **no** mutation-worthy PR-tracked entries, **skip** this gate — continue to step **2**.

### Archive candidates gate (binding)

When step **2** **`list-candidates`** and step **1** **`flagged`** lists merge to a **non-empty** pick set, open structured choice **before** step **4** archive mutations. **Forbidden:** archiving without developer multi-select. **Forbidden:** report-only turn without modal when candidates exist.

Put the session orientation table and merged candidate / flagged list in **`display.markdown`**.

USER_CHECKPOINT — pick plans to archive from reconcile candidates and flagged entries.

| Option id | Label (brief) | Act |
|-----------|---------------|-----|
| *(multi-select per plan slug)* | `<slug>` — todos N/N done, signal: … | Record slug in archive batch; proceed to step **3.5** when follow-ups exist, else step **4** |
| `skip-archive-this-pass` | Skip archive this pass | No **`archive`** invocations; continue to step **5** or end summary when applicable |
| `more-details` | More details for option _ | Elaborate; re-open this gate |

Prompt text: **`Pick plans to archive. Candidates are safe to archive; flagged plans need judgement (selecting them will archive with signal "flagged: <reason>" — only do this if you intend to close out).`**

- **Next-step resolution:** Auto-advance through steps **1** and **2** on the happy path — no `USER_CHECKPOINT` until merged lists are non-empty.

When both lists are empty, **skip** this gate — continue to step **3.5** only when something in scope has follow-ups; otherwise step **6** summary.

### Follow-ups triage gate (binding)

For each plan in the archive batch with a non-empty **`## Follow-ups`** section, open structured choice **before** step **4** archive for that slug (or before integrate routing when the plan was reconcile-auto-archived in step **1b**). **Forbidden:** archiving a plan with un-triaged follow-ups. **Forbidden:** prose-only *tell me how to route* without modal.

Put the session orientation table, source slug, and follow-up bullet summaries in **`display.markdown`**.

USER_CHECKPOINT — route follow-up bullets before archiving this plan.

| Option id | Label (brief) | Act |
|-----------|---------------|-----|
| `drop` | Drop this follow-up | No file change for that bullet |
| `elaborate-first` | Elaborate first — queue this pass | Queue for wave 2–4 per **development-process** follow-ups triage |
| `postpone` | Postpone — keep source plan active | Record slug in **`postponed:`** set; step **4** skips archive for that slug *(omit when source was reconcile-auto-archived)* |
| `integrate-<target-slug>` | Integrate → `<target-slug>` | Append bullet to target **`## Follow-ups`**; one canonical sink |
| `(other)` | Pick manually after archive | Manual fallback per step **3.5** terminal mapping |
| `more-details` | More details for option _ | Elaborate; re-open this gate for the same bullet |

- **Next-step resolution:** Auto-advance silently for plans with no **`## Follow-ups`** section — no `USER_CHECKPOINT` until a non-empty section requires routing.

### Post-ship workspace cleanup gate (binding)

When **`detect-stale-workspaces`** returns one or more candidates, present the dry-run **`actions`** list and open structured choice **before** **`--apply`**. **Forbidden:** **`--apply`** in the same assistant turn as this modal. **Forbidden:** report-only turn ending without structured choice when stale candidates exist.

Put the session orientation table and cleanup JSON **`actions`** list in **`display.markdown`**.

USER_CHECKPOINT — authorize post-ship workspace cleanup for stale worktrees.

| Option id | Label (brief) | Act |
|-----------|---------------|-----|
| `cleanup-apply` | Run workspace cleanup (worktree + worktree name ref + pull main) | MCP **`sedea_remove_worktree_folder`** per candidate, then **`post-reconcile-workspace-cleanup.mjs --apply`** on response turn |
| `cleanup-skip` | Skip git cleanup this pass | Report skip; continue to step **6** |
| `cleanup-dry-run-only` | Dry-run only — no git mutations | No **`--apply`**; continue to step **6** |
| `more-details` | More details for option _ | Elaborate; re-open this gate |

- **`defaultOptionId: cleanup-apply`** when ownership preconditions pass for all candidates and post-merge cleanup was deferred on **`coding-session`**.
- **Next-step resolution:** Auto-advance through steps **1–4** and follow-ups triage on the happy path — no `USER_CHECKPOINT` until stale candidates exist.

When **`detect-stale-workspaces`** returns no candidates, **skip** this gate — report one line and continue to step **6**.

## When this skill runs

| How it starts | Requirements | Auto-start? |
|---------------|--------------|-------------|
| Developer says **plan reconcile** / **reconcile plans** on active **`coding-session`** | Active dispatch scope or anchored **`targetPlanPath`** / **`targetPlanSlug`**; follow **Flow** below | No — explicit start |
| **`coding-session`** inline handoff | Developer chose reconcile on that turn; when plan-anchored from ship chain: `prState: merged`; `deployStatus: done`; `deployTodoStatus: done`; `targetPlanPath` or `targetPlanSlug` | Yes — on authorized pick only |
| **`deploy-walk`** finishes (checklist + capstone todo **done**) | — | **No** — deploy done alone does not start reconcile |

Do **not** trigger on the word **`plan`** alone — too generic.

When **`deploy-walk`** just finished and the user expects archive, open structured choice once per [Plan-reconcile handoff (inline)](../coding-session/SKILL.md#plan-reconcile-handoff-inline): start **`plan-reconcile`** inline now vs defer. Merge + deploy verification are still required for inline reconcile from **`coding-session`** when plan-anchored on the ship chain.

Detail: **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** § *deploy-walk vs plan-reconcile (not chained)*; **`.sedea/centers/research-and-development/docs/development-process.md`** § *Plan reconcile triggers*.

**Inline gate (ship chain):** if any required field is missing, stop with `partial`, keep `continuationStatus: "active"` on **`coding-session`**, and report what is missing. Do not archive before merge and deploy verification are complete.

## Script CLI (hosting repo)

All **`plan-state.mjs`** invocations run from **`HOSTING_ROOT`** (the hosting repo whose root contains **`.sedea/`**). Use a **direct `node` command** with the runtime in [`.sedea/centers/research-and-development/rules/31_dispatch-scope.mdc`](../../../../rules/31_dispatch-scope.mdc) § *Legacy CLI (`plan-state.mjs`) — hybrid only* and rule **20** § *Hosting repo cwd for scripts (canonical)*.

On Mission Control agent lanes, resolve plans via spawn **`inputs.targetPlanPath`** / **`targetPlanSlug`** or **`plan-state.mjs resolve --cwd "$WORKTREE_ROOT"`** — do **not** construct **`.sedea/operations/.../...`** or **`joint/plans`** paths. See rule **31** § *Dispatch scope (binding)* and § *Plans and docs paths*.

```bash
# HOSTING_ROOT: walk up until .sedea/centers/sedea/ exists
cd "$HOSTING_ROOT"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
  <subcommand> …
```

Plans and sidecars live under **`.sedea/operations/…/plans/`** on the dispatch-scoped operations tree. Use explicit absolute paths from spawn **`inputs`** or **`resolve --cwd`** output — do **not** use **`~/.cursor/plans/`** for Sedea hosting repo plans.

## Flow

### 1. Preview reconcile (PR-tracked path)

```bash
cd "$HOSTING_ROOT"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
  reconcile --dry-run
```

This queries **`gh pr view`** for every sidecar **`prs[]`** entry without moving files or appending parent bullets. The printed report has three buckets:

- **`archived`** — every PR for that plan is **`MERGED`**; in dry-run this means **`plan-state`** would move the plan + sidecar and append a bullet under **`## Child plans`** on the parent (when applicable). No mutation has happened yet.
- **`flagged`** — at least one PR closed without merge, mixed merged/open, unknown repo, or **`gh`** error. Needs judgement (step 3).
- **`skipped`** — still-open PRs, or no **`prs[]`** (the script’s way of saying “not this path”). Step 2 covers the no-**`prs[]`** subset via **`list-candidates`**.

Optional flags: **`--prune-worktrees`** is only allowed after the developer approves the mutation pass below (see script **`--help`**).

### 1b. Approve PR-tracked reconcile mutations

When step **1** dry-run reports mutation-worthy PR-tracked entries, open [Approve PR-tracked reconcile mutations gate](#approve-pr-tracked-reconcile-mutations-gate-binding) before running non-dry-run reconcile.

Only **`approve-reconcile-mutations`** authorizes:

```bash
cd "$HOSTING_ROOT"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
  reconcile
```

If the developer skips PR-tracked reconcile, do not run non-dry-run `reconcile`; continue only to read-only `list-candidates` and developer-selected archive work. If the developer aborts, stop with `continuationStatus: "active"` and no archive mutations.

### 2. Run list-candidates (non-PR path)

```bash
cd "$HOSTING_ROOT"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
  list-candidates --json
```

Emits a JSON array of plans reconcile could not auto-decide. Schema per entry:

```json
{
 "slug": "…",
 "planPath": "/abs",
 "parent": "…" | null,
 "name": "…",
 "todos": { "total": n, "done": n, "pending": 0, "in_progress": 0, "cancelled": 0, "allDone": true },
 "shipSignal": {
 "kind": "pr-body" | "no-pr-body",
 "label": "org/repo#540" | "…",
 "prs": [{ "evidence": "link" | "bare", "orgRepo": "…" | null, "number": n, "url": "…" | null }]
 },
 "suggestedSignal": "…"
}
```

When **`shipSignal.kind`** is **`no-pr-body`**, **`list-candidates`** found no merged-PR link or number in the plan body and there is no sidecar **`prs[]`** — it still treats the plan as an archive candidate. Use **`suggestedSignal`** from the JSON when present; otherwise a neutral signal string such as **`shipped (no merged-PR body link in plan)`**.

Filters already applied (unchanged from upstream script semantics):

- Plans with sidecar **`prs[]`** are excluded (reconcile’s job).
- Plans without all todos done are excluded.
- Roadmap topics (**`kind: roadmap_topic`**) are excluded.
- Plans with any **blocked descendant** are excluded. An all-done child in **`plans/`** does **not** block its parent — the fully-shipped subtree can surface together.

### 3. Present candidates + flagged plans

When merged lists are non-empty, open [Archive candidates gate](#archive-candidates-gate-binding). One option per plan. Label format:

- Candidates: `` `<slug>` — todos N/N done, signal: <shipSignal.label>, parent: <parent> ``
- Flagged: `` `<slug>` — FLAGGED (<reason>), parent: <parent> ``

If both lists are empty → skip the gate; continue (step 3.5 only if something in scope has follow-ups — usually skip to the end-of-flow summary).

### 3.5 — Follow-ups triage

Per **`.sedea/centers/research-and-development/docs/development-process.md`** (**Cadence** / plan updates): **an un-triaged follow-up is a forgotten one**. Before archiving a plan that has a non-empty **`## Follow-ups`** section, route every bullet.

**Scope**

- **User-selected plans** from step 3 (candidates the user picked + flagged plans they opted to archive). Files are still at their **active** **`.sedea/operations/.../plans/`** paths for this pass (not yet archived here).
- **Reconcile-auto-archived plans** from approved step 1b (**`archived`** list). **`plan-state`** **`reconcile`** may have moved each **`.plan.md`** within the same operations scope — **do not** assume its former path. **Re-resolve** each slug’s **`.plan.md`** under **`.sedea/operations/`** (for example **`plan-state resolve`** or a search for **`<slug>.plan.md`** under that scope) after the approved mutation run. For this set, **Postpone** below is **not** offered — the plan is already archived; only **Integrate** and **Drop** apply.

If a plan in scope has no **`## Follow-ups`** section, or the section is empty, skip it silently.

**Parent map.** Build **`slug → parent`** (and inverse) using **`list-candidates --json`** where available; for any other **`.plan.md`** under the operations **`plans/`** union you need for ordering, read the sidecar **`parent:`** via **`Read`**. Do **not** mutate sidecars in this step.

**Parse `## Follow-ups`.** Use **`Read`** on the plan file. Locate the top-level **`## Follow-ups`** heading and collect bullets until the next **`## `** heading or EOF. A bullet starts with **`- `** or **`* `** at column 0, including nested indented lines. Strip a trailing **`(target: …)`** suffix from the **first line** when present as a *routing hint* for the question text; the text integrated into the target keeps the rest verbatim.

**Per-plan gate.** For plan **`<slug>`** with **N** follow-ups, open [Follow-ups triage gate](#follow-ups-triage-gate-binding) with **N** questions (one per bullet). Each prompt: first line (truncated ~140 chars) plus **`(suggested: <hint>)`** when a **`(target: …)`** hint was parsed. **`integrate → <target-slug>`** options follow proximity order: parent → siblings → grandparent → aunt/uncle subtrees → walk up → **Master Plan** last when not already parent. Skip the source slug. Skip slugs already in the archive batch from step 3. **Skip targets that are already archived** for this scope. Cap ~30 options; final escape hatch **`(other) — pick manually after archive`**.

**Wave order** (normative): (1) Ask all bullets once. (2) Apply terminals (**Drop**, **Postpone**, **Integrate**, **`(other)`**); queue **Elaborate first**. (3) Brief each queued bullet (chat: what / why now / how routing differs). (4) Re-ask queued bullets only; repeat 3→4→2 until **`elaborate_queue`** is empty. If the user dismisses a form while non-terminal bullets remain, treat like **Postpone** for those source slugs (record in **`postponed:`**, list unresolved bullets in chat).

**Terminal mapping**

- **Drop** → no file change for that bullet.
- **Postpone** → **`postponed:`** slug set; do not route the bullet.
- **Integrate → `<target-slug>`** → append bullet (verbatim minus **`(target: …)`** on first line) to the target’s **`## Follow-ups`** (**`StrReplace`**). Create the section at EOF if missing. **One canonical sink** — not **Changes** / **Caveats** / **Delivery phases** here.

**Manual fallback** for **`(other)`**: add source slug to **`postponed:`** when the source was user-selected (stays active). For **reconcile-auto-archived** sources, emit **`MANUAL:`** lines in the chat summary — the user edits that plan file themselves.

**Routing summary** (chat, before step 4): per slug, counts integrated / dropped / postponed / manual / elaborate passes, with one line per integrate target.

### 4. Archive each selected plan

For each slug the user picked that is **not** in the **`postponed:`** set from step 3.5:

```bash
cd "$HOSTING_ROOT"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
  archive \
  --slug <slug> \
  --signal "<signal-text>"
```

Signal selection:

- Candidate with **`shipSignal.kind === "pr-body"`** → **`suggestedSignal`** (URLs/refs from JSON).
- Candidate with **`shipSignal.kind === "no-pr-body"`** → use **`suggestedSignal`**, or neutral text as in step 2 (keep signal strings factual — no home-local paths in the archive reason).
- Flagged plan → **`flagged: <reason>`** only when the user explicitly selected it.

One slug per invocation; print the script JSON response for a paper trail.

**Order:** when parent and children are selected together, archive **children before ancestors** so each child’s **`## Child plans`** bullet lands on the parent while the parent is still in the active **`plans/`** tree.

On non-zero exit, stop and surface the error.

### 5. Post-ship workspace cleanup

**Worktree removal ownership (binding).** This §5 fallback runs **only** when [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Worktree ownership* and rule **20** § *Worktree removal ownership (binding)* preconditions pass for **each** candidate path. **Do not remove worktrees you do not own.** **`detect-stale-workspaces`** + **`--apply`** are not permission to remove arbitrary entries from **`git worktree list`**. When ownership is unclear, stop and use structured choice.

**Primary owner:** [coding-session post-merge workspace cleanup](../coding-session/SKILL.md#post-merge-workspace-cleanup) on the ship chain **after PR merge and before After deploy** `deploy-walk`. Run this subsection when archive/reconcile work for this pass is done, when the developer explicitly requests workspace cleanup on a reconcile lane, or as an **idempotent fallback** when post-merge cleanup was skipped or deferred on **`coding-session`**.

**Idempotent fallback:** When **`detect-stale-workspaces`** returns no candidates (worktree already removed, **`mainPullStatus`** already **`success`** on this plan), report one line and skip **`--apply`** — do not treat as error.

**Worktree name ref cleanup gate:** Same as **`post-reconcile-workspace-cleanup.mjs`** — (1) **`mergedPr: true`** and remote head gone, or (2) worktree-linked fallback when **`prs[]`** empty, **`remoteHeadGone: true`**, worktree name not checked out elsewhere; not merge-base into **`origin/main`**.

**Detect (read-only):**

```bash
cd "$HOSTING_ROOT"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
  detect-stale-workspaces [--slug <slug>] --json
```

Each candidate includes `worktreePath`, `repo`, `worktreeName`, `mergedPr` (when sidecar **`prs[]`** exists), `remoteHeadGone`, and `reason`.

**Dry-run git plan:**

```bash
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/post-reconcile-workspace-cleanup.mjs \
  --dry-run [--slug <slug>]
```

Present the JSON **`actions`** list in the **same turn** as [Post-ship workspace cleanup gate](#post-ship-workspace-cleanup-gate-binding) — put long reports in **`display.markdown`** (phased) when needed; do not end with a report-only turn.

Only **`cleanup-apply`** authorizes **`--apply`**.

**Apply (after MCP detach):**

**Worktree removal ownership (binding).** Before step 1, confirm **all** preconditions in [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Worktree ownership* and rule **20** § *Worktree removal ownership (binding)* for **each** candidate **`worktreePath`**. **Forbidden:** **`--apply`** on paths not returned by **`detect-stale-workspaces`** for **this reconcile pass**; repo-wide cleanup from **`git worktree list`**; removing worktrees another session owns. If unsure, stop — **`git worktree list` is read-only**.

1. For **each** candidate **`worktreePath`**, invoke MCP **`sedea_remove_worktree_folder`** with `{ "path": "<absolute-worktree-root>" }` **before** git removal (rule **20** § *Detach merged worktrees*).
2. Run:

```bash
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/post-reconcile-workspace-cleanup.mjs \
  --apply [--slug <slug>]
```

The script runs **`git worktree remove`**, drops local worktree name refs when PR merged **and** remote head is gone (not merge-base heuristics), **`git pull origin <defaultIntegrationLine>`** on **`HOSTING_ROOT`**, optional **post-merge host rebuild** when **`.cursor/rules/dot-sedea.mdc`** documents **`postMergeHostRebuildScript`** on the active hosting repo (so the developer can reload the Sedea workbench), and **`plan-state.mjs prune-sessions --all`**.

3. Summarise **`cleanedWorktrees`**, **`deletedWorktreeNames`**, **`skippedWorktreeNames`**, **`mainPullStatus`**, and any **`errors`** from the script JSON.

**Primary path:** **`coding-session`** [Post-merge workspace cleanup](../coding-session/SKILL.md#post-merge-workspace-cleanup) runs **`--apply`** after PR merge and before After deploy walk. This §5 subsection is the **idempotent fallback** when that pass was skipped or deferred.

### 6. End state — no plans-repo shortcut

**Do not** run a separate **plans-only** git commit flow from this skill (operations changes belong to your normal hosting / center git process unless the user asked you to commit).

Mutations are under **`.sedea/operations/`** (and possibly center git elsewhere). Summarise in chat: reconcile counts, what was archived with which signals, flagged leftovers, follow-ups triage counts, **`MANUAL:`** / **`postponed:`** slugs. Commit or push **only** when the user explicitly asked you to handle hosting or center git for this pass.

## Scope guard

**This skill**

- Runs **`reconcile`** ( **`gh`**, file moves, parent body notes where applicable).
- Runs **`list-candidates`** (read).
- Triages **`## Follow-ups`** on plans about to be archived and on reconcile-auto-archived plans; can append to other plans’ **`## Follow-ups`** with optional **Elaborate first** passes.
- Runs **`archive`** per selected slug (skipping **`postponed:`**).
- Runs **§5 Post-ship workspace cleanup** when approved (`detect-stale-workspaces`, **`post-reconcile-workspace-cleanup.mjs`**, MCP detach, **`prune-sessions`**).

**Out of scope**

- Creating worktrees (**`coding-session`**).
- Editing plan frontmatter or sidecar YAML directly — **`plan-state.mjs`** is the sole writer for sidecar Plan Board fields (`status`, `archived`, `parent`, `worktrees`, `prs`, `session`) per **`.sedea/centers/sedea/rules/8_plan-board-contract.mdc`**; step 3.5 only edits **`## Follow-ups`** markdown bodies.
- Promoting routed bullets into **Changes** / **Caveats** / **Delivery phases** — planning work the user does later.
- Pushing fixes to individual PRs. If a flagged plan needs an amend, tell the user; do not silently **`gh`**-mutate from here.

## Inline result contract

When run inline on **`coding-session`**, report these fields in prose via **`## Completion (inline)`** so the parent can merge into coding-session `outputs`:

- `outputs.targetPlanPath`
- `outputs.targetPlanSlug`
- `outputs.prUrl`
- `outputs.prNumber`
- `outputs.prState`
- `outputs.deployStatus`
- `outputs.deployTodoStatus`
- `outputs.archivedSlugs`
- `outputs.flaggedSlugs`
- `outputs.postponedSlugs`
- `outputs.followUpsIntegrated`
- `outputs.followUpsDropped`
- `outputs.manualFollowUps`
- `outputs.remainingTasks`
- `outputs.shipPhase` — `done` with `rowStatus: closed` when target archived; `reconcile` when follow-ups remain; `blocked` when gates fail
- `outputs.rowStatus` — per bubble-up semantics below
- `outputs.blockedReason` — when `rowStatus` is `blocked`
- `outputs.cleanedWorktrees` — when §5 cleanup ran
- `outputs.deletedWorktreeNames` — when §5 cleanup ran
- `outputs.mainPullStatus` — when §5 cleanup ran

Stop when the target plan is archived or explicitly not archive-eligible with no remaining follow-up triage, or when flagged plans / postponed follow-ups / manual routing remain (`continuationStatus: active` on **`coding-session`**). Do not auto-invoke other skills.

| Outcome | `shipPhase` | `rowStatus` | Key fields for §8 recap |
|---------|-------------|-------------|-------------------------|
| Target archived / ship complete | `done` | `closed` | `targetPlanPath`, `archivedSlugs`, `remainingTasks` |
| Flagged / postponed follow-ups | `reconcile` | `open` | `targetPlanPath`, `flaggedSlugs`, `postponedSlugs`, `remainingTasks` |
| Script or gate blocked | `reconcile` | `blocked` | `targetPlanPath`, `remainingTasks`, `blockedReason` |

## Mission Control section 8 sync (via coding-session)

**`plan-reconcile`** is **not** a separate child terminal. §8 ship ledger fields reach the Squad Leader via **`coding-session`** terminal **`outputs`** on re-emit — include `targetPlanPath`, `shipPhase`, `rowStatus`, `archivedSlugs`, `remainingTasks`, and `blockedReason` when applicable per **`../coding-session/SKILL.md`** § *Mission Control section 8 sync*. **Forbidden:** manual **Ship recap** on the leader dispatch.

### Inline closure gate (binding)

When **`upstreamSkill`** is **`coding-session`**, close every inline pass with structured choice **before** emitting **`## Completion (inline)`** prose to the parent — even when archive mutations, follow-ups triage, and §5 cleanup are complete or skipped.

**When required:** After Flow steps **1–6** finish (or pause with a terminal outcome ready for handback). **Forbidden:** prose-only reconcile summary without this gate under Checkpoint trust. **Forbidden:** emitting **`mission_control_send_agent_result`** from this skill — the parent **`coding-session`** lane owns MCP results.

Put reconcile counts, archived slugs, flagged/postponed leftovers, and §5 cleanup summary in **`display.markdown`**.

USER_CHECKPOINT — confirm plan-reconcile inline closure and hand results back to coding-session.

| Option id | Label (brief) | Act |
|-----------|---------------|-----|
| `confirm-inline-closure` | Confirm — hand reconcile results back to coding-session | Emit **`## Completion (inline)`** on the **next** turn with fields from [Inline result contract](#inline-result-contract); parent merges into **`coding-session`** `outputs` |
| `review-reconcile-summary` | Review reconcile summary first | Re-present summary; re-open this gate |
| `continue-reconcile` | Continue reconcile work on this pass | Resume Flow from the next incomplete step; do **not** emit **`## Completion (inline)`** yet |
| `defer-closure` | Defer closure — keep coding-session active | One-line defer recap; parent keeps `continuationStatus: "active"` |
| `more-details` | More details for option _ | Elaborate; re-open this gate |

- **`defaultOptionId: confirm-inline-closure`** when the pass reached a clean handback (target archived, no hard script failures, or explicit skip/defer documented in recap).
- **Next-step resolution:** Auto-advance through steps **1**, **2**, **4**, and **6** recap on the happy path — no `USER_CHECKPOINT` until [Inline closure gate](#inline-closure-gate-binding).

**Standalone dispatch:** When [Standalone dispatch (stop immediately)](#standalone-dispatch-stop-immediately) applies, **skip** this gate — stop before mutations instead.

## Completion (inline)

Report the fields from **## Inline result contract** in prose to the invoker on the **same lane**. Do **not** emit `mission_control_spawn_agent`, `mission_control_send_agent_result`, or `mission_control_propose_dispatch_resolution`. Do **not** add a **MCP result** (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

Normally invoked inline from **`coding-session`** after deploy verification or when the developer chooses reconcile on that lane. **`plan reconcile`** phrases on the active coding-session lane use the same procedure body.

## Extensions

Maintenance subcommands and future UX — **not** part of the default reconcile flow (§§1–4). Run only when the developer explicitly requests them or dry-run output shows they are needed.

- **`shippedPrs` frontmatter** — **`reconcile`** / **`archive`** write **`shippedPrs`** from sidecar **`prs[]`** at archive time. **`list-candidates`** prefers that field over body-regex hits when present (adjust step 2 commentary when this field is populated).

- **`backfill-prs-from-body`** — optional pre-step when sidecar **`prs[]`** is empty but merged PRs appear only in plan body prose. Procedure, triggers, and CLI examples: **`.sedea/centers/research-and-development/docs/development-process.md`** § *Plan metadata backfill (`backfill-prs-from-body`)*. Gate with **AskQuestion** before any non-dry-run run; then continue **Flow** from step 1.
