#!/usr/bin/env node
/**
 * Compare center.yaml skillEntries to on-disk mission skill SKILL.md files and lint
 * warmUpRules / laneRules frontmatter against per-skill manifest tables (spawn
 * preflight row 11 — README § Definitive laneRules for author-prd, master-planner,
 * coding-session).
 *
 * Also lints mission_control_spawn_agent spawn examples on master-planner skills (Software Development and Sedea
 * maintenance copies): when frontmatter declares inputs.parent.type: string, JSON
 * null for parent is forbidden — wire encoding must use "parent":"null".
 *
 * Lints plan-change notify governance (PR 4):
 * - Parent emit: master-planner, phase-planner, pr-breakdown — emit-when + N1–N8 preflight rows
 * - Child receive: coding-session, phase-planner, master-planner — receive checkpoint contract
 * - coding-session must not document notify caller paths
 * - skills/README.md — N1–N8 notify preflight + v1 child receive table
 *
 * Spawn byte budget: sums warmUpRules ∪ laneRules path bodies; excludes assigned skill
 * SKILL.md when listed (host skillPath inject — lane-manifest-contract § Spawn cap).
 * --enforce-spawn-byte-budget: strict cap for planning + coding-session spawn roles.
 *
 * Run from hosting repo root (directory containing `.sedea/centers/sedea/`) or from the
 * software-development center repo root (standalone clone / center-repo CI):
 *
 *   node .sedea/centers/software-development/missions/plan-and-deliver/scripts/verify-skill-manifest.mjs
 *
 * Exit 0 when lists match, warm-up manifest parity passes, and spawn wire lint passes; exit 1 otherwise.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import {
  mapWarmUpPath,
  resolveGovernanceContext,
  SD_CENTER_PREFIX,
} from './resolve-governance-root.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CENTER_ROOT = path.resolve(__dirname, '../../..');
const CENTER_YAML = path.join(CENTER_ROOT, 'center.yaml');
const MISSIONS_ROOT = path.join(CENTER_ROOT, 'missions');
const PLAN_AND_DELIVER_PREFIX = 'missions/plan-and-deliver/skills/';

/** Parent planner skills — must document notify emit + N1–N8 preflight. */
const NOTIFY_EMIT_SKILL_NAMES = ['master-planner', 'phase-planner', 'pr-breakdown'];

/** Child skills — must document plan-change notification receive checkpoint. */
const NOTIFY_RECEIVE_SKILL_NAMES = ['coding-session', 'phase-planner', 'master-planner'];

const NOTIFY_EMIT_WHEN_HEADING =
  '### Plan-change notify — emit-when (`mission_control_notify_child_lanes`)';
const NOTIFY_PREFLIGHT_HEADING =
  '### MCP notify preflight (`mission_control_notify_child_lanes`)';
const NOTIFY_RECEIVE_HEADING = '### Plan-change notification receive (child lane)';

const NOTIFY_PREFLIGHT_STEPS = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8'];

const NOTIFY_RECEIVE_OPTION_IDS = [
  'acknowledge-only',
  're-read-revise',
  'plan-reconcile',
  'escalate-parent',
  'stop-work',
  'more-details',
];

const SKILLS_README_REL =
  'missions/plan-and-deliver/skills/README.md';
const SKILLS_SPAWN_SHIP_REL =
  'missions/plan-and-deliver/docs/spawn-ship-contracts.md';
/** PRD C1 — slim README core warm-up target (bytes). */
const SKILLS_README_BYTE_CAP = 25 * 1024;
const DEV_PROCESS_REL = 'docs/development-process.md';
const PLANNING_MODE_TEMPLATES_REL = 'docs/planning-mode-templates.md';
/** PRD C2 — slim development-process core warm-up target (bytes). */
const DEV_PROCESS_BYTE_CAP = 60 * 1024;

const SKILL_WARMUP_HEADING = '### `skillWarmUp` — frontmatter `warmUpRules`';
const LANE_RULES_HEADING = '### `laneRules` — frontmatter `laneRules`';
/** Host spawn cap — `.sedea/centers/sedea/rules/4_mission.mdc` § Spawned execution */
const WARM_UP_BYTE_CAP = 384 * 1024;

/** Spawn skills — strict byte-budget enforce when `--enforce-spawn-byte-budget` (planning + ship roles). */
const SPAWN_BYTE_BUDGET_ENFORCE_SKILLS = new Set([
  'master-planner',
  'phase-planner',
  'pr-plan',
  'pr-breakdown',
  'delivery-phases',
  'new-plan',
  'author-prd',
  'ad-hoc-prd',
  'quick-fix-plan',
  'coding-session',
]);

