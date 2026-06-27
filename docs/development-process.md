# Sedea's New Feature Development Process

## Overview

This is a document describing how developers deliver new features from idea to production. It is structured in four layers, captured in this order:

1. **Strategy** — the underlying principles that govern every decision.
2. **Development tools** - A surface of missions, protocol branches, agents, and workbench host capabilities that is used to deliver artifacts - designs, plans and hosting repo code.
3. **Planning Modes** — the three modes planning passes through, applied top-down (*architectural / code design* → *delivery phases* → *PR breakdown*), each with a plan-file template and notes on how the template shifts across hierarchy levels (feature-level plan, delivery phase plan, etc.). A **PRD** (Product or Feature Requirements Document) is upstream input to the one-shot **Master Plan** in mode #1; it is not a separate planning mode.
4. **Cadence** — the continuous loop that wraps the modes once delivery starts: phase decomposition → PRs breakdown → work session → feedback collection → plan updates → next phase. Each iteration may update *any* plan in the hierarchy, depending on the feedback's nature.

**Naming.** **Master Plan** is this document's term for the feature-level plan at the top of a feature's plan tree — the artifact mode #1's **Master Plan** template (below) produces. It is the single source of truth for the feature; phases, PRs, and child plans all hang off it.

## Strategy

The six principles below are the non-negotiables. Everything in **Planning Modes** and **Cadence** below must be consistent with them.

1. **Top-down granularity.** Planning moves from the highest, least-granular level down to the lowest, most-granular level. We never start from a PR.
2. **Three planning modes.** Planning happens in three modes, applied top-down:
 - *Architectural / code design* — what the shape of the solution is.
 - *Delivery phases* — how that shape decomposes on its way to delivery (a phase is never delivered directly — it splits further into sub-phases or into PRs).
 - *PR breakdown* — how a **PR-ready plan** (a phase plan decided not to decompose further, or a Master Plan small enough to skip the phase layer) breaks into individual, coding-ready PRs. Optional and partial: only PR-ready plans go through this mode.
3. **Each level has its own set of plans.** A planning level in the hierarchy is not a single document; it is a set of plans that share that level's granularity.
4. **Small chunks, fast to production.** We plan and deliver small chunks of work. Chunks that are ready ship to production as soon as possible — we do not batch.
5. **Forward planning is partial by design.** We do not require everything to be planned before the first chunks go out. Later levels are planned just-in-time as earlier chunks land.
6. **Single concern per deliverable.** Every deliverable chunk follows the single-concern principle — one purpose, one reason to change, one PR's worth of intent.

**Desired outcome.** Living by these principles, we ship a steady stream of small PRs that are easy for both a human developer reviewer and **a reviewer agent** to review, and whose impact on production execution is easy to reason about. The issues that do reach production are correspondingly small in scope and easy to fix. As a result we are always confident that the production system is robust and stable — every production issue we currently have is temporary and easy to fix.

## Development tools

Single catalogue of **what we use** in this process. Later sections still spell out **agent roles** wherever a role appears (e.g. **a coding agent**) so a developer reader scanning a template never has to chase definitions.

### Center and mission governance

This center does **not** ship **`missions/<missionSlug>/rules/*.mdc`** for **`plan-and-deliver`** or **`prd`**. That is **intentional**, not incomplete setup. Sedea treats mission rules as **optional** (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Rules* — absence is normal).

R&D delivery agents are governed by:

- **Center rules** — `.sedea/centers/research-and-development/rules/`
- **Mission plans** — `missions/<missionSlug>/plan.mdc`
- **Skills** — `missions/<missionSlug>/skills/` and the **Protocol branches** table below

**Lane warm-up manifest contract.** Per-lane warm-up semantics (`bootstrapRules`, `laneRules`, `skillWarmUp`, `effectiveWarmUp`, reload obligations) are normative in **`.sedea/centers/sedea/docs/lane-manifest-contract.md`**, with spawn/reload bindings in **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Lane warm-up manifest (spawn and reload)*. R&D plans and skills should reference that contract when declaring role-specific **`laneRules`**.

| Layer | R&D dispatch path |
|-------|-------------------|
| **Sedea `bootstrapRules`** | **`.sedea/centers/sedea/rules/bootstrap.mdc`** (sole Sedea `alwaysApply: true` bootstrap) |
| **R&D `bootstrapRules`** | **`.sedea/centers/research-and-development/rules/bootstrap.mdc`** — sole R&D `alwaysApply: true` bootstrap (≤10 KB); documented in skill warm-up manifest **`bootstrapRules`** tables and **`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md`** § *Definitive `bootstrapRules`* |
| **`laneRules`** | Role minimums in **`skills/README.md`** § *Definitive `laneRules`* and skill frontmatter |
| **`skillWarmUp`** | Skill frontmatter **`warmUpRules`** + optional spawn **`warmUpRules`** |

Do not flip numbered R&D rule **`alwaysApply`** frontmatter until the host R&D resolver and parity gate ship (reduce-alwaysapply-governance-load PRD §5.4 phase 6 sequencing). Sedea center **`alwaysApply`** flip is governed separately (PRD §5.3).

**Audits and gap reports** must **not** flag missing mission-level rule files under this center. To change **this center's** process or rules, use **`improve center rules`** on **`research-and-development`** (`center-maintenance` on the **sedea** center). For **Sedea platform** governance (hosting layout, git gate, Safeguard), use **`improve center rules`** on **`sedea`**. To change **repo** agent guidance in a hosting repo, use **`.cursor/rules/*.mdc`** per **`.sedea/centers/research-and-development/rules/40_maintain-rules.mdc`** and per-PR plan **§ 5. Repo rules impact**.

### Center submodule git (two repositories)

Non-built-in centers (including **`research-and-development`**) are **separate git repositories** submodule-pinned in the hosting repo. Agents must treat **center-repo git** and **hosting-repo gitlink promotion** as two steps — not one.

