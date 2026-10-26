const { execFileSync } = require('node:child_process');
const { mkdtempSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

function load(moduleFile, expression) {
  const code = `import * as mod from ${JSON.stringify(moduleFile)};\n${expression}`;
  return execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function git(dir, args) {
  execFileSync('git', args, {
    cwd: dir,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com'
    }
  });
}

function repoWithOriginMain() {
  const dir = mkdtempSync(join(tmpdir(), 'lf-pr-base-'));
  git(dir, ['init', '-b', 'main']);
  git(dir, ['commit', '--allow-empty', '-m', 'init']);
  git(dir, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  return dir;
}

describe('integration pull request base', () => {
  test('pr-ready defaults to origin/main and accepts the identity integration branch', () => {
    const dir = repoWithOriginMain();
    git(dir, ['update-ref', 'refs/remotes/origin/cursor/identity-account-continue', 'HEAD']);
    const out = load(
      './.opencode/scripts/pr-ready.mjs',
      `
      const repo = ${JSON.stringify(dir)};
      const fallback = mod.resolveBase(repo, null);
      const explicit = mod.resolveBase(repo, 'origin/cursor/identity-account-continue');
      const args = mod.parseArgs(['--base', 'origin/cursor/identity-account-continue', '--skip-test']);
      console.log(JSON.stringify({ fallback, explicit, args }));
    `
    );
    expect(JSON.parse(out)).toEqual({
      fallback: 'origin/main',
      explicit: 'origin/cursor/identity-account-continue',
      args: {
        skipTest: true,
        issue: null,
        bodyFile: null,
        base: 'origin/cursor/identity-account-continue'
      }
    });
  });

  test('pr-ready does not fall back when the requested base is missing', () => {
    const dir = repoWithOriginMain();
    expect(() =>
      load(
        './.opencode/scripts/pr-ready.mjs',
        `mod.resolveBase(${JSON.stringify(dir)}, 'origin/cursor/identity-account-continue');`
      )
    ).toThrow(/Base ref not found/);
  });

  test('agent worktree defaults to origin/main and names the fetched branch', () => {
    const out = load(
      './.opencode/scripts/agent-worktree.mjs',
      `
      const fallback = mod.parseArgs(['348']);
      const explicit = mod.parseArgs(['--base', 'origin/cursor/identity-account-continue', '348']);
      console.log(JSON.stringify({
        fallbackBase: fallback.base,
        fallbackRemote: mod.originBranch(fallback.base),
        explicitBase: explicit.base,
        explicitRemote: mod.originBranch(explicit.base),
        issue: explicit.issue
      }));
    `
    );
    expect(JSON.parse(out)).toEqual({
      fallbackBase: 'origin/main',
      fallbackRemote: 'main',
      explicitBase: 'origin/cursor/identity-account-continue',
      explicitRemote: 'cursor/identity-account-continue',
      issue: 348
    });
  });

  test('agent worktree rejects a base that is not an origin ref', () => {
    expect(() =>
      load('./.opencode/scripts/agent-worktree.mjs', "mod.originBranch('main');")
    ).toThrow(/origin/);
  });

  test('CI runs pull requests into the identity integration branch against that base', () => {
    const yml = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
    expect(yml).toMatch(
      /pull_request:[\s\S]*branches:\s*\[main,\s*cursor\/identity-account-continue\]/
    );
    expect(yml).toMatch(/--base origin\/\$\{\{\s*github\.base_ref\s*\}\}/);
  });
});