/** Definitive laneRules rows from skills/README.md § Definitive laneRules (spawn preflight row 11). */
const DEFINITIVE_LANE_RULES_BY_SKILL = {
  'author-prd': [
    '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
    '.sedea/centers/software-development/missions/plan-and-deliver/skills/author-prd/SKILL.md',
    '.sedea/centers/software-development/missions/plan-and-deliver/plan.mdc',
  ],
  'brainstorm-research': [
    '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
    '.sedea/centers/software-development/missions/plan-and-deliver/skills/brainstorm-research/SKILL.md',
    '.sedea/centers/software-development/rules/31_dispatch-scope.mdc',
    '.sedea/centers/software-development/missions/plan-and-deliver/skills/README.md',
  ],
  'master-planner': [
    '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
    '.sedea/centers/software-development/rules/30_planning-target-resolution.mdc',
    '.sedea/centers/software-development/missions/plan-and-deliver/skills/master-planner/SKILL.md',
    '.sedea/centers/software-development/missions/plan-and-deliver/skills/README.md',
  ],
  'coding-session': [
    '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
    '.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc',
    '.sedea/centers/software-development/rules/20_efficient-pr-shipping.mdc',
    '.sedea/centers/software-development/missions/plan-and-deliver/skills/coding-session/SKILL.md',
  ],
};

/** @type {{ repoRelativePath: string, bytes: number }[]} */
const byteBudgetReports = [];
let enforceSpawnByteBudget = false;

function parseMainArgs(argv) {
  return { enforceSpawnByteBudget: argv.includes('--enforce-spawn-byte-budget') };
}

function die(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function normalizeRepoPath(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '');
}

function skillNameFromRel(repoRelativePath) {
  const m = repoRelativePath.match(/missions\/[^/]+\/skills\/([^/]+)\/SKILL\.md$/);
  return m ? m[1] : undefined;
}

async function listSkillFilesOnDisk() {
  const out = new Set();
  let missions;
  try {
    missions = await fs.readdir(MISSIONS_ROOT, { withFileTypes: true });
  } catch {
    die(`cannot read missions dir: ${MISSIONS_ROOT}`);
  }
  for (const m of missions) {
    if (!m.isDirectory()) continue;
    const skillsDir = path.join(MISSIONS_ROOT, m.name, 'skills');
    let entries;
    try {
      entries = await fs.readdir(skillsDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const skillPath = path.join(skillsDir, e.name, 'SKILL.md');
      try {
        const st = await fs.stat(skillPath);
        if (st.isFile()) {
          out.add(
            `missions/${m.name}/skills/${e.name}/SKILL.md`.replace(/\\/g, '/'),
          );
        }
      } catch {
        /* skip */
      }
    }
  }
  return out;
}

function parseSkillEntriesFromYaml(text) {
  const listed = new Set();
  const lines = text.split('\n');
  let inSkillEntries = false;
  for (const line of lines) {
    if (/^\s+skillEntries:\s*$/.test(line)) {
      inSkillEntries = true;
      continue;
    }
    if (inSkillEntries) {
      const m = line.match(/^\s+-\s+(missions\/[^\s#]+\/SKILL\.md)\s*$/);
      if (m) {
        listed.add(m[1]);
        continue;
      }
      if (/^\s+\w+:/.test(line) && !/^\s+-\s+/.test(line)) {
        inSkillEntries = false;
      }
    }
  }
  return listed;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** JSON null for parent in spawn wire — forbidden when inputs.parent.type is string. */
const JSON_NULL_PARENT_IN_SPAWN_RE = /"parent"\s*:\s*null(?=\s*[,}])/;

/** Repo-relative planner SKILL.md paths scanned for nullable-parent wire lint. */
const SEDEA_PLANNER_SKILL_GLOB = '.sedea/centers/sedea/missions';

function readStringArray(value, label, repoRelativePath) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    return { error: `${repoRelativePath}: frontmatter \`${label}\` must be a YAML array of path strings` };
  }
  const out = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) {
      return {
        error: `${repoRelativePath}: frontmatter \`${label}\` entries must be non-empty strings`,
      };
    }
    out.push(normalizeRepoPath(item));
  }
  return { paths: out };
}

