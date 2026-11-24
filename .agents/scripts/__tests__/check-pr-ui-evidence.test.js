const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.resolve(process.cwd(), '.agents/scripts/check-pr-ui-evidence.mjs');
const LINK = 'https://raw.githubusercontent.com/themeganerddddddd/LouisianaFrench/abc/shot.png';

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'git failed');
  }
}

function initRepo() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-evidence-'));
  git(cwd, ['init', '-b', 'main']);
  git(cwd, ['config', 'user.email', 'test@example.com']);
  git(cwd, ['config', 'user.name', 'Test']);
  const screen = path.join(cwd, 'src', 'screens');
  fs.mkdirSync(screen, { recursive: true });
  fs.writeFileSync(path.join(screen, 'HomeScreen.js'), 'export default function Home() { return null; }\n');
  git(cwd, ['add', '.']);
  git(cwd, ['commit', '-m', 'base']);
  git(cwd, ['checkout', '-b', 'change']);
  fs.writeFileSync(path.join(screen, 'HomeScreen.js'), 'export default function Home() { return 1; }\n');
  git(cwd, ['add', '.']);
  git(cwd, ['commit', '-m', 'ui']);
  return cwd;
}

function writeEvidence(cwd, key) {
  const dir = path.join(cwd, 'docs', 'evidence', key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'shot.png'), 'png');
}

function runCheck(cwd, { body, branch }) {
  const bodyFile = path.join(cwd, 'body.md');
  fs.writeFileSync(bodyFile, body);
  const args = [SCRIPT, '--base', 'main', '--body-file', bodyFile];
  if (branch != null) args.push('--branch', branch);
  return spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
}

describe('UI evidence issue key', () => {
  let cwd;

  beforeEach(() => {
    cwd = initRepo();
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it('uses a BIO key from the branch name', () => {
    writeEvidence(cwd, 'BIO-50');
    const result = runCheck(cwd, {
      body: `${LINK}\n`,
      branch: 'cursor/bio-50-testids'
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(expect.objectContaining({
      ok: true,
      issue: 'BIO-50',
      evidenceDir: 'docs/evidence/BIO-50'
    }));
  });

  it('uses a BIO key from the pull request body', () => {
    writeEvidence(cwd, 'BIO-50');
    const result = runCheck(cwd, {
      body: `Refs BIO-50\n${LINK}\n`,
      branch: 'cursor/no-digits'
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).issue).toBe('BIO-50');
    expect(JSON.parse(result.stdout).evidenceDir).toBe('docs/evidence/BIO-50');
  });

  it('keeps a numeric GitHub issue on the body', () => {
    writeEvidence(cwd, '123');
    const result = runCheck(cwd, {
      body: `Fixes #123\n${LINK}\n`,
      branch: 'cursor/bio-50-testids'
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).issue).toBe(123);
    expect(JSON.parse(result.stdout).evidenceDir).toBe('docs/evidence/123');
  });

  it('keeps a numeric issue from the branch name', () => {
    writeEvidence(cwd, '435');
    const result = runCheck(cwd, {
      body: `${LINK}\n`,
      branch: 'cursor/435-notes'
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).issue).toBe(435);
    expect(JSON.parse(result.stdout).evidenceDir).toBe('docs/evidence/435');
  });

  it('fails when the BIO evidence folder is missing', () => {
    const result = runCheck(cwd, {
      body: `Refs BIO-7\n${LINK}\n`,
      branch: 'cursor/bio-7-missing'
    });
    const payload = JSON.parse(result.stdout);

    expect(result.status).toBe(2);
    expect(payload.ok).toBe(false);
    expect(payload.issue).toBe('BIO-7');
    expect(payload.missing).toContain('evidence-media');
  });
});
