# plan-and-deliver — spawn contracts

This mission uses **three execution shapes** (see **`.sedea/centers/sedea/skills/README.md`** for dual-mode authoring). Parent resume for the **Squad Leader** is in **`../plan.mdc`** § **Spawn, wait, and parent resume** (planning §§3–7) and § **8** (ship oversight). Host spawn/result protocol is in **`.sedea/centers/sedea/rules/4_mission.mdc`**.

## Normative execution mode (plan-and-deliver)

**Do not infer mode from the presence of `## Completion (spawned)` alone** — many skills document both sections for dual-mode authoring. Use this table for **plan and deliver** on the **software-development** center.

| Skill | Normative mode on this mission | Invoker | Terminal / result |
|-------|----------------------------------|---------|-------------------|
| **`master-planner`** | **Spawned only** — new child lane; may emit **`coding-session`** spawn via inline **`pr-plan`** §5d on **this** lane (distinct from Squad Leader §§1–7 non-spawn) | Squad Leader §5 (`mission_control_spawn_agent`) | **`mission_control_send_agent_result`** on child lane |
| **`pr-plan`** | **Inline only** — same lane as invoker | **`new-plan`** step 4 (`parentAgentRole: new-plan-agent`) | **`## Completion (inline)`** — no `mission_control_send_agent_result` for **`pr-plan`** |
| **`pr-plan`** → **`coding-session`** | Spawn after §5c **Start coding session** (or **`phase-planner`** Step **5f** when inline **`pr-plan`** skipped §5c) | **`pr-plan`** lane, or **`phase-planner`** after **`prPlanHandoffSkipped`** | Child **`coding-session`** uses **`mission_control_send_agent_result`** |
| **`author-prd`** | **Spawned only** | Squad Leader §3 | Child terminal |
| **`ad-hoc-prd`** | Spawned (**`single-phase`** §3, **`debug-and-fix`** §5c — **not** plan-and-deliver §3) | **`single-phase`** / **`debug-and-fix`** Squad Leader | Child terminal |
| **`delivery-phases`**, **`pr-breakdown`**, **`new-plan`** | **Primary:** inline on **`master-planner`** / **`phase-planner`** lane on **`plan and deliver`** | Parent planning skill | Inline completion merged into parent |
| **`phase-planner`** | Spawned from inline **`new-plan`** (optional) | **`new-plan`** | Child terminal; **owns phase delivery** on its lane until **`phaseShipComplete`** or explicit defer/abandon — Master Plan lane ack-only meanwhile |
| **`phase-planner` + autoContinue** | Inline **`pr-breakdown`** on phase lane | **`phase-planner`** | inline §5 on phase plan |
| **`phase-planner` + single-PR** | **`pr-breakdown`** on phase plan | **`phase-planner`** | see **`phase-planner/SKILL.md`** §5b |
| **`coding-session`** | Spawned (from **`pr-plan`** §5d or **`phase-planner`** §5f) or detached entry | **`pr-plan`**, **`phase-planner`** (inline subtree), developer, dispatch | Child terminal + inline ship skills |
| **`hosting-repo-rules`** | **Spawned only** — detached parallel fork after **`coding-session`** terminal when spawn contract matches | **`master-planner`** Step **7c**, **`phase-planner`** Step **5e** (fire-and-forget — not **`pendingByParent`**) | Child **`mission_control_send_agent_result`**; parent updates product row **`rulesUpdatesStatus`** |
| **`pr-review`**, **`create-pr`**, **`deploy-walk`**, **`plan-reconcile`** | **Inline only** on active **`coding-session`** or **`hosting-repo-rules`** | **`coding-session`**, **`hosting-repo-rules`** | Prose to invoker ship lane — no separate child terminal |

**Dual-mode / common mistakes:** See table; detail in [`docs/spawn-ship-contracts.md`](../docs/spawn-ship-contracts.md). Glossary for colliding step labels: **`.sedea/centers/research-and-development/docs/development-process.md`** § *Agent glossary — step and section labels*.

## Inline execution (same lane)

When a skill runs **inline** on the invoker’s lane (not spawned via **`mission_control_spawn_agent`**):

- Report **`## Completion (inline)`** (or the mission’s inline-only result section) in **prose** to the invoker.
- Do **not** emit **`mission_control_send_agent_result`** under the inline section — MCP spawn/result tooling applies **only** under **`## Completion (spawned)`** (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).
- Do **not** emit **`mission_control_spawn_agent`** unless the protocol step explicitly switches to spawned mode.

**plan and deliver** normally spawns planning and ship skills on child lanes; inline sections exist for dual-mode authoring and same-lane ship steps. **`pr-review`**, **`create-pr`**, **`deploy-walk`**, and **`plan-reconcile`** are **inline-only** on **`coding-session`** (no **`## Completion (spawned)`** on those skills). **`pre-pr-review`** is **spawn-only** from **`coding-session`** — **forbidden** inline on the coding-session lane; **auto-spawn** = **`mission_control_spawn_agent`** + wait for child **`mission_control_send_agent_result`**, not self-execute review steps here.

**Inline `deploy-walk`:** Self-run agent steps per **`deploy-walk/SKILL.md`**; manual steps use **`USER_CHECKPOINT`**.

## software-development center edit destination gate (binding)

Applies to **all PRD and planning skills** on this center (`author-prd`, `ad-hoc-prd`, `brainstorm-research`, `master-planner`, `phase-planner`, `delivery-phases`, `pr-breakdown`, `new-plan`, `pr-plan`, and **`quick-fix-plan`**). Happy-path PRD/plan writes under **`.sedea/operations/`** do **not** open this gate.

