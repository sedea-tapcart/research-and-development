---
name: author-prd
description: Gather evidence and draft or update a flexible Product or Feature Requirements Document.
timeoutMs: 1800000
inputs:
  prdTitle:
    type: string
    description: Human-friendly PRD title.
    required: true
  operation:
    type: string
    description: Either create or manage.
    required: true
  targetPath:
    type: string
    description: Output path for create mode or existing PRD path for manage mode.
    required: false
  storageScope:
    type: string
    description: Deprecated; PRD creation always writes under `.sedea/operations/<operationsUserId>/docs/`.
    required: false
    default: user
  sourceMaterials:
    type: array
    description: Optional seed materials from the opening command or Squad Leader handoff; author-prd collects the full source ledger from the user.
    required: false
    default: []
  sectionPolicy:
    type: object
    description: Map of PRD sections to mandatory, important, optional, or not applicable.
    required: false
  existingPrdBody:
    type: string
    description: Existing PRD content when operation is manage.
    required: false
  operationsUserId:
    type: string
    description: Current Mission Control operations user id for user-private operations paths.
    required: true
---

# Skill: author-prd

## Purpose

Gather evidence, calibrate section policy, and draft or update a Product or Feature Requirements Document that is complete and correct enough to feed the development center's `create new plan` flow. The document structure is flexible: mandatory sections define planning readiness, important sections raise visible gaps, and optional sections appear only when the feature needs them.

## Inputs

- `prdTitle`
- `operation`: `create` or `manage`
- `targetPath` when supplied
- `storageScope`: ignored for creation; new PRDs always use `.sedea/operations/<operationsUserId>/docs/`
- `sourceMaterials` (optional seed materials)
- `sectionPolicy`
- `existingPrdBody` for updates
- `operationsUserId`

## Procedure

1. Validate the operation:
   - `create` drafts a new PRD.
   - `manage` updates or reviews an existing PRD.
   - `create` always resolves output under `.sedea/operations/<operationsUserId>/docs/`; do not create PRDs under `.sedea/operations/joint/docs/`.
2. Initialize a source ledger:
   - start from any documents, URLs, notes, paths, excerpts, screenshots, thoughts, or related artifacts already present in the opening command or Squad Leader handoff.
   - leave the ledger empty when no seed materials were supplied.
   - preserve attribution so claims can be traced back to sources.
   - list unreadable or unavailable seed sources as blockers or caveats.
3. Run the evidence-gathering loop:
   - use `AskQuestion` to ask the user for documents, URLs, write-ups, thoughts, screenshots, mocks, user or stakeholder evidence, implementation constraints, and related PRDs when needed.
   - read local files and `@path` references completely.
   - fetch readable URLs when available; if a URL is inaccessible, ask for an accessible copy or pasted content.
   - extract candidate facts into the source ledger after each added material.
   - stop collecting only when mandatory sections have enough evidence, or when the user explicitly says no more material is available.
4. Calibrate section policy:
   - use caller-provided policy when present.
   - ask the user to classify sections when their importance is unclear or when policy affects planning readiness.
   - otherwise apply the default policy below.
   - do not require optional sections when they are not relevant.
5. Identify gaps and ask targeted questions:
   - identify product problem, users, goals, non-goals, requirements, dependencies, risks, rollout, and acceptance criteria.
   - ask targeted follow-up questions for missing mandatory content.
   - report important-section gaps and ask whether to gather more data, mark them optional/not applicable, or carry them as visible gaps.
   - mark contradictions and missing mandatory information as open questions until resolved.
6. Draft or update the PRD:
   - keep section ordering stable unless the existing PRD uses a clearly intentional structure.
   - retain useful existing content in `manage` mode.
   - omit optional sections that have no supporting evidence.
   - include `TBD` only when the gap is intentionally surfaced for review.
7. Run completeness review:
   - mandatory gaps block `planningReadiness: ready`.
   - important gaps are reported but do not always block planning.
   - optional gaps do not block planning.
8. Write the document when an output path is resolved, then re-read it and verify the required sections.
9. Return the output contract.

## Default section policy

### Mandatory

These sections define whether a PRD can be treated as complete enough for planning.

1. **Summary** — 1-3 paragraphs describing the feature or product change.
2. **Problem / Background** — current state, user pain, business context, or why this should exist.
3. **Goals** — concrete outcomes the feature must achieve.
4. **Non-goals** — explicit exclusions that protect scope.
5. **Scope / Requirements** — user-facing behavior, system behavior, UX surface, or functional requirements.
6. **Acceptance criteria** — observable checks for "done".
7. **Open questions / Review notes** — unresolved decisions, assumptions, and known gaps.