| Repository | What ships | Typical mission / skill |
|------------|------------|-------------------------|
| **Center repo** (e.g. `.sedea/centers/research-and-development/`) | Changes under center **`rules/`**, **`docs/`**, **`missions/`**, **`skills/`**, **`center.yaml`** | **`improve center rules`** / **`improve mission`** on **sedea** — **`center-maintenance`** / **`mission-maintenance`**; commit/push/PR in the **center** repo |
| **Hosting repo** (gitlink on **`main`**) | Submodule pointer after the center **`defaultBranch`** advances | **Mandatory:** run [`.sedea/centers/sedea/skills/promote-center-submodule-pin/SKILL.md`](.sedea/centers/sedea/skills/promote-center-submodule-pin/SKILL.md) **inline** — **direct** after center merge, or **cleanup-hint** only when post-merge **`worktree-cleanup.sh`** reports drift (`nextAction: promote-pin-required` with **`centerPinDriftPaths`**; host background when **`autoPromoteSubmodulePins: true`**) per [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Pin promotion routing* |

**After center merge (binding):** When a center-repo PR merges and the hosting repo should adopt the new revision, agents **must** run **promote-center-submodule-pin** **inline** on the hosting-repo lane. Entry routing: [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Pin promotion routing* — **direct** invoke with **`centerSlug`**, or **cleanup-hint** only when post-merge **`worktree-cleanup.sh`** reports drift (`nextAction: promote-pin-required` with **`centerPinDriftPaths`**; Mission Control host background chain when **`autoPromoteSubmodulePins: true`** on **`.cursor/rules/dot-sedea.mdc`**). Skill procedure: center **`worktree-setup.sh`** from **`HOSTING_ROOT`** → **`sedea_add_worktree_folder`** → commit gitlink in **`WORKTREE_ROOT`** → PR → merge → **`sedea_remove_worktree_folder`** → center **`worktree-cleanup.sh`**. Pin the center **`defaultBranch`** tip only (from **`.sedea/centers/centers.yaml`**) — never a feature-branch SHA. **Forbidden:** Git Data API pin-only commits without a worktree; staging or committing gitlinks on **`HOSTING_ROOT`** checked-out **`main`**. See [`.sedea/centers/sedea/skills/promote-center-submodule-pin/SKILL.md`](.sedea/centers/sedea/skills/promote-center-submodule-pin/SKILL.md); [`.sedea/centers/sedea/rules/3_center.mdc`](.sedea/centers/sedea/rules/3_center.mdc) § *Git repo semantics*; [`.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc`](.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc) § *Submodule pin promotion (skill-owned)*.

Do **not** hand-commit hosting-repo submodule gitlinks or rely on local **`git submodule update`** alone when **`origin/main`** should record the new pin — unless the user explicitly directs a different workflow.

Built-in **`sedea`** center is **not** submodule-pinned; this subsection does not apply to it.

### Git governance (worktree-only)

Implementation and ship use **git worktrees** only — not **`git checkout -b`** on the primary hosting clone. Each coding-ready PR maps to **one worktree**; the **worktree name** is the `--worktree-name` on center **`worktree-setup.sh`** (same string as the `-b` ref the script creates). Naming: **`.sedea/centers/research-and-development/rules/10_plan-naming-convention.mdc`** and **`.sedea/centers/sedea/rules/7_stacked-pr-worktree-naming.mdc`**. Setup, attach, commit/push, and post-merge cleanup: **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** and **`.sedea/centers/sedea/rules/0_hosting-repo.mdc`**, **6**, **7**. **Attach order:** center **`worktree-setup.sh`** → **`sedea_add_worktree_folder`** → edits; post-merge on operational hosting repos (for example **sedea-push**): **`sedea_remove_worktree_folder`** → hosting **`scripts/compose-worktree-teardown.sh`** (fail-open; agent warns on **`failed-open`** per **`.cursor/rules/dot-sedea.mdc`**) → center **`worktree-cleanup.sh`**.

**Worktree removal ownership (binding).** Agents **must not** remove, detach, or prune worktrees they do not own. A worktree name and a path on **`git worktree list`** are **not** permission to remove that path.

| Rule | Topic |
|------|--------|
| **`.sedea/centers/sedea/rules/0_hosting-repo.mdc`** § *Worktree ownership* | Four preconditions before **`sedea_remove_worktree_folder`** / **`git worktree remove`** |
| **`.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc`** § *Post-merge worktree cleanup* | Consent + **this pass’s** path only |
| **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** § *Worktree removal ownership (binding)* | R&D ship lanes (**`coding-session`**, **`plan-reconcile`** §5) |

**Forbidden:** **`git worktree remove`**, **`git worktree prune`**, or **`sedea_remove_worktree_folder`** on worktrees created by another developer, dispatch, agent lane, or prior session; repo-wide “cleanup” from **`git worktree list`**; **`git worktree remove`** on **`HOSTING_ROOT`**; hand-deleting worktree directories while still mounted in Sedea. **`git worktree list` is read-only** when ownership is unclear — stop and use structured choice. Post-merge cleanup removes **only** **this pass’s** **`WORKTREE_ROOT`** after merge consent (see **`coding-session/SKILL.md`** § *Post-merge workspace cleanup*).

**`center.yaml` `skillEntries` sync (manifest hygiene).** Mission Control discovers skills on disk; **`skillEntries`** in **`.sedea/centers/research-and-development/center.yaml`** is for audits and maintenance. When you **add, rename, or remove** a `SKILL.md` under any mission `skills/` tree, update that mission's `skillEntries` list in the same change. From the **hosting repo root**:

```bash
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-skill-manifest.mjs
```

Exit **0** when manifest and disk match, warm-up parity passes, and nullable-parent spawn wire lint passes (planner **`AGENT_RUN_REQUEST_V1`** examples must use **`"parent":"null"`** when **`inputs.parent.type`** is **`string`** — JSON **`null`** fails); **1** prints mismatch or lint errors. Plan-and-deliver authors also see **`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md`** § *Adding or removing a skill*.

**Lane warm-up parity (`verify-lane-warmup-parity.mjs`).** After changing definitive **`laneRules`** tables or skill **`warmUpRules`**, run from the hosting repo root:

```bash
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-lane-warmup-parity.mjs --bootstrap full
```

Exit **0** when every **plan and deliver** lane role's manifest **`effectiveWarmUp`** covers today's legacy baseline (**sedea `alwaysApply` scan ∪ skill `warmUpRules`**). **`--bootstrap slim`** is the **§5.3 `alwaysApply` flip merge gate** (single bootstrap rule only). Hosting-repo CI: **`./scripts/verify-center-governance.sh`** (runs skill manifest + parity **full** + parity **slim** + warm-up/parity integration tests).

**Center governance CI (hosting repo).** GitHub Actions workflow **`.github/workflows/center-governance.yml`** runs on every PR and push to **`main`**. The job checks out the hosting repo with **recursive submodules**, installs script dependencies, then runs **`./scripts/verify-center-governance.sh`**.

| Variable / secret | Where | Purpose |
|-------------------|-------|---------|
| **`GH_SUBMODULE_CHECKOUT_TOKEN`** | GitHub Actions secret on the hosting repo | PAT with **`contents:read`** on **`sedea-ai/app`** and **`sedea-centers/research-and-development`**. Required because the default **`GITHUB_TOKEN`** cannot read private submodule repos during **`actions/checkout`**. |
| **`HOSTING_ROOT`** | Local / integration test env (optional) | Absolute path to the hosting repo root. **`verify-center-governance-integration.test.mjs`** defaults to the hosting root inferred from the script path when unset; set explicitly when running tests from a non-standard cwd. |

**Local pre-PR check:** from the hosting repo root, **`./scripts/verify-center-governance.sh`** runs **`npm ci`** in **`missions/plan-and-deliver/scripts/`** then the same three verify steps as CI. No extra env vars are required for a standard clone with populated **`.sedea/centers/research-and-development`** submodule.

**§5.6 operational sunset (L1–L5).** Before the legacy H8 directory-scan fallback is turned off in production, all gates in **`.sedea/centers/sedea/docs/lane-manifest-contract.md`** § *Legacy fallback operational sunset (PRD §5.6 L1–L5)* must pass. L2 is partially machine-enforced today via parity **`--bootstrap full`** in CI; L1/L3–L5 remain operator/host milestones documented in that section.

**Spawn warm-up byte budget.** `verify-skill-manifest.mjs` sums on-disk bytes for each spawned skill's frontmatter **`warmUpRules` ∪ `laneRules`**, emits **`WARN:`** lines when over **384 KiB**, and reports **`spawn byte budget smoke`** in the OK line. Pass **`--enforce-spawn-byte-budget`** to exit **1** on over-cap skills (strict gate for post-flip manifest trimming).

**Warm-up/parity integration tests.** **`./scripts/verify-center-governance.sh`** runs these as its third step (after **`npm ci`** in **`missions/plan-and-deliver/scripts/`**). To run only the integration suite locally:

```bash
npm ci --prefix .sedea/centers/research-and-development/missions/plan-and-deliver/scripts
HOSTING_ROOT="$(pwd)" node --test .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-center-governance-integration.test.mjs
```

Asserts **`verify-skill-manifest.mjs`** exit **0**, parity **`--bootstrap full`** exit **0**, and parity **`--bootstrap slim`** exit **0** (§5.3 merge gate).

**Scripts vendor trees.** Any `node_modules/` or other tooling-only trees under `missions/*/scripts/` are **not** center governance assets — do not link-audit or gap-report them as protocol. Hosting repos document audit scope in **`.cursor/rules/`** (not in this center repo).

### PRD routing (canonical)

Every **`plan and deliver`** dispatch runs **`author-prd`** before **`planner`**. Squad Leader procedure: **`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`** §§1–3.

```mermaid
flowchart TD
 START[plan and deliver dispatch] --> S1[§1 Open dispatch]
 S1 --> S2[§2 PRD intake on leader lane]
 S2 --> S3[§3 spawn author-prd]
 S3 --> APR[Author PRD lane: evidence draft approve]
 APR --> SEED[§4 seed → §5 spawn planner]
 S2 -->|unreadable existing PRD| AQ[§2 AskQuestion paste path or switch create]
 AQ --> S2
```

| Step | When | Artifact | Next |
| --- | --- | --- | --- |
| **§1 Open** | Every **`plan and deliver`** dispatch | Optional opening seeds (title, `@path`, URL) | §2 intake |
| **§2 Intake** | Leader lane before spawn | `prdTitle`, `prdDescription`, `operation` (`create` \| `manage`), `sourceMaterials` | §3 spawn **`author-prd`** |
| **§3 Author PRD** | Child lane | Full or updated PRD under **`.sedea/operations/<operationsUserId>/docs/`** (or managed existing path) via **`author-prd`** | Developer approves on **Author PRD** lane → Squad Leader **auto-chains** §4 seed + §5 **`planner`** same turn |
| **§4–§5 Planning** | After terminal approved PRD | Master Plan via **`planner`** | Decomposition / ship per mission protocol |

**Intake boundaries**

- **`plan and deliver` §2** collects product context on the **Squad Leader** lane — it does **not** draft the PRD or skip **`author-prd`**.
- **`author-prd`** owns evidence gathering, drafting, and developer approval on its **child** lane (steps 10–11).
- **`ad-hoc-prd`** is **not** used on **`plan and deliver`** — it remains for **`debug-and-fix`** and **`single-phase`** (minimal fix-scope PRD). **`ad-hoc-prd`** does **not** spawn **`planner`**; **`single-phase`** Squad Leader auto-chains §4 seed → §5 **`planner`** after terminal PRD approval (see **`ad-hoc-prd/SKILL.md`** § *Downstream `planner` (invoker-owned)*).
- **PRD approval UX (binding):** On **`author-prd`** step 10 and **`ad-hoc-prd`** step 5, when open questions, concerns, ambiguities, or incompleteness remain, the approval modal **co-presents** per-item resolution picks **and** **Approve PRD** / **Revise PRD** on the **same** turn — **forbidden** to hide Approve until all items are cleared. See those skills for batching when many items remain.

**Do not use**

- Skipping **`author-prd`** because a PRD `@path` was pasted in the opening message — §2 may set **`operation: manage`**, but §3 still runs for approval and gap closure.
- **`joint/docs/`** for new PRD writes — **`author-prd`** **`create`** mode is **`operationsUserId`**-scoped only.

**Handoff phrase examples**

| Developer says (paraphrase) | Route |
| --- | --- |
| “Plan and deliver — here’s `@path` to our PRD” | **`plan and deliver`** → §2 (`manage`) → §3 **`author-prd`** |
| “Plan and deliver — small auth tweak for SSO” | **`plan and deliver`** → §2 intake (description + sources) → §3 **`author-prd`** |
| “This Confluence link won’t load” | **`plan and deliver`** §2 **AskQuestion** (paste, different path, or switch **`create`**) |

**Referenced skills:** **`author-prd`** (plan-and-deliver §3); **`ad-hoc-prd`** (**`debug-and-fix`**, **`single-phase`**).

### Mission routing (expedited paths)

Normative mission slugs, PR caps, and complexity ceilings (protocol detail in each **`missions/<slug>/plan.mdc`**; hub listings in **`mission.yaml`** and center **`README.md`**):

| Command | Mission | PR cap | Complexity ceiling | PRD skill |
|---------|---------|--------|-------------------|-----------|
| **`plan and deliver`** | plan-and-deliver | — | **> 20** → route §6 **Delivery phases** | **`author-prd`** |
| **`plan and deliver a single phase`** | single-phase | **1–6** | **≤ 20** (**> 20** → **`plan and deliver`**) | **`ad-hoc-prd`** |
| **`quick fix`** | quick-fix | **1** | **≤ 6** (**> 6** → **`plan and deliver a single phase`** or **`plan and deliver`**) | — |
| **`debug and fix`** | debug-and-fix | — | — | **`ad-hoc-prd`** |

**Cross-reference hygiene (binding):** **`single-phase`** protocol, hub listings, and cadence cross-refs must cite **1–6 PRs** and complexity **≤ 20** — not legacy three-PR / **≤ 12** wording. **`quick-fix`** out-of-scope redirects to **`plan and deliver a single phase`** must state those caps so agents do not infer the old ceiling.

### Root delivery plans vs legacy Hub parent intake

Sedea **`.plan.md`** files are **delivery anchors** for Mission Control ship (Master Plan → PR plans → **`coding-session`**). **Scope and backlog** live in **external PM tools** (JIRA, Trello, ClickUp, Asana, …); traceability uses optional **`Related:`** entries in the **`planner`** seed — **not** a Sedea parent tree or Hub roadmap topic.

| Dispatch path | §4 **`Parent`** default | §4 parent **AskQuestion** | Scope traceability |
| --- | --- | --- | --- |
| **Manual `plan and deliver`** in Mission Control | **`null`** (root delivery plan) | **No** — compile seed with **`Parent: null`** unless the developer explicitly names a **`Parent`** slug, `@path`, or plan path in the same message (see **`plan.mdc`** §4) | Optional **`Related:`** lines for external PM or doc links when the developer supplies them — separate from **`Parent`** |
| **Centers** mission launch from Hub (no Hub plan parent) | **`null`** | **No** — same default; explicit **`Parent`** override only when named in the same message | **`Related:`** optional per **`plan.mdc`** §4 *External PM scope* |
| **Legacy — Start New Plan** from Sedea Hub `top_level_topic` row *(sunset; see Master Plan phase 2–3)* | Hub **`missionInputs.parentSlug`** until host strip lands | **Skipped** when opening message still includes **`### Parent (Sedea Hub)`** (see **`plan.mdc`** §4 *Legacy Hub parent*) | Do **not** treat Hub topic rows as the long-term parent model |

**Normative contract (agents):** New **`plan and deliver`** dispatches default **`Parent: null`** in the §4 seed. Do **not** prompt for a roadmap topic, **`top_level_topic`**, or plan-tree parent unless the developer explicitly overrides **`Parent`** in the same message. Prefer **`Related:`** for external PM or doc links.

**Legacy Hub `missionInputs`:** **`plan-and-deliver/plan.mdc`** still declares a trimmed **`## Hub missionInputs`** block until Mission Control host strip (Master Plan **phase 2**) and Hub UI removal (**phase 3**). See that section for sunset keys — do not extend Hub parent intake in new governance text.

**Implementation phases (Master Plan *Remove Sedea Hub plans box*):** This table is the **governance narrative** (phase 1). Host code and Hub UI follow in later phases — docs lead code; agents must not reintroduce topic-parent defaults while implementing those slices.

### Plan Board writer notes

Normative field semantics: [`.sedea/centers/sedea/rules/8_plan-board-contract.mdc`](.sedea/centers/sedea/rules/8_plan-board-contract.mdc). This subsection is the **R&D operator checklist** for agents and tools that create or update `.sedea/operations/**/plans/` pairs.

| Write target | Rule |
| --- | --- |
| **Tree parent** | Sidecar **`parent`** only — **`null`** / omitted for root delivery plans; child plans set parent slug in **`.state.yaml`**, not frontmatter **`parent`** |
| **Lifecycle dot** | Sidecar **`status`** — `not_started`, `started`, `completed`, `canceled` (American spelling) |
| **Archive bucket** | Sidecar **`archived: true`** only — not frontmatter **`archived`** |
| **`kind` frontmatter** | **`plan`** or omit for new delivery plans — **do not** create **`top_level_topic`** or files under **`plans/roadmap-topics/`** |
| **Title / todos** | Frontmatter **`name`**, **`overview`**, **`todos[]`** — todo **`status`** uses British **`cancelled`**; plan lifecycle uses American **`canceled`** in sidecar |

**Intake alignment:** [`.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`](../rules/30_planning-target-resolution.mdc) § *Root delivery plans only* forbids roadmap-topic expand paths in planning snapshots. [`.sedea/centers/research-and-development/rules/50_mission-control-display-metadata-discipline.mdc`](../rules/50_mission-control-display-metadata-discipline.mdc) § *Null-parent dispatch labels* forbids Hub-topic wording in dispatch chrome.

**Operations write location:** Plan and sidecar edits target the **main hosting clone** only — see [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Operations persistence (main hosting root only)*.

### Agent UX pitfalls (easy mis-runs)

| Pitfall | Correct surface |
|---------|-----------------|
| **Squad Leader §6** shows decomposition menus | **Forbidden** — only **Master Plan agent** Step 7 (**`planner/SKILL.md`**) offers §6 routes; leader **ack only** (**`plan.mdc`** §6) |
| **`pr-review`** as its own Mission Control dispatch | **Stop** — inline on active **`coding-session`** only (**`pr-review/SKILL.md`** § *Standalone dispatch*) |
| **Commit and push cadence** step 3 | Rule **20** step 3 = **`pr-review` Step 5 — GitHub only** after push when Steps 1–4 already ran — not a second full triage |
| **High complexity** Master Plan (score **> 20**) | Recommend **Route §6 → Delivery phases** on the **planner** lane (do not withhold §6); each phase plan gets **`phase-planner`** without numeric gate; Squad Leader never runs **`delivery-phases`** / **`pr-breakdown`** |
| Worktree name / PR / chat titles | **`.sedea/centers/research-and-development/rules/10_plan-naming-convention.mdc`** — benefit verbs only; never the forbidden busy-work prefix |
| Squad Leader collects **title only**, spawns **`author-prd`**, child invents scope | Complete **`plan.mdc`** §2 intake on Squad Leader; §3 handoff includes **`prdDescription`** + **`sourceMaterials`** |
| Spawn **`planner`** from **`new-plan`** or run **`pr-plan`** on a standalone child without **`new-plan-agent`** | **`planner`** = Squad Leader §5 **spawn only**; **`pr-plan`** = **inline** under **`new-plan`** — **`skills/README.md`** § *Normative execution mode* |
| Leader **AskQuestion** after Author PRD child approve (seed review / confirm spawn) | **Forbidden** — auto-chain §4→§5 on same leader turn; PRD approval stays on **Author PRD** child lane (**`plan.mdc`** §3 resume) |
| Author PRD resolve-only modal without **Approve PRD** / **Revise PRD** | **Forbidden** — open-item resolution and approval co-present on the same modal (**`author-prd`** step 10; **`ad-hoc-prd`** step 5) |
| **Child lane** calls **`mission_control_update_dispatch_display`** | **Forbidden** — dispatch chrome is Squad Leader scope only; child refreshes **own** slot via **`mission_control_update_lane_display`** — [`.sedea/centers/sedea/rules/9_display-metadata-authority.mdc`](.sedea/centers/sedea/rules/9_display-metadata-authority.mdc); [`.sedea/centers/research-and-development/rules/50_mission-control-display-metadata-discipline.mdc`](../rules/50_mission-control-display-metadata-discipline.mdc) |
| **Squad Leader** renames a **child** agent tab via dispatch MCP or prose | **Forbidden** — leader uses **`mission_control_update_dispatch_display`** for dispatch title/hover; child lane self-service via lane MCP — rule **9** § *Forbidden* |
| **Chat-only** tab rename ("call it X in the UI") with no MCP on owning lane | **Stop** — durable labels persist through governed MCP; see [`.sedea/centers/research-and-development/docs/mission-control-display-metadata-host-spec.md`](mission-control-display-metadata-host-spec.md) § *Stale tab title recovery* |
| Tab title stale after reload | **Orientation** — re-read spawn context; owning lane runs correct MCP per role — not Alignment Safeguard; rule **50** + host-spec doc § *Stale tab title recovery* |

**Host spec (additive fields):** [`.sedea/centers/research-and-development/docs/mission-control-display-metadata-host-spec.md`](mission-control-display-metadata-host-spec.md) — bundle field names, max lengths, hosting-repo implementation pointers. Authority table remains [`.sedea/centers/sedea/rules/9_display-metadata-authority.mdc`](.sedea/centers/sedea/rules/9_display-metadata-authority.mdc) only.

### Agent glossary — step and section labels

Labels reuse numbers and § symbols across documents. **Read the owning doc** before acting.

| Label | Owns it | Meaning |
| --- | --- | --- |
| **`plan.mdc` §1–§10** | Squad Leader dispatch | Mission protocol sections (PRD intake, spawn **`planner`**, §8 ship ledger, resolution). |
| **`planner` Step 1–7** | **`planner/SKILL.md`** on **planner child lane** | Master Plan scaffold §§1–5; Step **7b** = structured next moves after §§1–5. |
| **`pr-plan` §5a–§5e** | **`pr-plan/SKILL.md`** on **inline** lane | §5c = planning handoff modal; §5d = spawn **`coding-session`** (child lane). |
| **`new-plan` step 4 / 5b** | **`new-plan/SKILL.md`** | Step 4 = inline **`pr-plan`**; 5b = merge child **`coding-session`** results. |
| **Rule 20 — cadence step 3** | **`20_efficient-pr-shipping.mdc`** | After commit+push on **`coding-session`**: **`pr-review` Step 5 — GitHub only** when Steps 1–4 already ran — not a full new triage. |
| **`pr-review` Steps 1–5** | **`pr-review/SKILL.md`** inline on **`coding-session`** | Full comment triage; Step 5 = GitHub reconciliation. |
| **Per-PR plan §§1–8** | Plan file template | §§1–4 = planning; §§5–8 = implementation/ship (often filled on **`coding-session`** lane). |
| **§8 `shipPhase` / `rowStatus`** | Squad Leader **`plan.mdc` §8** | Ship ledger on leader dispatch — updated **only** via Mission Control **host sync** from ship child terminals. |
| **Sedea rule 6 / rule 30** | **`.sedea/centers/sedea/rules/`** | Git consent gate vs planning-target resolution — not R&D skill step numbers. |

### Agents and roles

**Coding agent.** Delivers deliverables defined in a PR plan.

**Pre-PR reviewer agent.** Reviews the change **before** the PR is treated as ready to land: run that pass in a **new agent session with no carry-over turns from the coding session**, no “we already decided X while coding” bias — so the review is **unbiased**. That **pre-PR reviewer agent** complements — it does **not** replace — **a reviewer agent** on the PR surface. Per-PR plans and PR descriptions must read cleanly to **both** passes.

**PR-creating agent.** Only *a PR-creating agent* drafts the GitHub PR description from the prompt **a coding agent** supplies; the parenthetical names the sole supported implementation today. Use that full phrase wherever the PR-authoring role must be explicit.

**Reviewer agent.** The role is *a reviewer-agent* — whichever **dedicated** automated PR-review agent consumes the PR diff and description on the review surface. It might be part of a Sedea Squad agents, or it might be a third-party service connected directly to GitHub PRs. These agents are not part of Sedea and are not mandated by the Mission Control. Dedicated reviewer-agents are **not** the only review pass — see **Pre-PR reviewer agent** above. Use that full phrase wherever that dedicated reviewing role must be explicit (distinct from **developer**, who reads planning-mode plans on the plan board). In the same paragraph, *they / them* may refer to that reviewer-agent.

### Surfaces and artifacts

- **GitHub** — Pull requests, diffs, and PR description fields (e.g. “Notes for the reviewer”). **A PR-creating agent** fills the body from the prompt **a coding agent** supplies.
- **Plan board** — Where **developers** open and review planning-mode `.plan.md` files in the plans folder `.sedea/operations/**/plans/**`).
- **Path placeholders (`...`)** — In this document and R&D governance, `` `...` `` inside path examples (e.g. `.sedea/operations/.../plans/`) denotes **omitted segments**, not a folder named `...`. Substitute **`joint`**, **`operationsUserId`**, or a real **`slug`**. See **`.sedea/centers/research-and-development/rules/31_operations-user-id.mdc`** § *Path placeholders in documentation*.
- **`.plan.md` files** — Standalone plan files at each hierarchy level (Master Plan, phase plans, PR plans); canonical location is under `.sedea/operations/**/plans/**`.
- **PRD** — Product (or feature) Requirements Document — the prime input for the one-shot **Master Plan** (mode #1). Every **`plan and deliver`** dispatch authors or validates PRD via **`author-prd`** (§§1–3) before **`planner`** — see § *PRD routing (canonical)*.
- **Git worktree** — Isolated worktree used by the **`coding-session`** protocol branch when spinning up a coding agent.
- **Protocol** — The **plan and deliver** mission (`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`, command phrase *plan and deliver*) — protocol branches and skills under `missions/plan-and-deliver/skills/` implement this document's cadence.

### Protocol branches

| Branch | Path | Role in this process |
| --- | --- | --- |
| `author-prd` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/author-prd/SKILL.md` | Squad Leader §3 child lane: gather evidence, draft or update a flexible PRD, developer approval — mandatory before **`planner`** on every **`plan and deliver`** dispatch. **`create`** writes under **`.sedea/operations/<operationsUserId>/docs/`** only. |
| `ad-hoc-prd` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/ad-hoc-prd/SKILL.md` | Minimal fix-scope PRD for **`single-phase`** (§3) and **`debug-and-fix`** (post-fix §5c) — **not** **`plan and deliver`** (which uses **`author-prd`** §3). Does **not** spawn **`planner`**; **`single-phase`** Squad Leader auto-chains §4 seed → §5 **`planner`** after terminal PRD approval. |
| `quick-fix-plan` | `.sedea/centers/research-and-development/missions/quick-fix/skills/quick-fix-plan/SKILL.md` | **`quick-fix`** §3 spawn target — minimal parent scaffold plus inline **`new-plan`** + **`pr-plan`** on one child lane (single PR, complexity **≤ 6**). |
| `planner` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/planner/SKILL.md` | PRD → **Master Plan** (mode #1). Drafts §§ 1–5 in the initial turn, including **`### Decomposition assessment`** and **`### Complexity score (plan-scope signal)`** under § 5. **High** complexity (overall score > 20) recommends **Route §6 → Delivery phases** — not withholding §6 — to split into lower-complexity phase plans via **`phase-planner`**. Follow-up moves use **AskQuestion** per **`.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`** § *Sedea input channel* — run **`delivery-phases`** or **`pr-breakdown`** **inline** on the planner lane, draft §7 Caveats inline, or revise sections. **Operations git** (`.sedea/operations/` plan files) is **user-managed** — agents never solicit commit/push/PR via modal **`options`** (rule **6** § Operations repository). |
| `delivery-phases` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/delivery-phases/SKILL.md` | Decompose a focused **Master Plan** or **Phase plan** into delivery phases (mode #2). **Primary (`plan and deliver`):** **`planner`** or **`phase-planner`** runs this skill **inline** — see **`skills/README.md`** § *Normative execution mode*. **Secondary:** protocol-branch dispatch may spawn a child lane (`## Completion (spawned)`). Runs **`new-plan`** **inline** per approved row. |
| `pr-breakdown` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-breakdown/SKILL.md` | Decompose a focused **Master Plan** or **Phase plan** into PRs (mode #3 set-level). **Primary (`plan and deliver`):** **`planner`** or **`phase-planner`** runs this skill **inline** — see **`skills/README.md`** § *Normative execution mode*. **Secondary:** protocol-branch dispatch may spawn a child lane. Runs **`new-plan`** **inline** (then inline **`pr-plan`**) per approved row. |
| `phase-planner` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/phase-planner/SKILL.md` | Populate a focused **phase plan** stub: drafts §§ 1–4 plus **`### Decomposition assessment`**. Runs **`delivery-phases`** / **`pr-breakdown`** **inline** on the phase-planner lane after route approval. |
| `pr-plan` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-plan/SKILL.md` | Populate §§ 1–4 on the **planning** lane; §§ 5–8 default **`_TBD_`**. **Primary (`plan and deliver`):** **`new-plan`** runs this skill **inline** under **`planner`** or **`phase-planner`** — see **`skills/README.md`** § *Normative execution mode* (**`pr-plan`** inline-only on this mission). **Secondary:** other missions (e.g. **`quick-fix`** via **`quick-fix-plan`**) run **`pr-plan`** inline on their planning child lane. **AskQuestion** **Start coding session** → spawn **`coding-session`** via **`AGENT_RUN_REQUEST_V1`** (§5d). See skill § *Handoff to coding-session*. |
| `new-plan` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/new-plan/SKILL.md` | Scaffold a new `.plan.md` + sidecar; parent linkage. **Primary (`plan and deliver`):** **`delivery-phases`** / **`pr-breakdown`** run this skill **inline** under **`planner`** or **`phase-planner`**. **Secondary:** protocol-branch or mission dispatch (e.g. **`quick-fix-plan`**) may use spawned mode per that mission's `plan.mdc`. Runs **`pr-plan`** **inline**; spawns **`phase-planner`** when the child is a phase plan. |
| `coding-session` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/coding-session/SKILL.md` | **Separate** lane from **`pr-plan`**: center **`worktree-setup.sh`**, sidecar, attach, map setup **`bootstrapStatus`** before implementation, then **implements** §§ 5–8 on that lane (default after **`pr-plan`** spawn; **auto-authorize** when §§1–4 drafted) or **prompt-only** external handoff. Ship chain (**`pre-pr-review`**, inline **`create-pr`**, inline **`pr-review`**, inline **`deploy-walk`**, inline **`plan-reconcile`**). |
| `worktree-bootstrap` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/worktree-bootstrap/SKILL.md` | **Deprecated (read-only).** Normative bootstrap is center **`worktree-setup.sh`** on **`coding-session`**. Exception-only **inline** retry when setup failed — not spawn-by-default. See **`skills/README.md`** § *Worktree-bootstrap skill drain gate*. |
| `pre-pr-review` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pre-pr-review/SKILL.md` | Fresh spawned pre-PR reviewer lane. Reviews committed implementation diff against a PR plan or free-form scope, checks per-PR template + repo rules + quality (§7 **Local test** only for deploy checklist — **Staging test** and **After deploy** are post–create-pr / post-merge). Returns **proposed** non-blocker items in `outputs.proposedFollowUps` when anchored to **`plan`** (does **not** edit the plan file). The active **`coding-session`** agent presents proposals to the developer; approved bullets are appended to `## Follow-ups` before **`create-pr`** when the developer chooses that path. Reports go/no-go. |
| `create-pr` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/create-pr/SKILL.md` | **Inline** on the active **`coding-session`** lane after **`pre-pr-review`** returns `go` and Create-PR gate approval. Evaluates repo class: **inline GitHub** (`gh pr create` when authorized) or **outsider handoff** (tapcart product submodules — fenced prompt for external agent, no `gh pr create`). Post-merge **`deploy-walk`** and **`plan-reconcile`** are owned by **`coding-session`**. |
| `pr-review` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-review/SKILL.md` | Triage PR review comments; feeds **Code review follow-ups** on the PR plan. |
| `deploy-walk` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/deploy-walk/SKILL.md` | **Inline** on the active **`coding-session`** lane. Walk a PR plan's `## N. Deploy test plan` section step by step. **Agent-executable** steps run **without approval**; **manual** steps present for the developer. Detached dispatch redirects to **`coding-session`**. Does **not** auto-run **`plan-reconcile`**. |
| `plan-reconcile` | `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/plan-reconcile/SKILL.md` | **Inline** on the active **`coding-session`** lane. Plan reconcile / archive, follow-ups triage, post-ship workspace cleanup. Detached dispatch redirects to **`coding-session`**. |

### Diagram and feedback channels

- **Mermaid** (or similar) — Diagrams inside plan files (mode #1 **Architectural design**, mode #2 **Code design**, mode #3 **Sequencing** optional graph).
- **Slack**, support tickets, production telemetry, customer interviews — Async inputs listed under **Cadence** → *Customer feedback* / *New ideas from teammates*; drained at *Plan Updates*, not plan-authoring tools.

## Planning Modes

Per Strategy principle #2, planning happens in three modes, applied top-down: **architectural / code design**, **delivery phases**, and **PR breakdown**. Each addresses a different question — design says *what* will exist, delivery says *how the design decomposes* (into sub-phases or into PRs) *on its way to delivery*, and PR breakdown says *which coding-ready PRs* a PR-ready phase produces. PRs are the only units that ship; phases are organizing structure, not delivery units.

**Every level of the plan tree gets its own plan file.** A feature is a plan tree rooted at the **Master Plan** (one file per feature, mode #1). Every phase, sub-phase, and sub-sub-phase below it is its own standalone plan file authored from the **Phase plan template** in mode #2 — recursion stops only when a plan is decided to be **PR-ready**. Every PR is its own standalone plan file authored from the per-PR template in mode #3. Standalone files at every level keep each plan focused on a single granularity, let **a coding agent** work without broader-context distraction when working from a PR plan (Strategy #6), and make **indexed child expansion** via **`new-plan`** the natural way to grow any non-PR-ready entry one level down.

**The dual-title `Delivery phases | PR breakdown` section is the recursion point.** Both the Master Plan template (§ 6) and the Phase plan template (§ 5) end in a dual-title section whose heading is one of `Delivery phases` (children are sub-phase plans) or `PR breakdown` (children are PR plans, mode #3). The shared **§ 6 / § 5 contents rule** below the Phase plan template defines both shapes once. Until the decomposition decision is made, the heading reads `Delivery phases | PR breakdown` and the body is `_TBD_`.

**Roles and surfaces** — Agent definitions, GitHub, plan board, and the protocol are listed in **Development tools** (section above). Subsections below define **authoring conventions** (short bullets, LLM consumers, carve-outs) that apply across the three modes.

**Bullet-style convention.** Most bulleted sections across the three modes follow a short-bullet rule: aim for 2–3 words per bullet, never more than 5. **A long list of short bullets is always better than a short list of long sentences.** The rule exists because the primary reader is a human (the developer) scanning the plan board to validate a design or trace delivery — humans process small, bite-sized chunks faster and more precisely than long prose, so terse bullets win.

**LLM-agent corollary.** When a section's primary consumer is an LLM agent (e.g. **a coding agent** reading a PR plan, **a pre-PR reviewer agent** in a **fresh agent session**, or **a reviewer agent** reading a PR description), the constraint becomes *whatever length lets the agent consume the section unambiguously*, not 2–5 words. Sometimes that's still short bullets (e.g. **Change scope** in mode #3 is the contract for **a coding agent** — terseness *is* the value, and a clipped bullet is unambiguous because it names a code-level concept the agent can ground on). Sometimes it's full sentences (e.g. **Reasoning** in mode #3 — **a coding agent** has to relay the *because* into a PR description for **a reviewer agent** and surface the same *because* in a **fresh pre-PR reviewer agent session**, and a 3-word bullet would force **a coding agent** to invent context). The author judges per section.

**Carve-outs from the short-bullet rule.** Sections that opt out, with reason:
- **PR list** (mode #3 set-level § 3) — a numbered list whose item lines (the PR slug or short title, bolded) follow the short-bullet rule, but whose **Single concern** sub-bullet inherits the per-PR § 1 sentence verbatim and is therefore full prose, not 2–5 words.
- **Reasoning** (mode #3 per-PR) — **a coding agent** (implementation + **fresh pre-PR reviewer agent session**) + **a reviewer agent**-facing; full sentences so the PR description carries faithful rationale.
- **Deploy test plan** (mode #3 per-PR) — each step must be unambiguous for the on-call.
- **Repo rules impact** (mode #3 per-PR § 5) — short bullets for **`.cursor/rules/*.mdc`** in the repo that receives the PR (hosting repo or hosting repo worktree); see **`.sedea/centers/research-and-development/rules/40_maintain-rules.mdc`**. **Not** Sedea center rules under **`.sedea/centers/`** — R&D center changes use **`improve center rules`** on **`research-and-development`**; Sedea platform center rules use **`sedea`**. The `_None — …_` line is still short-bullet form.
- **Caveats** (mode #3 per-PR only) — **a coding agent** (implementation + **fresh pre-PR reviewer agent session**) + **a reviewer agent**-facing; full sentences so the PR description carries the concern faithfully. *In modes #1 and #2 Caveats is read by the developer during plan review and follows the short-bullet rule like the other planning bullets — short, scannable, sufficient.*

Each section says inline whether it follows the short-bullet rule or opts out.

### 1. Architectural / code design

The design mode answers: *what shape does the change take, and where does it land in the codebase?*

#### Master Plan template

A **Master Plan** operates at feature granularity. It has these sections only — sections 1–6 are required, section 7 is optional:

1. **Background.** 1–2 sentences about the feature from a hosting repo perspective.
2. **Benefits.** Short bullet points covering only the *why* — benefits to merchants or their customers, cost / effort reductions for the system, user-experience improvements. Follow the short-bullet rule from the bullet-style convention above.
3. **Related features.** Short bullet points capturing how this feature relates to others touching the same parts of the system. Per related feature, list the relationship type and what it implies for **delivery** or **scope**. **Ordering / concurrency** — *follows*, *precedes*, or *concurrent*, with the implied synchronization need (order, shared surface, rollout coupling). **Scope** — *narrows scope*, *widens scope*, or *shifts scope*, with a few words on *how* (less this feature must own, more it must cover, or boundaries / ownership that move). One bullet may combine ordering and scope when both apply. Follows the short-bullet rule.
4. **Architectural design.** One or more diagrams showing what the implementation will look like. Pick the diagram type(s) that best fit the feature:
 - **Component / architecture chart** — service topology, module boundaries, dependency direction.
 - **Flow chart** — control flow or data flow through new logic.
 - **Sequence diagram** — interactions between services, processes, or actors over time.
 - **State diagram** — lifecycle / state-machine changes.
 - **ER / schema diagram** — data model or database changes.
 - …whatever conveys the change most clearly.
5. **Changes.** Short bullet points listing what changes, how, and where, scoped at the feature level. Follows the short-bullet rule. Immediately after the change bullets, the **`planner`** protocol branch appends a **`### Decomposition assessment`** subsection (same short-bullet + one-line recommendation pattern as phase plans — see mode #2 below). That block records **kinds of change**, **PR count band**, **sequencing / coupling**, a **routing recommendation** (`Delivery phases`, multi-PR `PR breakdown`, or single-PR `PR breakdown`), and **confidence**, so **developer** can choose "Delivery Phase" or "PR Breakdown" with evidence before § 6 is drafted. After that block, **`planner`** appends **`### Complexity score (plan-scope signal)`** using the **table + overall score + band** shape and counting rules defined in **`planner`** Step 6c (**low** ≤ 10, **medium** 11–20, **high** > 20, where the score is the max of the three table rows). **High** means recommend **Route §6 → Delivery phases** on the **planner** lane — split the Master Plan into outcome-titled phase rows, each populated by **`phase-planner`** with lower scoped surface (see the protocol branch); separate Master Plans remain an optional alternative, not a prerequisite before §6.
6. **Delivery phases | PR breakdown.** Dual-title section: the heading is `Delivery phases` when the feature decomposes into one or more phase plans, or `PR breakdown` when the feature is small enough to break directly into PRs without an intermediate phase layer. When the heading is `Delivery phases`, the body is a **short numbered list** (see the **§ 6 / § 5 contents rule** below the Phase plan template in mode #2). Most features land on `Delivery phases`; tiny features that don't need a phase layer land on `PR breakdown` and skip mode #2 entirely. Until this section is drafted, its body may stay `_TBD_` **or** follow the **assessment-before-dual-title** pattern in the **§ 6 / § 5 contents rule** (assessment block already present from § 5, dual-title list still `_TBD_`).
7. **Caveats.** *Optional — omit if there are none.* Anything that needs special attention — known exceptions, edge cases, risks, or coupling that isn't obvious from the diagram or change list. Follows the short-bullet rule from the bullet-style convention above (developer-primary; one short bullet per concern is more scannable than a paragraph).

### 2. Delivery phases

The delivery-phases mode answers: *how does the design decompose on the way to delivery?* A phase is **never delivered directly**. It is either broken further into sub-phases (the next hierarchy level down) or split into PRs via mode #3 (PR breakdown) that are themselves the delivered units. Phases exist to step the design down from "one big shape" toward PR-sized chunks aligned with Strategy #4 (small chunks, fast to production).

**PR-readiness is decided per phase.** When you decide a phase will be split directly into PRs (no further sub-phases), you mark it a **PR-ready phase** — its dual-title section is titled `PR breakdown` and holds PR pointers via mode #3. Otherwise, the **delivery phase** is further decomposed into **sub-phases** — its dual-title section is titled `Delivery phases` and holds a **short numbered list** of summary entries pointing at each sub-phase's standalone plan file. The decision is made per phase, so PR breakdown is **optional and partial by design**: some phases of the same parent may be PR-ready while others decompose further. A phase having a PR breakdown is what makes it **PR-ready** — there is no further plan breakdown beyond it.

**This mode produces a standalone plan file per child phase.** Each item in the parent plan's dual-title `Delivery phases` **numbered list** corresponds to its own `<slug>.plan.md` authored from the **Phase plan template** below. The parent's section only carries short summaries with links — the body of every phase plan lives in its own file. This is what lets every plan stay scoped to a single granularity and keeps any plan a reader opens digestible in one screen.

#### Phase plan template

A **phase plan** is a standalone plan file that fills in one entry of a parent plan's dual-title `Delivery phases` section. The same phase plan template applies whether the parent is a **Master Plan** or another phase plan (recursion). It has these sections only — 1–5 are required, 6 is optional:

1. **Background.** 1–2 sentences on how this phase builds on the previous phase(s) and which part of the parent plan it covers.
2. **Scope.** One short sentence describing the scope at a high level, plus diagram(s) reused from the parent plan's **Architectural design** section with the parts this phase touches highlighted (annotation / color / callout). The highlight should convey both *which* parts the phase touches and *how* it touches them.
3. **Code design.** A diagram giving a visual representation of the change introduced by this phase. Pick the type that best fits, using the same menu as **Architectural design** in mode #1 (component, flow, sequence, state, ER, …).
4. **Changes.** Short bullet list describing each change. Follows the short-bullet rule from the bullet-style convention above. Immediately after these bullets, the **`phase-planner`** protocol branch appends **`### Decomposition assessment`** — a short, explicit pass over **kinds of change** (count distinct *kinds*, not files), **PR count band** (single vs few vs many), **sequencing / coupling** (migrations, flags, cross-repo, etc.), a **routing recommendation** (`Delivery phases` vs multi-PR `PR breakdown` vs single-PR `PR breakdown`), and **confidence** (high / med / low). That block is **evidence for the next planning move**; the committed recursion shape is still the dual-title **heading** once `delivery-phases` / `pr-breakdown` runs. Until then, keep the dual-title heading as `Delivery phases | PR breakdown` and leave the dual-title **list** body as `_TBD_` after the assessment block (see **assessment-before-dual-title** below).
5. **Delivery phases | PR breakdown.** Dual-title section: the heading is `Delivery phases` when this phase decomposes further into sub-phases, or `PR breakdown` when it is PR-ready and decomposes directly into PRs. When the heading is `Delivery phases`, the body is a **short numbered list** (see the **§ 6 / § 5 contents rule** below). The **heading** is the committed decomposition decision once set; the **`### Decomposition assessment`** block (between § 4 and § 5 for phase plans, under § 5 for Master Plans) is the **pre-commitment sizing record** used to choose that heading. Until the decision is made, leave the heading as `Delivery phases | PR breakdown` and the list body `_TBD_` (with assessment already filled in by `planner` / `phase-planner` where those protocol branches have run).
6. **Caveats.** Same as mode #1 above — *optional*, short bullets for exceptions, risks, or coupling that needs special attention (e.g. feature-flag prerequisites, ordering constraints with other phases, migration sequencing). Follows the short-bullet rule.

#### § 6 / § 5 contents rule (shared by Master Plan and Phase plan templates)

**Assessment-before-dual-title.** For a Master Plan or Phase plan, the file may contain **`### Decomposition assessment`** (sizing and routing recommendation) **immediately above** the dual-title `## 6.` / `## 5.` section while the dual-title body is still `_TBD_`. Legacy plans may have only `_TBD_` under the dual heading; **`pr-breakdown`** ensures an assessment exists (inserting one if missing) before the developer picks `Delivery phases` vs multi-PR vs single-PR `PR breakdown`. The assessment does **not** replace the numbered child list or the mode #3 set-level template — it informs the choice.

**Single-PR on a phase plan (draft location — binding).** Typical chain: **`planner`** → **`delivery-phases`** → **`new-plan`** → **`phase-planner`**. When **`phase-planner`** records **single-PR** `PR breakdown` in **`### Decomposition assessment`**, **always** draft the full § 5 **`PR breakdown`** set-level block (**`### Single-concern strategy`**, **`### Sequencing`**, **`### PR list`**) on **this phase plan** — same shape as multi-PR phases; **K = 1** only changes list length.

1. **Default procedure (where the PR list is drafted).** Run inline **`pr-breakdown`** with **`targetPlanPath`** = **this phase plan** and `prBreakdownShape: "single"`. Retitle § 5 to **`PR breakdown`** when the set-level block is written. The decomposition **ancestor** (Master Plan **`Delivery phases`** row **N**) receives **link-only** updates: **`Phase plan:`** (phase link) and **`Plan:`** (PR link after **`new-plan`**) — **never** a row-scoped **`#### PR breakdown — row N`** block or duplicate **`### PR list`** on the ancestor.
2. **Phase lane ownership.** While **`continuationOwner: phase-planner-agent`**, the phase `.plan.md` (§§ 1–4, assessment, § 5 **`PR breakdown`**) is the **primary delivery document** in user-facing recaps — **link the phase file first**.
3. **Forbidden (agent failure).** Hoisting PR-list drafting to the ancestor Master Plan; **`StrReplace`** on the ancestor that inserts **`#### PR breakdown — row N`**, **`### Single-concern strategy`**, **`### Sequencing`**, or **`### PR list`** for a single-PR phase row; leaving phase § 5 as a pointer-only note when the route is **`pr-breakdown-single`**.

See **`phase-planner/SKILL.md`** Step **5b-decompose** and **`pr-breakdown/SKILL.md`** (single-PR uses **step 5s** on the phase target, same flow as multi-PR).

Every plan ends in a **dual-title section** — § 6 in the Master Plan, § 5 in a Phase plan — whose heading is one of two values, and whose body shape is determined by the heading:

- **Heading = `Delivery phases`** (the plan decomposes into child phases): a **short numbered list** — use Markdown ordered list syntax (`1.`, `2.`, `3.`, …), **one numbered item per child phase**. Under each numbered item, three nested sub-bullets (unordered `-` bullets are fine):
 - Sub-bullet 1: the child's decomposition decision — `Delivery phases` or `PR breakdown` (matches the child plan's own dual-title heading).
 - Sub-bullet 2: a one-line scope sentence (paraphrased from the child plan's § 2 Scope).
 - Sub-bullet 3: a Markdown link to the child plan's `.plan.md` file.

 List index **N** (1-based ordered list) is what the developer picks via **AskQuestion** (one `option` per index) when spawning a child via **`new-plan`**: keep list order and numbering in sync with `## N.` phase headings in the parent plan when you add those headings (same **N**, same sequence). Follows the short-bullet rule (each sub-bullet is one short line).

- **Heading = `PR breakdown`** (the plan is PR-ready and decomposes directly into PRs): the mode #3 set-level content — Single-concern strategy + Sequencing + **PR list**. The **PR list** sub-section is itself a **short numbered list** mirroring the Delivery phases shape (one numbered item per PR, with the PR's slug or short title bolded on the item line so **`new-plan`** can seed the child name from item **N**). See mode #3 below for the full set-level template, including the two sub-bullets each numbered item carries.

A short **optional intro paragraph** (one or two sentences) is allowed immediately under the heading and before the entries — useful when the decomposition needs a one-line framing the reader can't infer from the entries alone (e.g. "phases run in two parallel tracks"). Skip it when the entries speak for themselves; an empty intro is preferred over filler.

A non-PR-ready plan thus *only* lists short summaries pointing at child plans — never inlines a child's body. To break a child entry out into its own plan file, the developer picks list index **N** via **AskQuestion** per **30_planning-target-resolution** § *Sedea input channel*; the agent runs the **`new-plan`** protocol branch (**Development tools** § *Protocol branches*) with the parent plan resolved from chat context per **`.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`**. **N** is the ordered-list index from the parent's numbered list of children — `Delivery phases` body when the heading is `Delivery phases`, or the `### PR list` sub-section when the heading is `PR breakdown`. **`new-plan`** seeds the child plan's name from the bolded item title on item **N**'s line (indexed-child mode). **Indexed-child stub:** the child file uses a **generic** scaffold (`## Overview`, `## Phasing`, `## Out of scope`) until **`phase-planner`** or **`pr-plan`** replaces the body with the Phase plan or per-PR template — that two-step split is intentional.

#### Depth-first plan-tree traversal (indexed spawn)

**List-first, expand-when-eligible.** When **`delivery-phases`** or **`pr-breakdown`** drafts a parent list, the plan file shows **every** phase or PR at high level. Each row's **`Plan:`** sub-bullet stays `_TBD_` (or an equivalent spawn placeholder) until that row becomes **eligible** for **`new-plan`** indexed spawn. **Do not** scaffold all children in one approval pass.

**Ship-complete gate (normative).** A row is eligible for indexed spawn only when every **blocking** predecessor is **ship-complete** on the **`plan and deliver`** §8 ship ledger (`shipPhase: done`, `rowStatus: closed`, or explicit `deferred` / `abandoned` per developer choice on that dispatch). Planning-handoff signals alone (`readyForImplementation`, populated §§1–4) do **not** unlock the next row.

| Parent list | Blocking rule |
| --- | --- |
| **`Delivery phases`** (phase rows) | **Always sequential.** Phase **N+1** is not eligible until phase **N** is ship-complete — meaning every PR plan under phase **N** meets the ship-complete bar above (`shipPhase: done` + `rowStatus: closed`, or explicit `deferred` / `abandoned`). |
| **`### PR list`** (PR rows) | **Stage-aware** per **`### Sequencing`** below. |

**PR stages (reuse set-level `### Sequencing`).** The mode #3 set-level template already records which PRs are chained vs parallel (bullet stages such as *Stage 1 (sequential): PR 1 → PR 2; Stage 2 (parallel): PR 3, PR 4*). Agents **parse** that subsection — do not invent a parallel syntax elsewhere.

- **Sequential chain** (within one stage, or `→` between PR numbers): PR **k+1** is not eligible until PR **k** is ship-complete.
- **Parallel stage** (comma-separated PRs in one stage label): all PRs in that stage may become eligible **together** once the **prior stage** is fully ship-complete (every PR in the prior stage meets the ship-complete bar above).
- **Single PR** (`### Sequencing` notes one PR): only item **1** exists; no sibling gate.

**List approval vs expand.** Structured choice on **`delivery-phases`** / **`pr-breakdown`** separates **approve list** (wording + order + sequencing) from **expand eligible row(s)** (run **`new-plan`** only for indices that pass the gate). On **`pr-breakdown`** inline under **`planner`** or **`phase-planner`**, **`approve-list`** may **auto-expand PR index 1** in the **same** act-after-select turn when depth-first eligible — then inline **`new-plan`** → inline **`pr-plan`** (§§1–4, verbatim **Single concern** from the list row). PR **2+** and re-expand still use **`expand-eligible`**. **`delivery-phases`** unchanged (approve list does not auto-expand). See those skills §6 and **`.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`** § *Depth-first expansion eligibility*.

**Upstream notification (spawn chain).** When a **`coding-session`** child finishes **plan-reconcile** with the PR **merged**, **main** fast-forwarded, and the target plan **archived** (`shipPhase: done`, `rowStatus: closed`), the child terminal **`AGENT_RESULT_RESPONSE_V1`** must set **`outputs.prShipComplete: true`** and include **`parentPlanPath`**, **`parentPlanSlug`**, **`parentIndex`** from spawn inputs. Mission Control delivers that result to the **parent lane** (`pr-plan` → inline **`new-plan`** → **`pr-breakdown`** / **`phase-planner`** → **`planner`**). Each parent **re-emits an updated** terminal result (same `correlationId`) after merging child ship status so upstream agents can run **`expand-eligible`** / **`expand-next-eligible`** without waiting for manual **Ship recap** on the Squad Leader lane. When every PR under a phase is **`prShipComplete`**, **`phase-planner`** sets **`outputs.phaseShipComplete: true`** for **`delivery-phases`** / **`planner`**. Contract detail: **`missions/plan-and-deliver/skills/README.md`** § *Upstream ship-complete notification*.

### 3. PR breakdown

The PR-breakdown mode answers: *how does a PR-ready plan decompose into individual, coding-ready PRs?* Each PR is a single-concern deliverable (Strategy #6) that can ship to production on its own. This mode applies to any plan whose dual-title section is titled `PR breakdown` — typically a **PR-ready phase plan**, but also a **Master Plan** for features small enough to skip the phase layer entirely. PR breakdown is therefore optional and partial: only PR-ready plans go through this mode.

**Each PR has its own standalone plan file.** Like phase plans (mode #2), PR plans are standalone — but where phase plans separate by *granularity*, PR plans separate by *coding agent isolation*. A PR plan is the artifact handed to **a coding agent**, who must not be confused by broader feature / phase context. Keeping the PR plan scoped to a single concern keeps **them** focused on a single concern (Strategy #6).

The responsibilities of **a coding agent** do not stop at the code change. **They** also produce the prompt for **a PR-creating agent**, which writes the PR description. That description must give **a reviewer agent** *complete context* — including *why* a change was made and *which alternatives were considered and rejected* — so **a reviewer agent** can respond with actionable feedback rather than exploratory prompts. The same per-PR material must support a **fresh pre-PR reviewer agent session** (see **Development tools** § *Pre-PR reviewer agent*) before those dedicated reviewer-agents run. **A coding agent** cannot invent that reasoning without the per-PR plan carrying it explicitly. This is why the per-PR template below contains **Background** and **Reasoning** sections in addition to the change-scope / tests / deploy-plan answers.

The breakdown answers five core questions split across two scopes:

| Set level (PR-ready plan's dual-title `PR breakdown` section) | Per PR (standalone PR plan file) |
| --- | --- |
| 1. How is single-concern enforced across the whole set? | 3. What is the change scope of this PR? |
| 2. Which PRs are chained vs parallel? | 4. What tests need to be written? |
| | 5. What is the test plan before and after deployment? |

…plus the supporting Background + Reasoning sections per PR so **a PR-creating agent** can draft a description **a reviewer agent** can act on — and so **a coding agent** can run a **fresh pre-PR reviewer agent session** from the same artifact.

The set-level content fills the PR-ready plan's dual-title section (Master Plan § 6 or Phase plan § 5) when it is titled `PR breakdown`. Every PR pointer in that list links to a standalone PR plan file authored from the per-PR template.

#### PR sizing — test cases and kinds of changes

**Canonical source (center sync contract).** This subsection is the **authoritative** definition of PR sizing for the **research-and-development** center. When buckets, kinds-of-change rules, or test-case counting change, edit **here first**, then align:

- **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** § *Keep PRs small and focused* (ship-lane summary)
- **`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-breakdown/SKILL.md`** § *Step 5a — Infer PR boundaries from the parent plan* (operational application)
- **`planner`** / **`phase-planner`** § *Decomposition assessment* (routing bands `single` | `few (2–5)` | `many (6+)` only — sizing metrics reference this subsection)

Do **not** change thresholds (**≤ 10** / **11–20** / **21+**) or the kinds-vs-lines rule in a single downstream file alone.

Two metrics support the breakdown decision — which PRs to carve out, and how heavy each candidate ends up:

1. **Test-case count.** Estimate the test cases each candidate PR introduces or meaningfully changes — unit + integration / snapshot + exploratory recordings, each enumerated case counted once. Buckets: **≤ 10** simple, **11–20** mid-sized, **21+** heavy. A heavy PR is a *signal to investigate* splitting — it is not automatically wrong. Do not split if the only available split runs within one kind of change (instance batching), or if the result is a half-shipped feature (Strategy #4 trumps size).
2. **Kinds of changes.** Count *distinct kinds* of changes — not raw lines and not raw files. N instances of the same kind (the same shape applied to N similar files) is **one kind**, not N kinds. Threading the same prompt fragment into 8 generators is one kind with 8 instances; **a reviewer agent** reads the first instance carefully and skims the rest, and **a pre-PR reviewer agent** does the same. Splitting by call-path or by file is rarely justified when the kinds across both halves are identical.

Raw changed-line count is **not** a size signal in this process. Downstream copies must stay aligned with this subsection per the sync contract above.

**When to run sizing.** **`### Decomposition assessment`** is authored at the end of **`planner`** § 5 and **`phase-planner`** § 4 (same metrics as this subsection), *before* the dual-title section is populated — so **developer** and **`pr-breakdown`** together choose `delivery-phases`, a multi-item **`pr-breakdown`**, or a **one-item `### PR list`** with full context. If a plan predates that block, **`pr-breakdown`** inserts it before the decision gate.

#### Set-level template (PR-ready plan's dual-title `PR breakdown` section)

When a PR-ready plan's dual-title section is titled `PR breakdown` and populated, it has these sub-sections in order:

1. **Single-concern strategy.** 1–2 sentences on how this PR-ready plan keeps each PR single-concern (Strategy #6) — typically: "every PR maps to exactly one user-visible behavior change or one internal contract change; no PR mixes concerns". Optionally followed by a short bullet list of concerns that were tempting to bundle but were intentionally split (short-bullet rule per the convention above).
2. **Sequencing.** How PRs relate in time — **this subsection is the machine-readable gate** for depth-first PR expansion (see **Depth-first plan-tree traversal** above). Pick whichever form conveys it most clearly:
 - Bullet list grouped by stage: *Stage 1 (sequential): PR 1 → PR 2; Stage 2 (parallel): PR 3, PR 4*. Numbers match the `### PR list` ordering so cross-references resolve at a glance. Label each stage **`(sequential)`** or **`(parallel)`** so agents can parse blocking vs concurrent PRs.
 - Small dependency diagram (Mermaid graph or similar) — optional supplement; the staged bullet form remains authoritative for **`new-plan`** eligibility when both exist.
 When the bullet form is used, follows the short-bullet rule.
3. **PR list.** A **short numbered list** — use Markdown ordered list syntax (`1.`, `2.`, `3.`, …), one numbered item per PR, in roughly the sequencing order from the **Sequencing** sub-section above. A **single numbered item** is valid when the whole plan ships as one coding-ready PR (then **`new-plan`** indexed spawn for item **1** → per-PR plan → **`pr-plan`**). Each numbered item carries the PR's slug or short title on the item line, **bolded** so the **`new-plan`** protocol branch (digit-only **N** in session) can read it as the new plan's name; under each numbered item, two nested sub-bullets (unordered `-` bullets are fine):
 - Sub-bullet 1: **Single concern.** A one-line **PR description seed** — the exact per-PR § 1 sentence **`pr-plan`** copies verbatim into the child plan (no paraphrase when `parentRowSingleConcern` is passed); **a reviewer agent** can scan the set in one glance.
 - Sub-bullet 2: **Plan.** A Markdown link to the standalone PR plan file, or _TBD_ until **`new-plan`** creates the child for item **N** (indexed spawn).

 The index **N** is the digit-only indexed-child argument to **`new-plan`** — invoking **`new-plan`** with the parent locked and **N**=`3` on a parent plan whose dual-title section is `PR breakdown` spawns the standalone PR plan file for the third numbered item. This section is **carved out** of the short-bullet rule on the **Single concern** sub-bullet — that bullet inherits the per-PR Single-concern sentence and is full prose, not 2–5 words. The bolded item line itself follows the short-bullet rule (a slug or 2–5-word title).

#### Per-PR plan template

Each PR's standalone plan file has these sections only — sections 1–7 are required, section 8 is optional. Sections 1–3 keep **a coding agent** on a single concern; sections 4 and the prose of section 2 give **them** what they need so **a PR-creating agent** can draft a complete PR description for **a reviewer agent** — and so **a coding agent** can run a **fresh pre-PR reviewer agent session** from the same text.

1. **Single concern.** One sentence stating the single concern this PR addresses (e.g. *"Add the `feature_flag_x_enabled` field to the merchant config schema and surface it in the admin UI read path."*). This sentence is also what shows up next to the PR's bullet in the parent PR-ready plan's PR list, and is the basis for the PR title.
2. **Background.** 2–3 sentences narrowly scoped to this PR — the relevant prior state of the codebase, and the gap, decision, or upstream change this PR is responding to. Oriented for **a reviewer agent** reading the PR cold *and* for **a coding agent** in a **fresh pre-PR reviewer agent session**: enough context that **they** can understand *why this PR exists* without opening the parent plan. Do **not** restate the broader feature / phase context — **a coding agent** must stay focused on the single concern; this section only carries the narrow slice of context needed for the PR description.
3. **Change scope.** Short bullet list of what changes, how, and where. Follows the short-bullet rule from the bullet-style convention above — terseness is the contract for **a coding agent**: anything outside this list is outside the PR. (This is a section where the LLM corollary still resolves to short bullets, because each bullet names a code-level concept the agent can ground on.)
4. **Reasoning.** Why this PR makes the choices it does, in two parts. The bullet-length rule does **not** apply here — items are full sentences, since each entry needs to make the reasoning unambiguous for **a reviewer agent** (via the PR description), for **a coding agent** relaying to **a PR-creating agent**, and for **a coding agent** in a **fresh pre-PR reviewer agent session**.
 - **Why this approach.** The design decisions made in this PR and *why each was made*. Capture the *because* for every non-obvious choice — naming, layering, where logic is placed, what is reused vs introduced, what is kept backwards-compatible.
 - **Considered & rejected.** Alternatives that were considered but not taken, each with the reason it was rejected. This gives **a reviewer agent** maximum signal and the same signal to **a coding agent** in a **fresh pre-PR reviewer agent session**: capturing "we considered X and rejected it because Y" short-circuits "did you think about X?" comments and lets **a reviewer agent** give actionable feedback on the chosen path.
5. **Repo rules impact.** Short bullet list for **a coding agent** — which **`.cursor/rules/*.mdc`** files in the **hosting repo** (the repo that receives this PR) should be **added or updated** after the code change lands, and **one line each** on *what* guidance to add or adjust (new boundary, deployment constraint, error-handling pattern, layout rule, …). Follows the short-bullet rule; paths are relative to that repo's root. When this PR does not warrant any rule change, write a single bullet: `_None — no repo rule updates required for this PR._` This section is **plan-first** for long-lived agent guidance (see **`.sedea/centers/research-and-development/rules/40_maintain-rules.mdc`**); it is **not** required to duplicate the GitHub PR description body unless **a coding agent** chooses to surface it under "Notes for the reviewer".

 **Align hosting-repo rules before commit and push.** The §5 list is not only planning intent — it is the **coding checklist against the hosting-repo diff**. Before asking for review or running rule **20** § *Commit and push cadence*, **a coding agent** reconciles every §5 bullet with the worktree diff: bullets that call for **update** / **extend** / **add** a named **`.cursor/rules/*.mdc`** file must have the corresponding edit **in the same PR** (preferred) or an explicit follow-up commit in the same worktree before merge; bullets that say **no file edit** / **verify only** / **skip unless …** are satisfied by confirming the code obeys the existing rule (no `.mdc` change). If a rule edit is genuinely deferred, **revise §5 in the plan** in the same window so a **fresh pre-PR reviewer agent session** and **reviewer-agents** do not see plan ↔ repo drift. **Executable ship step:** [plan-and-deliver `coding-session/SKILL.md` § *Repo rules reconciliation (binding)*](../missions/plan-and-deliver/skills/coding-session/SKILL.md#repo-rules-reconciliation-binding) (pre-PR); post-review **`.mdc`** edits via [Post-review repo rules handoff](../missions/plan-and-deliver/skills/coding-session/SKILL.md#post-review-repo-rules-handoff) when inline **`pr-review`** assigns **Rule-update required**.
6. **Tests to write.** Check this repo's specific rule for writing tests if exists. If the rule does not exist write: *No testing rules exist for this repo.*
7. **Deploy test plan.** Three **numbered GFM task lists** (Markdown `1. [ ]`, `2. [ ]`, `3. [ ]` — *not* dash bullets, *not* bare numbered items without checkboxes), under a **`**Status:**`** lifecycle marker. Section shape:

 ```markdown
 ## 7. Deploy test plan

 **Status:** drafted *(YYYY-MM-DD: PR plan drafted.)*

 ### Local test

 1. [ ] First local step.
 2. [ ] Second local step.

 ### Staging test

 1. [ ] First staging step.
 2. [ ] Second staging step.

 ### After deploy

 1. [ ] First post-deploy check.
 2. [ ] Second post-deploy check.
 ```

 The **`**Status:**`** line tracks the section's lifecycle: `drafted` (PR plan written; **Local test** active) → `pr-open` (PR exists on the integration line; **Staging test** active) → `deployed` (PR merged; **After deploy** unlocked) → `done` (all checks complete). Each transition appends a dated `*(YYYY-MM-DD: <note>)*` entry; history is **append-only** and serves as the audit trail for what was verified when. The **`deploy-walk`** protocol branch drives this lifecycle: it **auto-runs** agent-executable steps (tests, scripts, automatable checks) and flips boxes on pass; **manual** steps are presented for the developer with agent assistance. Plans authored without the lifecycle marker still validate (legacy form), but `deploy-walk` will surface the missing-marker case as a flag and recommend adding it.

 **Sub-sections:**
 - **Local test** — what to verify locally before the PR is opened (worktree, localhost, unit/integration checks beyond standing pre-review commands).
 - **Staging test** — what to verify on staging (or preview env) **after the PR is up and before merge**.
 - **After deploy** — what to verify in production after the PR ships (smoke checks, monitors / alerts to watch, rollback trigger conditions).

 **Legacy:** Plans with **`### Before deploy`** only (no Local / Staging split) are read as **`### Local test`** during migration; authors should split staging steps into **`### Staging test`** on the next plan edit.

 The bullet-length rule does **not** apply here: items can be full sentences, since each step needs to be unambiguous for **a coding agent** or the on-call. Numbering is required so reviewers and a **fresh pre-PR reviewer agent session** can reference each step by index (e.g. *"flag § 7 After-deploy 3"*) without counting; the same convention applies to § 8 Caveats. The `[ ]` / `[x]` checkbox is the contract the **`deploy-walk`** protocol branch uses — *no* checkbox means the step won't be picked up by `deploy-walk <N> done` and the step has to be tracked manually. Prefer **agent-executable** wording for automatable checks (named test command, script path, curl with URL) and reserve **manual** phrasing for UI, production dashboards, and judgment calls — see **`deploy-walk/SKILL.md`** § *Agent-executable vs manual steps*.

 **What NOT to include.** § 7 is the **PR-specific delta** on top of the baseline development process — anything covered by always-on rules, standing alerts, or the hosting repo’s **standing** pre-review commands (README, CONTRIBUTING, CI defaults, etc.) does not belong here. Center docs do **not** name hosting-repo rule paths; discover that repo’s baseline from its own docs when implementing. Specifically:

 - **Standing verify / review commands** — Do **not** paste the hosting repo’s normal lint/build/test (or equivalent) pre-review bar into § 7. § 7 captures what is **different for this PR** beyond that standing bar. Do **not** assume another hosting repo’s pipelines or copy baseline commands from this center doc.
 - **Local smoke curls when integration tests cover the same surface.** If § 6 Tests to write includes an integration test that exercises the new endpoint / handler / job, do not also list a `curl http://localhost:<port>/...` step in **Local test**. The integration test is the contract; a localhost curl is a strictly weaker version of it. List a local smoke curl only when there is no integration test (because the surface is hard to integration-test) or when the curl exercises a real external dependency the integration test mocks.

 When applying these exclusions leaves a section empty (e.g. **Local test** or **Staging test** with no PR-specific prep), write the section as a single italic line — *"None — covered by § 6 tests and the hosting repo’s standing pre-review checks (not duplicated here)."* — rather than leaving it blank.

 **Frontmatter capstone todo (`deploy-test-plan-verified`).** Every PR plan's YAML `todos:` list must include one entry **after** implementation todos, **before** `isProject:`:

 ```yaml
 todos:
 - id: deploy-test-plan-verified
 content: >-
 Mark done only when every Local-test, Staging-test, and After-deploy step is checked
 (`[x]`) and the deploy section `**Status:**` reads `done` (walk via `deploy-walk`,
 or edit manually). Independent of PR merge; run `plan-reconcile` protocol branch when you want
 reconcile/archive after merges.
 status: pending
 ```

 In real files **`todos:` already exists** — append only the **new** list item (same indentation as sibling todos: two spaces before `-`, four before `content` / `status`, six before each `>-` continuation line) after the last implementation todo, before `isProject:`.

 - **Purpose** — Plan Board and developers see a single row that stays `pending` until the deploy checklist is fully verified, even when every § 7 box is already `[x]` on disk (e.g. if someone edited Markdown without running **`deploy-walk`**). The todo is the **capstone**: mark `done` only in sync with `**Status:**` `done`.
 - **Who flips it** — The **`deploy-walk`** protocol branch flips this todo from `pending` → `done` in the **same turn** as the `StrReplace` that sets `**Status:**` `deployed` → `done` after the last After-deploy checkbox (see that protocol branch's *Frontmatter capstone* subsection). If you close the walk manually (edit the plan file without `deploy-walk`), flip the todo yourself.
 - **`plan-reconcile` is not auto-triggered.** Finishing the deploy walk (or this todo) does **not** run `plan-reconcile` protocol branch. **`plan-reconcile`** reconciles **merged** PRs, archive candidates, and follow-ups triage — a different cadence. Run `plan-reconcile` yourself when linked PRs have merged and you want reconcile/archive. See the **`plan-reconcile`** protocol branch *When to trigger* guardrail.
8. **Caveats.** *Optional — omit if there are none.* Free-form bullets for exceptions, risks, or agent-relevant warnings (e.g. feature-flag dependencies, schema-migration timing, rollback caveats). The short-bullet rule does **not** apply here: bullets may be full sentences, since this section faces **a coding agent** (implementation + **fresh pre-PR reviewer agent session**) and **a reviewer agent** — **a coding agent** carries Caveats into the PR description's "Notes for the reviewer" field (GitHub UI label), and **a reviewer agent** needs the concern spelled out unambiguously. (This is the divergence from mode #1 / mode #2 Caveats, which are developer-only and do follow the short-bullet rule.)

Sections 1, 2, 3, 4, 6, 7, and 8 (when present) flow into the PR description that **a coding agent** has **a PR-creating agent** write — single concern → PR title and summary; Background → "Context"; Change scope → "What changed"; Reasoning → "Why this approach" and "Alternatives considered"; Tests to write → "Tests"; Deploy test plan → "Verification / deploy plan"; Caveats → "Notes for the reviewer" (for **a reviewer agent** and for a **fresh pre-PR reviewer agent session**). Section **5 (Repo rules impact)** is primarily for **coding + workspace rules** alignment; it may be summarized in the PR description optionally but its contract is to list **which** rule files to touch — and **those hosting-repo `.mdc` edits land with the code before merge** unless §5 explicitly defers them (see **Align hosting-repo rules before commit and push** above).

#### Cross-repo dashboard-first sequencing (sedea-push)

When **plan and deliver** on the **sedea-push** hosting repo spans **both** `tapcart-push/` and `tapcart-merchant-dashboard/`, preserve a **dashboard-first** delivery order per feature slice so PMs can review UX before backend work lands.

**Trigger** — apply when **all** are true:

1. Dispatch uses **research-and-development** center **plan and deliver** (or downstream planning skills on that mission).
2. Feature scope touches **both** application submodules (`planner` Step 3a selects both paths, or PRD/plan text implies both).
3. Delivery is a **new or extended user-facing capability** — not pure infra, docs-only, or gitlink housekeeping on the sedea-push root.

**Per-slice invariant (normative order):** For each slice, plan and ship **shell → backend → wiring**:

| Step | Repo | Content |
|------|------|---------|
| **1 — Dashboard shell** | `tapcart-merchant-dashboard/` | UI layout, copy, styling, navigation, placeholder states; **no** live backend calls for the new capability |
| **2 — Backend work** | `tapcart-push/` | API routes, workers, schema/migrations, orchestration, config |
| **3 — Dashboard wiring** | `tapcart-merchant-dashboard/` | Connect UI to backend; gate network mounts behind LaunchDarkly when applicable |

Repeat per slice. Parallel delivery is allowed **across independent slices**, not **within** one slice's shell/backend/wiring chain.

**Planning artifacts:** When the trigger applies, Master Plan and phase **`### Decomposition assessment`** should record **Sequencing / coupling:** `cross-repo dashboard-first (shell → push API → dashboard wiring)`. **`pr-breakdown`** set-level **`### Sequencing`** and **`Delivery phases`** lists must preserve shell → backend → wiring order per slice.

**Authoritative hosting rule:** Full invariant text, feature-slice definition, shell placeholder rule, and LaunchDarkly table live in the sedea-push hosting repo — `.cursor/rules/push-monorepo-submodules.mdc` § *Cross-repo plan-and-deliver sequencing* on the active sedea-push checkout. Cross-reference that section; do not duplicate the full prose here.

**Governance mission cap vs feature delivery:** The sedea-governed-repo-setup Planning lane caps governance PR rows at three; **feature** plan-and-deliver work on sedea-push may exceed three PRs per slice or feature when complexity warrants — the invariant governs **order within a slice**, not a fixed PR count.

## Cadence

**Strategy**, **Development tools**, and **Planning Modes** describe the **artifacts** and tooling of feature development. **Cadence** describes the **operational loop** those artifacts live inside. Setup is one-shot per feature (PRD → **Master Plan**); from there, every feature runs the loop below until it is done shipping.

### Canonical sources (do not conflate)

| Question | Read first |
|----------|------------|
| Protocol branch names, templates, and the **hosting repo development loop** | This document — **Development tools** § *Protocol branches* and **Cadence** below |
| Happy-path **skill order** (planning → ship) | **Cadence reference** diagram (matches **`plan-and-deliver/plan.mdc`** *Cadence reference*) |
| **Mission Control `plan and deliver` dispatch** — who spawns whom, §§1–8 protocol, §8 ship ledger, `MC_DISPATCH_RESOLVED_V1` gates | **`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`** — *Squad operations* and §8 (not duplicated here) |

The large loop diagram below includes planning, **ship chain**, feedback, and plan updates. It is **not** the Squad Leader spawn map. Detached ship lanes, Mission Control §8 host sync, and leader-lane recap: **`plan.mdc`** §8 (*Mission Control host sync*, *Leader-lane ship recap*) and **Loop stages** § *Leader-lane ship recap* below.

### Cadence reference (skill order — same as plan-and-deliver mission plan)

**Planning** milestones below are logical — not strict spawn order. **`coding-session` ship chain** is **normative step order** on the implementation lane (inline · spawn · gate · procedure). **`pr-review`** runs **inline** after **`create-pr`** while the PR is open. **`plan-reconcile`** requires an **explicit start** — not auto after **`deploy-walk`** (rule **20**, **`plan-reconcile/SKILL.md`** § *Not auto-started from deploy-walk*).

```mermaid
flowchart TB
 classDef branch fill:#f0fdf4,stroke:#16a34a,color:#14532d

 subgraph plan["Planning"]
 PRD[PRD] --> MPB[planner]:::branch
 MPB --> DEC[delivery-phases or pr-breakdown]:::branch
 DEC --> CHILD[new-plan → phase-planner or pr-plan]:::branch
 end

 CHILD --> CSB[coding-session]
```

**Ship chain** (after implement — matches **`plan-and-deliver/plan.mdc`** *Cadence reference* and **`coding-session/SKILL.md`** § *Ship chain after implementation*):

```mermaid
flowchart TB
 classDef inline fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
 classDef spawn fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
 classDef gate fill:#fef3c7,stroke:#d97706,color:#78350f
 classDef proc fill:#f1f5f9,stroke:#64748b,color:#0f172a

 subgraph CS["coding-session lane"]
 direction LR
 CUT["Ship cut-point<br/>review · approve · commit"]:::gate
 LTW["Local test<br/>deploy-walk inline"]:::inline
 CPR["create-pr"]:::inline
 STW["Staging test<br/>deploy-walk inline"]:::inline
 PRV["pr-review"]:::inline
 WAIT["Wait merge<br/>post-create-pr gate"]:::gate
 PMC["Cleanup<br/>MCP detach · center cleanup"]:::proc
 ADW["After deploy<br/>deploy-walk inline"]:::inline
 REC["plan-reconcile<br/>explicit start"]:::inline
 CUT --> LTW --> CPR
 CPR --> STW --> PRV --> WAIT --> PMC --> ADW --> REC
 end

 subgraph CHILD["spawned child lane"]
 PPR["pre-pr-review"]:::spawn
 end

 LTW -->|spawn| PPR
 PPR -->|result go| CPR
```

### Hosting repo development loop (planning + ship + feedback)

```mermaid
---
config:
 layout: elk
---
flowchart TD
 %% Upstream setup section (visually outside the loop)
 subgraph Setup["Upstream Planning"]
 direction LR
 A["[Ad-Hoc] PRD"] --> B[Master Plan]
 end

 %% Main circular development cycle
 subgraph Cycle["Hosting repo Development Loop"]
 direction TB
 C[Next Phase Decomposition] --> D[PRs Breakdown]
 D --> E[coding-session]

 subgraph S1["Feedback Collection"]
 direction TB
 G1[Implementation Follow-ups]
 G2[Code Review Follow-ups]
 G3[New Ideas from Teammates]
 G4[Customer Feedback]
 end

 E --> PPR[pre-pr-review]
 E -.->|inline create-pr| CPR[create-pr]
 E -.->|inline pr-review| PRV[pr-review]
 E -.->|after merge| DW[deploy-walk]
 DW -.->|not auto-chained| REC[plan-reconcile]
 REC --> S1 --> H[Collect Feedback]
 H --> I[Plan Updates]
 end

 %% Link setup to main loop
 B --> C

 %% Classes for color consistency
 classDef indigo fill:#eef2ff,stroke:#818cf8,color:#1e1b4b
 classDef teal fill:#f0fdfa,stroke:#2dd4bf,color:#1e1b4b
 classDef violet fill:#f5f3ff,stroke:#a78bfa,color:#1e1b4b
 classDef orange fill:#fff7ed,stroke:#fb923c,color:#1e1b4b
 classDef fuchsia fill:#fdf4ff,stroke:#e879f9,color:#1e1b4b
 classDef green fill:#f0fdf4,stroke:#4ade80,color:#1e1b4b
 classDef yellow fill:#fefce8,stroke:#facc15,color:#1e1b4b
 classDef rose fill:#fff1f2,stroke:#fb7185,color:#1e1b4b

 class A indigo
 class B teal
 class C violet
 class D orange
 class E fuchsia
 class PPR,CPR,PRV,DW,REC fuchsia
 class S1 green
 class H yellow
 class I rose
```

**Diagram legend.** **`coding-session`** covers worktree setup and the **coding agent** implementation pass. **Pre-merge:** spawn **`pre-pr-review`**; **`create-pr`** and **`pr-review`** are **inline on `coding-session`**. **Post-merge:** **`deploy-walk`** and **`plan-reconcile`** inline on **`coding-session`**; **`plan-reconcile`** requires a **separate explicit start** — finishing **`deploy-walk` does not auto-run reconcile** (dotted *not auto-chained*). See **Cadence reference** and **`plan-and-deliver/plan.mdc`**. Feedback and **Plan Updates** close the iteration; they are not substitutes for ship branches.

**One-shot setup.** PRD → **Master Plan**. The agent that drafts the **Master Plan** from a PRD is the **`planner`** protocol branch (path in **Development tools** § *Protocol branches*); the artefact is mode #1's **Master Plan** template above.

**Continuous loop.** Once the **Master Plan** exists, the loop runs per *delivery slice* — the next-phase-to-ship plus the PRs it decomposes into. Each iteration produces one or more PRs in production and a batch of feedback that triages back into the plan tree. Loops continue until the **Master Plan**'s last phase ships.

**Targeted plan updates.** The closing arc is *Plan Updates*, not "**Master Plan** Update": each feedback item routes to whichever plan in the hierarchy fits its nature, and a single batch can fan out across many plans. Heuristics:

- **Code / system hardening discovered in passing.** Often slots into a deferred hardening phase appended to the **Master Plan**, scheduled to land when feature delivery has cooled off. Doesn't block the next iteration.
- **Feature improvement that's blocking customer adoption.** Goes into the *next* phase of the **Master Plan**; high priority by definition.
- **Implementation detail noticed during a session.** Often attaches to the currently-active phase plan rather than escalating to the **Master Plan** — local concern, local fix.
- **Out-of-scope idea bigger than this feature.** Might go to a different feature's **Master Plan**, a different top-level topic, or spawn a new **Master Plan** via the `planner` flow.

The triage decision is the human-in-the-loop part of the cycle — there is no rule like "feedback type X always goes to plan Y", just heuristics like the four above. The discipline is to *triage every item* before kicking off the next phase decomposition.

**An un-triaged follow-up is a forgotten one.**

### Loop stages

#### Next Phase Decomposition

Pick up the next phase to ship from the active plan's dual-title section (Master Plan § 6 or, recursively, a phase plan's § 5). The **section's heading** is the decomposition decision: `Delivery phases` means the body is a **short numbered list** of child phases; `PR breakdown` means "skip mode #2 and go straight to mode #3 here" — the body's `### PR list` sub-section is itself a **short numbered list** of child PRs. The two heading variants share the same numbered-list shape. Expanding list item **N** uses **`new-plan`** (indexed child) after the developer picks **N** per **`.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`** § *Sedea input channel* (**N** is the parent plan list index).

#### PRs Breakdown

For a plan decided to be PR-ready (its dual-title section is titled `PR breakdown`), this stage produces the per-PR plans. See **§ 3 PR breakdown** above and its set-level + per-PR templates.

#### Planning readiness vs worktree completeness

**Canonical (do not duplicate here):** [`.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`](../rules/30_planning-target-resolution.mdc) § *Planning readiness vs ship* (three signals + agent checklist), § *PR-plan completeness before coding-session* (script + snapshot ordering), and § *§8 ship ledger and inline `pr-review`* (leader recap after inline **`pr-review`**).

Two independent gates apply before a worktree opens: layer 1 **`readyForImplementation`** + **`planningHandoffApproved`** from **`pr-plan`** §5c **Start coding session**, then layer 2 **`developerApprovedImplementation`** from **`coding-session`**. On **`pr-plan`** §5d spawn, when **`plan-ws-completeness.mjs`** reports **`OK`** (full plan) or **`INCOMPLETE`** + **`EXPECTED_SECTIONS_5_8_TBD`** (§§1–4 drafted), the child **auto-authorizes** worktrees — no second approval modal; §§5–8 fill during implementation on that lane. Detached **`coding-session`** entry still uses the worktree-open gate. Neither layer alone advances Squad Leader §8 past `not-started` — **`plan-and-deliver/plan.mdc`** §7–§8.

#### Start implementation (`coding-session` entry)

After **`pr-plan`** handoff (or an approved per-PR plan), implementation runs on a **ship lane** — **not** on the **`plan and deliver`** Squad Leader lane (§§1–7). There is **no** `mission.yaml` command phrase for ship; use one of the starts below.

**Lane ownership (binding):**

| Actor | Spawns **`coding-session`**? | Role |
|-------|------------------------------|------|
| **Squad Leader** (`plan and deliver`, **`single-phase`**, **`quick-fix`**) | **No** from §§1–7 (or §§1–3) | Tracks §8 host sync only |
| **`planner`** Master Plan child | **Yes** — inline **`pr-plan`** §5d on **this lane** after §5c | Owns planning + §5d spawn |
| **`phase-planner`** child | **Yes** — Step **5f** or inline **`pr-plan`** §5d | Owns phase subtree + spawn |
| **Quick Fix Plan agent** | **Yes** — inline **`pr-plan`** §5d on child lane | Same §5c–§5d contract |
| **Developer** (phrase / snapshot) | Detached session | Worktree-open gate on coding lane |

**Anti-pattern:** *Squad Leader does not spawn **`coding-session`*** therefore *redirect implementation to Squad Leader* — **wrong**. Redirect means **this planning child lane** runs §5c–§5d, not the leader dispatch.

| How to start | Typical lane | Minimum inputs |
|--------------|--------------|----------------|
| **New Mission Control session** — natural language | Detached | Name **`coding-session`** or “implement this PR”; `@path` to `.sedea/operations/<operationsUserId>/plans/<slug>.plan.md` or `targetPlanSlug`; hosting repo **`repoPath`** or **`repoPaths`** |
| **After `pr-plan` spawn** (§5d **`AGENT_RUN_REQUEST_V1`**) | Child lane opened by host | **Same lane implements** the PR plan in the worktree after layer 2 — not paste-prompt-elsewhere. Spawn `inputs` carry `targetPlanPath`, `repoPath`, `readyForImplementation`, `planningHandoffMode: sections-1-4-complete`; §§5–8 may stay `_TBD_` until the child fills them. Worktree-open gate uses **Continue — fill §§5–8 while implementing** (expected `INCOMPLETE` from `plan-ws-completeness.mjs`) |
| **After `pr-plan` without spawn** (defer / revise only) | Detached session when developer starts later | Same as natural-language row; `readyForImplementation` is a hint only |
| **Re-use a prior session prompt** | Detached / coding-agent | Two-phase prompt from an earlier **`coding-session`** run; worktree name and sidecar `worktrees` must still match |
| **Planning snapshot** | Detached | Snapshot with `targetPlanPath`, `operationsUserId`, repo paths per **`.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`** |

**Do not** — see rule **30** § *Agent checklist (planning vs ship — do not conflate)*.

**Canonical skill:** `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/coding-session/SKILL.md`
**Squad Leader §8:** host sync from ship child terminals updates the leader dispatch automatically — no manual recap. See **`plan.mdc`** §8 *Mission Control host sync*.

#### Coding Session

Each PR is delivered through the **`coding-session`** protocol branch (see **Development tools** § *Protocol branches*). This stage runs center **`worktree-setup.sh`**, records the plan sidecar, and attaches the Sedea workbench when applicable. **Mission Control spawn** from **`pr-plan`** (or another spawner) defaults to **implementation on the child lane** in that worktree after the worktree-open gate — not an orchestrator-only stop that tells the developer to paste a prompt elsewhere. **Detached** or **`promptOnly`** entry may still emit a copy-safe prompt for **a separate coding agent** session. After implementation completes, **`coding-session`** runs every locally executable **test and check** (Project rules, plan §6, repo scripts) **before** the developer review modal — see **`coding-session/SKILL.md`** § *Post-implementation tests and checks*. The active lane coordinates the **ship chain** (§ *Ship chain* below): **one cut-point modal** covers approve + commit + Local test **`deploy-walk`** inline when §7 **`### Local test`** has unchecked items — **no commit** before that pick.

**In-loop feedback** during implementation: **a coding agent** maintains **`## Follow-ups`** on the PR plan for scope-adjacent items (Strategy #6). **`pre-pr-review`** returns **proposed** follow-ups only; **`coding-session`** appends after developer approval. **`pr-review`** follow-ups follow the same approval pattern when required. When follow-ups target **future** phase or PR work ( **`(target: …)`** outside current PR scope or explicit *schedule on parent*), **`coding-session`** **notifies** the parent planning lane via spawn-chain **`parentPlanningFollowUps`** — see **`missions/plan-and-deliver/skills/README.md`** § *Upstream parent follow-up notification*. Parents **schedule**; they do **not** receive expand eligibility until **`prShipComplete`**. § *Plan Updates* below drains routed bullets at archive.

#### Ship chain (per PR)

After **`pr-plan`** handoff and **`coding-session`** implementation, the happy path runs these **protocol branches** in order (see **Cadence reference** and the loop diagram). Branches usually run on **detached** lanes (developer phrase, snapshot, or nested spawn) — not from the **plan and deliver** Squad Leader protocol §§1–7. Skill paths: **Development tools** § *Protocol branches*.

| Order | Branch | Role (one line) |
|------:|--------|-----------------|
| 1 | **`coding-session`** (implementation) | Worktree + implement §§ 5–8 — **no commit** until developer approves |
| 2 | **`coding-session`** (ship gates) | One cut-point modal — approve + commit + inline Local test **`deploy-walk`** when §7 applies |
| 3 | **`pre-pr-review`** | Fresh reviewer lane on committed diff; go/no-go before merge-ready |
| 4 | **`create-pr`** | **Inline** on **`coding-session`** — **only** path that may run **`gh pr create`** (rule **20**) |
| 5 | **`coding-session`** (staging) | Inline Staging test **`deploy-walk`** after PR is open — before merge |
| 6 | **`pr-review`** | Triage open PR comments (often **inline** in **`coding-session`**) |
| 7 | **`deploy-walk`** (After deploy) | Post-merge §7 **After deploy** + lifecycle to `done` — **inline** on **`coding-session`** (see **Entry points** below) |
| 8 | **`plan-reconcile`** | Merge-driven archive + follow-ups triage — **inline** on **`coding-session`** (separate explicit start after deploy) |

**`deploy-walk` entry points (canonical)**

| How it starts | Typical lane | When |
|---------------|--------------|------|
| **`coding-session` chain** — inline after commit with `deployWalkScope: local-test-only` | Inline on **`coding-session`** | Pre-merge; §7 **`### Local test`** has unchecked items |
| **`coding-session` chain** — inline after PR open with `deployWalkScope: staging-test-only` | Inline on **`coding-session`** | PR open; §7 **`### Staging test`** has unchecked items |
| **Developer phrase** — `deploy-walk present <N>`, `deploy-walk status`, step done/skip/block | Active **`coding-session`** lane (detached dispatch redirects) | Plan §7 exists; worktree + plan context on coding lane |
| **`coding-session` chain** — **AskQuestion** **PR merged — start After deploy deploy-walk** at post-create-pr gate | Inline on **`coding-session`** | PR `merged`; full §7 walk including After deploy (**`coding-session/SKILL.md`** § *After deploy deploy-walk handoff*) |
| **Mission / skill dispatch** — invoke **`deploy-walk/SKILL.md`** without **`coding-session`** | **Stop** — redirect to **`coding-session`** | Same procedure once coding lane is active |

**Ordering:** **Local test** runs from **`coding-session`** after implementation approval and commit (pre-PR). **Staging test** runs after **`create-pr`** while the PR is open and before merge. **After deploy** runs after merge (typically **`coding-session`** post-create-pr gate). Finishing deploy-walk (or capstone todo **done**) does **not** run **`plan-reconcile`** — start **`plan-reconcile`** separately when linked PRs are merged and you want archive/follow-up triage (**`plan-reconcile/SKILL.md`** § *When to trigger*).

##### pre-pr-review

Spawned from **`coding-session`** after developer implementation approval, **commit**, and inline **Local test** **`deploy-walk`** (or documented skip). Reviews the **committed** diff + PR plan + repo rules; returns **`recommendation: go`** or blockers. Non-blockers are **`outputs.proposedFollowUps`** — **`coding-session`** presents them; plan **`## Follow-ups`** edits only after developer approval. **Pre-merge scope only:** score §7 **`### Local test`** against what was walked or skipped; **`### Staging test`** and **`### After deploy`** are post–create-pr / post-merge — omit them entirely from the pre-PR report (not blockers, flags, **Defer**, or summary). See **`pre-pr-review/SKILL.md`** § *Pre-PR phase boundary*.

##### create-pr

**Inline** on the active **`coding-session`** lane when pre-PR review is clean **go** (auto path) or exceptional Create-PR gate approves. **`create-pr`** evaluates route: **inline GitHub** opens PR via `gh pr create` when authorized; **outsider repos** (`tapcart-push`, `tapcart-merchant-dashboard`) emit an outsider handoff prompt only. Planning and other lanes must **not** run **`gh pr create`**. Post-PR lifecycle (merge checks, auto post-merge cleanup, After-deploy **`deploy-walk`**, **`plan-reconcile`**) is owned by **`coding-session`**. See **`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/create-pr/SKILL.md`**.

##### pr-review

Runs **inline** on the active **`coding-session`** lane after a PR exists (not a separate spawn on **`plan and deliver`**). Triages review comments; commit/push gates per rule **20** and Sedea **6_git-commit-push-gate**. See **`pr-review/SKILL.md`**.

**Cyclic post-create-pr flow (canonical detail in `plan.mdc` §8 *PR review cycle*):**

| Step | What happens |
|------|----------------|
| 1 | **`create-pr`** opens the PR; post-create-pr gate opens same turn |
| 2 | GitHub reviewers comment (external) |
| 3 | Developer picks **`start-pr-review`** → **`coding-session`** runs **`pr-review`** inline (Steps 1–5) |
| 4 | **No Must/Should/follow-up:** **`skip-reject`** → Step 5 GitHub reconciliation → **`coding-session`** merge gate ([Pre-merge authorization gate](missions/plan-and-deliver/skills/coding-session/SKILL.md#pre-merge-authorization-gate) + [Agent-delegated PR approve and merge](missions/plan-and-deliver/skills/coding-session/SKILL.md#agent-delegated-pr-approve-and-merge) on outsider repos or when delegated; [Post-pr-review merge approval gate](missions/plan-and-deliver/skills/coding-session/SKILL.md#post-pr-review-merge-approval-gate) **`approve-merge`** on non-outsider repos without delegation) → **`check-pr-status`** or **`spawn-after-deploy-walk`** |
| 5 | **Must/Should present:** disposition gate → fixes → commit/push → Step 5 reconcile (re-request automated reviewer when **CHANGES_REQUESTED**) |
| 6 | Post-create-pr gate re-opens; pick **`start-pr-review`** again when new comments arrive |

Loop continues until merge, defer, or all comments are resolved/skipped/follow-up-captured. **`continuationStatus: active`** on **`coding-session`** throughout.

##### deploy-walk

Step-by-step walk of the PR plan **`## 7. Deploy test plan`** — **inline** on **`coding-session`**. **Agent-executable** steps run without approval; **manual** steps delegate to the developer with full context. Flips capstone todo **`deploy-test-plan-verified`** when done. Entry paths: **§ Ship chain** *deploy-walk entry points* above. See **`deploy-walk/SKILL.md`** § *Agent-executable vs manual steps*.

##### plan-reconcile

Archive candidates, follow-ups triage, merge/deploy gates. Often developer-triggered after merge; separate from deploy-walk completion. **Post-ship workspace cleanup** (`sedea_remove_worktree_folder` → hosting **`compose-worktree-teardown.sh`** when the active hosting repo documents it → center **`worktree-cleanup.sh`** with ownership attestation — pull/submodule/remove/ref-drop inside the center script) is owned primarily by **`coding-session/SKILL.md`** § *Post-merge workspace cleanup*; **`plan-reconcile/SKILL.md`** §5 is idempotent fallback (`post-reconcile-workspace-cleanup.mjs` invokes the hosting helper before **`git worktree remove --force`**). **`coding-session`** runs **`plan-state.mjs detect-stale-workspaces`** and routes to reconcile when cleanup was skipped. See **`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/plan-reconcile/SKILL.md`**.

##### Leader-lane §8 host sync (detached lanes)

On a **`plan and deliver`** Mission Control dispatch, the Squad Leader **§8** ship ledger does **not** show detached child **`AGENT_RESULT_RESPONSE_V1`** on the leader chat. Progress reaches §8 **only** through Mission Control **host sync** (see **`plan.mdc`** §8 *Mission Control host sync*):

| Step | Behavior |
|------|----------|
| **Trigger** | Ship child terminal or **`coding-session`** re-emit with **`outputs.targetPlanPath`** and derivable **`shipPhase`** |
| **Persist** | **`ship-ledger.v1.json`** in the dispatch bundle |
| **Deliver** | Silent leader message **`Mission Control: ship-ledger sync (section 8).`** with host-sync fields |

- Inline **`pr-review`**, inline **`create-pr`**, inline **`deploy-walk`**, and inline **`plan-reconcile`** on **`coding-session`** are **not** separate child terminals — those milestones **must** ship via **`coding-session`** terminal re-emit with §8 **`outputs`**.
- Manual **Ship recap** paste is **forbidden** as a §8 input path. When sync skips, fix child terminal contracts or start **mission completeness triage** on **sedea**.

##### §8 troubleshooting (stale ledger or blocked dispatch close)

Full checklist and *Pre-resolution checklist* live in **`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`** §8 *§8 troubleshooting (when the ledger looks wrong)*. Short version:

| If… | Then… |
|-----|--------|
| Ship child finished but leader §8 unchanged | Child terminal must include **`targetPlanPath`**, **`shipPhase`**, **`rowStatus`** — re-emit on ship lane |
| No **`Mission Control: ship-ledger sync (section 8).`** on leader | Fix terminal **`outputs`**; read **`ship-ledger.v1.json`** when present |
| **`pr-review`** finished on coding lane | **`coding-session`** must re-emit with `shipPhase: pr-review` |
| Developer wants **`resolved`** but rows still `open` | Run *Pre-resolution checklist* **AskQuestion** — wait for sync, planning-only close, or **`partial`** |

**Host sync scope:** ship skills per the **hosting repo** ship-ledger contract documented in **`.cursor/rules/dot-sedea.mdc`** (or equivalent host overlay) and **`center.yaml`** `governance.hostSync`. Inline milestones on **`coding-session`** use **`coding-session`** re-emits. Implementation lives in the **hosting repo Mission Control host integration** — not in this center submodule.

- **Dispatch closure gate:** On the **plan and deliver** leader lane, do **not** propose **`MC_DISPATCH_RESOLVED_V1`** with **`resolved`** while any §8 ship row is **`open`** or **`blocked`** unless a **host-sync** update for that row was parsed this session, or the developer explicitly chose **planning-only** dispatch closure via **AskQuestion** (see **`plan.mdc`** §8 *Pre-resolution checklist*).

#### Feedback Collection

Four sources, split by where they enter the loop.

**In-loop sources** — captured inside the Coding Agent Session, on the PR plan's `## Follow-ups`:

- **Implementation Follow-ups.** Things **a coding agent** noticed *while writing the code* that aren't in scope of the current PR. Recorded during the session in `## Follow-ups`. Freshest source; losing these is the most expensive omission in the loop.
- **Code Review Follow-ups.** Non-blockers from **a pre-PR reviewer agent** (`outputs.proposedFollowUps` → developer approval → **`coding-session`** append), from **a reviewer agent** on the open PR (**`pr-review`** after approval), or from **a coding agent** during implementation (direct append when in scope). Example: **a pre-PR reviewer agent** flags "out of scope but worth thinking about" without blocking merge readiness.

**Async sources** — they don't originate inside the loop; they queue up between sessions and are drained at the next Plan Updates pass:

- **New Ideas from Teammates.** Out-of-band suggestions from Slack DMs, design reviews, planning meetings, hallway conversations.
- **Customer Feedback.** Production telemetry, support tickets, customer interviews.

The async sources are *not* part of the per-iteration tempo — they accumulate independently of the coding-session rhythm, and the discipline is to drain them every time Plan Updates runs. They enter the loop at the same triage step as in-loop sources; only the upstream channel differs.

#### Plan Updates

Closing the loop. When a PR plan is archived (via `plan-reconcile`), the archive flow pauses on every plan with a non-empty `## Follow-ups` section and routes each bullet — **Drop**, **Postpone** (skip archive for that plan; bullet stays where it is), or **Integrate → `<target-plan>`**. The integrate target list is the whole plan tree ordered by proximity to the source plan: **parent**, then **siblings**, then **grandparent**, then grandparent's other-subtree descendants, up to the **Master Plan**. Routed bullets land in the **target plan's `## Follow-ups`** — a single canonical sink, not directly into **Changes** / **Caveats** / **Delivery phases**, because section choice is a planning act the user makes later when reviewing the target plan.

A bullet may eventually graduate from the target's `## Follow-ups` to:

1. **Changes** — a feature-level addition picked up in the next PR breakdown.
2. **Delivery phases | PR breakdown** — a new entry that becomes its own phase or PR.
3. **Caveats** — a risk or constraint the next coding agent must respect.
4. **A new child plan** scaffolded via **`new-plan`** — **indexed-child** (list item **N** under a parent, then **`phase-planner`** or **`pr-plan`** on the child path) or **standalone** (free-standing plan with `parent: null`), per **`.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`**.

(Section numbers shift between templates: Master Plan uses § 5 / § 6 / § 7, Phase plan uses § 4 / § 5 / § 6 — names stay the same.)

The async-source drain plugs in at the same step: teammate suggestions and customer signals land in some plan's `## Follow-ups` (Master Plan by default) and pass through the same routing options the next time **`plan-reconcile`** archives that plan.

### Nested loops — child plans feed back up the hierarchy

A **child plan** (one scaffolded via **`new-plan`** with a non-Master `parent` in the sidecar) runs *its own* Cadence loop — own phase decomposition, own PR breakdown, own work sessions, own feedback collection, own plan updates. When that sub-loop's Plan Updates step fires, the targeted plan is picked from the same heuristics — but the candidate set now includes the child plan itself, its parent, the **Master Plan**, and any sibling. **Feedback flows along the plan hierarchy, in either direction.** A child loop's Implementation Follow-up may surface a **Master Plan**-level concern; a **Master Plan**-level customer feedback item may target a child plan if the work it implies is local to that child's concern.

The diagram above describes the per-feature shape and deliberately does not draw the cross-loop arrows for every hierarchy level — adding them makes it unreadable. The shape is fractal: every plan in the tree runs the same loop with the same triage step.

## Plan reconcile triggers

| Event | Starts **`plan-reconcile`?** |
|-------|---------------------------|
| **`deploy-walk`** completes (deploy checklist + capstone todo **done**) | **No** — use **AskQuestion** if the user wants reconcile next |
| **`coding-session`** after deploy; developer chooses reconcile | **Yes** (inline **`plan-reconcile`**; requires `deployStatus` / `deployTodoStatus` **done** when plan-anchored on ship chain) |
| Developer says **plan reconcile** on active **`coding-session`** | **Yes** (inline) |
| Detached **`plan-reconcile`** dispatch | **Stop** — redirect to **`coding-session`** |

Ship cadence detail: **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** § *deploy-walk vs plan-reconcile (not chained)*. Skill procedure: **`plan-reconcile/SKILL.md`** § *When this skill runs*.

## Plan metadata backfill (`backfill-prs-from-body`)

Optional **`plan-state.mjs`** subcommand (see **`--help`**) — run **before** reconcile step 1 when a PR plan lists merged PRs **only in body prose** and sidecar **`prs[]`** / frontmatter **`shippedPrs`** are empty (otherwise PR-tracked **`reconcile`** may **skip** the plan).

| Step | Action |
|------|--------|
| 1 | Dry-run: `backfill-prs-from-body --slug <slug>` or `--all` |
| 2 | **AskQuestion** — approve backfill vs skip |
| 3 | Re-run without `--dry-run`; add `--force` only when overwriting existing **`shippedPrs`** after prose fixes |

The subcommand **only** backfills **`shippedPrs`** — it does not archive, reparent, or run follow-ups triage.

```bash
cd "$HOSTING_ROOT"
OPS_ID="<operationsUserId>"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
 --operations-user-id "$OPS_ID" backfill-prs-from-body --slug <slug> --dry-run
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
 --operations-user-id "$OPS_ID" backfill-prs-from-body --all --dry-run
```

## Out of scope

- Per-tool setup, packaging, and auth internals (e.g. Mission Control install, third-party OAuth). **Development tools** names what this process uses and where protocol branches are recorded; hosting-repo-specific mechanics belong with each hosting repo’s docs.
- Repo-specific roadmaps and engineering plans. Those live alongside the plan trees and top-level topics your org uses under the operations / plans layout (see **Surfaces and artifacts**).
- People / org / HR / hiring process. This document describes the development loop and artifacts for **developers** using Sedea’s planning protocol; it is not team workflow policy.