**Trigger:** any step that would **create, edit, move, or delete** files under **`.sedea/centers/research-and-development/`** (center git content — rules, missions, skills, docs, `center.yaml`).

USER_CHECKPOINT — pick software-development center edit destination before any center write.

| Option id | Label | Action |
|-----------|-------|--------|
| `ship-app-rd` | Ship in `sedea-ai/software-development` — Sedea app process / ops | Continue on the **app-focused** center remote; require hosting **Own centers** listing for `software-development` → `git@github.com:sedea-ai/software-development.git` and **`CENTER_WORKTREE_ROOT`** before writes |
| `delegate-base-rd` | Delegate to base center — `sedea-centers/software-development` | **Stop** local center writes; developer continues on **`sedea-centers-development-hosting-repo`** for **general** software-development center operating-model changes |
| `pause` | Pause — stop until I say more | No writes |
| `more-details` | More details for option _ | Elaborate; re-ask |

**How to choose (nature of the change):**

| Destination | When |
|-------------|------|
| **`sedea-ai/software-development`** (`ship-app-rd`) | Change reflects how the **Sedea app** is developed, its processes and operations |
| **`sedea-centers/software-development`** (`delegate-base-rd`) | Change applies to how the software-development center operates **in general** — not app-specific |

**Forbidden:** writing center files without this gate; treating **`sedea-centers/software-development`** as Own on **`sedea-ai/app`**; editing the primary hosting clone’s submodule checkout without **`CENTER_WORKTREE_ROOT`**.

Each listed skill **must** point here from its Checkpoint / pre-write guidance. Do not re-author a divergent option table in individual skills.

## Recap, structured choice, act (plan-and-deliver)

Mission Control delivery: recap + modal + act. Canonical rules: **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** § **Context and structured choice**; hosting runtime **`.cursor/rules/mission-control-agent-runtime.mdc`**.

| Stage | Purpose |
|-------|---------|
| **Recap** | Plan link, one-line summary |
| **Structured choice** | Modal approval / gates (`AskQuestion` or **`mission_control_present_structured_choice`**) |
| **Act** | Spawn, terminal result, implementation after modal selection |

**Checkpoint trust:** Auto-advance happy-path steps; **`USER_CHECKPOINT`** at gates and exceptions only. **Forbidden:** prose-only exit when structured choice is required.

**On-demand:** Planning open-item modal contract and ship-path gate examples — [`docs/spawn-ship-contracts.md`](../docs/spawn-ship-contracts.md). Relevant Links registration — same doc § *Relevant Links*; rule **50** § *Relevant Links (documents)*.

## Planning spawn (summary)

Squad Leader §§3/§5 spawn **`author-prd`** / **`master-planner`**; decomposition runs **`delivery-phases`**, **`pr-breakdown`**, **`new-plan`**, **`pr-plan`**, **`phase-planner`** per **§ Normative execution mode**. Depth-first expansion: **`planning-mode-templates.md`** § *Depth-first plan-tree traversal*; rule **30** § *Depth-first expansion eligibility*.

## Relevant Links — post-write registration

Mission Control **Relevant Links** refresh from warm-up, spawn `*Path` / `*Ref` inputs, terminal `outputs` keys ending in `Path` / `Ref`, ship-ledger merges, and **explicit** mid-session registration. There is **no** host auto-sniff of Write/StrReplace. Planning skills that create or materially edit ops artifacts **must** register those paths on the calling lane.

### MCP tool

| Tool | Caller | Purpose |
|------|--------|---------|
| **`mission_control_update_relevant_documents`** | Any agent on **this** lane | Append in-workspace paths to the **calling slot’s** `relevantDocuments` |

**Args (agent-facing):** `paths` — non-empty array of absolute (or workspace-relative) paths, or `{ path, kind?, label? }` objects. Optional `kind`: `plan` \| `prd` \| `skill` \| `rule` \| `other`. Host injects lane identity — **forbidden:** `dispatchId`, `slotId`, `correlationId` in args.

**Delivery:** Stdio MCP acks are transcript-only; the extension host stream mirror normalizes, dedupes, persists, and patches the panel.

### When to call (binding)

After **Write**, **StrReplace**, or equivalent that **creates or materially edits** a workspace file the lane wants visible in Relevant Links, call **`mission_control_update_relevant_documents`** on the **same turn** (or the next turn before StreamFinal) with those absolute paths.

| Call | Skip |
|------|------|
| New or materially edited ops plans, PRDs, brainstorm reports under **`operationsDocsDirectory`** / `.sedea/operations/**/{docs,plans}/` | Read-only `Read` / Grep with no write |
| Other authored workspace documents the developer should open from Relevant Links | Paths already registered this session with no content change |
| | Warm-up rules, every `@path` touch, sibling-dispatch folders, transient scratch, build artifacts |

**Authored or materially edited only** — do **not** blanket-register every path you read or the warm-up manifest.

### Kind hints

| Situation | Prefer |
|-----------|--------|
| Plan Board `.plan.md` / sidecar pair (plan body) | `kind: plan` |
| PRD / ad-hoc PRD under ops docs | `kind: prd` |
| Brainstorm report, misc ops docs | `kind: other` (or omit — host may infer) |

Optional **`label`** overrides the panel display name when the basename is opaque.

### Relationship to other refresh paths

