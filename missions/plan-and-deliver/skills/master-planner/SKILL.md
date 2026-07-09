---
name: master-planner
description: >-
 Take a PRD and scaffold a Master Plan file under the dispatch-scoped plans union
 (explicit `targetPlanPath` / handover paths — do not construct `.sedea/operations/.../...`),
 pre-populated with sections 1 through 5 (Background, Benefits, Related
 features, Architectural design, Changes — including `### Decomposition
 assessment` and `### Complexity score (plan-scope signal)` under § 5) per
 Sedea's New Feature Development Process Master Plan template. Computes a
 complexity score from §4–§5; when **high**, recommends Delivery phases via Route §6 to split into lower-complexity phase plans via `delivery-phases`/`phase-planner`. Section 6 (Delivery phases | PR breakdown)
 and section 7 (Caveats) stay as TBD stubs for follow-up turns. Use when the user
 opens a fresh planning chat from the "feature plan: design + changes"
 plan-board prompt, or says "master-planner" / "draft a master plan".
designation:
  allowed: Master Plan authoring; inline pr-breakdown, new-plan, pr-plan on planning lane
  forbidden: Application implementation; worktree ship; mission_control_propose_dispatch_resolution on child
inputs:
  seedBlock:
    type: string
    description: Complete master-planner seed block (Master Plan handoff) containing Feature planning, PRD, Parent, and optional Related entries.
    required: true
  featurePlanningTitle:
    type: string
    description: Human-readable feature title copied into the Master Plan name and H1.
    required: true
  prdRef:
    type: string
    description: Readable PRD URL, workspace @path, or absolute path.
    required: true
  parent:
    type: string
    description: >-
      Parent plan slug, @path, or absolute plan path. For a root delivery Master Plan
      (no parent), emit spawn wire value `"null"` (JSON string) — never JSON null.
      Semantic absence is `Parent: null` in the seed block; sidecar uses YAML `parent: null`.
    required: true
  related:
    type: array
    description: Optional related document entries with role and link/path.
    required: false
    default: []
laneRules:
  - ".sedea/centers/sedea/rules/2_ask-question-instructions.mdc"
  - ".sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/master-planner/SKILL.md"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc"
---

# Planner: §§ 1–5 from the PRD

**Normative execution (plan and deliver):** **Spawned only** on a **new child lane** — Squad Leader §5 emits **`mission_control_spawn_agent`**. End with **`mission_control_send_agent_result`** per **`## Completion (spawned)`**. Do **not** run as an inline skill on the Squad Leader lane. Decomposition skills (**`delivery-phases`**, **`pr-breakdown`**, **`new-plan`**) run **inline on the planner child lane** after §§1–5. See **`../README.md`** § *Normative execution mode*.

This skill drives the **first** step of feature planning: read a PRD, **scaffold the Master Plan file**, draft sections 1 through 5 (Background, Benefits, Related features, Architectural design, Changes) directly into that file, then compute a **plan-scope complexity score** from what was written under §§ 4–5, persist it under § 5, and stop. Sections 6 (Delivery phases | PR breakdown) and 7 (Caveats) are filled in in follow-up turns once the user has reviewed the initial draft — when complexity is **high**, **Route §6 → Delivery phases** is the primary path to split design surface into lower-complexity phase plans (see Step 6c).

The agent has enough context after step 4 to draft §§ 1–5 without further input from the user — these sections are inferable from the PRD plus the loaded architectural rules. Stopping at § 5 is deliberate: § 6 (Delivery phases | PR breakdown) is a separate planning conversation that benefits from a settled architectural picture first, and § 7 (Caveats) often only emerges once § 6 reveals constraints.

The procedure below is a hard contract — do **not** skip steps, re-order them, or start drafting before steps 1–5 are complete. Skipping a step here is the difference between a high-quality Master Plan and one that drifts from the documented process.

**Worktree removal ownership (binding).** This skill is planning-only — it does **not** create or remove hosting-repo worktrees. **Do not remove worktrees you do not own.** **`git worktree list` is read-only** unless rule **0** § *Worktree ownership* preconditions hold for **that** path. Ship worktrees belong to **`coding-session`** on a separate lane.

## Warm-up manifest (spawned)

Per [`.sedea/centers/sedea/docs/lane-manifest-contract.md`](.sedea/centers/sedea/docs/lane-manifest-contract.md) and **`../README.md`** § *Default warm-up* / *Definitive `laneRules`*. Host merge: `effectiveWarmUp = dedupe(bootstrapRules → laneRules → skillWarmUp)`. Frontmatter matches this table; spawners may omit run-request **`laneRules`** when identical (README spawn preflight row 11). **No `alwaysApply` frontmatter flip.**

### `bootstrapRules` — host-resolved (R&D layer)

| Path | Purpose |
|------|---------|
| `.sedea/centers/research-and-development/rules/bootstrap.mdc` | Sole R&D `alwaysApply: true` bootstrap (≤10 KB); host merges when `centerSlug === research-and-development` |

### `skillWarmUp` — frontmatter `warmUpRules`

| Path | Purpose |
|------|---------|
| `.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc` | Squad Leader ledger, spawn/wait |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` | Spawn contracts, terminal stop |
| `.sedea/centers/research-and-development/docs/development-process.md` | NFD process templates |
| `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc` | Target resolution, depth-first gates |

### `laneRules` — frontmatter `laneRules`

| Path | Purpose |
|------|---------|
| `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc` | Structured choice, AskQuestion |
| `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc` | Planning target resolution (role minimum) |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/master-planner/SKILL.md` | This skill procedure |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` | Spawn preflight, definitive `laneRules` |

## Agent messaging (MCP)

**MCP spawn/result/notify skill.** Parent→child spawn, plan-change notify, and child terminal result use MCP tools per **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Agent-to-agent spawn protocol*.

| Action | MCP tool |
|--------|----------|
| Parent spawn (when this skill emits a child lane) | **`mission_control_spawn_agent`** |
| Parent plan-change notify (named non-terminal children) | **`mission_control_notify_child_lanes`** |
| **This** spawned lane terminal (and terminal re-emits) | **`mission_control_send_agent_result`** |

**Binding:**

- Run **`../README.md`** § *MCP spawn preflight* (rows M1–M8) before every MCP spawn; **forbidden** host-resolved identity keys in MCP args (`correlationId`, `dispatchId`, `slotId`, … — see README § *Host-resolved identity*).
- Run **`../README.md`** § *MCP notify preflight* (rows N1–N8) before every **`mission_control_notify_child_lanes`** call — cross-ref **`.sedea/centers/sedea/rules/4_mission.mdc`** § *MCP notify protocol*.
- Inline skills on this mission stay **inline-only** — no spawn wire change unless the protocol step explicitly spawns a child lane.

### Plan-change notify — emit-when (`mission_control_notify_child_lanes`)

After a **material** Master Plan edit that affects **ongoing work** on named **non-terminal** child lanes, notify each affected child with a **separate** MCP call (one slug per call, v1). Normative protocol: **`.sedea/centers/sedea/rules/4_mission.mdc`** § *MCP notify protocol*.

| Emit when | Target child slugs (examples) | Do not notify |
|-----------|------------------------------|---------------|
| Material edit to §§1–7, **`### Delivery phases`** rows, or §6 decomposition scope changes **`affectedPlanPaths`** for open children | **`phase-planner`** children on active Delivery phases rows; nested **`pr-breakdown`** / **`new-plan`** / **`coding-session`** lanes listed in **`activeLanes`** with non-terminal **`continuationStatus`** | Terminal lanes (`continuationStatus: terminal`, completed without active continuation); empty or speculative **`targetSlugs`**; broadcast fan-out |

**Material edit** includes: scope/sequencing changes on **`Delivery phases`** or PR breakdown blocks, §4–§5 architectural or Changes bullets that alter child plan paths, and ledger updates that change what a named open child should implement — not typo-only or §7 Caveats-only edits with no child impact.

**Forbidden:** empty or speculative **`targetSlugs`**; notify terminal children; implicit fan-out or **`notifyAllDescendants`**; using notify instead of **`mission_control_spawn_agent`** for new work.

### MCP notify preflight (`mission_control_notify_child_lanes`)

| Step | Check |
|------|--------|
| N1 | Caller authority — **`master-planner`** may notify descendant slugs only (rule **4** § *MCP notify protocol* caller table) |
| N2 | Required args present: **`summary`**, **`changeType`**, **`affectedPlanPaths`** (non-empty), **`targetSlugs`** (exactly one slug) |
| N3 | **Forbidden args absent** — no host-resolved identity keys, no **`notifyAllDescendants`** |
| N4 | **`targetSlugs`** contains exactly **one** dispatch-unique **non-terminal** child slug per call |
| N5 | **`affectedPlanPaths`** lists every operations plan path that grounds the change (Master Plan + affected child plans when applicable) |
| N6 | Multiple children → **separate MCP calls** (one slug per call, v1) |
| N7 | Enumerate targets from **`activeLanes`** / registry — omit terminal lanes before calling |
| N8 | New lanes or new work → **`mission_control_spawn_agent`** — never notify as a spawn workaround |

## Refresh lane display (when stale)

After **`featurePlanningTitle`** / Master Plan scope is clear (before or right after Step 1 warm-up):

