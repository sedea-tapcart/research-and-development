# plan-and-deliver — spawn contracts

This mission uses **three execution shapes** (see **`.sedea/centers/sedea/skills/README.md`** for dual-mode authoring). Parent resume for the **Squad Leader** is in **`../plan.mdc`** § **Spawn, wait, and parent resume** (planning §§3–7) and § **8** (ship oversight). Host spawn/result protocol is in **`.sedea/centers/sedea/rules/4_mission.mdc`**.

## Planning spawn (Squad Leader §3, §5, decomposition tree)

Squad Leader steps **§3** and **§5** and downstream decomposition agents run these skills **spawned** on child lanes. Each file has **`## Completion (spawned)`** and **`## Completion (inline)`** (inline is unused on standard leader spawn for most of these).

| Skill | Typical spawner | Squad Leader ledger |
|-------|-----------------|---------------------|
| `ad-hoc-prd` | Squad Leader §3 | `prdRef` → developer approval before §4; no child lanes |
| `master-plan` | Squad Leader §5 | Seed ledger; §6 ack when `continuationOwner: master-plan-agent` |
| `delivery-phases` | Master Plan agent | Merge `childRows`, `spawnedPlans`, `activeLanes` in §7 |
| `pr-breakdown` | Master Plan agent | Same as delivery-phases |
| `new-plan` | decomposition agents | Register child plan path/slug per row index |
| `phase-plan` | `new-plan` / decomposition | Populator lane; route fields for next branch |
| `pr-plan` | `new-plan` / decomposition | `readyForImplementation`; implementation handoff pending |

Field-level `outputs` and `continuationStatus` rules: each skill’s **`## Completion (spawned)`**.

## Ship spawn (detached / coding-session chain)

These skills run on **detached** or **nested** lanes (often **not** the Squad Leader). They use **domain-specific section titles** for long procedures; each file also has **`## Completion (spawned)`** with the host terminal line. Detailed `outputs` lists live in the section named in the **Outputs section** column.

| Skill | Typical spawner | Outputs section | §8 ship phase hints |
|-------|-----------------|-----------------|---------------------|
| `coding-session` | Developer / mission dispatch | `## Implementation handoff result` | `worktree`, `implementing`; `developerApprovedImplementation`, `targetPlanPath` |
| `pre-pr-review` | `coding-session` | Step 8 — Report and result | `pre-pr-review`; `recommendation: go` |
| `create-pr` | `coding-session` | `## Result contract` (+ lifecycle sections) | `pr-open`; `prUrl`, `prNumber` |
| `deploy-walk` | `create-pr` (after merge, when chosen) | `## Spawned result contract` | `deploy-walk`; `deployStatus`, `deployTodoStatus` |
| `plan-reconcile` | Developer / `create-pr` after deploy | `## Spawned result contract` | `reconcile` → `done`; `archivedSlugs` |

The Squad Leader **§8** ship ledger may update from **developer-message** when detached lanes do not bubble `AGENT_RESULT_RESPONSE_V1` to the leader — see **`../plan.mdc`** §8.

## Inline-only (no spawn)

| Skill | Invoker | Result section |
|-------|---------|----------------|
| `pr-review` | Active **`coding-session`** agent only | `## Inline result for coding-session` |

Do **not** emit **`AGENT_RUN_REQUEST_V1`** for **`pr-review`** on this mission. Merge `outputs.prReview*` into the **`coding-session`** handoff result.

## Required terminal line (all spawned children)

Every **spawned** child (planning and ship) ends with exactly one line on its lane:

`AGENT_RESULT_RESPONSE_V1` — same `correlationId` as the originating **`AGENT_RUN_REQUEST_V1`**; JSON fields `version`, `status` (`success` | `partial` | `failure` | `aborted` | `abandoned`), `summary` (1–3 sentences), `outputs` (per the skill’s completion section), optional `errors`. Re-emit an **updated** line after user-requested follow-up on that lane (same `correlationId`).

Populate `outputs` from the skill’s **`## Completion (spawned)`** and any referenced domain section above. Stop after the terminal line.

## Default warm-up

**Planning skills** (frontmatter `warmUpRules` on most planning skills):

- `.sedea/centers/research-and-development/docs/development-process.md`
- `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`

**Ship skills** — invoker should pass rule **20**, target plan path, and Sedea always-apply rules via Mission Control warm-up and optional run-request **`warmUpRules`** (many ship skills omit frontmatter `warmUpRules`).

The invoker should also pass this mission **`plan.mdc`** where the parent is the Squad Leader or needs mission context.
