#!/usr/bin/env node
/**
 * Post-merge ship mechanics — binding helper for coding-session ship chain (PRD B6–B7).
 *
 * Mechanical portion after PR merge: verify merge state, ff-only pull on HOSTING_ROOT main,
 * detect center submodule gitlink drift (promote-pin handoff), emit §8 re-emit JSON fields.
 * Developer consent gates remain in SKILL checkpoint UX — this script does not bypass rule 6.
 *
 * Run from HOSTING_ROOT via run-sedea-node.sh:
 *
 *   .sedea/centers/sedea/scripts/run-sedea-node.sh \
 *     .sedea/centers/software-development/missions/plan-and-deliver/scripts/post-merge-ship-mechanics.mjs \
 *     --dry-run
 *
 *   .../post-merge-ship-mechanics.mjs --hosting-root /path/to/hosting --pr-number 42 --apply
 *
 * Exit 0 on success (stdout = one JSON line). Exit 1 on failure (stderr message, optional JSON).
 */

import fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

const DRY_RUN_FIXTURE = {
  prState: 'merged',
  mergeSha: '0000000000000000000000000000000000000000',
  mergedAt: null,
  mainPullStatus: 'dry-run',
  shipPhase: 'pr-merged',
  nextAction: 'none',
  centerPinDriftPaths: [],
  promotePinRequired: false,
  dryRun: true,
};

function die(msg, code = 1, payload = null) {
  if (payload) {
    process.stderr.write(`${JSON.stringify({ ok: false, error: msg, ...payload })}\n`);
  } else {
    process.stderr.write(`post-merge-ship-mechanics: ${msg}\n`);
  }
  process.exit(code);
}

function parseFlags(argv) {
  const out = {
    dryRun: false,
    apply: false,
    hostingRoot: null,
    prNumber: null,
    prNumbers: null,
    defaultBranch: 'main',
    repo: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (a === '--apply') {
      out.apply = true;
      continue;
    }
    if (a === '--help' || a === '-h') {
      process.stdout.write(`Usage: post-merge-ship-mechanics.mjs [--dry-run] [--hosting-root PATH] [--pr-number N] [--pr-numbers N,N,...] [--repo ORG/REPO] [--default-branch main] [--apply]

  --dry-run              Smoke/fixture mode — emit sample §8 JSON without gh/git mutations.
  --hosting-root PATH    Hosting repo root (directory containing .sedea/centers/sedea/).
  --pr-number N          PR to verify (optional in --dry-run).
  --repo ORG/REPO        GitHub repo for gh pr view (default: origin remote of hosting root).
  --default-branch NAME  Integration branch to pull (default: main).
  --apply                Run git pull on HOSTING_ROOT; default is verify-only for pull.
`);
      process.exit(0);
    }
    if (!a.startsWith('--')) die(`unexpected argument: ${a}`);
    const eq = a.indexOf('=');
    let key;
    let value;
    if (eq >= 0) {
      key = a.slice(2, eq);
      value = a.slice(eq + 1);
    } else {
      key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) value = true;
      else {
        value = next;
        i += 1;
      }
    }
    if (key === 'hosting-root') out.hostingRoot = path.resolve(String(value));
    else if (key === 'pr-number') out.prNumber = Number(value);
    else if (key === 'pr-numbers') {
      out.prNumbers = String(value).split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
    }
    else if (key === 'repo') out.repo = String(value);
    else if (key === 'default-branch') out.defaultBranch = String(value);
    else die(`unknown flag: --${key}`);
  }
  return out;
}

function spawnGit(cwd, args) {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      resolve({ ok: false, stdout: stdout.trim(), stderr: err.message, code: -1 });
    });
    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: code ?? 1,
      });
    });
  });
}

function spawnGh(args) {
  return new Promise((resolve) => {
    const child = spawn('gh', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      resolve({ ok: false, stdout: stdout.trim(), stderr: err.message, code: -1 });
    });
    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: code ?? 1,
      });
    });
  });
}