1. Compare the visible tab **title** / **hover** to this lane's work (feature title, **`masterPlanSlug`** when known).
2. When spawn labels are **generic or wrong**, call MCP **`mission_control_update_lane_display`** on **this lane only** with **`title`** = `MP-{semantic title}` (**`featurePlanningTitle`** or **`masterPlanSlug`** when known) and optional **`description`** / **`hoverDescription`** (max lengths in [`.sedea/centers/sedea/rules/9_display-metadata-authority.mdc`](.sedea/centers/sedea/rules/9_display-metadata-authority.mdc)). See [rule **50**](../../../../rules/50_mission-control-display-metadata-discipline.mdc) § *Lane title prefix conventions*.
3. **Skip** when spawn labels already match scope.
4. **Forbidden:** **`mission_control_update_dispatch_display`** from a child lane.

See [`.sedea/centers/research-and-development/rules/50_mission-control-display-metadata-discipline.mdc`](../../../../rules/50_mission-control-display-metadata-discipline.mdc) § *Child lane — refresh own slot when labels are stale*.

## Spawn contract (`mission_control_spawn_agent`)

Cross-check every spawn against **`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md`** § *MCP spawn preflight* before calling the tool.

### Inbound — Squad Leader → **master-planner** (`plan and deliver` §5)

The **Squad Leader** must pass **`inputs`** keys that match this skill’s frontmatter **exactly** (see **`plan.mdc`** §5 *Spawn preflight* for the §4 seed → **`inputs`** map).

| `inputs` key | Required | Notes |
|--------------|----------|--------|
| `seedBlock` | yes | Full compiled seed block text |
| `featurePlanningTitle` | yes | Human title — **not** `featurePlanning` |
| `prdRef` | yes | Readable PRD URL, `@path`, or absolute path |
| `parent` | yes | Parent slug, `@path`, or absolute plan path. When §4 seed has **`Parent: null`**, emit **`"parent": "null"`** (string sentinel) in spawn JSON — **not** JSON `null`. |
| `related` | no | Array; use `[]` when §4 has no related docs |

### Wire encoding — nullable `parent` (binding)

| Layer | Root delivery (no parent) | Non-null parent |
|-------|---------------------------|-----------------|
| §4 seed block | `Parent: null` (semantic) | `Parent: <slug>` or `@path` |
| Spawn `inputs.parent` | **`"null"`** (JSON **string**) | slug, `@path`, or absolute plan path |
| Sidecar `.state.yaml` | YAML `parent: null` (unquoted) | `parent: <slug>` |

**Forbidden in spawn JSON:** `"parent": null` (JSON null) — Mission Control validates against frontmatter **`type: string`** and rejects the spawn.

**Spawn `name` (binding):** `MP-{semantic title}` — semantic title from **`featurePlanningTitle`** or PRD heading. Squad Leader sets at spawn; this lane refreshes via § *Refresh lane display* when stale. See [rule **50**](../../../../rules/50_mission-control-display-metadata-discipline.mdc) § *Lane title prefix conventions*.

**Valid example (normative wire shape — replace UUID, paths, and seed text):**

```text
Call MCP mission_control_spawn_agent with: skillPath, slug, name, description, inputs (seedBlock, featurePlanningTitle, prdRef, parent, related). Do not pass correlationId — host mints it.
```

### Inline handoff — **master-planner** → **`delivery-phases`** / **`pr-breakdown`** (Step 7c)

When the user selects **Route §6 decomposition**, run the chosen skill **inline on this lane** — **do not** emit **`mission_control_spawn_agent`** for **`delivery-phases`** or **`pr-breakdown`**. Load the target **`SKILL.md`**, construct inline context from the table below, follow that skill’s steps, and merge its **`## Completion (inline)`** fields into this skill’s ledger (`spawnedPlans`, `activeLanes`, `openLedgerEntries`, `remainingTasks`). Those decomposition skills run **`new-plan`** **inline** on this lane (no child lanes for **`new-plan`**); they may still spawn **`phase-planner`** or inline **`pr-plan`** (which may spawn **`coding-session`**) per their contracts.

| Inline context field | Value |
|----------------------|--------|
| `targetPlanPath` | Absolute path to this Master Plan `.plan.md` |
| `targetPlanSlug` | Slug from filename |
| `parentAgentRole` | `"master-plan-agent"` |
| `ledgerParent` | This plan’s slug |
| `complexityBand` / `complexityScore` | From §5 **`### Complexity score`** when present |
| `decompositionAssessment` | Full **`### Decomposition assessment`** block text when present |
| `routeLock` | `"delivery-phases"` or `"pr-breakdown"` per the route choice |

**Paths:** `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/delivery-phases/SKILL.md` or `…/pr-breakdown/SKILL.md`.

### Failure modes (operator recovery)

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| No child lane opens | Malformed JSON or sentinel not on its own line | Re-emit one parseable line; no fences or trailing prose |
| No child lane | Wrong or missing `skillPath` | Workspace-relative path ending in `…/SKILL.md` |
| Child bootstrap rejects `inputs` | Renamed key (`featurePlanning`, `prd`, `seed`) | Use frontmatter names (`featurePlanningTitle`, `prdRef`, `seedBlock`) |
| Child bootstrap rejects `inputs` | Missing required field | Compile §4 seed / target plan path before spawn |
| Duplicate spawn ignored | Reused `slug` in same dispatch | New unique `slug` + new `correlationId` |
| Parent lane silent after emit | Host rejected payload (PR 2 diagnostics) | Fix keys per table; retry — do not advance protocol until a child lane exists or the developer abandons |

### Checkpoint turn UX (skill-local)

Under Checkpoint trust (`trustLevel: checkpoint`), auto-advance scripted happy-path steps; emit structured choice only at **USER_CHECKPOINT** markers in this section, implicit external-wait surfaces, or exception paths. **No cross-skill inheritance** — gate defaults here apply only to **`planner`**; other planning skills document their own markers.

**Real-dispatch test loop (binding):** After merge, run one full **`planner`** spawn on a Checkpoint dispatch and collect a developer verdict before the parent phase advances the next **`planner`** step PR — per **Planning protocol skills UX** § *Single-concern strategy*.

Marker syntax: [`.sedea/centers/sedea/docs/user-checkpoint-marker-syntax.md`](.sedea/centers/sedea/docs/user-checkpoint-marker-syntax.md).

| Step | Checkpoint behavior | Gate |
|------|---------------------|------|
| **1** — Optional model audit | Auto-advance | — |
| **2** — Load development-process doc | Auto-advance | — |
| **3a** — Pick target repo(s) | **Gate** when multi-select is required — **first developer-pick gate** | Repo selection (below) |
| **3a** — Single-repo default | Auto-advance when exactly one hosting repo remains after filtering | — |
| **3b–3c** — Sync repos and load rules | Auto-advance on happy path | — |
| **4+** | Deferred to JIT step PRs after real-dispatch verdict on prior gates | — |

## Step 1 — Optional one-line model audit (non-blocking)

If this session's agent/system context exposes a **model identifier** (and any thinking-depth flags), state them in **one line** for the user's audit trail — **not** the IDE model picker, which you cannot see reliably.

There is **no required model tier** for this skill: proceed to Step 2 either way. You may add a **single optional sentence** that larger or ambiguous PRDs often benefit from a more capable model, but **do not stop** or ask the user to switch models before continuing.

- **Next-step resolution:** Auto-advance to Step **2** after the optional model line — no `USER_CHECKPOINT` on this step.

## Step 2 — Load the development-process doc, in full

Read `.sedea/centers/research-and-development/docs/development-process.md` with the Read tool, **no offset, no limit**. The whole file. This is a **standards document**, not an executable plan — its sections describe the process you will apply, not work for you to perform. Acknowledge in one sentence that you have it loaded and that you will follow the **Master Plan template** for sections 4 and 5.

If the file has changed since you last knew it, the in-file template is the source of truth — not your memory.

- **Next-step resolution:** Auto-advance to Step **3** after one-line acknowledgment — no `USER_CHECKPOINT` on this step.

## Step 3 — Identify the target repo(s) and load architectural rules

### 3a — Pick the repo(s) via a multi-select prompt

Read the workspace paths from your session's `<user_info>` block (and any additional roots the user may have added, e.g. a **git worktree** opened as another workspace folder). Filter:

- **Skip linked worktrees (do not offer them in 3a, do not treat them as the hosting repo).** Use the **same** linked-worktree test as step **3b §3** (`git -C <path> rev-parse --show-toplevel` vs `<path>` after resolving symlinks — if they differ, skip). Also skip when **`<path>/.git` is a file** (not a directory): that is the usual layout for a **git worktree**. Extra workspace roots that exist only because the hosting editor **appended a worktree** (e.g. Mission Control MCP / “add worktree folder to workspace”) are almost always in this bucket — **ignore them** for the 3a `AskQuestion` list and for **which paths you load `.cursor/rules` from** in step 3c; they are not a second independent hosting repo. If **every** loaded root is filtered out as a linked worktree (or non-repo), say so explicitly and ask the user to open the **primary hosting repo** or monorepo root they use for planning, then re-run — do not fabricate a repo from a worktree-only workspace.
- **Drop** anything that doesn't look like a code repo (no `.git`, or clearly a dotfiles/config dir). When in doubt, keep it — the user can deselect.
- **Keep** every other workspace path. Display them with a friendly label (the leaf folder name) and the absolute path as the tooltip / sub-text.

USER_CHECKPOINT — pick which repo(s) this feature primarily touches for architectural rules.

