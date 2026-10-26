const { execFileSync, spawnSync } = require('node:child_process');
const { readdirSync, readFileSync } = require('node:fs');
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
    let readyStreak = 0;
    let lastError = '';
    for (let attempt = 0; attempt < 60 && readyStreak < 2; attempt += 1) {
      const probe = spawnSync(bin, ['exec', name, 'psql', '-U', 'postgres', '-c', 'select 1'], {
        encoding: 'utf8'
      });
      if (probe.status === 0) readyStreak += 1;
      else {
        readyStreak = 0;
        lastError = `${probe.stdout || ''}${probe.stderr || ''}`;
      }
      execFileSync('sleep', ['1']);
    }
    if (readyStreak < 2) {
      const logs = spawnSync(bin, ['logs', name], { encoding: 'utf8' });
      throw new Error(`Postgres did not accept queries\n${lastError}\n${logs.stdout || ''}${logs.stderr || ''}`);
    }
  }, 240000);

  afterAll(() => {
    if (!bin) return;
    spawnSync(bin, ['rm', '-f', name], { stdio: 'ignore' });
  });

  test('a learner cannot read another learner, a stale revision writes nothing, and Claim does not overwrite', () => {
    const migrations = readdirSync(join(root, 'supabase/migrations'))
      .filter((name) => name.endsWith('.sql'))
      .sort()
      .map((name) => readFileSync(join(root, 'supabase/migrations', name), 'utf8'));
    for (const migration of migrations) {
      expect(migration).not.toMatch(/service_role key|SUPABASE_SERVICE/i);
      expect(migration).not.toMatch(/jsonb/i);
    }
    psql(
      bin,
      name,
      `
      do $$
      begin
        if not exists (select 1 from pg_roles where rolname = 'authenticated') then
          create role authenticated nologin;
        end if;
        if not exists (select 1 from pg_roles where rolname = 'anon') then
          create role anon nologin;
        end if;
        if not exists (select 1 from pg_roles where rolname = 'service_role') then
          create role service_role nologin bypassrls;
        end if;
      end
      $$;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
      `
    );
    for (const migration of migrations) psql(bin, name, migration);
    const proofs = readdirSync(join(root, 'supabase/tests'))
      .filter((file) => file.endsWith('.sql'))
      .sort();
    for (const file of proofs) {
      psql(bin, name, readFileSync(join(root, 'supabase/tests', file), 'utf8'));
    }
  }, 60000);
});