function extractSection(body, heading) {
  const idx = body.indexOf(heading);
  if (idx === -1) return null;
  const rest = body.slice(idx + heading.length);
  const nextHeading = rest.search(/\n#{2,3} /);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

function parseManifestTablePaths(sectionText) {
  if (!sectionText) return [];
  const paths = [];
  for (const line of sectionText.split('\n')) {
    const m = line.match(/^\|\s*`?(\.(?:sedea|cursor)\/[^|`]+)`?\s*\|/);
    if (m) paths.push(normalizeRepoPath(m[1]));
  }
  return paths;
}

function samePathOrder(a, b) {
  if (a.length !== b.length) return false;
  return a.every((p, i) => p === b[i]);
}

function dedupeOrderedPaths(paths) {
  const seen = new Set();
  const out = [];
  for (const raw of paths) {
    const p = normalizeRepoPath(String(raw));
    if (!p || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

/** Repo-relative warm-up path for the assigned skill body (host injects via skillPath — lane-manifest-contract § Spawn cap). */
function assignedSkillBodyWarmUpPath(skillName) {
  if (!skillName) return undefined;
  return normalizeRepoPath(
    `${SD_CENTER_PREFIX}missions/plan-and-deliver/skills/${skillName}/SKILL.md`,
  );
}

/** Paths counted toward the 384 KiB spawn budget — excludes assigned skill body when listed in laneRules / warmUpRules. */
function pathsForSpawnByteBudget(skillName, mergedPaths) {
  const assigned = assignedSkillBodyWarmUpPath(skillName);
  if (!assigned) return mergedPaths;
  return mergedPaths.filter((p) => normalizeRepoPath(p) !== assigned);
}

async function combinedWarmUpBytes(ctx, paths) {
  let total = 0;
  for (const rel of dedupeOrderedPaths(paths)) {
    const abs = mapWarmUpPath(ctx, rel);
    if (!abs) continue;
    const st = await fs.stat(abs);
    total += st.size;
  }
  return total;
}

function diffSets(label, frontmatter, table, repoRelativePath) {
  const fmSet = new Set(frontmatter);
  const tableSet = new Set(table);
  const onlyFm = frontmatter.filter((p) => !tableSet.has(p));
  const onlyTable = table.filter((p) => !fmSet.has(p));
  if (!onlyFm.length && !onlyTable.length) return undefined;
  const lines = [`${repoRelativePath}: ${label} frontmatter/table mismatch`];
  if (onlyFm.length) {
    lines.push(`  frontmatter only: ${onlyFm.join(', ')}`);
  }
  if (onlyTable.length) {
    lines.push(`  manifest table only: ${onlyTable.join(', ')}`);
  }
  return lines.join('\n');
}

async function assertPathsExist(ctx, paths, repoRelativePath, label) {
  const missing = [];
  for (const rel of paths) {
    const abs = mapWarmUpPath(ctx, rel);
    if (!abs) continue;
    try {
      await fs.access(abs);
    } catch {
      missing.push(rel);
    }
  }
  if (!missing.length) return undefined;
  return `${repoRelativePath}: ${label} path(s) not found on disk:\n  ${missing.join('\n  ')}`;
}

function manifestKind(body) {
  if (body.includes('## Warm-up manifest (spawned)')) return 'spawned';
  if (body.includes('## Warm-up manifest (inline)')) return 'inline';
  return 'none';
}

async function validateWarmUpManifest(repoRelativePath, ctx) {
  if (!repoRelativePath.startsWith(PLAN_AND_DELIVER_PREFIX)) return [];

  const abs = path.join(CENTER_ROOT, repoRelativePath);
  const raw = await fs.readFile(abs, 'utf8');
  const fmMatch = FRONTMATTER_RE.exec(raw);
  if (!fmMatch) return [`${repoRelativePath}: missing YAML frontmatter (--- ... ---)`];

  let parsed;
  try {
    parsed = parseYaml(fmMatch[1]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return [`${repoRelativePath}: frontmatter YAML parse error — ${msg.split('\n')[0]}`];
  }

  const body = raw.slice(fmMatch[0].length);
  const kind = manifestKind(body);
  const skillName = skillNameFromRel(repoRelativePath);
  const errors = [];

  const warmUpResult = readStringArray(parsed?.warmUpRules, 'warmUpRules', repoRelativePath);
  if (warmUpResult.error) errors.push(warmUpResult.error);
  const laneRulesResult = readStringArray(parsed?.laneRules, 'laneRules', repoRelativePath);
  if (laneRulesResult.error) errors.push(laneRulesResult.error);
  if (errors.length) return errors;

  const warmUpFm = warmUpResult.paths ?? [];
  const laneRulesFm = laneRulesResult.paths ?? [];

  if (kind === 'inline' || kind === 'none') {
    if (warmUpFm.length) {
      errors.push(
        `${repoRelativePath}: inline-only skill must not declare frontmatter \`warmUpRules\``,
      );
    }
    if (laneRulesFm.length) {
      errors.push(
        `${repoRelativePath}: inline-only skill must not declare frontmatter \`laneRules\``,
      );
    }
    return errors;
  }

  if (kind === 'spawned') {
    if (!warmUpFm.length) {
      errors.push(`${repoRelativePath}: spawned skill missing frontmatter \`warmUpRules\``);
    }
    if (!laneRulesFm.length) {
      errors.push(`${repoRelativePath}: spawned skill missing frontmatter \`laneRules\``);
    }

    const warmUpTable = parseManifestTablePaths(
      extractSection(body, SKILL_WARMUP_HEADING),
    );
    const laneRulesTable = parseManifestTablePaths(
      extractSection(body, LANE_RULES_HEADING),
    );

    if (!warmUpTable.length) {
      errors.push(
        `${repoRelativePath}: missing manifest table under \`${SKILL_WARMUP_HEADING}\``,
      );
    } else {
      const diff = diffSets('warmUpRules', warmUpFm, warmUpTable, repoRelativePath);
      if (diff) errors.push(diff);
    }

    if (!laneRulesTable.length) {
      errors.push(
        `${repoRelativePath}: missing manifest table under \`${LANE_RULES_HEADING}\``,
      );
    } else {
      const diff = diffSets('laneRules', laneRulesFm, laneRulesTable, repoRelativePath);
      if (diff) errors.push(diff);
    }

    const definitive = skillName ? DEFINITIVE_LANE_RULES_BY_SKILL[skillName] : undefined;
    if (definitive) {
      const normalizedDef = definitive.map(normalizeRepoPath);
      if (!samePathOrder(laneRulesFm, normalizedDef)) {
        errors.push(
          `${repoRelativePath}: frontmatter \`laneRules\` must match README definitive row (same paths and order)\n` +
            `  expected: ${normalizedDef.join(', ')}\n` +
            `  actual:   ${laneRulesFm.join(', ')}`,
        );
      }
    }

    const pathErrWarmUp = await assertPathsExist(
      ctx,
      warmUpFm,
      repoRelativePath,
      'warmUpRules',
    );
    if (pathErrWarmUp) errors.push(pathErrWarmUp);
    const pathErrLane = await assertPathsExist(
      ctx,
      laneRulesFm,
      repoRelativePath,
      'laneRules',
    );
    if (pathErrLane) errors.push(pathErrLane);

    if (!errors.length) {
      const skillName = skillNameFromRel(repoRelativePath);
      const mergedPaths = dedupeOrderedPaths([...warmUpFm, ...laneRulesFm]);
      const budgetPaths = pathsForSpawnByteBudget(skillName, mergedPaths);
      const bytes = await combinedWarmUpBytes(ctx, budgetPaths);
      byteBudgetReports.push({ repoRelativePath, bytes });
      if (bytes > WARM_UP_BYTE_CAP) {
        const assignedExcluded =
          budgetPaths.length < mergedPaths.length
            ? ' (assigned skill body excluded per lane-manifest-contract § Spawn cap)'
            : '';
        process.stderr.write(
          `WARN: ${repoRelativePath}: spawn byte budget paths total ${bytes} bytes (host spawn cap ${WARM_UP_BYTE_CAP})${assignedExcluded} — trim frontmatter or use README cap exceptions before --enforce-spawn-byte-budget\n`,
        );
        if (
          enforceSpawnByteBudget &&
          SPAWN_BYTE_BUDGET_ENFORCE_SKILLS.has(skillName)
        ) {
          errors.push(
            `${repoRelativePath}: spawn byte budget paths total ${bytes} bytes (cap ${WARM_UP_BYTE_CAP})${assignedExcluded}`,
          );
        }
      }
    }
  }

  return errors;
}

