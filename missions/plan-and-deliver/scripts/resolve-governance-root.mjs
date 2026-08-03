/**
 * Resolve hosting-repo vs center-repo-only execution context for governance verify scripts.
 *
 * Hosting mode: cwd walk finds `.sedea/centers/sedea/` (standard submodule checkout under HOSTING_ROOT).
 * Center-only mode: cwd walk finds `center.yaml` + `missions/` (standalone center git repo / GitHub Actions).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SD_CENTER_SLUG = 'software-development';
export const SD_CENTER_PREFIX = `.sedea/centers/${SD_CENTER_SLUG}/`;

/**
 * @typedef {'hosting' | 'center'} GovernanceMode
 * @typedef {{ mode: GovernanceMode, hostingRoot: string | null, centerRoot: string, scanRoot: string }} GovernanceContext
 */

/**
 * @param {{ scriptDir?: string }} [options]
 * @returns {Promise<GovernanceContext>}
 */
export async function resolveGovernanceContext(options = {}) {
  const scriptDir =
    options.scriptDir ?? path.dirname(fileURLToPath(import.meta.url));
  const centerRootFromScript = path.resolve(scriptDir, '../../..');

  let dir = process.cwd();
  for (let depth = 0; depth < 32; depth += 1) {
    try {
      await fs.access(path.join(dir, '.sedea/centers/sedea'));
      return {
        mode: 'hosting',
        hostingRoot: dir,
        centerRoot: path.join(dir, '.sedea/centers', SD_CENTER_SLUG),
        scanRoot: dir,
      };
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  dir = process.cwd();
  for (let depth = 0; depth < 32; depth += 1) {
    try {
      await fs.access(path.join(dir, 'center.yaml'));
      await fs.access(path.join(dir, 'missions'));
      return {
        mode: 'center',
        hostingRoot: null,
        centerRoot: dir,
        scanRoot: dir,
      };
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  try {
    await fs.access(path.join(centerRootFromScript, 'center.yaml'));
    return {
      mode: 'center',
      hostingRoot: null,
      centerRoot: centerRootFromScript,
      scanRoot: centerRootFromScript,
    };
  } catch {
    /* fall through */
  }

  throw new Error(
    'could not resolve hosting or center repo root — run from HOSTING_ROOT or center repo root',
  );
}

/**
 * Map a warm-up rule path to an absolute filesystem path, or null when skipped in center-only mode.
 *
 * @param {GovernanceContext} ctx
 * @param {string} rel
 * @returns {string | null}
 */
export function mapWarmUpPath(ctx, rel) {
  const normalized = String(rel).replace(/\\/g, '/').replace(/^\.\//, '');
  if (normalized.startsWith(SD_CENTER_PREFIX)) {
    return path.join(ctx.centerRoot, normalized.slice(SD_CENTER_PREFIX.length));
  }
  if (ctx.hostingRoot) {
    return path.join(ctx.hostingRoot, normalized);
  }
  if (
    normalized.startsWith('.sedea/centers/sedea/') ||
    normalized.startsWith('.cursor/')
  ) {
    return null;
  }
  return path.join(ctx.centerRoot, normalized);
}