### Important

These sections should be populated when the feature has the relevant surface area.

1. **Source links** — mocks, designs, related PRDs, codebases, plans, tickets, research, or user/stakeholder evidence.
2. **Users and use cases** — personas, workflows, and job-to-be-done context.
3. **Data / interface plan** — interfaces, data shapes, events, data derivations, migrations, integrations, or analytics.
4. **Dependencies / prerequisites** — upstream plans, release controls, contracts, teams, or ordering constraints.
5. **Risks and mitigations** — known technical, product, rollout, or operational risks.
6. **Rollout / release controls** — gates, staged launch, fallback behavior, and stop conditions.
7. **Alternatives considered** — approaches rejected and why.
8. **Follow-ups** — useful work intentionally deferred from this PRD.

### Optional

Include only when the feature benefits from the detail.

1. **Experience surface breakdown** — workflow, surface, component, or interaction sections.
2. **Metrics / success measures** — adoption, conversion, cost, reliability, or quality signals.
3. **Technical derivations** — formulas, aggregation rules, query behavior, or synchronization strategy.
4. **Test strategy** — high-level verification notes before a plan breaks work into PRs.
5. **Team review history** — dated notes from synchronous review sessions.
6. **Appendix** — raw notes, glossary, research excerpts, or extended tables.

### Not Applicable

Mark sections not applicable when they do not fit the feature. Examples: no interface plan for copy-only changes, no rollout section for an internal document-only artifact, or no experience surface for a system-internal contract.

## Flexible PRD template

Use this template as a starting point. Remove optional sections that do not apply. Rename sections when the feature's domain has clearer language, but preserve the mandatory meaning.

```md
# <Feature or product name>

**Status:** Draft
**Sources:** <links, paths, or notes>
**Codebases / systems in scope:** <codebases, services, tools, or none>

## 1. Summary

<What is being built or changed, for whom, and why now.>

## 2. Problem / Background

<Current state, user pain, business context, prior decisions, and relevant constraints.>

## 3. Goals

1. <Outcome>
2. <Outcome>

## 4. Non-goals

| Out of scope | Why deferred / where it belongs |
| --- | --- |
| <Item> | <Reason> |

## 5. Scope / Requirements

### 5.1 <Requirement area>

- <Behavior, surface, rule, or workflow>
- <Important detail>

### 5.2 <Requirement area>

- <Behavior, surface, rule, or workflow>

## 6. Data / Interface / Technical Plan

| Area | Contract | Notes |
| --- | --- | --- |
| <Section> | <Interface, data shape, event, module, workflow, or none> | <Use, constraints, or derivation> |

## 7. Rollout / Release Controls

- <Gate, cohort, fallback, release note, or stop condition>

## 8. Dependencies / Prerequisites

- <Dependency and why it matters>

## 9. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| <Risk> | <Mitigation> |

## 10. Acceptance Criteria

- <Observable done condition>
- <Observable done condition>

## 11. Follow-ups

- <Deferred item>

## 12. Open Questions / Review Notes

- <Question, assumption, or decision>
```

## Completeness rules

- A PRD is **complete** when every mandatory section has enough specific content for a planner to create a Master Plan without inventing product intent.
- A PRD is **correct** when claims are source-grounded, open questions are explicit, and scope boundaries are not contradicted elsewhere in the document.
- Important sections may remain incomplete only when the gap is visible and the user accepts the PRD as planning-ready or partial.
- Optional sections should be omitted rather than padded with filler.
- `TBD` markers are allowed only when paired with either an explicit approver or a clear explanation of how implementation can proceed without that section.

## Output contract

Return:

- `status`: `success`, `partial`, `failure`, `aborted`, or `abandoned`
- `prdPath`
- `prdTitle`
- `sectionPolicy`
- `completedSections`
- `missingMandatorySections`
- `missingImportantSections`
- `openQuestions`
- `sourceLedger`
- `planningReadiness`: `ready`, `partial`, or `blocked`
- `recommendedNextAction`

## Safety constraints

- Do not invent source evidence.
- Do not treat optional sections as mandatory unless the caller or user explicitly marks them mandatory.
- Do not overwrite an existing PRD without preserving useful existing content.
- In `create` mode, do not write outside `.sedea/operations/<operationsUserId>/docs/`.
- In `manage` mode, update only the existing PRD target supplied by the caller or user.
