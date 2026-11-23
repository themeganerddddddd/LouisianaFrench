/**
 * @jest-environment node
 */
// Path pieces stay split so this test file is not itself a mixed import.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = require.resolve('../validate-fixture-sep.mjs');

function rel(...parts) {
  return parts.join('/');
}

const SHIPPED = `import { getAllActivities } from '${rel('..', '..', 'data', 'lessonLoader')}';`;
const FIXTURE = `import { fixtureCatalog } from '${rel('..', '..', 'test', 'fixtures', 'catalog', 'activities')}';`;
const LITERAL_SHIPPED = `import catalog from '${rel('src', 'data', 'catalog.json')}';`;
const LITERAL_FIXTURE = `import { fixtureActivities } from '${rel('src', 'test', 'fixtures', 'catalog', 'activities')}';`;

function writeFile(root, relPath, text) {
  const absolute = path.join(root, relPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${text}\n`);
}

function run(root, args = []) {
  const env = { ...process.env, PATH: path.join(root, 'bin') };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, '--root', root, ...args], {
      cwd: root,
      encoding: 'utf8',
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { status: 0, report: JSON.parse(stdout) };
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout) : '';
    let report = null;
    try {
      report = stdout ? JSON.parse(stdout) : null;
    } catch {
      throw new Error(
        `Validator stdout was not JSON (status ${error.status}): ${stdout}\n${error.stderr || ''}`
      );
    }
    return { status: error.status, report };
  }
}

describe('validate:fixture-sep --strict on a plain source tree', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'fixture-sep-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('blocks mixed shipped-data and fixture imports under --strict', () => {
    writeFile(root, 'src/utils/__tests__/mixedRelative.test.js', `${SHIPPED}\n${FIXTURE}`);
    writeFile(root, 'src/screens/__tests__/mixedLiteral.test.js', `${LITERAL_SHIPPED}\n${LITERAL_FIXTURE}`);
    writeFile(root, 'src/utils/__tests__/shippedOnly.test.js', SHIPPED);
    writeFile(root, 'src/components/Widget.spec.js', FIXTURE);
    writeFile(root, 'src/utils/helper.js', `${SHIPPED}\n${FIXTURE}`);

    expect(fs.existsSync(path.join(root, '.git'))).toBe(false);

    const open = run(root);
    expect(open.status).toBe(0);
    expect(open.report.verdict).toBe('PASS');
    expect(open.report.counts.scanned).toBe(4);
    expect(open.report.warnings.map((line) => line.split(':')[0]).sort()).toEqual([
      'src/screens/__tests__/mixedLiteral.test.js',
      'src/utils/__tests__/mixedRelative.test.js'
    ]);

    const strict = run(root, ['--strict']);
    expect(strict.status).toBe(2);
    expect(strict.report.verdict).toBe('BLOCKED');
    expect(strict.report.reasons).toEqual(strict.report.warnings);
  });

  it('passes --strict when no test file mixes shipped data with fixtures', () => {
    writeFile(root, 'src/utils/__tests__/shippedOnly.test.js', SHIPPED);
    writeFile(root, 'src/components/Widget.spec.js', FIXTURE);

    const strict = run(root, ['--strict']);
    expect(strict.status).toBe(0);
    expect(strict.report.verdict).toBe('PASS');
    expect(strict.report.counts).toEqual({ scanned: 2, warnings: 0 });
    expect(strict.report.warnings).toEqual([]);
    expect(strict.report.reasons).toEqual([]);
  });
});
