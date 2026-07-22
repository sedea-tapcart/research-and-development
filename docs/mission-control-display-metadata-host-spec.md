# Mission Control display metadata — host spec pointer (R&D)

This document is a **read-only pointer** for R&D agents and plan authors. The **host implementation** lives in the **active hosting repo** Mission Control host integration (not in the **research-and-development** center git repo). Do not treat this file as the normative authority table — use [`.sedea/centers/sedea/rules/9_display-metadata-authority.mdc`](.sedea/centers/sedea/rules/9_display-metadata-authority.mdc).

Phase **1** (host persistence + MCP tools) must be merged before agents rely on governed updates. Phase **2** PR **1** added rule **9**; this doc supports PR **2** (R&D rules + development-process cross-links).

---

## Additive bundle fields (dispatch tab)

Mission Control persists display metadata in **`dispatch-tab.v1.json`** under each dispatch bundle (see [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Directory namespaces under `operations/`*).

| Scope | Fields (additive) | Written by |
|-------|-------------------|------------|
| **Dispatch chrome** | `dispatchTitle`, `dispatchDescription`, `dispatchHoverDescription` | **`mission_control_update_dispatch_display`** (Squad Leader only) |
| **Per-slot row** (`agentSlots[]`) | `title`, `description`, `hoverDescription` (plus existing `slug`, `role`, …) | **`mission_control_update_lane_display`** (caller slot only) |

**Read path:** Host merges bundle snapshot with lane memento. Resolve merge modules from the **active hosting repo** host overlay (for example **`.cursor/rules/dot-sedea.mdc`**) — do not hard-code repository layout paths in this center doc.

**Max lengths** (host validation): title / `dispatchTitle` **64** characters; description, hover, and dispatch long-form fields **512** characters — limits are enforced in the hosting repo host package; see that repo's overlay for source module names.

---

## Governed MCP tools (names only)

| Tool | Caller | Patches |
|------|--------|---------|
| `mission_control_update_lane_display` | Agent on a lane | Own slot `title`, `description`, `hoverDescription` |
| `mission_control_update_dispatch_display` | Squad Leader | `dispatchTitle`, `dispatchDescription`, `dispatchHoverDescription` |
| `mission_control_update_relevant_documents` | Agent on a lane | Append authored/materially edited paths to calling slot `relevantDocuments` |

**Documents vs chrome:** Relevant Links registration is **not** display-metadata chrome — see [rule **50**](../rules/50_mission-control-display-metadata-discipline.mdc) § *Relevant Links (documents)* and [plan-and-deliver skills README](../missions/plan-and-deliver/skills/README.md) § *Relevant Links — post-write registration*.

Audit: successful display updates append **`display-metadata-updated`** events to **`dispatch-events.v1.ndjson`**. Agents must not edit bundle JSON directly.

---

## Stale tab title recovery

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Child tab shows generic spawn label after work started | Spawn `name` / initial copy was vague | **Child lane** calls **`mission_control_update_lane_display`** with accurate title/hover |
| Dispatch tab title does not match mission scope | Leader never updated dispatch chrome | **Squad Leader** calls **`mission_control_update_dispatch_display`** |
| User renamed in chat but UI unchanged | Chat is not the system of record | Owning lane runs the correct MCP tool per rule **9** |
| Reload restored old bundle snapshot | Expected — bundle is authoritative | Re-run MCP refresh on the **owning** lane after reload if labels are still wrong |

**Forbidden:** Leader relabeling a child slot via dispatch MCP; child calling dispatch MCP; hand-editing **`dispatch-tab.v1.json`**.

---

## Related hosting-repo references (implementation)

Mission Control host source, limits, and integration tests live in the **active hosting repo**, not in this center submodule. **Do not** embed product-specific directory paths here — resolve implementation file paths from **`.cursor/rules/dot-sedea.mdc`** (or equivalent host overlay) on the repo that ships Mission Control.

R&D center agents **reference** host overlay docs in plans; **implement** host changes in the hosting repo, not in this center submodule.

---

## Related R&D governance

- R&D discipline rule: [`.sedea/centers/research-and-development/rules/50_mission-control-display-metadata-discipline.mdc`](../rules/50_mission-control-display-metadata-discipline.mdc)
- Platform authority: [`.sedea/centers/sedea/rules/9_display-metadata-authority.mdc`](.sedea/centers/sedea/rules/9_display-metadata-authority.mdc)
- Agent UX pitfalls: [`.sedea/centers/research-and-development/docs/development-process.md`](development-process.md) § *Agent UX pitfalls*