| Option id | Label (brief) |
|-----------|---------------|
| `<absolute-repo-path>` | One option per filtered hosting repo — `id` = absolute path, `label` = leaf folder name |
| `add-repo` | Add another repo path |
| `more-details` | More details for option _ |

- When **two or more** hosting repos remain after filtering → open this gate with **`AskQuestion`** (`allow_multiple: true`) or **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`**. **`modalTitle`:** *Planner — pick target repo(s)*; **`prompt`:** *Which repo(s) does this feature primarily touch? Architectural rules will be loaded from each one's `.cursor/rules/`.* — one option per filtered repo (`id` = absolute path, `label` = leaf folder name) plus **`add-repo`** and **`more-details`**. Mention an implied default repo in recap when the PRD/title suggests one — do **not** auto-select.
- When **exactly one** hosting repo remains after filtering → **auto-advance** with *"Only one hosting repo in this workspace — defaulting to \<name\>. Reply 'add \<path\>' if you want to include another."* — do **not** open this gate.
- After a developer pick at this gate, continue to step **3b** with the selected repo path(s).

### 3b — Sync each selected repo to its default branch

Architectural rules are loaded from the working tree, not from a fixed git ref — drafting against a stale local tree produces a Master Plan grounded in code that no longer matches `main`. Before loading rules, fast-forward each selected repo to its default branch.

For every repo path returned in 3a, in turn:

1. **Detect the default branch.** `git -C <repo-path> symbolic-ref refs/remotes/origin/HEAD --short` returns `origin/<branch>` (typically `origin/main`, sometimes `origin/master`). Strip the `origin/` prefix. If the symbolic-ref isn't set locally, fall back to `git -C <repo-path> remote show origin | grep "HEAD branch"`.
2. **Refuse to touch a dirty tree.** `git -C <repo-path> status --porcelain`. Any output (modified, staged, or untracked files) ⇒ **skip this repo's sync**. Say in one line: *"<repo>: working tree has uncommitted changes on `<current-branch>` — leaving as-is. Architectural rules will load from the current branch."* Continue to the next repo. **Do not** stash, commit, discard, or stage anything; the user's WIP is sacred.
3. **Skip linked worktrees.** Compare `git -C <repo-path> rev-parse --show-toplevel` (symlinks resolved) to `<repo-path>`. If they differ, the workspace path is a linked worktree, not the primary hosting repo — Git refuses to check out the same branch in two worktrees, so trying to switch would only produce noise. Say *"<repo>: linked worktree, can't share its branch with the primary hosting repo — leaving as-is."* and continue.
4. **Check out and fast-forward.** When both checks pass:

 ```bash
 git -C <repo-path> checkout <default-branch>
 git -C <repo-path> pull --ff-only origin <default-branch>
 ```

 If `--ff-only` fails (the local branch has diverged from `origin/<branch>`), say *"<repo>: local `<branch>` has diverged from `origin/<branch>` — leaving as-is for manual resolution."* and continue. Never use `--rebase`, `--no-ff`, or a plain `pull`; diverged branches are the user's call, not the agent's.

After processing every repo, surface a one-line summary before moving to 3c so the user can spot a stale tree *before* the rules are loaded:

> *Synced: <repo-A> (main, fast-forwarded 12 commits), <repo-B> (master, already up to date). Skipped: <repo-C> (uncommitted changes), <repo-D> (linked worktree).*

If every repo was skipped, say so explicitly and continue — loading rules from a non-default branch is degraded but not blocking; the summary makes it visible so the user can decide whether to clean up and re-run the skill.

### 3c — Load architectural rules from each selected repo

For every repo the user picked:

1. List all files matching `<repo>/.cursor/rules/*.mdc` (use Glob).
2. For each, read its frontmatter description (or first paragraph if no description).
3. Read **in full** every rule whose description suggests it informs the *shape* of new code. Architecture-relevant categories include, but are not limited to:
 - Source layout / module boundaries / where things live.
 - Service topology / cross-service contracts / shared infrastructure.
 - Data flow / replication / messaging / queues.
 - Schema / migrations / data model.
 - Domain-specific architecture conventions (orchestration, message generators, flows).
 - Health, deployment, and long-lived-release rules when they constrain *where* code lives.
4. Skip rules that are purely about ops, secrets, test fixtures, logging style, or test-only patterns. When unsure, err on loading.

After loading, list — grouped per repo — the rules you loaded, one per line, so the user can verify coverage. If the user says "also load X", load X. If the user says "drop Y", drop Y.

## Step 4 — Get the PRD and any related documents

The seed prompt for this skill carries the PRD title, link, the parent plan in the plan tree, and an optional list of related documents at the top of the first user message:

```
Feature planning: "<PRD title — filled in by user>"

PRD: <link or @path — filled in by user>

Parent: <slug or @path to the parent plan — filled in by user>

Related (optional, `<role>: <link or @path>` per bullet):
- <role>: <link or @path>
- <role>: <link or @path>
- ...

Load and follow .sedea/centers/research-and-development/missions/plan-and-deliver/skills/master-planner/SKILL.md ...
```

`Feature planning:`, `PRD:`, and `Parent:` are required slots. The Related block is the only optional one — empty when the feature stands alone. `Parent:` is read in step 5a; when empty, missing, or `null`, default to `parent: null` (root delivery plan). Use `AskQuestion` only when a **non-null** parent slug or path fails to resolve.

### 4a — Fetch the PRD

Use the title in line 1 to keep yourself grounded. Then resolve the PRD body:

- **Local file** (`@<path>` or absolute path): Read tool, **no offset, no limit**.
- **Confluence URL** or **Google Docs URL**: WebFetch. If WebFetch returns auth-required / 401 / 403 (the doc is private and not publicly readable), say:

 > "I can't fetch <link> directly — it's behind auth. Either make the doc world-readable, paste the PRD body inline below, or save it as a file under the workspace and reattach with `@<path>`."

 Close with **AskQuestion** (paste body, attach file, make doc public, or **More details for option _**) — do not prose-only wait for the body.

**Fail-fast on missing slots.** Before fetching anything, sanity-check the first message:

- If line 1 is `Feature planning: ""` (empty quotes): say *"The first line of the prompt has an empty PRD title — please paste the PRD's title between the quotes and re-send. Cursor's auto-titler reads only the first message; without a title, this chat will be auto-named after the skill instruction."* Stop.
- If the `PRD:` line has no link or `@<path>` after it: ask for one.

Once you have both the title and the body, acknowledge in one sentence (e.g. *"Loaded PRD '<title>', ~<N> sections / ~<K> words."*) and continue to 4b.

### 4b — Fetch related documents (optional)

The user can attach extra context in the `Related:` block of the seed prompt — adjacent feature plans being built now, Figma mockups for the UI, screenshots of the current/proposed UI, design docs from a sibling team, infrastructure / capacity / migration docs, etc. Each bullet is in the form `<role>: <link or @path>`, where `<role>` is a one-phrase description of the document's relevance to this feature ("adjacent feature plan", "Figma mockup", "current UI screenshot", "proposed UI", "infra design doc", "migration runbook"…).

If the `Related:` block is **empty or absent** (the user pasted the seed prompt and didn't add bullets), skip this step. Say *"No related documents provided."* and continue.

If there are bullets, fetch each in turn. Pick the right tool per source type:

- **Local file** (`@<path>` or absolute path): Read tool. Read handles images (PNG, JPG, GIF, WebP) and PDFs natively, so screenshots and exported design docs come in directly.
- **Confluence / Google Docs / generic web URL**: WebFetch. Same auth-failure path as 4a.
- **Figma URL** (`figma.com/design/...`, `figma.com/board/...`, `figma.com/make/...`): use the Figma MCP server (`plugin-figma-figma`). Call `get_design_context` for design files (parse `fileKey` and `nodeId` from the URL — convert `-` to `:` in `nodeId`) or `get_figjam` for FigJam boards. Do **not** WebFetch a Figma URL; you'll get the marketing page, not the design.

After fetching each related doc, acknowledge it in one line: `Loaded related doc: '<role>' — <short content summary>`.

**How related documents feed §§ 1–5.** When you draft in step 6, map each related doc to the section(s) it most informs. The role description usually makes this obvious — but as a guide:

- **Adjacent feature plan / sibling design doc** → primarily § 3 Related features (the role often states the relationship: "ships before this", "depends on this", "shares an API contract"). May also inform § 4 if the adjacent feature touches the same part of the system.
- **Figma mockup / proposed UI / UI screenshot** → primarily § 4 Architectural design (UI shape) and § 5 Changes (UI deltas). Use them to ground the diagram and the change list in something concrete instead of inferred.
- **Infra / capacity / migration doc** → primarily § 4 (topology / data flow) and § 5 (DB / infra changes).

Don't write "from <related doc>" into the plan body — the plan reads as one coherent document, not a citation index. If a related doc reveals a constraint or risk that would normally land in § 7 Caveats, **flag it for the user in the chat reply** so it can be drafted in the follow-up turn — don't slip it into the file (§ 7 is explicitly out of scope for this skill).

## Step 5 — Scaffold the Master Plan file

The plan file is created **before** drafting, so § 4 + § 5 land in a persistent artefact from turn one. Follow the local plan conventions under the dispatch-scoped plans union (frontmatter contract, slug pattern with 8-char hex suffix, sidecar with `parent:`; child plans via **`new-plan`** after **delivery-phases** or **pr-breakdown**) — but use the **Master Plan template body** from the dev-process doc, not the generic Overview/Phasing stub.

### 5a — Resolve the parent

The seed prompt's `Parent:` line is the **primary** input — the user already curated plan placement, so use what they wrote. **Default when empty or missing:** `parent: null` (root delivery Master Plan under flat `plans/`). Only fall back to a picker when the line names a slug or path that **does not resolve**.

#### Read from the seed prompt first

Parse the `Parent:` line. Accepted forms (case-insensitive on the keywords):

- **`null`, `none`, or empty** — `parent` is `null`. Master Plan file goes under the flat `plans/` directory for the active dispatch scope (absolute path from spawn handover — see rule **31** § *Plans and docs paths*). This is the **default** for net-new **`plan and deliver`** dispatches per **development-process.md** § *Root delivery plans vs legacy Hub parent intake*.
- **Slug** (e.g. `prior_feature_master_abc12345`) — use directly. Validate that exactly one `<plans>/<slug>.plan.md` exists at the handover-supplied or resolved absolute path.
- **`@path` or absolute path to a `.plan.md`** — extract `<slug>` from the filename (`<slug>.plan.md` → `<slug>`). Validate the file exists under the flat `plans/` tree for the active dispatch scope.

When the slot resolves cleanly, acknowledge in one line — `Parent: <slug>` or `Parent: null (root delivery plan)` — and continue to 5b. Do **not** ask the user to confirm when they already wrote `null` or a resolvable parent.

#### Fall back to a picker when needed

Fall back to the picker below **only** when:

- The `Parent:` line names a slug or `@path` that does **not** resolve to an existing `.plan.md` under `.sedea/operations/.../plans/` (flat tree only).

Do **not** open a parent picker when `Parent:` is empty, missing, or `null` — use `parent: null` and continue to 5b.

In the unresolved case, say so in one line — `Parent slot "<raw value>" doesn't resolve to an existing plan; falling back to picker.` — then ask via `AskQuestion` (single-select):

> "Which existing plan should be this Master Plan's parent?"

Options, in order:

- **Root delivery plan — no parent** (`id: __null_parent__`) — `parent: null`; file under flat `plans/`.
- One option per **existing** plan slug the developer may intend as parent (from a Glob of `plans/*.plan.md` in the active operations tree), `id` = slug, `label` = frontmatter `name:` when present.
- **Other / I'll paste a parent** (`id: __other__`) — free-form follow-up for slug or `@path`.
- **More details for option _**

Do **not** offer roadmap-topic roots, `plans/roadmap-topics/`, or Hub **`top_level_topic`** intake — those paths are legacy and out of scope for new planning.

### 5b — Pick the slug + filename

- **Display name** for `name:` frontmatter: the PRD title (line 1 between the quotes).
- **Slug base**: lowercase the title, replace spaces with `_` (or `-` to match sibling convention in the target folder).
- **Slug suffix**: 8-char random hex (`crypto.randomBytes(4).toString('hex')` equivalent).
- **Filename**: `<plans>/<slug>.plan.md` under the active dispatch-scoped plans directory — **always** the flat `plans/` folder; `parent: null` does **not** change the path.
- **Sidecar**: `<same-dir>/<slug>.state.yaml` with `parent: <resolved-parent-slug-or-null>`.

### 5c — Write the plan file (Master Plan template body)

Write `<slug>.plan.md` with the **full** Master Plan layout. Every section that hasn't been worked on yet gets the same visible placeholder — `_TBD_` — so when you (or anyone else) opens the plan, a single glance tells you which sections are still pending. Step 6 will replace the placeholders under § 1 through § 5 with real content; § 6 (`Delivery phases | PR breakdown`) and § 7 (Caveats) stay `_TBD_` until follow-up turns work them. Note that § 6's heading is the deliberate dual-title form — the actual decomposition decision (`Delivery phases` vs `PR breakdown`) is made when § 6 is drafted, not at scaffold time.

````markdown
---
name: <PRD title>
overview: <one-line overview synthesised from the PRD>
todos:
 - id: review-initial-draft
 content: Review §§ 1–5 (Background, Benefits, Related features, Architectural design, Changes) drafted from the PRD.
 status: pending
isProject: false
---

# <PRD title>

> PRD: <link or @path from the seed prompt>

## 1. Background

_TBD_

## 2. Benefits

_TBD_

## 3. Related features

_TBD_

## 4. Architectural design

_TBD_

## 5. Changes

_TBD_

## 6. Delivery phases | PR breakdown

_TBD_

## 7. Caveats (optional)

_TBD_
````

The literal `## 6. Delivery phases | PR breakdown` heading is the **deliberate, not-yet-decided** form documented in the dev-process doc's **§ 6 / § 5 contents rule**. When § 6 is drafted in a follow-up turn, the agent picks one of `Delivery phases` (the feature decomposes into phases) or `PR breakdown` (the feature is small enough to skip the phase layer) and rewrites the heading to the chosen value, dropping the other side. Until then, the dual heading communicates "decomposition pending" at a glance.

Use uniform italic **`_TBD_`** for every pending section (scannable in Plan Board and GitHub; grep with `rg '^_TBD_$'`). Rationale and template rules: **`.sedea/centers/research-and-development/docs/development-process.md`** § *Master Plan template*.

Frontmatter rules carry over from the new-plan contract:

- Do **not** put `parent:` in frontmatter. Parent lives in the sidecar.
- Seed `todos:` with the one honest first todo shown above (so the Plan Board renders the plan as `not_started` until the user marks it in-progress).
- `isProject: false` unless the user says otherwise.
- Do not invent a `status:` field.
- **Quote YAML scalar values that would otherwise mis-parse** — most commonly **`name:`** when the PRD title contains `: ` (colon + space). Follow the local `new-plan` skill's YAML-scalar rules for the full trigger list. PRD titles routinely use the form `Subject: clarifier`, which the YAML parser reads as a nested mapping unless the value is wrapped in **double quotes**, and that silently breaks the Plan Board tree label (snake-cased slug fallback) and todo rendering. When in doubt, quote.

Write `<slug>.state.yaml` alongside:

```yaml
# Sidecar for Plan Board (runtime). Plan: <slug>.plan.md
parent: <resolved-parent-slug-or-null>
worktrees: []
prs: []
```

Both files must be written in the same skill turn so the Plan Board picks the plan up cleanly on first scan.

After writing, link the plan file with an absolute path so the user can click through:

> Plan file: [`<slug>.plan.md`](file:///<absolute-targetPlanPath>)

## Step 6 — Draft sections 1 through 5 into the plan file

Following the **Master Plan template** in the dev-process doc (loaded in step 2), populate the `_TBD_` placeholders under § 1 through § 5 of the plan file scaffolded in step 5. Use `StrReplace` per section — never rewrite the whole file.

The placeholder `_TBD_` appears seven times in the fresh scaffold (one per section), so each `StrReplace` call's `old_string` must include the section header above it as disambiguating context. Concretely, for § 4 the call looks like:

```
old_string:
## 4. Architectural design

_TBD_

new_string:
## 4. Architectural design

<your Mermaid diagram(s) here>
```

Repeat the analogous shape for §§ 1, 2, 3, 5. Leave the `_TBD_` placeholders under § 6 and § 7 untouched — they mark the two sections that still need work in follow-up turns.

### § 1 Background

One paragraph, **1–2 sentences**, framed from the **hosting repo** perspective (not implementation). What is the feature, in plain language? Who is it for? What problem does it solve? Pull this directly from the PRD's overview / goals — paraphrase, don't quote at length. Implementation framing belongs in § 4 / § 5, not here.

### § 2 Benefits

Short bullet list answering only *why* — benefits to merchants, benefits to their customers, system improvements that reduce cost or operational effort, user-experience wins. Follow the short-bullet rule from the dev-process doc's bullet-style convention: **2–3 words per bullet, never more than 5**. A long list of short bullets beats a short list of long sentences.

Source material: the PRD's "goals" / "value" / "why now" sections, plus any merchant pain points the PRD calls out. If the PRD is light on benefits, infer them from the problem statement — but flag inferred bullets with `(inferred)` so the user catches anything you over-extrapolated.

### § 3 Related features

Short bullet list — one bullet per related feature, in the form `<feature> — <relationship>: <implication>`. **Ordering / concurrency** — **precedes**, **follows**, **runs concurrently with**, or **depends on**; say what must align in delivery (e.g. "ship migration first", "share API contract", "stagger rollout"). **Scope** — **narrows scope**, **widens scope**, or **shifts scope**; say *how* in a few words (e.g. "their work drops our login UI", "their API adds fields we must persist", "auth moves to their slice, we stop owning tokens"). A bullet may name both when a related feature reschedules and rescopes work.

Sources for identifying related features, in priority order:

1. **User-supplied related documents from step 4b that describe a feature** (highest signal — the user already curated relevance and stated the role). The role description is your starting point; map it to one of the four relationship verbs above.
2. The PRD itself — often names dependencies / sequels / parallel efforts in passing.
3. *Fallback only when 1 and 2 are empty:* other `.plan.md` files under the same operations `plans/` tree (Glob) — read frontmatter `name:` and skim overview sections for overlap. Don't auto-flag every plan that mentions a shared concept; only flag genuine sync needs.
4. *Fallback only when 1, 2, and 3 are empty:* architectural rules loaded in step 3 — they sometimes flag domain concepts that hint at adjacent features.

If you can't identify any related features from this context, write the single bullet `_None identified from current context — confirm in review._` instead of inventing relationships. Empty here is **fine**; many features stand alone.

### § 4 Architectural design

One or more diagrams showing what the implementation will look like. Pick the diagram type(s) that best fit the feature, from the menu in the dev-process doc:

- Component / architecture chart — service topology, module boundaries, dependency direction.
- Flow chart — control flow or data flow through new logic.
- Sequence diagram — interactions between services, processes, or actors over time.
- State diagram — lifecycle / state-machine changes.
- ER / schema diagram — data model or database changes.

Use **Mermaid** (in fenced ```mermaid blocks) so the diagrams render in Cursor and on the Plan Board. Include only what is necessary to understand the *shape*; don't draft pseudocode here. If multiple diagrams are needed, label each one.

### § 5 Changes

Short bullet list of what changes, how, and where, scoped at the feature level. Same short-bullet rule as § 2: **2–3 words per bullet, never more than 5**.

Group bullets by area of the codebase if it helps scannability (e.g. **DB:**, **API:**, **Worker:**, **UI:**) — but keep each bullet terse.

**Immediately after** the last change bullet (still inside `## 5. Changes`), append **`### Decomposition assessment`** — mandatory in the same turn as the rest of § 5. Use the same bullet dimensions as **`phase-planner`** (`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/phase-planner/SKILL.md`) § *4g — `### Decomposition assessment`*: **Kinds of change (count)**, **PR count band** (`single` | `few (2–5)` | `many (6+)`), **Sequencing / coupling**, **Routing recommendation** (`Delivery phases` | `PR breakdown` multi-PR | `PR breakdown` single-PR) with a short **why**, **Confidence** (`high` | `med` | `low`). Ground this in §§ 4–5 and the PRD. The assessment is evidence for the §6 **AskQuestion** route (inline **`delivery-phases`** / **`pr-breakdown`**); it does **not** replace §6 drafting by those skills.

The `StrReplace` for § 5 must replace from `## 5. Changes` through its `_TBD_` placeholder and include both the change bullets **and** the `### Decomposition assessment` subsection in `new_string`. Do **not** write `### Complexity score` in that same replace — Step 6c appends it after the decomposition assessment is final (it needs the finished §4 and §5 text to fill the table).

### Step 6c — Plan-scope complexity score (mandatory)

After §§ 1–5 are fully drafted in the file (including `### Decomposition assessment`), compute **three integers** from the **as-written** `## 4. Architectural design` and `## 5. Changes` bodies, take the **largest** as the **overall score**, assign a **band**, and write the subsection below. This is a **scoping signal** for whether one Master Plan is trying to carry too much design surface before § 6 — not a substitute for `### Decomposition assessment`.

#### Count 1 — Flowchart boxes (§4)

In every Mermaid **`flowchart`** / **`graph`** block under §4, count each **labeled node** that names a real part of the system (service, app, worker, datastore, queue, bus, external system, UI shell — count each distinct name **once** even if it appears twice).

- If §4 has **no** `flowchart` / `graph` but **does** have a **`sequenceDiagram`**, use the number of **`participant`** / **`actor`** lines for this count instead (one per lifeline).
- If §4 has **neither**, use **0**.

#### Count 2 — Sequence arrows (§4)

In every **`sequenceDiagram`** under §4, count **message lines** — lines where one actor signals another (`->>`, `-->>`, `->`, `-->`, `-x`, `--x`, `-)`, etc.). Each such line is one count; a return on its own line counts separately. If there is **no** sequence diagram in §4, use **0**.

#### Count 3 — Change bullets (§5)

Count Markdown lines that start with `- ` **strictly between** the `## 5. Changes` heading and the `### Decomposition assessment` heading. Each top-level `-` bullet is one count (including bullets under **DB:** / **UI:** style subheads). Do **not** count bullets inside `### Decomposition assessment` or any later subsection under `## 5. Changes`.

#### Overall score and band

- **Overall score** = **max(count 1, count 2, count 3)** — one integer for the whole plan.
- **Band:** **low** if overall score ≤ 10; **medium** if 11–20; **high** if > 20.

#### Persist + echo

1. **StrReplace** — Append immediately **after** the full `### Decomposition assessment` block (still under `## 5. Changes`) a subsection that **matches this shape exactly** (replace angle-bracket placeholders with your computed numbers):

```markdown
### Complexity score (plan-scope signal)

- **Band:** <low | medium | high>
- **Overall score:** <n> — largest of the three counts in the table (plan-scope signal from §4–§5 only).

| What we counted | Value |
| --- | ---: |
| **Flowchart boxes** in §4 | <n> |
| **Sequence arrows** in §4 | <n> |
| **Change bullets** in §5 | <n> |
```

Use **exactly these three row labels** and **these two column headers**. Put **only integers** in the Value column.

2. **Chat (required)** — Before Step 7 **AskQuestion**, state **band**, **overall score**, and the **three table values** (same numbers as in the file) so the user can audit the math.

#### High-complexity gate (overall score > 20)

When the band is **high**:

1. **§6 is available — prefer Delivery phases.** A **high** score means §§4–5 carry a large design surface on **this** Master Plan. That is exactly when **mode #2 — Delivery phases** applies: inline **`delivery-phases`** drafts outcome-titled phase rows; each child gets **`phase-planner`** (scoped §§1–4 + **`### Decomposition assessment`**, **no** numeric withhold — see **`phase-planner/SKILL.md`** Step 5) and may further decompose per phase. **Do not** withhold **`route-6`** because the score is > 20 — that blocks the primary mitigation.
2. **Routing guidance (required)** — Before Step 7, state explicitly: score > 20 → recommend **Route §6 → Delivery phases**; **PR breakdown** on this Master Plan usually **undersizes** the problem (skips the phase layer that absorbs complexity).
3. **Optional alternative — separate Master Plans** — When the feature is really **multiple independent outcomes**, propose **2–4** user-journey slices shippable as **separate planning conversations** (each its own root or child Master Plan). Present this as an **alternative** to single-plan **Delivery phases**, **not** as a prerequisite before §6. **Avoid** topology-only splits ("frontend vs backend") unless each slice names **who gains what**.
4. Proceed to **Step 7** — Step **7b** **must include `route-6`** at high band (same as low/medium).

When band is **low** or **medium**, proceed to **Step 7**; the status line in Step 7a must mention complexity (e.g. *"Complexity: medium (overall score = 12) — §6 decomposition available in next AskQuestion."*).

When band is **high**, Step 7a must say e.g. *"Complexity: high (overall score = 23) — Route §6 recommended → **Delivery phases** to split into lower-complexity phase plans via **`phase-planner`**."*

### Echo to chat

After writing §§ 1–5 **and** `### Complexity score` into the plan file, **echo all five sections in the chat reply** — including **`### Decomposition assessment`** and **`### Complexity score`** under `## 5. Changes` — so the user can review without opening the file. The plan file is the source of truth; the chat copy is a review surface. Use the same section headers (`## 1. Background`, etc.) so the chat output aligns line-for-line with the file. **Also** echo the **band** and **three table values** above or below the echoed sections (see Step 6c **Chat (required)**).

### What NOT to draft

Do **not** draft section 6 (`Delivery phases | PR breakdown`) or section 7 (Caveats). Those are follow-up turns. Specifically:

- **§ 6 Delivery phases | PR breakdown** is owned by **`delivery-phases`** and **`pr-breakdown`** (modes #2 and #3), invoked **inline on this lane** after the user picks **Route §6 decomposition** (Step 7c–7d). Either skill drafts the dual-title list; child stubs use **`new-plan`** (indexed spawn via **AskQuestion** on list index **N**, per **30_planning-target-resolution**). Do **not** draft §6 inline in **`master-planner`** prose alone.
- **§ 7 Caveats** often only emerges once § 6 reveals concrete constraints. Drafting it from the PRD alone risks listing PRD-level worries that aren't real planning caveats.

## Step 7 — Next moves (AskQuestion + inline decomposition)

 §§ 1–5 are drafted (including **`### Complexity score`**); §6 and §7 stay `_TBD_` until the user chooses next moves. Collect each next-move pick per **`.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`** § *Sedea input channel* and **`../README.md`** § *Recap, structured choice, act* — **`AskQuestion`** or **`MC_PHASED_RESPONSE_V1`** in **one turn** (`display.markdown` + `askQuestion`). Execute **one** chosen action per turn.

§6 decomposition runs **`delivery-phases`** or **`pr-breakdown`** **inline on this lane** (no child lane for those skills). §7 **Caveats** is drafted **inline** in this skill when the user selects that option.

**Continuation ownership.** When this skill runs as a spawned **Master Plan agent** under **`plan and deliver`**, this lane owns post–Master Plan continuation and downstream spawning **except phase-scoped delivery** — once inline **`new-plan`** opens a **`phase-planner`** child lane, that child owns the phase subtree until **`phaseShipComplete`** or explicit defer/abandon; this lane **acknowledges only** (Step **7b** *Phase-planner child active*). The **Squad Leader** only acknowledges status and maintains the closure ledger — no duplicate route **AskQuestion** on the leader lane. Include `continuationOwner: "master-plan-agent"` and `continuationStatus: "active"` in the terminal result while follow-up remains on this lane.

### Step 7a — Recap after initial draft

After **Echo to chat** (§§1–5 + complexity table), end with **one short status line only** (plan path, band, overall score). **Do not** embed the next-move menu in prose blockquotes.

When the full section echo is too long for one message, use rule **2** priority **3** split only: prior message = echo; **next** message = **`MC_PHASED_RESPONSE_V1`** sentinel-first with Step **7b** options — never a prose-only follow-up. On the **initial §§1–5 draft turn**, include **`MC_PHASED_RESPONSE_V1`** in the **same** message as **`mission_control_send_agent_result`** — phased **line 1**, terminal **last line** (rule **2** § *Same message as spawn terminal*).

### Step 7a.1 — Open-item modal contract

Apply the shared planning open-item contract from `../README.md` to every **master-planner** review gate that surfaces multiple unresolved items: initial draft observations, section revision needs, high-complexity route caveats, route-choice caveats, inline decomposition blockers, and follow-up flags.

**When open items exist** — use **one modal with multiple `questions[]` entries**:

- **`display.markdown`:** numbered list of open items. For each item, include the section or route it affects, the gap or caveat, why the decision matters, and the agent's proposed resolution options.
- **`askQuestion.questions`:** one scoped question per open item, with its own stable `id`, `prompt`, and item-only `options` (for example `accept-proposed`, `revise-section`, `defer-to-caveats`, `skip-no-change`, `more-details`). **Forbidden:** one combined question whose options mix several item decisions.
- **Final question:** always append the terminal planner gate question last in the array. Use the normal gate for the current step: Step **7b** primary next moves, Step **7c** route choice, §7 Caveats approval, or the relevant resume/expand gate. **Forbidden:** a resolve-only modal that omits the terminal next-move or approval question until every item is cleared.
- **Many open items:** batch across turns when needed; each batch still ends with the terminal planner gate question as the final `questions[]` entry so the developer can approve, route, revise, or defer with the surfaced context visible.

**When no open items remain** — use the existing single terminal gate question for Step **7b**, Step **7c**, §7 approval, or resume/expand.

### Step 7b — Structured choice: primary next moves

Invoke **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** in the **same turn** as step **7a** recap when practical. **Obsolete:** structured choice in a **separate** assistant message after step **7a** without a phased sentinel on that follow-up. Build options from plan state and Step 6c band.

**Phase-planner child active (binding):** When **`activeLanes`** (from inline **`delivery-phases`** / **`new-plan`** merge or bubbled **`mission_control_send_agent_result`**) includes **`continuationOwner: "phase-planner-agent"`** with **`continuationStatus: "active"`** for a **`Delivery phases`** row, **do not** offer **`route-6`**, **`expand-eligible-pr`**, **`expand-next-phase`**, or other phase-scoped decomposition options for that row on this **Master Plan** lane. Acknowledge in one line (phase slug, child lane id when known) and tell the developer to continue on the **phase-planner** child lane. Re-offer Step **7b** master-plan options only after **`phaseShipComplete`** for that phase or explicit defer/abandon — see **`phase-planner`** § *Phase delivery ownership*.

**Inline `pr-plan` handoff pending (binding):** When **`spawnedPlans`** includes a PR plan whose inline merge reports **`implementationHandoffStatus`** in **`not-offered`**, **`offered`**, or **`spawned-coding-session`** (and no terminal **`coding-session`** yet), **omit** **`route-6`**, **`draft-7`**, and other master-plan options until §5c resolves or the **`coding-session`** child completes — **except** when merge includes **`prPlanHandoffSkipped: true`** (**`pr-breakdown`** **`approve-list`** auto-chain; §5c deferred). Then offer Step **7b** menus and an option to open inline **`pr-plan`** §5c on that **`targetPlanPath`** (for example *Start coding session — PR plan ready*). Offer **`pr-plan`** §5c options (or continue waiting on an open **`coding-session`** child) on **this lane** when **`prPlanHandoffSkipped`** is absent — see Step **7c** *Pending inline `pr-plan` handoff*.

**Primary next moves (all complexity bands)** — include at minimum:

| Option id (example) | Label (brief) | Action |
|---------------------|---------------|--------|
| `route-6` | Route §6 — Delivery phases or PR breakdown | Step 7d → route **AskQuestion** → inline skill |
| `draft-7` | Draft §7 Caveats | Inline §7 only |
| `revise` | Revise a drafted section (§1–§5 or §7) | Step 7e |
| `more` | More details for option _ | Elaborate, then re-ask |

**When complexity is high (C > 20)** — **include `route-6`** (same as low/medium — do not withhold §6 at high band). In recap / **`display.markdown`**, recommend **Delivery phases** over **PR breakdown** and name the downstream chain (**`delivery-phases`** → **`new-plan`** → **`phase-planner`**). At Step **7c** route **AskQuestion**, list **Delivery phases** first with a brief label such as *Delivery phases — recommended (split into phase plans)* and **PR breakdown** second with caution such as *PR breakdown — skips phase layer; usually not for high band*. Also offer **revise §4**, **revise §5** when the user wants to narrow before decomposing. The **Squad Leader** must **never** run **`delivery-phases`** or **`pr-breakdown`** — only this **master-planner** lane runs them inline after **`route-6`**.

When band is high, optional separate-Master-Plan journey-split bullets from Step 6c may appear in recap / **`display.markdown`** as context — not as a prose choice menu; options live in the modal.

Always include **More details for option _** per conduct.

**When inline decomposition reports unlocked indices** (from **`expandEligibleIndices`** on **`pr-breakdown`** or **`expandNextEligibleIndex`** on **`delivery-phases`** after spawn-chain **`prShipComplete`** / **`phaseShipComplete`**):

| Option id (example) | Label (brief) | Action |
|---------------------|---------------|--------|
| `expand-eligible-pr` | Expand eligible PR row(s) | Re-invoke inline **`pr-breakdown`** structured choice act **`expand-eligible`** or run eligible **`new-plan`** indices directly when list already approved |
| `expand-next-phase` | Expand next eligible phase | Re-invoke inline **`delivery-phases`** act **`expand-next-eligible`** for **`expandNextEligibleIndex`** |

Include these options **only** when the ledger shows non-empty eligible indices; omit when prior stage ship is still incomplete.

**When decomposition is ship-complete** (no **`expandEligibleIndices`**, no **`expandNextEligibleIndex`**, and every decomposition / ledger row is **`ship-complete`**, **`closed`**, **`deferred`**, or **`abandoned`**):

| Option id (example) | Label (brief) | When |
|---------------------|---------------|------|
| `draft-7` | Draft §7 Caveats | §7 is still **`_TBD_`** or empty |
| `approve-caveats` | Approve §7 Caveats | §7 drafted; **`caveatsApprovalStatus: pending`** |
| `revise-caveats` | Revise §7 Caveats | §7 drafted; developer wants edits before approve |
| `skip-caveats` | Skip §7 Caveats | §7 still **`_TBD_`** or pending — explicit defer |

Do **not** omit **`draft-7`** when all phases are shipped but §7 was never drafted. Do **not** set **`continuationStatus: terminal`** or empty **`remainingTasks`** until **`caveatsApprovalStatus`** is **`approved`** or **`skipped`** via explicit structured choice (see **Draft §7 Caveats** below).

**Stop** after emitting AskQuestion — do not execute the chosen action in the same turn.

### Step 7c — One choice per turn

Execute **only** what the user selected in **AskQuestion** (or the matching **`option`** from). Multi-step work requires explicit multi-action approval in one user message.

#### Route §6 decomposition (`route-6`)

1. **Structured choice** — **AskQuestion**, **`MC_PHASED_RESPONSE_V1`**: **Delivery phases** vs **PR breakdown** (align with **`### Decomposition assessment`** when possible). Prefer one message; split only when a long draft was sent in the prior message.
2. Load and follow the chosen skill **inline** on this lane (see **Inline handoff** above):
 - `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/delivery-phases/SKILL.md` — `routeLock: "delivery-phases"`
 - `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-breakdown/SKILL.md` — `routeLock: "pr-breakdown"`
3. Pass inline context: `targetPlanPath`, `targetPlanSlug`, `parentAgentRole: "master-plan-agent"`, `ledgerParent: <masterPlanSlug>`, `complexityBand`, `complexityScore`, `decompositionAssessment`, `routeLock`.
4. When the inline skill returns **`## Completion (inline)`** fields, merge `activeLanes`, `openLedgerEntries`, `spawnedPlans`, `remainingTasks`, **`expandEligibleIndices`**, and **`expandNextEligibleIndex`** into this skill’s ledger. Append each new child **`planPath`** / **`planSlug`** from inline **`new-plan`** (including inline **`pr-plan`**) into **`outputs.spawnedPlans`** on the next **`mission_control_send_agent_result`** re-emit so Mission Control lane documents list PR plans — not only **`masterPlanPath`**. If the inline skill opened **`phase-planner`** child lanes or **`coding-session`** from inline **`pr-plan`**, wait on this lane for their **`mission_control_send_agent_result`** deliveries per that skill’s aggregation step, then continue **`master-planner`** Step **7b** — **do not** emit child lanes for **`delivery-phases`**, **`pr-breakdown`**, or **`new-plan`**.

**Pending inline `pr-plan` handoff (binding):** When inline **`pr-breakdown`** / **`new-plan`** merged fields show a fresh PR plan with **`implementationHandoffStatus: not-offered`** or **`offered`** (§5c open, **`coding-session`** not yet spawned), **do not** offer Step **7b** **`route-6`** / master-plan menus on this turn — **unless** **`prPlanHandoffSkipped: true`** (auto-chain after **`approve-list`**). In that case continue Step **7b**; offer **Start coding session** via re-entering inline **`pr-plan`** §5c on **`targetPlanPath`**. When **`prPlanHandoffSkipped`** is absent, **re-enter** inline **`pr-plan`** §5c–§5e on **this Master Plan lane** (same **`targetPlanPath`**) until the developer picks **Start coding session**, **`defer`**, or a **`coding-session`** child terminal arrives. **PRD source is irrelevant** — every **`plan and deliver`** dispatch reaches **`master-planner`** only after Squad Leader §3 **`author-prd`** approval; only **`pr-plan`** §5c–§5d opens **`coding-session`**.

**Spawn-chain ship notifications:** When Mission Control delivers **`agent-result-response delivered`** with **`outputs.prShipComplete`** or **`outputs.phaseShipComplete`** (bubbled from **`coding-session`** → **`pr-plan`** / **`new-plan`** → **`pr-breakdown`** / **`phase-planner`** → **`delivery-phases`**), merge into the ledger per **`../README.md`** § *Upstream ship-complete notification*, **re-emit updated** **`mission_control_send_agent_result`** (same **`correlationId`**) when this lane is standalone spawned, then return to Step **7b** with expand options when indices unlock.

#### Parallel **`hosting-repo-rules`** fork after **`coding-session`** terminal (fire-and-forget)

When Mission Control delivers a **`coding-session`** child **`mission_control_send_agent_result`** terminal (direct spawn from inline **`pr-plan`** §5d or bubbled through Step **7c** aggregation), evaluate the parallel rules fork **in the same aggregation pass** as **`prShipComplete`** merge — **before** returning to Step **7b** expand menus.

**Spawn trigger (all required):**

| # | Condition |
|---|-----------|
| 1 | Plan-anchored run — `outputs.targetPlanPath` present on **`coding-session`** terminal |
| 2 | `outputs.repoRulesReconciliationStatus` is **`pending`** **or** product PR plan §5 lists `.mdc` action bullets not covered by `outputs.reconciledRepoRulesPaths` |
| 3 | Product terminal merge-ready — `outputs.prShipComplete: true` **or** documented deferral on the product row |

**Do not spawn when:** `outputs.repoRulesReconciliationStatus` is **`complete`** or **`skipped-none`**; §5 is `_None — no repo rule updates required for this PR._` only; scope is center/mission governance (route **Alignment Drift Brief** per rule **5** instead).

**When all triggers match:**

1. Emit fire-and-forget **`mission_control_spawn_agent`** for **`hosting-repo-rules/SKILL.md`** — **same turn** as terminal merge when possible. **Forbidden:** add the rules child to **`pendingByParent`**, **`activeLanes`** wait sets, or a separate **`shipRows`** entry.
2. Spawn **`inputs`** (from **`coding-session`** terminal + product PR plan):

| Input | Source |
|-------|--------|
| `targetPlanPath` | Product PR plan from **`coding-session`** `outputs.targetPlanPath` |
| `targetPlanSlug` | Same plan slug |
| `sourceCodingSessionCorrelationId` | **`coding-session`** child `correlationId` |
| `pendingRepoRulesPaths` | Gap between §5 bullets and `outputs.reconciledRepoRulesPaths`, or terminal handoff list |
| `repoRulesReconciliationStatus` | Echo from terminal — must be **`pending`** or deferral signal |
| `ledgerParent` | **`outputs.masterPlanSlug`** or spawn **`inputs.ledgerParent`** |

3. On the **existing product PR row** in this lane's ledger, set **`rulesUpdatesStatus: spawned`** and record **`hostingRepoRulesCorrelationId`**. Let the async child update **`rulesUpdatesStatus`** / **`rulesPrUrl`** on return.
4. **Continue depth-first expand** — offer Step **7b** **`expand-next-eligible`** when sequencing gates allow **without** waiting on rules PR merge.

**Async rules child terminal merge:** When Mission Control later delivers **`hosting-repo-rules`** **`mission_control_send_agent_result`**, match by **`hostingRepoRulesCorrelationId`**. Update product row **`rulesUpdatesStatus`** (`complete` | `failed` | `abandoned`) and optional **`rulesPrUrl`**. **Re-emit updated** **`mission_control_send_agent_result`** (same **`correlationId`**) when standalone spawned.

**Forbidden:** blocking next-row PR expand until rules PR merges; separate **`shipRows`** sub-row; adding rules lane to **`pendingByParent`**.

Normative overview: **`../README.md`** § *Parallel **`hosting-repo-rules`** fork (fire-and-forget)* and **`hosting-repo-rules/SKILL.md`** § *Spawn trigger*.

### Resume / PR-expand handoff (binding)

When this skill resumes on a spawned **Master Plan** child lane (Mission Control reload, Squad Leader re-spawn for one PR index, or **`single-phase`** / **`plan and deliver`** resume after inline **`new-plan` + `pr-plan`** completes §§1–4):

1. **Do not** emit **`continuationStatus: terminal`** with only **`readyForImplementation: true`** while inline merge reports **`implementationHandoffStatus`** in **`not-offered`** or **`offered`** — apply Step **7c** *Pending inline `pr-plan` handoff* first.
2. **Do not** redirect **`coding-session`** spawn to the **Squad Leader**. Squad Leader §§1–7 never spawn ship skills; **this lane** re-enters inline **`pr-plan`** §5c–§5d on **`targetPlanPath`** and emits §5d **`mission_control_spawn_agent`** when the developer picks **Start coding session**.
3. When the developer acknowledges **ready for coding-session** (or equivalent), treat that as **`start-coding-session`** authorization — run inline **`pr-plan`** §5c then §5d on **this lane**, not prose deferral to the leader dispatch.
4. **Forbidden:** prose such as *Squad Leader owns **`coding-session`** spawn* or *hand off to Squad Leader for implementation* after a PR plan was created on **this** lane.

**Spawn-chain parent follow-up notifications:** When a bubbled child terminal carries **`outputs.parentPlanningFollowUpNotification: "sent"`** and non-empty **`parentPlanningFollowUps`**, append each item to the **master plan** (or resolved **`parentPlanPath`**) **`## Follow-ups`** section via **`StrReplace`**; record **`pendingParentFollowUps[]`** on the working ledger. **Do not** offer **`expand-eligible`** / **`expand-next-eligible`** solely because follow-ups arrived — depth-first expand still requires **`prShipComplete`** / **`phaseShipComplete`**. **Re-emit updated** terminal when standalone spawned so upstream receives merged follow-up fields.

Do **not** draft §6 in **`master-planner`** prose without running the inline skill.

#### Draft §7 Caveats (`draft-7`)

Draft **`## 7. Caveats (optional)`** inline from PRD + §§1–5 (+ §6 when already drafted). **§7 requires an explicit developer approval gate** before this lane may report **`continuationStatus: terminal`** or imply planning complete to the Squad Leader.

##### Act after `draft-7` select (one turn — write + §7 approval gate)

1. **`StrReplace`** the §7 **`_TBD_`** (or empty body) under **`## 7. Caveats (optional)`** with caveats grounded in PRD + §§1–6 (constraints from decomposition or ship — not generic PRD worries alone).
2. Set working ledger **`caveatsApprovalStatus: pending`**.
3. Close the **same turn** with **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`**: put the full **`## 7. Caveats`** block (or plan path + one-line summary) in **`display.markdown`** when phased; **`askQuestion`** options:

| Option id (example) | Label (brief) | Action |
|---------------------|---------------|--------|
| `approve-caveats` | Approve §7 Caveats | **`caveatsApprovalStatus: approved`** → evaluate terminal eligibility |
| `revise-caveats` | Revise §7 Caveats | Step **7e** on §7; keep **`pending`** until re-approved |
| `skip-caveats` | Skip §7 Caveats | **`caveatsApprovalStatus: skipped`** → evaluate terminal eligibility |
| `more-details` | More details for option _ | Elaborate; re-ask |

4. **Stop without** emitting **`mission_control_send_agent_result`** on this turn — not combined with the approval modal. **Obsolete:** separate write-only turn with §7 echo and no structured choice.

##### §7 approval gate (after developer selects)

**Forbidden on the master-master-planner lane (binding):**

- **Same turn:** §7 approval modal **and** **`mission_control_send_agent_result`** with **`continuationStatus: terminal`**.
- **Same turn:** §7 approval modal **and** **`mission_control_propose_dispatch_resolution`** — only the **Squad Leader** closes the dispatch.
- **`continuationStatus: terminal`** while **`caveatsApprovalStatus: pending`**.
- **`remainingTasks: []`** while **`caveatsApprovalStatus: pending`**.

After **`approve-caveats`** or **`skip-caveats`**, emit **`mission_control_send_agent_result`** on a **separate turn** from the approval modal (or on the turn **after** the user selects in the modal — never terminal in the same message as the approve modal). Then Step **7b** unless terminal eligibility applies.

##### Terminal eligibility (after §7 gate)

Set **`continuationStatus: terminal`** and empty **`remainingTasks`** **only when all** apply:

1. **`caveatsApprovalStatus`** is **`approved`** or **`skipped`** (explicit structured choice), **or** §7 was approved on a prior turn.
2. No **`expandEligibleIndices`** / **`expandNextEligibleIndex`**; no **`open`** / **`blocked`** ledger rows needing planner action.
3. No other pending Step **7b** choice.

When (2) holds but §7 is still **`_TBD_`**, keep **`continuationStatus: active`**, offer **`draft-7`**, list **`Draft §7 Caveats`** in **`remainingTasks`**. When §7 is drafted but **`pending`**, keep **`active`**, list **`Approve §7 Caveats`** in **`remainingTasks`**, offer **`approve-caveats`** / **`revise-caveats`** / **`skip-caveats`** — **not** terminal status.

#### Revise section (`revise`) — Step 7e

1. **AskQuestion:** which section — **§1 Background** … **§5 Changes** or **§7 Caveats** (not §6; owned by decomposition agents).
2. Collect feedback via **prompt** / **More details for option _** if needed.
3. Apply edit to **that section only**; re-run Step 6c after §4 or §5 edits.
4. Flag sibling issues; do not fix silently.

#### Operations git requests (binding)

When the developer asks to commit, push, or open a PR for plan files under **`.sedea/operations/`**, **decline in prose** — operations git is **user-managed** outside the agent per **`.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc`** § **Operations repository**. **Forbidden:** `commit-plans`, `commit-only`, `commit-push`, or any commit/push/PR **`options`** in **`MC_PHASED_RESPONSE_V1`** / **AskQuestion** when the active **`targetPlanPath`** (or plan writes from this skill) resolve under **`.sedea/operations/`**.

### Observations (numbered flags)

When you notice gaps while working, list **numbered observations** in **`display.markdown`** (Flag 1, Flag 2, …) and apply **Step 7a.1 — Open-item modal contract**: one scoped `questions[]` entry per observation or batch item, then the current terminal planner gate question last. Prefer recap + modal in one message.

After handling flags, return to **Step 7b**.

### Follow-up turns

After each completed action, re-read the plan file and run **Step 7b** again with updated options. Decomposition remains available via `route-6` at all complexity bands. Child list index **N** for **`new-plan`** is chosen via **AskQuestion** or snapshot per **30_planning-target-resolution**.

**Terminal / re-closure (binding):** When a prior turn emitted **`mission_control_send_agent_result`** with **`outputs.continuationStatus: terminal`**, resumed turns (including Mission Control warm-up on this lane) offer **acknowledgment**, **More details for option _**, or **user-directed follow-up** that explicitly reopens skill scope (for example **Revise a section**). **Forbidden:** re-offer full Step **7b** next-move menus, **`route-6`**, expand options, or any commit/push/PR modal **`options`** unless the user's message explicitly reopens planning scope on this lane.

## Scope guard

This skill writes the Master Plan file (`<slug>.plan.md` + `<slug>.state.yaml`) and populates §§ 1 through 5 in the initial turn (**§ 5 includes `### Decomposition assessment` and `### Complexity score (plan-scope signal)`**), computes the **plan-scope complexity table** per Step 6c, and when the **overall score** is **> 20** recommends **Route §6 → Delivery phases** (not withholding §6) to split into lower-complexity phase plans via **`phase-planner`**. It drafts §7 when the user selects that option, and runs **delivery-phases** or **pr-breakdown** **inline** when the user selects route §6. It does **not**:

- Create worktrees or start implementation.
- Modify code or content in the selected repos. Step 3b is the only repo touch this skill makes — it runs `git status --porcelain`, `git checkout <default-branch>`, and `git pull --ff-only` to sync each selected hosting repo to its default branch before loading architectural rules. It refuses to run on a dirty tree or a linked worktree, never stashes / commits / discards, and never falls back to a non-fast-forward pull.
- Offer or run commit / push / PR for **`.sedea/operations/`** plan files — operations git is user-managed per **`.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc`** § **Operations repository** (see Step **7c** § **Operations git requests**).
- Draft section 6 (`Delivery phases | PR breakdown`) in **`master-planner`** prose alone — that section is owned by inline **`delivery-phases`** / **`pr-breakdown`**.
- Spawn **`delivery-phases`**, **`pr-breakdown`**, or **`new-plan`** child lanes — those skills run inline on this lane; they may still spawn **`phase-planner`** or **`coding-session`** per their contracts.

## Completion (spawned)

End every spawned run (initial draft and each follow-up turn that finishes skill scope) with exactly one MCP result call:

Required `outputs` fields (populate the JSON `outputs` object on the MCP result call):

### MCP result preflight (`mission_control_send_agent_result`)

| Step | Check |
|------|--------|
| R1 | Call **`mission_control_send_agent_result`** with **`status`**, **`summary`**, optional **`outputs`** / **`errors`** |
| R2 | **Forbidden args absent** — no **`correlationId`**, **`dispatchId`**, **`slotId`**, or other host-resolved keys |
| R3 | Populate **`outputs`** from the required field list below |
| R4 | Re-emit updated MCP result after user-requested follow-up on this lane (same spawn session; host resolves **`correlationId`**) |

Required `outputs` fields:

- `outputs.masterPlanPath`
- `outputs.masterPlanSlug`
- `outputs.complexityBand`
- `outputs.complexityScore`
- `outputs.continuationOwner` — `master-plan-agent` while this lane owns follow-up (Step 7)
- `outputs.continuationStatus` — `active` while follow-up choices remain; `terminal` only when **§7 approval gate** is satisfied (see **Draft §7 Caveats** *Terminal eligibility*) and no other pending tasks
- `outputs.caveatsApprovalStatus` — `pending` | `approved` | `revised` | `skipped` | omitted when §7 untouched; **`pending`** blocks **`continuationStatus: terminal`**
- `outputs.activeLanes` — downstream lane records (`correlationId`, skill, target path, status)
- `outputs.openLedgerEntries` — phase/PR plan or lane entries the **Squad Leader** tracks (§7)
- `outputs.spawnedPlans` — **required whenever** inline decomposition or **`new-plan`** / inline **`pr-plan`** created or populated child `.plan.md` files on this lane. Array of `{ "planPath": "<absolute path>", "planSlug": "<slug>" }` (string paths also allowed). Include **every** accumulated child (phase plans, PR plans) on **each** `mission_control_send_agent_result` re-emit — Mission Control lane documents ingest `spawnedPlans` from terminal `outputs` (not only `masterPlanPath`).
- `outputs.remainingTasks` — pending user or agent actions; empty only when `continuationStatus` is `terminal`
- `outputs.expandEligibleIndices`, `outputs.expandNextEligibleIndex` — echo from inline decomposition after spawn-chain ship-complete merges
- `outputs.prShipComplete`, `outputs.phaseShipComplete` — when this lane merged bubbled ship terminals from nested **`coding-session`** / **`phase-planner`** chains
- Product PR row ledger (parallel rules fork) — per affected PR row when Step **7c** spawns or merges **`hosting-repo-rules`**: **`rulesUpdatesStatus`** (`not-spawned` | `spawned` | `in-progress` | `complete` | `failed` | `abandoned`), optional **`hostingRepoRulesCorrelationId`**, optional **`rulesPrUrl`**
- `outputs.parentPlanningFollowUpNotification`, `outputs.parentPlanningFollowUps`, `outputs.pendingParentFollowUps` — when bubbled from nested **`coding-session`** with parent follow-up notification (**`../README.md`** § *Upstream parent follow-up notification*)
- `outputs.implementationHandoffStatus` — `not-offered` | `offered` | `deferred` | `spawned-coding-session` merged from inline **`pr-plan`** (required when a PR plan handoff is pending or completed on this lane)
- `outputs.spawnCorrelationId` — UUID from inline **`pr-plan`** §5d when **`implementationHandoffStatus`** is **`spawned-coding-session`**

**Forbidden terminal patterns (binding):**

- **`outputs.nextRecommendedSkill: coding-session`** paired with prose or **`remainingTasks`** that assign spawn to the **Squad Leader** — §5d runs on **this Master Plan lane** via inline **`pr-plan`**, not on the leader dispatch.
- **`continuationStatus: terminal`** when Step **7c** / *Resume / PR-expand handoff* requires open §5c on **`targetPlanPath`** (unless developer explicitly **`defer`** implementation on this lane).
- **`implementationHandoffStatus: acknowledged-ready-for-coding-session`** (or similar) without **`spawnCorrelationId`** when the developer authorized **Start coding session** and §5a passed — emit §5d or keep **`continuationStatus: active`**.

Stop after the MCP result call. Do not emit another `mission_control_spawn_agent` for **`delivery-phases`**, **`pr-breakdown`**, or **`new-plan`** or run the next protocol step in the same turn (see **`../README.md`** § *Terminal stop (normative)*). While `continuationStatus` is `active`, the **Squad Leader** acknowledges only (**`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`** §6); this lane owns **AskQuestion** + inline decomposition (Step 7) on follow-up user messages. On turns that emit **`mission_control_send_agent_result`**, also emit **`MC_PHASED_RESPONSE_V1`** in the **same** message (phased line 1, terminal last line) per rule **2** § *Same message as spawn terminal* — Step **7b** options may be in that phased block on the initial draft turn.

**§7 / terminal coupling:** Never emit **`continuationStatus: terminal`** in the same turn as a §7 approval **AskQuestion**. When §7 was just populated and **`caveatsApprovalStatus`** is **`pending`**, the next user-visible turn must be approval structured choice only — terminal **`mission_control_send_agent_result`** comes **after** the developer approves or skips §7.

## Completion (inline)

Report the fields below in prose to the invoker on the **same lane**. Do **not** emit `mission_control_spawn_agent`, `mission_control_send_agent_result`, or `mission_control_propose_dispatch_resolution`. Do **not** add a **MCP result** under this section (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

**plan and deliver** runs this skill **spawned only** (Squad Leader §5). If another invoker runs inline, use the same `outputs` semantics as **`## Completion (spawned)`** in prose only.
