#!/usr/bin/env node
/**
 * Contract harness — Sedea pr-review.mjs PR_REVIEW_INPUT paths.
 *
 * Validates exit codes and stderr/stdout for input contract paths that do not
 * require live GitHub credentials. (Legacy pr-review.py parity removed after
 * hosting-repo migration to pr-review.mjs.)
 *
 * Run from hosting repo root:
 *
 *   HOSTING_ROOT="$(pwd)" node --test \
 *     .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-pr-review-parity.test.mjs
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hostingRoot = process.env.HOSTING_ROOT
  ? path.resolve(process.env.HOSTING_ROOT)
  : path.resolve(__dirname, '../../../../../..');

const MJS = path.join(hostingRoot, '.sedea/centers/sedea/scripts/pr-review.mjs');

/**
 * @param {{ cwd?: string, env?: Record<string, string>, inputPath?: string }} opts
 */
function runMjs(opts = {}) {
  const cwd = opts.cwd ?? hostingRoot;
  const env = { ...process.env, ...opts.env };
  if (opts.inputPath !== undefined) {
    env.PR_REVIEW_INPUT = opts.inputPath;
  } else {
    delete env.PR_REVIEW_INPUT;
  }

  const result = spawnSync(process.execPath, [MJS], {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    status: result.status ?? 1,
    stdout: (result.stdout ?? '').trimEnd(),
    stderr: (result.stderr ?? '').trimEnd(),
    error: result.error,
  };
}

function normalizeStderr(stderr) {
  return stderr
    .replaceAll('\\', '/')
    .replace(/:\/{2,}/g, ':/')
    .replace(/([^:/])\/{2,}/g, '$1/')
    .trim();
}

/**
 * @param {string} label
 * @param {{ cwd?: string, env?: Record<string, string>, inputPath?: string }} opts
 * @param {{ exit?: number, stderrIncludes?: string, stdout?: string }} expect
 */
function assertContract(label, opts, expect) {
  const r = runMjs(opts);
  assert.ifError(r.error, `${label}: spawn failed: ${r.error?.message}`);
  assert.equal(r.status, expect.exit ?? 1, `${label}: exit code`);
  if (expect.stderrIncludes) {
    const err = normalizeStderr(r.stderr);
    assert.match(err, expect.stderrIncludes, `${label}: stderr`);
  }
  if (expect.stdout !== undefined) {
    assert.equal(r.stdout, expect.stdout, `${label}: stdout`);
  }
}

test('pr-review.mjs exists on disk', () => {
  assert.ok(fs.existsSync(MJS), `missing runner: ${MJS}`);
});

test('contract — missing PR_REVIEW_INPUT and no cwd input files', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  try {
    assertContract(
      'missing input',
      { cwd: tmp, env: {} },
      { stderrIncludes: /No PR review input/ },
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('contract — PR_REVIEW_INPUT points to missing file', () => {
  const missing = path.join(
    os.tmpdir(),
    'nonexistent-pr-review-input-governance-sweep.json',
  );
  assertContract(
    'missing env file',
    { cwd: hostingRoot, inputPath: missing },
    { stderrIncludes: /does not exist/ },
  );
});

test('contract — unknown command (GH_TOKEN stub avoids mcp lookup)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  const inputPath = path.join(tmp, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify({ command: 'not-a-real-command' }));
  try {
    assertContract(
      'unknown command',
      {
        cwd: tmp,
        inputPath,
        env: { GH_TOKEN: 'parity-test-stub-token' },
      },
      { stderrIncludes: /Unknown command: not-a-real-command/ },
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('contract — array payload with non-object item', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  const inputPath = path.join(tmp, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify(['not-an-object']));
  try {
    assertContract(
      'array non-object',
      {
        cwd: tmp,
        inputPath,
        env: { GH_TOKEN: 'parity-test-stub-token' },
      },
      { stderrIncludes: /expected object, got str/ },
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('contract — top-level non-object payload', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  const inputPath = path.join(tmp, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify(42));
  try {
    assertContract(
      'non-object payload',
      {
        cwd: tmp,
        inputPath,
        env: { GH_TOKEN: 'parity-test-stub-token' },
      },
      { stderrIncludes: /Expected object or array, got int/ },
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('contract — cwd fallback reads .pr-review-input.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  fs.writeFileSync(
    path.join(tmp, '.pr-review-input.json'),
    JSON.stringify({ command: 'bogus-cmd' }),
  );
  try {
    assertContract(
      'cwd input file',
      {
        cwd: tmp,
        env: { GH_TOKEN: 'parity-test-stub-token' },
      },
      { stderrIncludes: /Unknown command: bogus-cmd/ },
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('command surface — all documented commands registered in mjs', () => {
  const src = fs.readFileSync(MJS, 'utf8');
  const documented = [
    'threads',
    'reply',
    'resolve',
    'minimize',
    'pr-for-branch',
    'reviews',
    'review-comments',
    'pull-reviews',
    'issue-comments',
    'request-review',
    'summary',
  ];
  for (const cmd of documented) {
    const keyPattern =
      cmd.includes('-') ? `'${cmd}':` : `${cmd}:`;
    assert.match(src, new RegExp(keyPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `mjs missing command: ${cmd}`);
  }
});
