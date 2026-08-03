# Software Development — Sedea Governance Center

This repository is a **Sedea Governance Center** for **Sedea-governed hosting repos**. It defines how agents and developers plan, implement, ship, and verify software under **Sedea Governance** — the rules, missions, and skills pinned from `.sedea/centers/software-development/` in hosting workspaces.

## Purpose

Govern end-to-end delivery from idea to production using a **depth-first iterative** approach: ship the **first PR** of an initiative before locking detail for later phases and PRs. Mission protocols, center rules, and skills live under `missions/`, `rules/`, and `docs/` — this README is orientation only.

## GitHub repository

| Remote | URL |
|--------|-----|
| **Upstream (sedea-centers org)** | `git@github.com:sedea-centers/software-development.git` |
| **HTTPS** | `https://github.com/sedea-centers/software-development` |

Wave 2 retargets the GitHub repo name to **`software-development`** while **`centerSlug`** and hosting checkout paths remain **`software-development`** until Wave 3 (see center rename PRD on the active dispatch).

## Missions

| Command | Summary |
|---------|---------|
| **`plan and deliver`** | Full PRD → plan tree → implementation and ship chain for multi-PR initiatives. |
| **`quick fix`** | Small, single-PR fixes with minimal planning overhead. |
| **`plan and deliver a single phase`** | Simplified Master Plan for bounded single-phase work (1–6 PRs, complexity ≤ 20). |
| **`debug and fix`** | Log-first diagnosis and targeted fixes; optional promotion into broader delivery. |

## License

MIT — see [LICENSE](LICENSE).

## Further reading

- [`docs/development-process.md`](docs/development-process.md) — protocol catalogue and ship-chain glossary
- [`center.yaml`](center.yaml) — center manifest and mission index
