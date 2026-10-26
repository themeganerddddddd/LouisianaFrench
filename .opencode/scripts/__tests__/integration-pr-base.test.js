const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

function load(moduleFile, expression) {
  const code = `import * as mod from ${JSON.stringify(moduleFile)};\n${expression}`;
  return execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root,
    encoding: 'utf8'
  });
}

describe('integration pull request base', () => {
  test('pr-ready defaults to origin/main and accepts the identity integration branch', () => {
    const out = load(
      './.opencode/scripts/pr-ready.mjs',
      `
      const fallback = mod.resolveBase(process.cwd(), null);
      const explicit = mod.resolveBase(process.cwd(), 'origin/cursor/identity-account-continue');
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
