const { execFileSync, spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const image = 'docker.io/library/postgres:16-alpine';

function engine() {
  for (const bin of ['docker', 'podman']) {
    const result = spawnSync(bin, ['info'], { stdio: 'ignore' });
    if (result.status === 0) return bin;
  }
  return null;
}

function psql(bin, name, sql) {
  return execFileSync(bin, ['exec', '-i', name, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
    input: sql,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
}

describe('Saved Learner Progress tables', () => {
  const bin = engine();
  const name = `lf-saved-progress-${process.pid}`;

  beforeAll(() => {
    if (!bin) throw new Error('Postgres proof needs docker or podman');
    spawnSync(bin, ['rm', '-f', name], { stdio: 'ignore' });
    execFileSync(bin, [
      'run',
      '-d',
      '--name',
      name,
      '-e',
      'POSTGRES_HOST_AUTH_METHOD=trust',
      image
    ]);
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const probe = spawnSync(bin, ['exec', name, 'pg_isready', '-U', 'postgres'], { stdio: 'ignore' });
      if (probe.status === 0) {
        ready = true;
        break;
      }
      execFileSync('sleep', ['1']);
    }
    if (!ready) {
      const logs = spawnSync(bin, ['logs', name], { encoding: 'utf8' });
      throw new Error(`Postgres did not become ready\n${logs.stdout || ''}${logs.stderr || ''}`);
    }
  }, 240000);

  afterAll(() => {
    if (!bin) return;
    spawnSync(bin, ['rm', '-f', name], { stdio: 'ignore' });
  });

  test('a learner cannot read another learner, a stale revision writes nothing, and Claim does not overwrite', () => {
    const migration = readFileSync(
      join(root, 'supabase/migrations/20261026000000_saved_learner_progress.sql'),
      'utf8'
    );
    expect(migration).not.toMatch(/service_role|SUPABASE_SERVICE/i);
    expect(migration).not.toMatch(/jsonb/i);
    psql(bin, name, migration);
    const proof = readFileSync(join(root, 'supabase/tests/saved_learner_progress_proof.sql'), 'utf8');
    psql(bin, name, proof);
  }, 60000);
});
