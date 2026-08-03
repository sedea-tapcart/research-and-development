---
name: quick-fix-plan-agent
description: >-
  Quick Fix Plan agent — scaffold a minimal parent plan with a single PR list row,
  run new-plan (indexed child) and pr-plan inline, then offer coding-session spawn
  via pr-plan §5d. Spawned from quick-fix Squad Leader §3 only.
inputs:
  changeList:
    type: array
    description: Developer-confirmed bullet list of quick-fix items (each complexity ≤6).
    required: true
  title:
    type: string
    description: Human title for the plan tree.
    required: true
  operationsUserId:
    type: string
    description: Mission Control operations user id for plan writes.
    required: true
  centerSlug:
    type: string
    description: Center slug (software-development).
    required: true
  complexityConfirmed:
    type: boolean
    description: Developer attested each changeList item is complexity 6 or under.
    required: true
laneRules:
  - ".sedea/centers/sedea/rules/2_ask-question-instructions.mdc"
  - ".sedea/centers/software-development/rules/30_planning-target-resolution.mdc"
  - ".sedea/centers/software-development/missions/quick-fix/skills/quick-fix-plan-agent/SKILL.md"
  - ".sedea/centers/software-development/missions/plan-and-deliver/skills/README.md"
warmUpRules:
  - ".sedea/centers/software-development/missions/quick-fix/plan.mdc"
  - ".sedea/centers/software-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/software-development/docs/development-process.md"
  - ".sedea/centers/software-development/rules/30_planning-target-resolution.mdc"
---

# Quick Fix Plan agent

## No agent gcloud secrets or env-var proposals (binding)

**Forbidden:** updating gcloud secrets; adding environment variables to code; proposing new env vars in plans, options, or follow-ups. **Allowed only** when the developer gives an **explicit same-turn instruction** for a **named** variable. Normative: `.sedea/centers/software-development/rules/60_no-agent-env-secrets.mdc`.

**Normative protocol:** [`.sedea/centers/software-development/missions/quick-fix/plan.mdc`](../../plan.mdc) §4. This skill implements minimal parent scaffold → **`new-plan`** inline → **`pr-plan`** inline → optional **`coding-session`** spawn via **`pr-plan`** §5d.

**Forbidden on this lane:** **`planner`**, **`pr-breakdown`**, **`delivery-phases`**, **`phase-planner`**, second PR row, Squad Leader dispatch resolution MCP on this lane.

## Agent messaging (MCP)

**MCP spawn/result skill.** Parent→child spawn and child terminal result use MCP tools per **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Agent-to-agent spawn protocol*.

| Action | MCP tool |
|--------|----------|
| **`coding-session`** spawn (via **`pr-plan`** §5d) | **`mission_control_spawn_agent`** |
| **This** spawned lane terminal (and terminal re-emits) | **`mission_control_send_agent_result`** |

**Binding:** Run **`../../../plan-and-deliver/skills/README.md`** § *MCP spawn preflight* before every MCP spawn; **forbidden** host-resolved identity keys in MCP args.

## Spawn contract (MCP inbound)

Cross-check every emit against **`../../../plan-and-deliver/skills/README.md`** § *Universal spawn preflight*.

### Inbound — Squad Leader → **quick-fix-plan-agent** (quick-fix §3)

| `inputs` key | Required | Notes |
|--------------|----------|--------|
| `changeList` | yes | Non-empty array of bullet strings |
| `title` | yes | Plan tree title |
| `operationsUserId` | yes | From Mission Control session |
| `centerSlug` | yes | `software-development` |
| `complexityConfirmed` | yes | Must be `true`; stop with `partial` if false |

**Spawn `warmUpRules` (binding):** Include **`quick-fix/plan.mdc`** instead of **`plan-and-deliver/plan.mdc`**.

## Steps

1. **Validate inputs** — `changeList` non-empty, `title` non-empty, `operationsUserId` present, `complexityConfirmed === true`. Missing → `partial` with `outputs.missingFields`.
2. **Resolve `HOSTING_ROOT`** — operations writes on main hosting clone only (rule **0**).
3. **Minimal parent plan** — scaffold under `.sedea/operations/<operationsUserId>/plans/`:
   - Title from `title`
   - **`### PR list`** with **exactly one** row summarizing `changeList`
   - Sidecar `parent: null`, `status: started` per plan-board contract
   - Follow quick-fix parent shape (Overview + PR breakdown / PR list — see existing quick-fix parent plans in operations)
4. **`new-plan` inline** — `mode: indexed-child`, `childKind: pr-plan`, `index: 1`, parent paths from step 3, `requestedPopulatorSkill: pr-plan`, `parentAgentRole: quick-fix-plan-agent`.
5. **`pr-plan` inline** — populate §§1–4 from `changeList` and `initiatingPrompt`; §§5–8 remain `_TBD_` for **`coding-session`**. Merge **`## Completion (inline)`** from **`pr-plan`** into this lane's ledger.
6. **`pr-plan` §5c/§5d** — offer **Start coding session**; when selected, spawn **`coding-session`** per **`pr-plan/SKILL.md`** §5d on **this lane**.
7. **Refresh lane display** when spawn labels are generic — MCP **`mission_control_update_lane_display`** on this lane only.

## Completion (spawned)

Call MCP **`mission_control_send_agent_result`** exactly once at terminal with **`status`**, **`summary`**, and **`outputs`** below. Re-call only after user-requested follow-up on this lane. **Forbidden:** host-resolved identity keys in MCP args.

Required `outputs`:

- `outputs.parentPlanPath`, `outputs.parentPlanSlug`
- `outputs.targetPlanPath`, `outputs.targetPlanSlug`
- `outputs.readyForImplementation`, `outputs.implementationHandoffStatus`
- `outputs.prPlanHandoffReady` — `true` when §§1–4 populated and §5c offered or §5d spawned
- `outputs.spawnCorrelationId` — when §5d emitted
- `outputs.activeLanes`, `outputs.openLedgerEntries`, `outputs.remainingTasks`
- `outputs.continuationOwner`: `"quick-fix-plan-agent"`
- `outputs.continuationStatus`: `terminal` when PR plan ready and no blocking `remainingTasks`; `active` when §5c pending or **`coding-session`** child open

Stop after the terminal MCP result call per **`../../../plan-and-deliver/skills/README.md`** § *Terminal stop (normative)*. On turns that emit terminal, also emit **`mission_control_present_structured_choice`** in the **same** message when offering §5c per rule **2**.
