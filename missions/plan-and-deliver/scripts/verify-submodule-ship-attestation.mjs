#!/usr/bin/env node
/**
 * Procedural verify helper — submodule source merge + promote-submodule-pin attestation.
 *
 * For each in-scope center submodule under HOSTING_ROOT `.sedea/centers/`:
 * - Hosting gitlink SHA equals center remote defaultBranch tip (strict SHA — v1)
 * - Optional `promoteSubmodulePinOutcomes` JSON does not report skipped/N/A/failed
 *
 * Run from hosting repo root (directory containing `.sedea/centers/sedea/`):
 *
 *   node .sedea/centers/software-development/missions/plan-and-deliver/scripts/verify-submodule-ship-attestation.mjs
 *   node .../verify-submodule-ship-attestation.mjs --hosting-root /path/to/hosting --center-slug sedea
 *   node .../verify-submodule-ship-attestation.mjs --outcomes-json /tmp/outcomes.json
 *
 * Exit 0 when every in-scope center passes; exit 1 with JSON report on stdout when any fail.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BUILTIN_SEDEA = {
  centerSlug: 'sedea',
  submodulePath: '.sedea/centers/sedea',
  defaultBranch: 'main',
  remote: 'git@github.com:sedea-ai/sedea-builtin-center.git',
};

function parseArgs(argv) {
  const opts = {
    hostingRoot: null,
    centerSlugs: [],
    outcomesJson: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--hosting-root' && argv[i + 1]) {
      opts.hostingRoot = path.resolve(argv[++i]);
    } else if (arg === '--center-slug' && argv[i + 1]) {
      opts.centerSlugs.push(argv[++i]);
    } else if (arg === '--outcomes-json' && argv[i + 1]) {
      opts.outcomesJson = path.resolve(argv[++i]);
    } else if (arg === '--help' || arg === '-h') {
      process.stdout.write(`Usage: verify-submodule-ship-attestation.mjs [--hosting-root PATH] [--center-slug SLUG ...] [--outcomes-json PATH]\n`);
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return opts;
}

async function resolveHostingRoot(explicit) {
  if (explicit) return explicit;
  let dir = process.cwd();
  for (let depth = 0; depth < 12; depth++) {
    const sedea = path.join(dir, '.sedea', 'centers', 'sedea');
    try {
      await fs.access(sedea);
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  throw new Error('HOSTING_ROOT not found — pass --hosting-root');
}

function runGit(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

async function loadCentersRegistry(hostingRoot) {
  const centersYaml = path.join(hostingRoot, '.sedea', 'centers', 'centers.yaml');
  const raw = await fs.readFile(centersYaml, 'utf8');
  const doc = parseYaml(raw);
  /** @type {{ centerSlug: string, submodulePath: string, defaultBranch: string, remote: string }[]} */
  const centers = [BUILTIN_SEDEA];
  for (const entry of doc.centers ?? []) {
    if (!entry.enabled) continue;
    centers.push({
      centerSlug: entry.slug,
      submodulePath: `.sedea/centers/${entry.slug}`,
      defaultBranch: entry.defaultBranch ?? 'main',
      remote: entry.source,
    });
  }
  return centers;
}

function readGitlinkSha(hostingRoot, submodulePath) {
  try {
    const line = runGit(['ls-tree', 'HEAD', submodulePath], hostingRoot);
    if (!line) return null;
    const parts = line.split(/\s+/);
    if (parts[1] !== 'commit') return null;
    return parts[2] ?? null;
  } catch {
    return null;
  }
}

function readRemoteTip(remote, defaultBranch) {
  const out = runGit(['ls-remote', remote, `refs/heads/${defaultBranch}`], process.cwd());
  const first = out.split('\n').find(Boolean);
  if (!first) return null;
  return first.split(/\s+/)[0] ?? null;
}

async function loadOutcomes(outcomesPath) {
  if (!outcomesPath) return null;
  const raw = await fs.readFile(outcomesPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.promoteSubmodulePinOutcomes)) {
    return parsed.promoteSubmodulePinOutcomes;
  }
  return null;
}

function validateOutcomeRecord(outcomes, centerSlug) {
  if (!outcomes) return { status: 'not-provided', ok: true };
  const row = outcomes.find((o) => o && o.centerSlug === centerSlug);
  if (!row) return { status: 'missing-record', ok: false };
  const promote = String(row.promoteStatus ?? '').toLowerCase();
  const sourceOk = row.sourceOnMainVerified === true;
  if (promote === 'n/a' || promote === 'na' || promote === 'skipped') {
    return { status: 'promote-na-or-skipped', ok: false, row };
  }
  if (promote === 'failed' || promote === 'failure') {
    return { status: 'promote-failed', ok: false, row };
  }
  if (!sourceOk) {
    return { status: 'source-not-on-main', ok: false, row };
  }
  return { status: 'recorded-ok', ok: true, row };
}

async function main() {
  const opts = parseArgs(process.argv);
  const hostingRoot = await resolveHostingRoot(opts.hostingRoot);
  const allCenters = await loadCentersRegistry(hostingRoot);
  const filter = new Set(opts.centerSlugs);
  const centers =
    filter.size > 0 ? allCenters.filter((c) => filter.has(c.centerSlug)) : allCenters;
  const outcomes = await loadOutcomes(opts.outcomesJson);

  /** @type {object[]} */
  const results = [];
  let allPass = true;

  for (const center of centers) {
    const gitlinkSha = readGitlinkSha(hostingRoot, center.submodulePath);
    let remoteTip = null;
    let remoteError = null;
    try {
      remoteTip = readRemoteTip(center.remote, center.defaultBranch);
    } catch (err) {
      remoteError = err instanceof Error ? err.message : String(err);
    }

    const shaAligned =
      gitlinkSha && remoteTip && gitlinkSha === remoteTip;
    const outcomeCheck = validateOutcomeRecord(outcomes, center.centerSlug);
    const pass = Boolean(shaAligned && outcomeCheck.ok);

    if (!pass) allPass = false;

    results.push({
      centerSlug: center.centerSlug,
      submodulePath: center.submodulePath,
      defaultBranch: center.defaultBranch,
      gitlinkSha,
      remoteTip,
      remoteError,
      shaAligned: Boolean(shaAligned),
      sourceOnMainVerified: shaAligned,
      promoteOutcome: outcomeCheck,
      pass,
    });
  }

  const report = {
    hostingRoot,
    checkedAt: new Date().toISOString(),
    strictSha: true,
    allPass,
    centers: results,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!allPass) {
    process.stderr.write('verify-submodule-ship-attestation: FAIL\n');
    process.exit(1);
  }
  process.stderr.write(`verify-submodule-ship-attestation: OK (${results.length} center(s))\n`);
}

main().catch((err) => {
  process.stderr.write(`verify-submodule-ship-attestation: ${err.message}\n`);
  process.exit(2);
});