| Path | Role |
|------|------|
| Warm-up / spawn `*Path` / `*Ref` | Initial seed — still call MCP for **mid-session** creates |
| Terminal `outputs` `*Path` / `*Ref` | Durable child handoff on **`mission_control_send_agent_result`** — does **not** replace mid-session register on the active lane |
| **`mission_control_update_lane_display`** / **`mission_control_update_dispatch_display`** | Tab / dispatch chrome only — **not** documents |

### Forbidden

| Pattern | Why |
|---------|-----|
| Register every read path or entire warm-up manifest | Noise; v1 control is skill wording |
| Supply host identity keys in MCP args | Host injects caller slot |
| Out-of-workspace / sibling-dispatch paths | Host rejects |
| Prose-only “add this to Relevant Links” without MCP | Panel does not update |
| Treating display-metadata MCP as a documents substitute | Wrong tool |

**Per-skill hooks:** `author-prd`, `ad-hoc-prd`, `brainstorm-research`, `master-planner`, `phase-planner`, `new-plan`, `pr-plan`, `pr-breakdown`, and `delivery-phases` each name the post-write call next to their Write/StrReplace steps. Cadence cross-refs: [rule **50**](../../../../rules/50_mission-control-display-metadata-discipline.mdc) § *Relevant Links (documents)*; [development-process.md](../../../../docs/development-process.md) § *Agent UX pitfalls*.

### Planning open-item modal contract

Planning composition skills that surface review gaps before approval use the same modal shape as **`author-prd/SKILL.md`** Step **10**. This applies when a planning lane presents open items in generated PRDs, Master Plans, phase plans, PR breakdowns, plan stubs, or PR plans before the developer approves, revises, defers, or starts implementation.

**Detect open items before building the modal.** Open items include unresolved `TBD` markers, missing required plan sections, contradictions, incomplete acceptance or handoff details, blocked readiness states, and any agent-discovered decision that would otherwise be hidden in prose.

**When open items exist — one modal, multiple questions:**

- **`displayMarkdown`** renders a numbered list of the open items. Each item states the document location, the gap, why the decision matters, and the agent-proposed resolution options.
- **`askQuestion.questions`** contains **one entry per open item**. Each question has its own `id`, `prompt`, and item-scoped `options` (for example accept a proposed resolution, choose an alternate resolution, mark not applicable, defer as follow-up, gather more evidence, or request more details for that item).
- **The final question in the array** is always the terminal approval / routing question for the gate, with options such as approve, revise, defer, start implementation, or **More details for option _** as appropriate for the skill.
- **Forbidden:** combining all open-item decisions into one `questions` entry; mixing item-resolution options with terminal approve / revise options in the same question; emitting a resolve-only modal that omits the terminal approval / routing question.
- **Many open items:** batch across turns when one modal would be impractical. Each batch still includes the terminal approval / routing question last, so the developer can approve with remaining gaps explicitly documented when the skill allows it.

**When no open items remain** (or only visible follow-up notes the developer may accept as-is), use a single terminal approval / routing question with the gate's normal options and **More details for option _**.

**Act after selection.** Apply selected item resolutions only after the developer picks them in the modal, rewrite or re-check the affected artifact, then return to the same modal shape until the gate reaches its terminal branch. Do **not** treat writing the draft, rendering the recap, or silence as approval.

**Reference implementations (planning):**

| Skill | Recap + structured choice (same turn) | Act |
|-------|---------------------------------------|-----|
| **`pr-breakdown`**, **`delivery-phases`** | §5d link + one-line summary + §6 modal | §6 act-after-select (depth-first); **`pr-breakdown`** **`approve-list`** may auto-expand PR **1** inline under **`master-planner`** |
| **`pr-plan`** | §5c recap + modal (skipped when `skipPrPlanHandoffModal` auto-chain) | §5d spawn |
| **`author-prd`**, **`ad-hoc-prd`** | Step 10 / 5 recap + open-item elaboration; **one `questions` entry per open item**, then Approve/Revise as **last** question | Step 10a / 5a apply resolution for answered item; step 11 / 6 terminal on Approve |
| **`master-planner`** | §7 draft + §7 approval modal same turn; §7a status + §7b next moves | §7c |
| **`phase-planner`** | §4f echo / §5c route modal; Step **5f** after **`prPlanHandoffSkipped`** | §5b inline decompose / Step **5f** **`coding-session`** spawn |
| **`new-plan`** | stub + parent link + populator gate | populator spawn |

