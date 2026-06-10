#!/usr/bin/env node
/**
 * Compare center.yaml skillEntries to on-disk mission skill SKILL.md files and lint
 * warmUpRules / laneRules frontmatter against per-skill manifest tables (spawn
 * preflight row 11 — README § Definitive laneRules for author-prd, planner,
 * coding-session).
 *
 * Run from hosting repo root (directory containing .sedea/):
 *
 *   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-skill-manifest.mjs
 *
 * Exit 0 when lists match and warm-up manifest parity passes; exit 1 otherwise.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CENTER_ROOT = path.resolve(__dirname, '../../..');
const CENTER_YAML = path.join(CENTER_ROOT, 'center.yaml');
const MISSIONS_ROOT = path.join(CENTER_ROOT, 'missions');
const PLAN_AND_DELIVER_PREFIX = 'missions/plan-and-deliver/skills/';

const SKILL_WARMUP_HEADING = '### `skillWarmUp` — frontmatter `warmUpRules`';
const LANE_RULES_HEADING = '### `laneRules` — frontmatter `laneRules`';

/** Definitive laneRules rows from skills/README.md § Definitive laneRules (spawn preflight row 11). */
const DEFINITIVE_LANE_RULES_BY_SKILL = {
  'author-prd': [
    '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
    '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/author-prd/SKILL.md',
    '.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc',
    '.sedea/centers/research-and-development/rules/31_operations-user-id.mdc',
  ],
  planner: [
    '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
    '.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc',
    '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/planner/SKILL.md',
    '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md',
  ],
  'coding-session': [
    '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
    '.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc',
    '.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc',
    '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/coding-session/SKILL.md',
  ],
};

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

async function resolveHostingRoot() {
  let dir = process.cwd();
  for (let depth = 0; depth < 32; depth += 1) {
    try {
      await fs.access(path.join(dir, '.sedea/centers/sedea'));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  die('could not resolve hosting repo root — run from HOSTING_ROOT');
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

async function assertPathsExist(hostingRoot, paths, repoRelativePath, label) {
  const missing = [];
  for (const rel of paths) {
    try {
      await fs.access(path.join(hostingRoot, rel));
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

async function validateWarmUpManifest(repoRelativePath, hostingRoot) {
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
      hostingRoot,
      warmUpFm,
      repoRelativePath,
      'warmUpRules',
    );
    if (pathErrWarmUp) errors.push(pathErrWarmUp);
    const pathErrLane = await assertPathsExist(
      hostingRoot,
      laneRulesFm,
      repoRelativePath,
      'laneRules',
    );
    if (pathErrLane) errors.push(pathErrLane);
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

async function main() {
  const hostingRoot = await resolveHostingRoot();
  const yamlText = await fs.readFile(CENTER_YAML, 'utf8');
  const listed = parseSkillEntriesFromYaml(yamlText);
  const disk = await listSkillFilesOnDisk();

  const frontmatterErrors = [];
  const warmUpErrors = [];
  for (const rel of disk) {
    const err = await validateSkillFrontmatter(rel);
    if (err) frontmatterErrors.push(err);
    const warmErrs = await validateWarmUpManifest(rel, hostingRoot);
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

  const onlyYaml = [...listed].filter((p) => !disk.has(p)).sort();
  const onlyDisk = [...disk].filter((p) => !listed.has(p)).sort();

  if (onlyYaml.length === 0 && onlyDisk.length === 0) {
    process.stdout.write(
      `OK: center.yaml skillEntries (${listed.size}) matches disk (${disk.size}); ` +
        `frontmatter valid; warmUp/laneRules manifest parity passed on plan-and-deliver spawned skills\n`,
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
