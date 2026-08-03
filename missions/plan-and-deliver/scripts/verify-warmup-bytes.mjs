#!/usr/bin/env node
/**
 * Print per-role spawn warm-up byte totals for plan-and-deliver skills (PRD D1).
 *
 * Scope: roles under `missions/plan-and-deliver/skills/` only (planning + ship
 * categories in SPAWN_ROLE_CATEGORY). Optional spawn roles outside that tree
 * (for example `quick-fix-plan` under `missions/quick-fix/skills/`) are not
 * included in this table — attest separately when those roles change.
 *
 * Run from hosting repo root or software-development center repo root:
 *
 *   node missions/plan-and-deliver/scripts/verify-warmup-bytes.mjs --table
 *   node .../verify-warmup-bytes.mjs --table --hosting-root /path/to/hosting
 *   node .../verify-warmup-bytes.mjs --table --bootstrap slim
 *
 * Exit 0 after printing the table (informational — WARN rows do not fail unless
 * --enforce-spawn-byte-budget is passed).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { resolveGovernanceContext } from './resolve-governance-root.mjs';
import {
  FRONTMATTER_RE,
  SPAWN_ROLE_CATEGORY,
  WARM_UP_BYTE_CAP,
  SKILL_PROSE_BYTE_CAP,
  assignedSkillBodyWarmUpPath,
  combinedWarmUpBytes,
  dedupeOrderedPaths,
  formatBytes,
  normalizeRepoPath,
  pathsForSpawnByteBudget,
  readSkillFrontmatterPaths,
  statusForBytes,
} from './warmup-byte-budget.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CENTER_ROOT = path.resolve(__dirname, '../../..');
const SEDEA_RULES_DIR = '.sedea/centers/sedea/rules';
const FUTURE_BOOTSTRAP_RULE = '.sedea/centers/sedea/rules/bootstrap.mdc';
const SD_BOOTSTRAP_RULE = '.sedea/centers/software-development/rules/bootstrap.mdc';

const PLAN_AND_DELIVER_PREFIX = 'missions/plan-and-deliver/skills/';

function die(msg, code = 1) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  let table = false;
  let bootstrap = 'full';
  let hostingRoot = undefined;
  let enforceSpawnByteBudget = false;
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--table') {
      table = true;
      continue;
    }
    if (arg === '--enforce-spawn-byte-budget') {
      enforceSpawnByteBudget = true;
      continue;
    }
    if (arg === '--bootstrap') {
      bootstrap = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (arg === '--hosting-root') {
      hostingRoot = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(
        'Usage: verify-warmup-bytes.mjs [--table] [--bootstrap full|slim] [--hosting-root PATH] [--enforce-spawn-byte-budget]\n',
      );
      process.exit(0);
    }
    die(`unknown argument: ${arg}`);
  }
  if (bootstrap !== 'full' && bootstrap !== 'slim') {
    die(`--bootstrap must be "full" or "slim" (got "${bootstrap}")`);
  }
  return { table, bootstrap, hostingRoot, enforceSpawnByteBudget };
}

async function resolveHostingRoot(explicit, ctx) {
  if (explicit) {
    const abs = path.resolve(explicit);
    try {
      await fs.access(path.join(abs, '.sedea/centers/sedea'));
      return abs;
    } catch {
      die(`--hosting-root is not a Sedea hosting repo: ${abs}`);
    }
  }
  if (ctx.hostingRoot) return ctx.hostingRoot;
  return null;
}

async function scanSedeaAlwaysApply(hostingRoot) {
  const rulesDir = path.join(hostingRoot, SEDEA_RULES_DIR);
  const entries = await fs.readdir(rulesDir);
  const out = [];
  for (const name of entries.sort()) {
    if (!name.endsWith('.mdc')) continue;
    const abs = path.join(rulesDir, name);
    const raw = await fs.readFile(abs, 'utf8');
    const m = FRONTMATTER_RE.exec(raw);
    if (!m) continue;
    let parsed;
    try {
      parsed = parseYaml(m[1]);
    } catch {
      continue;
    }
    if (parsed?.alwaysApply === true) {
      out.push(normalizeRepoPath(`${SEDEA_RULES_DIR}/${name}`));
    }
  }
  return out;
}

async function listSpawnSkillRelPaths() {
  const skillsDir = path.join(CENTER_ROOT, 'missions/plan-and-deliver/skills');
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const skillName = e.name;
    if (!SPAWN_ROLE_CATEGORY[skillName]) continue;
    const rel = `${PLAN_AND_DELIVER_PREFIX}${skillName}/SKILL.md`;
    try {
      await fs.access(path.join(CENTER_ROOT, rel));
      out.push({ skillName, rel });
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => a.skillName.localeCompare(b.skillName));
}

async function bootstrapPaths(hostingRoot, bootstrap) {
  if (!hostingRoot) return [];
  if (bootstrap === 'slim') {
    return dedupeOrderedPaths([FUTURE_BOOTSTRAP_RULE, SD_BOOTSTRAP_RULE]);
  }
  return scanSedeaAlwaysApply(hostingRoot);
}

function printTable(rows, ctx, bootstrap, hostingRoot) {
  process.stdout.write('\n');
  process.stdout.write('| Role | Category | Spawn warm-up (bytes) | Cap | Status |\n');
  process.stdout.write('|------|----------|----------------------:|----:|--------|\n');
  for (const row of rows) {
    process.stdout.write(
      `| ${row.skillName} | ${row.category} | ${formatBytes(row.bytes)} | ${formatBytes(WARM_UP_BYTE_CAP)} | ${row.status} |\n`,
    );
  }
  process.stdout.write('\n');
  const modeNote =
    ctx.mode === 'center' && !hostingRoot
      ? 'center-repo-only mode — sedea bootstrap paths omitted; pass --hosting-root for full totals'
      : `bootstrap=${bootstrap}${hostingRoot ? '' : ' (no hosting root — sedea paths omitted)'}`;
  process.stdout.write(`Note: ${modeNote}. Assigned skill body excluded per lane-manifest-contract § Spawn cap.\n`);
}

async function main() {
  const { table, bootstrap, hostingRoot: hostingRootArg, enforceSpawnByteBudget } =
    parseArgs(process.argv);
  const ctx = await resolveGovernanceContext({ scriptDir: __dirname });
  const hostingRoot = await resolveHostingRoot(hostingRootArg, ctx);
  const bootstrapList = await bootstrapPaths(hostingRoot, bootstrap);
  const skills = await listSpawnSkillRelPaths();

  const rows = [];
  let warnCount = 0;
  let proseWarnCount = 0;
  const proseWarns = [];

  for (const { skillName, rel } of skills) {
    const { warmUpRules, laneRules, skillBodyBytes } = await readSkillFrontmatterPaths(
      rel,
      CENTER_ROOT,
    );
    const merged = dedupeOrderedPaths([...bootstrapList, ...laneRules, ...warmUpRules]);
    const budgetPaths = pathsForSpawnByteBudget(skillName, merged);
    const { bytes, skippedPaths } = await combinedWarmUpBytes(ctx, budgetPaths);
    const status = statusForBytes(bytes);
    if (status === 'WARN') warnCount += 1;
    rows.push({
      skillName,
      category: SPAWN_ROLE_CATEGORY[skillName] ?? 'other',
      bytes,
      skippedPaths,
      status,
    });

    if (skillBodyBytes > SKILL_PROSE_BYTE_CAP) {
      proseWarnCount += 1;
      proseWarns.push({ skillName, skillBodyBytes });
      process.stderr.write(
        `WARN: ${rel}: skill body is ${skillBodyBytes} bytes (>${SKILL_PROSE_BYTE_CAP}) — justify on-demand split in PR per rule 45_skill-authoring-hygiene.mdc\n`,
      );
    }
  }

  if (table) {
    printTable(rows, ctx, bootstrap, hostingRoot);
  }

  const planning = rows.filter((r) => r.category === 'planning');
  const ship = rows.filter((r) => r.category === 'ship');
  process.stdout.write(
    `OK: spawn warm-up byte table — ${rows.length} role(s) ` +
      `(planning ${planning.length}, ship ${ship.length}); ` +
      `${warnCount} over ${WARM_UP_BYTE_CAP} bytes` +
      (enforceSpawnByteBudget ? ' (--enforce-spawn-byte-budget)' : '') +
      `; skill prose WARN ${proseWarnCount}\n`,
  );

  if (enforceSpawnByteBudget && warnCount > 0) {
    die(`${warnCount} role(s) exceed spawn cap ${WARM_UP_BYTE_CAP}`, 1);
  }
}

main().catch((err) => die(String(err)));
