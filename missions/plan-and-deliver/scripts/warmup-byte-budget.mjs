/**
 * Shared spawn warm-up byte budget helpers for verify scripts.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { mapWarmUpPath, SD_CENTER_PREFIX } from './resolve-governance-root.mjs';

export const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
export const WARM_UP_BYTE_CAP = 384 * 1024;
/** PRD D2 — skill body prose soft cap before on-demand split is required in PR. */
export const SKILL_PROSE_BYTE_CAP = 40 * 1024;

/** Spawn skills reported in the per-role CI table (planning + ship). */
export const SPAWN_ROLE_CATEGORY = {
  'author-prd': 'planning',
  'ad-hoc-prd': 'planning',
  'brainstorm-research': 'planning',
  'master-planner': 'planning',
  'phase-planner': 'planning',
  'pr-plan': 'planning',
  'pr-breakdown': 'planning',
  'delivery-phases': 'planning',
  'new-plan': 'planning',
  // quick-fix-plan lives under missions/quick-fix/skills/ — not scanned by --table
  'quick-fix-plan': 'planning',
  'coding-session': 'ship',
  'pre-pr-review': 'ship',
  'worktree-bootstrap': 'ship',
};

export function normalizeRepoPath(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '');
}

export function dedupeOrderedPaths(paths) {
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

export function assignedSkillBodyWarmUpPath(skillName) {
  if (!skillName) return undefined;
  return normalizeRepoPath(
    `${SD_CENTER_PREFIX}missions/plan-and-deliver/skills/${skillName}/SKILL.md`,
  );
}

export function pathsForSpawnByteBudget(skillName, mergedPaths) {
  const assigned = assignedSkillBodyWarmUpPath(skillName);
  if (!assigned) return mergedPaths;
  return mergedPaths.filter((p) => normalizeRepoPath(p) !== assigned);
}

export async function combinedWarmUpBytes(ctx, paths) {
  let total = 0;
  let skipped = 0;
  for (const rel of dedupeOrderedPaths(paths)) {
    const abs = mapWarmUpPath(ctx, rel);
    if (!abs) {
      skipped += 1;
      continue;
    }
    const st = await fs.stat(abs);
    total += st.size;
  }
  return { bytes: total, skippedPaths: skipped };
}

export async function readSkillFrontmatterPaths(skillRelPath, centerRoot) {
  const abs = path.join(centerRoot, skillRelPath);
  const raw = await fs.readFile(abs, 'utf8');
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) return { warmUpRules: [], laneRules: [], skillBodyBytes: raw.length };
  let parsed;
  try {
    parsed = parseYaml(m[1]);
  } catch {
    return { warmUpRules: [], laneRules: [], skillBodyBytes: raw.length };
  }
  const warmUpRules = Array.isArray(parsed?.warmUpRules)
    ? parsed.warmUpRules.map((p) => normalizeRepoPath(String(p)))
    : [];
  const laneRules = Array.isArray(parsed?.laneRules)
    ? parsed.laneRules.map((p) => normalizeRepoPath(String(p)))
    : [];
  return { warmUpRules, laneRules, skillBodyBytes: raw.length };
}

export function statusForBytes(bytes) {
  if (bytes > WARM_UP_BYTE_CAP) return 'WARN';
  return 'OK';
}

export function formatBytes(n) {
  return n.toLocaleString('en-US');
}