**Ship and ops skills:** **`coding-session`** (Checkpoint § *Checkpoint turn UX* — three-stop model (post-create-pr, **`pr-review`** disposition, Staging test manual); auto-advance happy path including review feedback (**`fix-now-session`** **same turn** — no modal; append **`proposedFollowUps`** to plan), create-PR follow-ups (**`approve-followups-create-pr`** **same turn**), rebase `--force-with-lease`, pre-merge **`delegate-merge-confirm`**; **`USER_CHECKPOINT`** at worktree-open when layer 2 required, **post-create-pr** after inline **`create-pr`**, implementation continuation (exception), repo rules reconciliation (exception), ship cut-point (exception), Non-Checkpoint/exception review-feedback and create-PR handoff only, and Staging test manual steps; center **`worktree-setup.sh`** bootstrap hints; **pre-PR ship gate** — no push/create-PR modals until **`pre-pr-review`** **`go`** except executive override; **auto** pre-PR spawn after cut-point + Local test; **auto** inline **create-pr** on clean **go**; inline **`pr-review`** (Checkpoint auto-disposition for CI/Must); **agent-delegated approve + merge** when authorized; **auto** post-merge cleanup when merged; inline **deploy-walk**; inline **plan-reconcile**), **`worktree-bootstrap`** (**deprecated** — exception-only inline retry; normative bootstrap is center setup on **`coding-session`**), **`pre-pr-review`** (Checkpoint § *Checkpoint turn UX* — spawn-only reviewer lane; Steps **1–8** auto-advance including Step **8** terminal + parent refocus; **no** developer-input **`USER_CHECKPOINT`** on this lane; findings hand back to **`coding-session`** [Review feedback approval gate](../coding-session/SKILL.md#review-feedback-approval-gate) — Checkpoint auto-implements). **`pr-review`** (Checkpoint § *Checkpoint turn UX* — auto-advance Steps **0–3a**, **1b**, and **5** on happy path; **`USER_CHECKPOINT`** at [Disposition gate](../pr-review/SKILL.md#step-4--report-and-disposition-gate) and [Post-fix commit/push gate](../pr-review/SKILL.md#post-fix-commitpush-gate-binding); cycle resume via **`coding-session`** [Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate) — **not** rule **2** external-wait). Step **4** disposition gate uses **contextual** `options` from triage counts (see § *Build disposition options*). Prefer **AskQuestion** or **`mission_control_present_structured_choice`** when recap and modal belong in one message. Gate detail: **`coding-session/SKILL.md`** § *Checkpoint turn UX*, § *Repo rules reconciliation gate*, § *Pre-PR ship gate (push/PR)*, § *Post-create-pr handoff gate*, and § *Implementation continuation gate*.

**Lane pick (no resolved target):** emit *Where we are now in the plan tree* snapshot, then structured choice per **30_planning-target-resolution** § *Sedea input channel* (MCP or split — not prose menus).

**Spawned child lanes:** Cloud/spawned agents lack the native AskQuestion tool. **Every turn** **must** call **`mission_control_present_structured_choice`** (MCP tool call, recap in **`displayMarkdown`**, options in **`askQuestion`**) or split per rule **2** priority **3**. Wire format: rule **2** § **`mission_control_present_structured_choice` MCP tool contract (binding)**. Gate templates: **`coding-session/SKILL.md`** § *Spawned lane — MCP structured choice (binding)*.

## Planning spawn (Squad Leader §3, §5, decomposition tree)

Squad Leader steps **§3** and **§5** spawn child lanes for **`author-prd`** and **`master-planner`**. **`master-planner`** runs **`delivery-phases`**, **`pr-breakdown`**, and **`new-plan`** **inline**. **`phase-planner`** runs **`delivery-phases`** and **`pr-breakdown`** **inline** on its child lane. Inline **`new-plan`** runs **`pr-plan`** inline and may still spawn **`phase-planner`**. **Depth-first expansion:** parent lists show all rows; **`new-plan`** runs only for ship-eligible indices (phases sequential; PRs per **`### Sequencing`** stages) — see **development-process.md** § *Depth-first plan-tree traversal* and rule **30** § *Depth-first expansion eligibility*. Skills that support both modes still document **`## Completion (spawned)`** and **`## Completion (inline)`** — use **§ Normative execution mode** above for which mode applies on this mission.

| Skill | Typical invoker | Squad Leader ledger |
|-------|-----------------|---------------------|
| `author-prd` | Squad Leader §3 | Child lane owns PRD recap + approval at step **10** USER_CHECKPOINT ( **`## Checkpoint turn UX (skill-local)`** ); **one `questions` entry per open item, Approve/Revise last** — never resolve-only without Approve/Revise; leader §4 only after `terminal` + `developerApprovedPrd: true`; no nested child lanes |
| `master-planner` | Squad Leader §5 | Seed ledger; §6 ack when `continuationOwner: master-plan-agent` |
| `phase-planner` | inline **`new-plan`** spawn | Runs **`delivery-phases`** / **`pr-breakdown`** inline on **its child lane**; owns phase subtree through ship-complete; **`master-planner`** ack-only while **`continuationOwner: phase-planner-agent`** is active |
| `delivery-phases` | **`master-planner`** or **`phase-planner` inline** | Runs **`new-plan`** inline on invoker lane |
| `pr-breakdown` | **`master-planner`** or **`phase-planner` inline** | Same as delivery-phases |
| `new-plan` | **`delivery-phases`** / **`pr-breakdown` inline** | Indexed stub + parent link; **`pr-plan`** inline; may spawn **`phase-planner`** |
| `pr-plan` | **inline `new-plan`** on planner or phase-planner lane | Layer 1 handoff; §5d spawn on invoker lane, or **`phase-planner`** Step **5f** when §5c skipped via **`skipPrPlanHandoffModal`** |

Field-level `outputs` and `continuationStatus` rules: each skill’s **`## Completion (spawned)`**.

### Implementation consent before worktrees (two layers)

| Layer | Skill | Primary output |
|-------|-------|----------------|
| 1 — Planning handoff | `pr-plan` | `readyForImplementation`, `implementationHandoffStatus` — does **not** advance §8 `phase` past `not-started` |
| 2 — Worktree open | `coding-session` | `developerApprovedImplementation` after **`plan-ws-completeness.mjs`** passes or override in the worktree-open gate |

**`pr-plan` → `coding-session`:** sequential skills on **different lanes**. **`pr-plan`** drafts §§ 1–4 and may sketch §§ 5–8; after **AskQuestion** **Start coding session**, **`pr-plan`** emits **`mission_control_spawn_agent`** for **`coding-session`** (§5d). When inline under **`phase-planner`** with **`skipPrPlanHandoffModal`**, §5c is skipped on the **`pr-plan`** turn only — **`phase-planner`** Step **5f** offers the same §5d-equivalent spawn (or §5c re-entry) on the **phase-planner** lane; **forbidden** to redirect to detached entry or **`master-planner`** §7b as the default. The **child lane** then owns worktrees, workspace attach, **implementation in the worktree** (default), §§ 5–8 fill, and ship execution — not prompt-only handoff unless **`promptOnly: true`** or **Defer implementation**. Detached **`coding-session`** entry may use prompt-only or implement on that detached lane after layer 2. See **`pr-plan/SKILL.md`** § *Handoff to coding-session*, **`phase-planner/SKILL.md`** Step **5f**, and **`coding-session/SKILL.md`** § *Execution mode after worktree attach*.

### Worktree removal ownership (binding)

**Do not remove worktrees you do not own.** Applies to every ship skill on **`coding-session`**, **`hosting-repo-rules`**, and **`plan-reconcile`** §5.

| Source | Contract |
|--------|----------|
| [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Worktree ownership* | Four preconditions before detach/remove |
| [`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`](.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc) § *Worktree removal ownership (binding)* | R&D ship lanes |
| **`coding-session/SKILL.md`** § *Post-merge workspace cleanup* | Primary post-merge owner |
| **`plan-reconcile/SKILL.md`** §5 | Idempotent fallback only |

**Forbidden:** **`git worktree remove`**, **`git worktree prune`**, **`sedea_remove_worktree_folder`** on paths **this pass** did not create and mount; repo-wide cleanup from **`git worktree list`**; **`git worktree remove`** on **`HOSTING_ROOT`**. **`git worktree list` is read-only** when ownership is unclear — stop and use structured choice.

## Ship spawn (detached / coding-session chain)

**On-demand:** [`docs/spawn-ship-contracts.md`](../docs/spawn-ship-contracts.md) — parallel **`hosting-repo-rules`** fork, worktree-bootstrap drain gate D1–D5, worktree removal ownership detail.


Detached/nested ship lanes — **`## Completion (spawned)`** vs inline per skill.

| Skill | Typical spawner | Outputs section | §8 ship phase hints |
|-------|-----------------|-----------------|---------------------|
| `coding-session` | **`pr-plan`** §5d / **`phase-planner`** §5f / dispatch | `## Implementation handoff result` | `implementing`; ship gates in **`coding-session/SKILL.md`** |
| `hosting-repo-rules` | **`master-planner`** / **`phase-planner`** after **`coding-session`** terminal | `## Completion (spawned)` | parallel fork — [`spawn-ship-contracts`](../docs/spawn-ship-contracts.md) |
| `worktree-bootstrap` | **Deprecated** — inline retry only | legacy contract | `worktree` |
| `pre-pr-review` | `coding-session`, **`hosting-repo-rules`** | Step 8 — Report and result | `pre-pr-review`; `recommendation: go` |

**Not §8 host-sync children:** inline **`pr-review`**, **`create-pr`**, **`deploy-walk`**, **`plan-reconcile`**, and deprecated inline **`worktree-bootstrap`** retry — milestones **must** ship §8 fields on the next **`coding-session`** terminal re-emit (see § *§8 terminal contract* below).

The Squad Leader **§8** ship ledger updates via Mission Control **host sync** when ship child lanes emit terminals with required **`outputs`**. See **`../plan.mdc`** §8 *Mission Control host sync* and **development-process.md** § *Leader-lane §8 host sync*.


### §8 terminal contract (ship skills)

When a ship skill finishes a milestone on a **detached** lane, the terminal **`mission_control_send_agent_result`** **must** include **`targetPlanPath`**, **`shipPhase`**, and **`rowStatus`** (host may infer phase when documented). **Do not** nudge manual recap on the leader dispatch. Field hints: § *Mission Control section 8 sync* in each ship `SKILL.md`.

## Inline-only (no spawn)

| Skill | Invoker | Result section | §8 ship ledger |
|-------|---------|------------------|----------------|
| `pr-review` | Active **`coding-session`** or **`hosting-repo-rules`** agent on its lane | `## Inline result for coding-session` (coding) or invoker prose (rules) | Invoker re-emit with `shipPhase: pr-review` — host sync when §8 fields present |
| `create-pr` | Active **`coding-session`** or **`hosting-repo-rules`** agent on its lane | `## Completion (inline)` | `pr-open` or outsider handoff (`implementing`) via invoker terminal re-emit — no separate child terminal |
| `deploy-walk` | Active **`coding-session`** agent on its lane (Local test after commit, Staging test after PR open, Production after merge, or deploy phrases) | `## Completion (inline)` | `deploy-walk` via **`coding-session`** terminal re-emit — no separate child terminal |
| `plan-reconcile` | Active **`coding-session`** agent on its lane (after production walk, stale worktree pick, or *plan reconcile* phrase) | `## Completion (inline)` | `reconcile` / `done` via **`coding-session`** terminal re-emit — no separate child terminal |

**`pr-review`**, **`create-pr`**, **`deploy-walk`**, and **`plan-reconcile`** return through the **active ship invoker** (**`coding-session`** or **`hosting-repo-rules`**). §8 updates on the leader dispatch via invoker terminal re-emit and host sync when documented (**`../plan.mdc`** §8).



## Required terminal notification (all spawned children)

Every **spawned** child ends with **one parent notification** on its lane via MCP **`mission_control_send_agent_result`**:

| Field | Rule |
|-------|------|
| **`status`**, **`summary`** | Required |
| **`outputs`**, **`errors`** | Optional per skill **`## Completion (spawned)`** |
| **`correlationId`** | **Forbidden** in MCP args — host resolves from child lane spawn context |

Re-emit an **updated** MCP result after user-requested follow-up on that lane (same spawn session).

Populate **`outputs`** from the skill's **`## Completion (spawned)`** and any referenced domain section above.

**MCP result protocol:** see rule **4** § *MCP result protocol* — tool descriptor on workspace server; forbidden identity keys in § *Host-resolved identity* above.

## Definitive `bootstrapRules` (Software Development center layer — plan and deliver)

When Mission Control dispatches **`centerSlug === research-and-development`**, the host merges this path into **`effectiveWarmUp`** after the Sedea bootstrap layer (PRD §5.4; host resolver ships in phase 6 PR 3):

| Path | Purpose |
|------|---------|
| `.sedea/centers/research-and-development/rules/bootstrap.mdc` | Sole Software Development `alwaysApply: true` bootstrap (≤10 KB) — mirrors **`.sedea/centers/sedea/rules/bootstrap.mdc`** pattern |

Spawned skill **`SKILL.md`** § *Warm-up manifest* tables document this row under **`bootstrapRules`**. **`laneRules`** and **`skillWarmUp`** tables in the same section are unchanged by bootstrap authoring alone — numbered Software Development rules stay **`alwaysApply: true`** until the flip PR lands.

## Definitive `laneRules` (plan and deliver)

Normative minimum **`laneRules`** paths per lane role — merged into **`effectiveWarmUp`** after Sedea and Software Development **`bootstrapRules`** per [`.sedea/centers/sedea/docs/lane-manifest-contract.md`](.sedea/centers/sedea/docs/lane-manifest-contract.md). Host-owned storage; invokers supply on **`mission_control_spawn_agent`** when skill frontmatter alone does not carry role minimums (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Lane warm-up manifest*).

| Lane role | Definitive `laneRules` (in addition to bootstrap) |
|-----------|---------------------------------------------------|
| **Squad Leader** | `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`, `.sedea/centers/sedea/rules/4_mission.mdc`, `.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`, `.sedea/centers/research-and-development/docs/development-process.md` |
| **`author-prd` child** | `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/author-prd/SKILL.md`, `.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc` (§§1–3) |
| **`brainstorm-research` child** | `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/brainstorm-research/SKILL.md`, `.sedea/centers/research-and-development/rules/31_dispatch-scope.mdc`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` |
| **`ad-hoc-prd` child** | `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/ad-hoc-prd/SKILL.md`, `.sedea/centers/research-and-development/rules/31_dispatch-scope.mdc`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` |
| **`master-planner` child** | `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`, `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/master-planner/SKILL.md`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` |
| **`quick-fix-plan` child** | `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`, `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`, `.sedea/centers/research-and-development/missions/quick-fix/skills/quick-fix-plan/SKILL.md`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` |
| **`coding-session` child** | `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`, `.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc`, `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/coding-session/SKILL.md` |
| **`phase-planner` child** | `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`, `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/phase-planner/SKILL.md`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` |
| **`pre-pr-review` child** | `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`, `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pre-pr-review/SKILL.md`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` |
| **`worktree-bootstrap` child** (deprecated — drain gate **D4**) | `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`, `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/worktree-bootstrap/SKILL.md`, `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` |

**Spawn binding exceptions** (`ad-hoc-prd`, **`quick-fix-plan`** mission `plan.mdc`) — [`spawn-ship-contracts.md`](../docs/spawn-ship-contracts.md) § *Default warm-up*.


**Parity / verify:** **`verify-lane-warmup-parity.mjs --bootstrap full`** (and **`--bootstrap slim`** before alwaysApply flip); **`verify-warmup-bytes.mjs --table`** for per-role spawn byte CI; **`--enforce-spawn-byte-budget`** when CI enforce is enabled. Roles, sign-off, and spawn **`warmUpRules`** binding detail — [`docs/spawn-ship-contracts.md`](../docs/spawn-ship-contracts.md) § *Default warm-up — cap exceptions and maintenance*.

## Universal spawn preflight (all plan-and-deliver spawners)

Run the checklist **before every child spawn** on any lane (Squad Leader §§3/§5, **master-planner** Step 7, **pr-plan** §5d, ship-chain spawns). Host behavior is in **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Agent-to-agent spawn protocol* (MCP-only, host-resolved identity); this section is the **plan-and-deliver** operator checklist.

Host MCP spawn/result and forbidden identity keys — rule **4** § *Agent-to-agent spawn protocol*; detail in [`spawn-ship-contracts.md`](../docs/spawn-ship-contracts.md).

### MCP spawn preflight (`mission_control_spawn_agent`)

| Step | Check |
|------|--------|
| M1 | Read target **`SKILL.md`** — confirm it documents MCP as primary (or MCP with MCP first) before switching off MCP-only |
| M2 | Every **`required: true`** input in skill frontmatter appears in MCP **`inputs`** with a valid value (see MCP spawn preflight) |
| M3 | Required MCP args present: **`skillPath`**, **`slug`**, **`name`**, **`description`**, **`inputs`** — camelCase keys match skill frontmatter |
| M4 | **Forbidden args absent** — no host-resolved identity keys (§ *Host-resolved identity* above) |
| M5 | Optional only when needed: **`warmUpRules`**, **`initiatingPrompt`** (≤ 32 KiB) |
| M6 | **`skillPath`** resolves under the correct center (Software Development skills under **`.sedea/centers/research-and-development/`**) |
| M7 | On tool validation failure: stop, fix the failing row, retry spawn — new successful spawn mints a **new** host **`correlationId`** |
| M8 | **`name`** / **`description`** — **lane title prefix** + semantic title per [rule **50**](../../../../rules/50_mission-control-display-metadata-discipline.mdc) § *Lane title prefix conventions* and § *Lane title prefix (spawn `name`)* below; refresh stale child tab via **`mission_control_update_lane_display`** |
| M9 | **Spawn-ack semantics** — MCP response with **`transcriptOnly: true`** / **`hostMirrorRequired: true`** is **transcript acknowledgment only**, not host spawn success, child lane open, or **`correlationId`** delivery proof; spawn turn emits **`mission_control_spawn_agent` alone** — **forbidden** parallel spawn + wait modal on the same turn; verify host-visible child before external-wait narration — see [`.sedea/centers/sedea/rules/4_mission.mdc`](.sedea/centers/sedea/rules/4_mission.mdc) § *Spawn-ack semantics (binding)* |

Child terminal: use § *MCP result preflight* in the spawned skill’s **`## Completion (spawned)`** — call **`mission_control_send_agent_result`** at terminal (host resolves **`correlationId`**; omit host-resolved identity keys from MCP args).


### Lane title prefix (spawn `name`)

Before MCP row **M8**, set spawn **`name`** (and child lane **`title`** on refresh) to **`{prefix}-{semantic title}`** per [`.sedea/centers/research-and-development/rules/50_mission-control-display-metadata-discipline.mdc`](../../../../rules/50_mission-control-display-metadata-discipline.mdc) § *Lane title prefix conventions*:

| Target skill | Prefix | `[N]` |
|--------------|--------|-------|
| **`author-prd`**, **`ad-hoc-prd`** | `PRD` | — |
| **`master-planner`** | `MP` | — |
| **`phase-planner`** | `PH{N}` | `parentIndex` (Delivery phases row) |
| **`coding-session`** | `PR{N}` | `parentIndex` (**`### PR list`** row) — **`pr-plan`** §5d and equivalent spawns |
| **`pre-pr-review`** | `Pre-PR Review` | — |

Truncate semantic title only when the full string exceeds rule **9** max **`title`** length (64).

### Terminal stop (normative for every spawned skill)

**This section is the canonical stop rule** for all **`## Completion (spawned)`** blocks in this mission, even when an individual `SKILL.md` ends that section after the host-protocol paragraph without repeating the sentence below.

After emitting **`mission_control_send_agent_result`**, **stop on that lane** for the current skill turn:

1. Do **not** emit another **`mission_control_spawn_agent`** unless a later user message on the same lane explicitly continues the skill (then call **`mission_control_send_agent_result`** again with updated **`outputs`** for the same spawn session).
2. Do **not** call MCP **`mission_control_propose_dispatch_resolution`** — only the **plan and deliver** Squad Leader closes the dispatch.
3. Do **not** run the next protocol step in the same turn after **`mission_control_send_agent_result`** (including “wait for child” announcements — the stop applies **after** the MCP result is sent).

**Canonical closing sentence** (optional in skill prose; meaning is required either way):

> Stop after the MCP result is sent.

**Order when gated:** structured choice → refocus (when eligible) → MCP result → stop. Refocus/detail: [`spawn-ship-contracts.md`](../docs/spawn-ship-contracts.md).


## Default warm-up

Every **spawned** plan-and-deliver skill lists the paths below in frontmatter **`warmUpRules`** (Mission Control merges with optional run-request **`warmUpRules`**). **`skills/README.md`** (this file) is **required** on all of them so § *Terminal stop (normative)* loads even when an individual `SKILL.md` omits the closing sentence.

**All spawned skills** (planning + ship):

- `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` — slim spawn contracts, **terminal stop (normative)**; on-demand [`docs/spawn-ship-contracts.md`](../docs/spawn-ship-contracts.md) at terminal gates

**Planning skills** also include (frontmatter **`warmUpRules`**):

- `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc` — plan-and-deliver planning roles (`master-planner`, `phase-planner`, `pr-plan`, `pr-breakdown`, `delivery-phases`, `new-plan`)
- `.sedea/centers/research-and-development/rules/10_plan-naming-convention.mdc` — **`ad-hoc-prd`**, **`quick-fix-plan`**
- `.sedea/centers/research-and-development/missions/quick-fix/plan.mdc` — **`quick-fix-plan`** only

**Squad Leader** and other lanes that need full mission protocol load **`plan.mdc`** and **`development-process.md`** via **`laneRules`** or explicit spawn **`warmUpRules`** — not via trimmed planning-skill frontmatter.

**Ship skills** also include:

- `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`
- `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc` — **`pre-pr-review`** spawn only; **`coding-session`** omits rule **30** from frontmatter (384 KiB warm-up cap); use `inputs.targetPlanPath` and explicit `Read` of rule **30** when resolving ambiguous `.sedea` paths

**Warm-up cap exceptions (384 KiB host budget):**

Each spawned ship skill documents its manifest in **`SKILL.md`** § *Warm-up manifest (spawned)* or § *Warm-up manifest (inline)*. Frontmatter must match the documented table — **`verify-skill-manifest.mjs`** enforces table ↔ frontmatter parity, spawn preflight row **11** for definitive **`laneRules`** roles, and plan-change notify emit/receive governance lint (see § *Adding or removing a skill*).

| Skill | Frontmatter omits (vs table above) | Runtime reads remain |
|-------|-----------------------------------|----------------------|
| **`pre-pr-review`** | `plan.mdc`, `development-process.md` | Step 3 reads **`development-process.md`**; Step 4 loads **`inputs.targetPlanPath`** (PR plan, not Squad Leader **`plan.mdc`**) |
| **`coding-session`** | `plan.mdc`, `development-process.md`, rule **30** | Explicit **`Read`** of **`development-process.md`** and rule **30** when resolving ambiguous `.sedea` paths; **`inputs.targetPlanPath`** for PR plan |
| **`deploy-walk`**, **`plan-reconcile`** | All frontmatter warm-up keys (inline-only) | Inherit **`coding-session`** **`effectiveWarmUp`** — see each skill § *Warm-up manifest (inline)* |

Do **not** re-add omitted paths to **`pre-pr-review`** frontmatter without re-checking combined warm-up size — spawn rejects with **`warm-up-too-large`** when frontmatter + merged run-request rules exceed the host cap (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Run-request line*).

**`pr-review`** and **`create-pr`** are inline-only — **no** frontmatter **`warmUpRules`**; they run **only** on the active **`coding-session`** lane (which includes this README and rule **20**). Do not dispatch **`pr-review`** or **`create-pr`** as standalone skill sessions.

**`pre-pr-review`** is **spawn-only** — **forbidden** inline on **`coding-session`**; do not dispatch **`pre-pr-review`** as a standalone session without **`coding-session`** spawn handover (see **`pre-pr-review/SKILL.md`** § *Standalone dispatch*).

### SKILL.md frontmatter (Mission Control spawn)

Mission Control **`skillResolver`** parses YAML frontmatter with strict unique keys. **`inputs`** must use **2-space** nesting (input name → field keys), not single-space flat keys — flat `inputs` breaks spawn with `skill-not-found` / duplicate key errors.

**Canonical shape** — copy from **`missions/plan-and-deliver/skills/author-prd/SKILL.md`**:

```yaml
inputs:
  inputName:
    type: string
    description: ...
    required: true
warmUpRules:
  - ".sedea/centers/..."
```

**Repair / verify:** from hosting repo root (with **`scripts/node_modules`** installed):

```bash
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/fix-skill-frontmatter.mjs --write
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-skill-manifest.mjs
```

### Adding or removing a skill

When you add, rename, or remove a protocol branch under `missions/plan-and-deliver/skills/<name>/SKILL.md` (or under the **`prd`** mission), update the same change set:

1. **`center.yaml`** — add or remove the repo-relative path under that mission's **`skillEntries`** (and **`development-process.md`** § *Protocol branches* when the branch is user-facing).
2. **Verify** from the hosting repo root:

 ```bash
 node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-skill-manifest.mjs
 ```

3. **plan-and-deliver only** — if the skill is **spawned**, ensure **`warmUpRules`** includes `missions/plan-and-deliver/plan.mdc`, this README, and the usual rules per § *Default warm-up* above; add **`## Completion (spawned)`** + host protocol line when applicable.

### Scripts (`plan-state.mjs`, `pr-review.mjs`)

- **Location:** `missions/plan-and-deliver/scripts/` for **`plan-state.mjs`** and **`plan-ws-completeness.mjs`**; canonical **`pr-review.mjs`** at **`.sedea/centers/sedea/scripts/pr-review.mjs`** (paths in skills and rule **20** are workspace-root relative from the hosting repo that contains **`.sedea/`** — see that repo’s **`.cursor/rules/`** for hosting-repo specifics).
- **Runtime:** **Node** (bundled with Sedea / VS Code) — see [`.sedea/centers/research-and-development/rules/31_dispatch-scope.mdc`](../../../rules/31_dispatch-scope.mdc) § *Hosting repo cwd (scripts)* and the hosting repo **`.cursor/rules/`**.
- **Vendor trees:** do not treat `scripts/**/node_modules/` or other installed dependencies as protocol documentation (center governance ends at `SKILL.md`, rules, and mission plans).
- **`verify-skill-manifest.mjs`** — compares **`center.yaml`** `skillEntries` to on-disk `SKILL.md` files; validates frontmatter YAML; lints **`warmUpRules`** / **`laneRules`** table ↔ frontmatter parity on spawned plan-and-deliver skills; enforces spawn preflight row **11** definitive **`laneRules`** for **`author-prd`**, **`master-planner`**, and **`coding-session`**; lints **`mission_control_spawn_agent`** spawn examples on master-planner skills (R&D + Sedea maintenance copies) so string-typed **`inputs.parent`** never uses JSON **`null`** — wire encoding must be **`"parent":"null"`**; lints **plan-change notify governance** — parent emit (**`master-planner`**, **`phase-planner`**, **`pr-breakdown`**) N1–N8 preflight rows + child receive (**`coding-session`**, **`phase-planner`**, **`master-planner`**) USER_CHECKPOINT contract + README N1–N8 / v1 receive table (exit 0 = match + parity + spawn wire lint + notify lint).