async function validateSkillFrontmatter(repoRelativePath) {
  const abs = path.join(CENTER_ROOT, repoRelativePath);
  const raw = await fs.readFile(abs, 'utf8');
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) {
    return `${repoRelativePath}: missing YAML frontmatter (--- ... ---)`;
  }
  let parsed;
  try {
    parsed = parseYaml(m[1]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `${repoRelativePath}: frontmatter YAML parse error — ${msg.split('\n')[0]}`;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return `${repoRelativePath}: frontmatter must be a YAML map`;
  }
  if (parsed.inputs !== undefined && parsed.inputs !== null) {
    if (typeof parsed.inputs !== 'object' || Array.isArray(parsed.inputs)) {
      return `${repoRelativePath}: frontmatter \`inputs\` must be a map keyed by input name`;
    }
    for (const [inputName, value] of Object.entries(parsed.inputs)) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return `${repoRelativePath}: inputs.${inputName} must be a map (type/description/required) — check YAML indentation (2 spaces per input, 4 for fields)`;
      }
      if (typeof value.type !== 'string') {
        return `${repoRelativePath}: inputs.${inputName}.type must be a string`;
      }
    }
  }
  return undefined;
}

async function listSedeaPlannerSkillFiles(hostingRoot) {
  const out = [];
  const sedeaMissions = path.join(hostingRoot, SEDEA_PLANNER_SKILL_GLOB);
  let missions;
  try {
    missions = await fs.readdir(sedeaMissions, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const m of missions) {
    if (!m.isDirectory()) continue;
    const skillPath = path.join(
      sedeaMissions,
      m.name,
      'skills',
      'planner',
      'SKILL.md',
    );
    try {
      const st = await fs.stat(skillPath);
      if (st.isFile()) {
        out.push(
          normalizeRepoPath(
            path.relative(hostingRoot, skillPath).replace(/\\/g, '/'),
          ),
        );
      }
    } catch {
      /* skip */
    }
  }
  return out;
}

function extractSpawnExampleLines(body) {
  const lines = [];
  for (const line of body.split('\n')) {
    if (line.includes('mission_control_spawn_agent') && line.includes('"inputs"')) {
      lines.push(line.trim());
    }
  }
  return lines;
}

function skillRelPath(skillName) {
  return `${PLAN_AND_DELIVER_PREFIX}${skillName}/SKILL.md`;
}

function assertContains(body, needle, repoRelativePath, label) {
  if (body.includes(needle)) return undefined;
  return `${repoRelativePath}: missing ${label} — expected substring: ${needle}`;
}

function assertNotifyPreflightRows(body, repoRelativePath) {
  const section = extractSection(body, NOTIFY_PREFLIGHT_HEADING);
  if (!section) {
    return `${repoRelativePath}: missing section \`${NOTIFY_PREFLIGHT_HEADING}\``;
  }
  const missing = NOTIFY_PREFLIGHT_STEPS.filter((step) => !section.includes(`| ${step} |`));
  if (missing.length) {
    return `${repoRelativePath}: MCP notify preflight missing row(s): ${missing.join(', ')}`;
  }
  return undefined;
}

function assertReceiveOptionOrder(body, repoRelativePath) {
  const section = extractSection(body, NOTIFY_RECEIVE_HEADING);
  if (!section) return undefined;
  const positions = NOTIFY_RECEIVE_OPTION_IDS.map((id) => {
    const idx = section.indexOf(`| \`${id}\` |`);
    return idx === -1 ? -1 : idx;
  });
  const missing = NOTIFY_RECEIVE_OPTION_IDS.filter((_, i) => positions[i] === -1);
  if (missing.length) {
    return `${repoRelativePath}: notify receive missing option id(s): ${missing.join(', ')}`;
  }
  for (let i = 1; i < positions.length; i += 1) {
    if (positions[i] <= positions[i - 1]) {
      return `${repoRelativePath}: notify receive option ids out of order — expected ${NOTIFY_RECEIVE_OPTION_IDS.join(' → ')}`;
    }
  }
  return undefined;
}

async function validateNotifyEmitSkill(skillName) {
  const rel = skillRelPath(skillName);
  const abs = path.join(CENTER_ROOT, rel);
  const raw = await fs.readFile(abs, 'utf8');
  const errors = [];

  const checks = [
    assertContains(raw, NOTIFY_EMIT_WHEN_HEADING, rel, 'Plan-change notify emit-when heading'),
    assertContains(raw, NOTIFY_PREFLIGHT_HEADING, rel, 'MCP notify preflight heading'),
    assertContains(
      raw,
      '**`mission_control_notify_child_lanes`**',
      rel,
      'Agent messaging notify tool row',
    ),
    assertContains(
      raw,
      'spawn-ship-contracts.md',
      rel,
      'spawn-ship-contracts notify preflight cross-ref',
    ),
    assertContains(
      raw,
      '§ *MCP notify protocol*',
      rel,
      '4_mission.mdc notify protocol cross-ref',
    ),
    assertContains(raw, 'notifyAllDescendants', rel, 'forbidden notifyAllDescendants mention'),
  ];
  for (const err of checks) {
    if (err) errors.push(err);
  }

  const preflightErr = assertNotifyPreflightRows(raw, rel);
  if (preflightErr) errors.push(preflightErr);

  return errors;
}

async function validateNotifyReceiveSkill(skillName) {
  const rel = skillRelPath(skillName);
  const abs = path.join(CENTER_ROOT, rel);
  const raw = await fs.readFile(abs, 'utf8');
  const errors = [];

  const checks = [
    assertContains(raw, NOTIFY_RECEIVE_HEADING, rel, 'Plan-change notification receive heading'),
    assertContains(
      raw,
      'Mission Control: plan-change-notification delivered.',
      rel,
      'notify delivery preamble line',
    ),
    assertContains(raw, '**`affectedPlanPaths`**', rel, 'affectedPlanPaths envelope field'),
    assertContains(raw, '**`Read`**', rel, 'mandatory Read of affected plans'),
    assertContains(raw, 'USER_CHECKPOINT', rel, 'USER_CHECKPOINT gate marker'),
    assertContains(
      raw,
      'developer-input USER_CHECKPOINT',
      rel,
      'developer-input vs external-wait binding',
    ),
    assertContains(
      raw,
      '**`mission_control_send_agent_result`** solely',
      rel,
      'forbid terminal result solely from notify',
    ),
    assertContains(
      raw,
      '§ *MCP notify protocol*',
      rel,
      '4_mission.mdc notify protocol cross-ref',
    ),
    assertContains(
      raw,
      '§ *Child delivery checkpoint (receive)*',
      rel,
      'README child receive cross-ref',
    ),
  ];
  for (const err of checks) {
    if (err) errors.push(err);
  }

  const orderErr = assertReceiveOptionOrder(raw, rel);
  if (orderErr) errors.push(orderErr);

  return errors;
}

async function validateCodingSessionNotifyCallerForbidden() {
  const rel = skillRelPath('coding-session');
  const abs = path.join(CENTER_ROOT, rel);
  const raw = await fs.readFile(abs, 'utf8');
  const errors = [];

  if (raw.includes(NOTIFY_EMIT_WHEN_HEADING)) {
    errors.push(`${rel}: coding-session must not document notify emit-when (receive-only lane)`);
  }
  if (raw.includes(NOTIFY_PREFLIGHT_HEADING)) {
    errors.push(`${rel}: coding-session must not document MCP notify preflight (receive-only lane)`);
  }
  if (!raw.includes('**forbidden** **`mission_control_notify_child_lanes`**')) {
    errors.push(
      `${rel}: coding-session must forbid mission_control_notify_child_lanes as notify caller`,
    );
  }

  return errors;
}

async function validateSkillsReadmeSlimSplit() {
  const errors = [];
  const readmeAbs = path.join(CENTER_ROOT, SKILLS_README_REL);
  const spawnAbs = path.join(CENTER_ROOT, SKILLS_SPAWN_SHIP_REL);
  const readmeRaw = await fs.readFile(readmeAbs, 'utf8');
  const readmeBytes = Buffer.byteLength(readmeRaw, 'utf8');
  if (readmeBytes > SKILLS_README_BYTE_CAP) {
    errors.push(
      `${SKILLS_README_REL}: ${readmeBytes} bytes exceeds slim core cap ${SKILLS_README_BYTE_CAP} (25 KiB)`,
    );
  }
  try {
    await fs.access(spawnAbs);
  } catch {
    errors.push(`${SKILLS_SPAWN_SHIP_REL}: missing on-demand spawn/ship contracts doc`);
  }
  return errors;
}

async function validateDevelopmentProcessSlimSplit() {
  const errors = [];
  const devProcAbs = path.join(CENTER_ROOT, DEV_PROCESS_REL);
  const templatesAbs = path.join(CENTER_ROOT, PLANNING_MODE_TEMPLATES_REL);
  const devProcRaw = await fs.readFile(devProcAbs, 'utf8');
  const devProcBytes = Buffer.byteLength(devProcRaw, 'utf8');
  if (devProcBytes > DEV_PROCESS_BYTE_CAP) {
    errors.push(
      `${DEV_PROCESS_REL}: ${devProcBytes} bytes exceeds slim core cap ${DEV_PROCESS_BYTE_CAP} (60 KiB)`,
    );
  }
  if (!devProcRaw.includes('planning-mode-templates.md')) {
    errors.push(
      `${DEV_PROCESS_REL}: missing on-demand pointer to ${PLANNING_MODE_TEMPLATES_REL}`,
    );
  }
  try {
    await fs.access(templatesAbs);
  } catch {
    errors.push(`${PLANNING_MODE_TEMPLATES_REL}: missing on-demand planning mode templates doc`);
  }
  return errors;
}

async function validateNotifyReadmeCoverage() {
  const rel = SKILLS_README_REL;
  const spawnRel = SKILLS_SPAWN_SHIP_REL;
  const abs = path.join(CENTER_ROOT, rel);
  const spawnAbs = path.join(CENTER_ROOT, spawnRel);
  const raw = await fs.readFile(abs, 'utf8');
  let spawnRaw = '';
  try {
    spawnRaw = await fs.readFile(spawnAbs, 'utf8');
  } catch {
    return [`${spawnRel}: missing — required for notify governance after README slim split`];
  }
  const corpus = `${raw}\n${spawnRaw}`;
  const errors = [];

  const notifySection = extractSection(corpus, '### MCP notify preflight (`mission_control_notify_child_lanes`)');
  if (!notifySection) {
    errors.push(`${rel} + ${spawnRel}: missing § MCP notify preflight (N1–N8)`);
  } else {
    const missing = NOTIFY_PREFLIGHT_STEPS.filter((step) => !notifySection.includes(`| ${step} |`));
    if (missing.length) {
      errors.push(`${spawnRel}: MCP notify preflight missing row(s): ${missing.join(', ')}`);
    }
  }

  const receiveAnchor = '**Child delivery checkpoint (receive) — binding:**';
  const receiveStart = corpus.indexOf(receiveAnchor);
  if (receiveStart === -1) {
    errors.push(`${rel} + ${spawnRel}: missing § Child delivery checkpoint (receive)`);
  } else {
    const receiveEnd = corpus.indexOf('### Lane title prefix', receiveStart);
    const receiveSection =
      receiveEnd === -1 ? corpus.slice(receiveStart) : corpus.slice(receiveStart, receiveEnd);
    for (const skillName of NOTIFY_RECEIVE_SKILL_NAMES) {
      const tableRowNeedle = '| **`' + skillName;
      if (!receiveSection.includes(tableRowNeedle)) {
        errors.push(`${spawnRel}: child receive table missing skill \`${skillName}\``);
      }
    }
  }

  if (!corpus.includes('sedea.features.plan-change-notification')) {
    errors.push(`${spawnRel}: missing plan-change-notification feature flag reference`);
  }

  for (const skillName of NOTIFY_EMIT_SKILL_NAMES) {
    const rel = skillRelPath(skillName);
    const abs = path.join(CENTER_ROOT, rel);
    const raw = await fs.readFile(abs, 'utf8');
    if (!raw.includes('Planner-lane wake') && !raw.includes('Leaf-lane omission') && !raw.includes('terminal planner')) {
      errors.push(
        `${rel}: emit skill should reference planner-lane wake or terminal planner notify (rule 4 cross-ref)`,
      );
    }
  }

  return errors;
}

async function validateNotifyGovernance() {
  const errors = [];
  for (const skillName of NOTIFY_EMIT_SKILL_NAMES) {
    errors.push(...(await validateNotifyEmitSkill(skillName)));
  }
  for (const skillName of NOTIFY_RECEIVE_SKILL_NAMES) {
    errors.push(...(await validateNotifyReceiveSkill(skillName)));
  }
  errors.push(...(await validateCodingSessionNotifyCallerForbidden()));
  errors.push(...(await validateSkillsReadmeSlimSplit()));
  errors.push(...(await validateDevelopmentProcessSlimSplit()));
  errors.push(...(await validateNotifyReadmeCoverage()));
  return errors;
}

async function validateNullableParentSpawnWire(hostingRoot, repoRelativePaths) {
  const errors = [];
  const seen = new Set();
  for (const rel of repoRelativePaths) {
    if (seen.has(rel)) continue;
    seen.add(rel);
    const abs = path.join(hostingRoot, rel);
    let raw;
    try {
      raw = await fs.readFile(abs, 'utf8');
    } catch {
      continue;
    }
    const fmMatch = FRONTMATTER_RE.exec(raw);
    if (!fmMatch) continue;
    let parsed;
    try {
      parsed = parseYaml(fmMatch[1]);
    } catch {
      continue;
    }
    const parentInput = parsed?.inputs?.parent;
    if (typeof parentInput !== 'object' || parentInput?.type !== 'string') {
      continue;
    }
    const body = raw.slice(fmMatch[0].length);
    const spawnLines = extractSpawnExampleLines(body);
    for (const line of spawnLines) {
      if (JSON_NULL_PARENT_IN_SPAWN_RE.test(line)) {
        errors.push(
          `${rel}: mission_control_spawn_agent spawn example uses JSON null for \`parent\` — ` +
            `inputs.parent is type string; wire encoding must be \`"parent":"null"\` (see master-planner spawn contract)`,
        );
      }
    }
  }
  return errors;
}

async function main() {
  ({ enforceSpawnByteBudget } = parseMainArgs(process.argv));
  const ctx = await resolveGovernanceContext({ scriptDir: __dirname });
  const yamlText = await fs.readFile(CENTER_YAML, 'utf8');
  const listed = parseSkillEntriesFromYaml(yamlText);
  const disk = await listSkillFilesOnDisk();

  const frontmatterErrors = [];
  const warmUpErrors = [];
  for (const rel of disk) {
    const err = await validateSkillFrontmatter(rel);
    if (err) frontmatterErrors.push(err);
    const warmErrs = await validateWarmUpManifest(rel, ctx);
    warmUpErrors.push(...warmErrs);
  }

  if (frontmatterErrors.length) {
    process.stderr.write('SKILL.md frontmatter validation failed:\n');
    for (const e of frontmatterErrors) process.stderr.write(`  ${e}\n`);
    process.exit(1);
  }

  if (warmUpErrors.length) {
    process.stderr.write('warmUpRules/laneRules manifest parity failed:\n');
    for (const e of warmUpErrors) process.stderr.write(`  ${e}\n`);
    process.exit(1);
  }

  const sedeaPlannerSkills = ctx.hostingRoot
    ? await listSedeaPlannerSkillFiles(ctx.hostingRoot)
    : [];
  const rdPlannerSkills = [...disk].filter((rel) =>
    /\/skills\/master-planner\/SKILL\.md$/.test(rel),
  );
  const spawnWirePaths = [...rdPlannerSkills, ...sedeaPlannerSkills];
  const spawnWireErrors = ctx.hostingRoot
    ? await validateNullableParentSpawnWire(ctx.hostingRoot, spawnWirePaths)
    : await validateNullableParentSpawnWire(ctx.centerRoot, rdPlannerSkills);
  if (spawnWireErrors.length) {
    process.stderr.write('nullable-parent spawn wire lint failed:\n');
    for (const e of spawnWireErrors) process.stderr.write(`  ${e}\n`);
    process.exit(1);
  }

  const notifyErrors = await validateNotifyGovernance();
  if (notifyErrors.length) {
    process.stderr.write('plan-change notify governance lint failed:\n');
    for (const e of notifyErrors) process.stderr.write(`  ${e}\n`);
    process.exit(1);
  }

  const onlyYaml = [...listed].filter((p) => !disk.has(p)).sort();
  const onlyDisk = [...disk].filter((p) => !listed.has(p)).sort();

  if (onlyYaml.length === 0 && onlyDisk.length === 0) {
    const overCap = byteBudgetReports.filter((r) => r.bytes > WARM_UP_BYTE_CAP);
    process.stdout.write(
      `OK: center.yaml skillEntries (${listed.size}) matches disk (${disk.size}); ` +
        `frontmatter valid; warmUp/laneRules manifest parity passed on plan-and-deliver spawned skills; ` +
        `nullable-parent spawn wire lint passed on ${spawnWirePaths.length} master-planner skill path(s); ` +
        `notify emit/receive governance lint passed (${NOTIFY_EMIT_SKILL_NAMES.length} emit + ${NOTIFY_RECEIVE_SKILL_NAMES.length} receive skills); ` +
        `spawn byte budget smoke: ${overCap.length} skill(s) over ${WARM_UP_BYTE_CAP} bytes` +
        (enforceSpawnByteBudget ? ' (--enforce-spawn-byte-budget)' : '') +
        (ctx.mode === 'center' ? '; center-repo-only mode (sedea warm-up paths skipped)' : '') +
        `\n`,
    );
    process.exit(0);
  }

  process.stderr.write('skill manifest mismatch\n');
  if (onlyYaml.length) {
    process.stderr.write('\nIn center.yaml only (missing on disk or wrong path):\n');
    for (const p of onlyYaml) process.stderr.write(`  ${p}\n`);
  }
  if (onlyDisk.length) {
    process.stderr.write('\nOn disk only (add to center.yaml skillEntries):\n');
    for (const p of onlyDisk) process.stderr.write(`  ${p}\n`);
  }
  process.exit(1);
}

main().catch((err) => die(String(err)));
