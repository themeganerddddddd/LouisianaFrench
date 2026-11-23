/**
 * @jest-environment node
 */
// Repro for #457: `npm run validate:fixture-sep` can never find a problem.
// FAILS on main at 549d4d0 on purpose. Runs the real script against a fresh
// clone of the current HEAD commit, which is what CI sees.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KNOWN_MIXED_FILE = 'src/utils/__tests__/reviewQueue.test.js'; // ../../data/lessonLoader + fixtures

let clone;

function runValidator(...args) {
  const out = execFileSync(
    process.execPath,
    ['.agents/scripts/validate-fixture-sep.mjs', ...args],
    { cwd: clone, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
  return JSON.parse(out);
}

function runValidatorStatus(...args) {
  try {
    runValidator(...args);
    return 0;
  } catch (error) {
    return error.status;
  }
}

beforeAll(() => {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  clone = fs.mkdtempSync(path.join(os.tmpdir(), 'fixture-sep-'));
  execFileSync('git', ['clone', '--quiet', '--no-hardlinks', root, clone]);
  execFileSync('git', ['checkout', '--detach', head], { cwd: clone });
});

afterAll(() => {
  if (clone) fs.rmSync(clone, { recursive: true, force: true });
});

describe('repro #457: validate:fixture-sep on a clean checkout', () => {
  it('sanity: the known mixed file imports shipped data by a relative path and a fixture', () => {
    const text = fs.readFileSync(path.join(clone, KNOWN_MIXED_FILE), 'utf8');
    expect(text).toMatch(/from '\.\.\/\.\.\/data\/lessonLoader'/);
    expect(text).toMatch(/fixtures/);
  });

  it('scans test files on a clean checkout', () => {
    // main: { verdict: 'PASS', counts: { scanned: 0, warnings: 0 } }
    expect(runValidator().counts.scanned).toBeGreaterThan(0);
  });

  it('blocks a known mixed file under --strict on a clean checkout', () => {
    expect(runValidatorStatus('--strict')).not.toBe(0);
  });

  it('flags the known mixed file once it is in the working tree', () => {
    fs.appendFileSync(path.join(clone, KNOWN_MIXED_FILE), '\n// touched by repro\n');
    const result = runValidator();
    expect(result.counts.scanned).toBe(1); // sanity: it does see the edited file
    // main: 0 warnings, because SHIPPED_CATALOG only matches the literal text "src/data/".
    expect(result.warnings.join('\n')).toContain(KNOWN_MIXED_FILE);
  });
});