async function resolveHostingRoot(explicit) {
  if (explicit) return explicit;
  let dir = process.cwd();
  for (let depth = 0; depth < 12; depth++) {
    const sedea = path.join(dir, '.sedea', 'centers', 'sedea');
    try {
      if (fsSync.statSync(sedea).isDirectory()) return dir;
    } catch {
      /* continue */
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  die('HOSTING_ROOT not found — pass --hosting-root');
}

function parseGithubRemote(url) {
  const u = String(url).trim();
  const ssh = u.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (ssh) return `${ssh[1]}/${ssh[2]}`;
  try {
    const parsed = new URL(u);
    const parts = parsed.pathname.replace(/^\/+/, '').replace(/\.git$/, '');
    if (parsed.hostname === 'github.com' && parts) return parts;
  } catch {
    /* ignore */
  }
  return null;
}

async function hostingOrgRepo(hostingRoot) {
  const r = await spawnGit(hostingRoot, ['remote', 'get-url', 'origin']);
  if (!r.ok) return { ok: false, orgRepo: null, error: r.stderr || 'remote get-url failed' };
  const orgRepo = parseGithubRemote(r.stdout);
  if (!orgRepo) return { ok: false, orgRepo: null, error: `unrecognized origin: ${r.stdout}` };
  return { ok: true, orgRepo, error: null };
}

async function queryPr(orgRepo, prNumber) {
  const r = await spawnGh([
    'pr', 'view', String(prNumber),
    '--repo', orgRepo,
    '--json', 'state,mergeCommit,mergedAt,url',
  ]);
  if (!r.ok) return { ok: false, error: r.stderr || r.stdout || 'gh pr view failed' };
  try {
    const j = JSON.parse(r.stdout);
    const mergeSha = j.mergeCommit?.oid || j.mergeCommit || null;
    return {
      ok: true,
      prState: String(j.state || 'UNKNOWN').toLowerCase(),
      mergeSha,
      mergedAt: j.mergedAt || null,
      prUrl: j.url || null,
    };
  } catch (err) {
    return { ok: false, error: `gh json parse: ${err.message}` };
  }
}

async function syncHostingMain(hostingRoot, defaultBranch, apply) {
  if (!apply) {
    return { ok: true, mainPullStatus: 'skipped', actions: [] };
  }
  const co = await spawnGit(hostingRoot, ['checkout', defaultBranch]);
  if (!co.ok) return { ok: false, mainPullStatus: 'failed', error: `checkout ${defaultBranch}: ${co.stderr}` };
  const pull = await spawnGit(hostingRoot, ['pull', '--ff-only', 'origin', defaultBranch]);
  if (!pull.ok) {
    return { ok: false, mainPullStatus: 'failed', error: `pull --ff-only origin ${defaultBranch}: ${pull.stderr}` };
  }
  return { ok: true, mainPullStatus: 'success', pullStdout: pull.stdout };
}

function readGitlinkSha(hostingRoot, submodulePath) {
  try {
    const sha = execFileSync('git', ['ls-tree', 'HEAD', submodulePath], {
      cwd: hostingRoot,
      encoding: 'utf8',
    }).trim().split(/\s+/)[2];
    return sha || null;
  } catch {
    return null;
  }
}

async function remoteTipSha(remoteUrl, branch) {
  const r = await spawnGit(process.cwd(), ['ls-remote', remoteUrl, `refs/heads/${branch}`]);
  if (!r.ok || !r.stdout.trim()) return null;
  return r.stdout.trim().split(/\s+/)[0] || null;
}

async function detectCenterPinDrift(hostingRoot) {
  const drift = [];
  const gitmodules = path.join(hostingRoot, '.gitmodules');
  let raw;
  try {
    raw = await fs.readFile(gitmodules, 'utf8');
  } catch {
    return drift;
  }
  const entries = [];
  let current = {};
  for (const line of raw.split('\n')) {
    if (line.startsWith('[submodule')) {
      if (current.path) entries.push(current);
      current = {};
      continue;
    }
    const pathM = line.match(/^\s*path\s*=\s*(.+)\s*$/);
    const urlM = line.match(/^\s*url\s*=\s*(.+)\s*$/);
    if (pathM) current.path = pathM[1].trim();
    if (urlM) current.url = urlM[1].trim();
  }
  if (current.path) entries.push(current);

  for (const entry of entries) {
    if (!entry.path?.startsWith('.sedea/centers/')) continue;
    const gitlinkSha = readGitlinkSha(hostingRoot, entry.path);
    if (!gitlinkSha || !entry.url) continue;
    const tip = await remoteTipSha(entry.url, 'main');
    if (tip && gitlinkSha !== tip) {
      drift.push({ path: entry.path, gitlinkSha, remoteTip: tip });
    }
  }
  return drift;
}

function mapPrStateToShipPhase(prState, mainPullStatus) {
  if (prState === 'merged') {
    // Verify-only (mainPullStatus skipped) stays pr-merged until --apply pull succeeds.
    if (mainPullStatus === 'success') return 'post-merge-cleanup';
    return 'pr-merged';
  }
  return 'pr-open';
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.dryRun && !flags.hostingRoot && flags.prNumber == null && flags.prNumbers == null) {
    process.stdout.write(`${JSON.stringify(DRY_RUN_FIXTURE)}\n`);
    process.exit(0);
  }

  const hostingRoot = await resolveHostingRoot(flags.hostingRoot);
  const orgRepo = flags.repo || (await hostingOrgRepo(hostingRoot)).orgRepo;
  if (!orgRepo) die('could not resolve GitHub repo — pass --repo ORG/REPO');

  let prState = 'unknown';
  let mergeSha = null;
  let mergedAt = null;

  if (flags.prNumber != null && !Number.isFinite(flags.prNumber)) {
    die('invalid --pr-number');
  }
  if (flags.prNumbers != null && flags.prNumbers.length === 0) {
    die('invalid --pr-numbers');
  }

  const prNumbersToQuery = flags.prNumbers ?? (flags.prNumber != null ? [flags.prNumber] : []);
  let batchResults = null;

  if (prNumbersToQuery.length > 0) {
    batchResults = [];
    for (const n of prNumbersToQuery) {
      const pr = await queryPr(orgRepo, n);
      if (!pr.ok) die(pr.error);
      batchResults.push({ prNumber: n, prState: pr.prState, mergeSha: pr.mergeSha, mergedAt: pr.mergedAt, prUrl: pr.prUrl });
      if (!flags.dryRun && pr.prState !== 'merged') {
        die(`PR #${n} state is ${pr.prState}, expected merged`, 1, {
          prState: pr.prState,
          mergeSha: pr.mergeSha,
          mergedAt: pr.mergedAt,
          shipPhase: mapPrStateToShipPhase(pr.prState, 'skipped'),
          batchResults,
        });
      }
    }
    const last = batchResults[batchResults.length - 1];
    prState = last.prState;
    mergeSha = last.mergeSha;
    mergedAt = last.mergedAt;
    if (flags.dryRun) {
      const fixture = {
        ...DRY_RUN_FIXTURE,
        ...(batchResults.length > 1 ? { batch: true, batchResults } : {}),
        dryRun: true,
      };
      process.stdout.write(`${JSON.stringify(fixture)}\n`);
      process.exit(0);
    }
  } else if (flags.dryRun) {
    Object.assign(DRY_RUN_FIXTURE, { dryRun: true });
    process.stdout.write(`${JSON.stringify(DRY_RUN_FIXTURE)}\n`);
    process.exit(0);
  }

  const pull = await syncHostingMain(hostingRoot, flags.defaultBranch, flags.apply && !flags.dryRun);
  if (!pull.ok) die(pull.error, 1, { mainPullStatus: 'failed', prState, mergeSha });

  const mainPullStatus = flags.dryRun ? 'dry-run' : pull.mainPullStatus;
  let centerPinDriftPaths = [];
  let nextAction = 'none';
  let promotePinRequired = false;

  if (flags.apply && !flags.dryRun && mainPullStatus === 'success') {
    const drift = await detectCenterPinDrift(hostingRoot);
    centerPinDriftPaths = drift.map((d) => d.path);
    promotePinRequired = centerPinDriftPaths.length > 0;
    if (promotePinRequired) nextAction = 'promote-pin-required';
  }

  const shipPhase = mapPrStateToShipPhase(prState, mainPullStatus);

  const result = {
    prState,
    mergeSha,
    mergedAt,
    mainPullStatus,
    shipPhase,
    nextAction,
    centerPinDriftPaths,
    promotePinRequired,
    ...(batchResults && batchResults.length > 1 ? { batch: true, batchResults } : {}),
    ...(flags.dryRun ? { dryRun: true } : {}),
  };

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((err) => die(err.message || String(err)));
