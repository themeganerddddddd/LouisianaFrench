const fs = require('fs');
const path = require('path');
const config = require('../../release/config');
const db = require('../checks');

const root = process.cwd();
const DEV_REF = 'isezzedrbdomyhfuqjak';
const PROD_REF = 'ykfbvrkqzzyyeheblhye';
const PASSWORD = 'sup3r-secret';

function databaseUrl(ref, port = 5432, password = PASSWORD) {
  return `postgresql://postgres.${ref}:${password}@aws-0-us-east-1.pooler.supabase.com:${port}/postgres`;
}

describe('project ref', () => {
  it('reads dev and prod refs from release config', () => {
    expect(db.projectRefs(config)).toEqual({ dev: DEV_REF, prod: PROD_REF });
    expect(config.supabaseHosts.preview.split('.')[0]).toBe(DEV_REF);
    expect(config.supabaseHosts.production.split('.')[0]).toBe(PROD_REF);
  });

  it('accepts a session-pooler URL whose username ref matches the env', () => {
    expect(db.assertTarget({ env: 'dev', url: databaseUrl(DEV_REF), refs: { dev: DEV_REF, prod: PROD_REF } })).toMatchObject({
      ref: DEV_REF,
      port: '5432',
      host: 'aws-0-us-east-1.pooler.supabase.com'
    });
    expect(db.assertTarget({
      env: 'prod',
      url: databaseUrl(PROD_REF),
      confirm: PROD_REF,
      refs: { dev: DEV_REF, prod: PROD_REF }
    }).ref).toBe(PROD_REF);
  });

  it('uses config refs when none are passed in', () => {
    expect(db.assertTarget({ env: 'dev', url: databaseUrl(DEV_REF) }).ref).toBe(DEV_REF);
  });

  it('refuses a URL whose username ref belongs to the other env', () => {
    expect(() => db.assertTarget({
      env: 'dev',
      url: databaseUrl(PROD_REF),
      refs: { dev: DEV_REF, prod: PROD_REF }
    })).toThrow(new RegExp(DEV_REF));
    expect(() => db.assertTarget({
      env: 'prod',
      url: databaseUrl(DEV_REF),
      confirm: DEV_REF,
      refs: { dev: DEV_REF, prod: PROD_REF }
    })).toThrow(new RegExp(PROD_REF));
  });

  it('refuses a direct-connection username that has no project ref', () => {
    const url = `postgresql://postgres:${PASSWORD}@db.${DEV_REF}.supabase.co:5432/postgres`;
    expect(() => db.assertTarget({
      env: 'dev',
      url,
      refs: { dev: DEV_REF, prod: PROD_REF }
    })).toThrow(/postgres\.<project ref>/);
  });

  it('still reads the ref when the password is percent-encoded', () => {
    const url = `postgresql://postgres.${DEV_REF}:p%40ss@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
    expect(db.assertTarget({
      env: 'dev',
      url,
      refs: { dev: DEV_REF, prod: PROD_REF }
    }).ref).toBe(DEV_REF);
  });

  it('requires the prod ref as --confirm and ignores a matching dev URL', () => {
    const refs = { dev: DEV_REF, prod: PROD_REF };
    expect(() => db.assertTarget({ env: 'prod', url: databaseUrl(PROD_REF), refs })).toThrow(/--confirm/);
    expect(() => db.assertTarget({
      env: 'prod',
      url: databaseUrl(PROD_REF),
      confirm: DEV_REF,
      refs
    })).toThrow(/--confirm/);
    expect(() => db.assertTarget({
      env: 'prod',
      url: databaseUrl(PROD_REF),
      confirm: 'please',
      refs
    })).toThrow(/--confirm/);
  });
});

describe('session pooler port', () => {
  const refs = { dev: DEV_REF, prod: PROD_REF };

  it('refuses the transaction pooler and names port 5432 on the same host', () => {
    expect(() => db.assertTarget({ env: 'dev', url: databaseUrl(DEV_REF, 6543), refs })).toThrow(
      /Transaction pooler port 6543 cannot run migrations\. Use port 5432 on the same host\./
    );
  });

  it('refuses any other port, including a missing one', () => {
    expect(() => db.assertTarget({ env: 'dev', url: databaseUrl(DEV_REF, 5433), refs })).toThrow(/5432/);
    const bare = `postgresql://postgres.${DEV_REF}:${PASSWORD}@aws-0-us-east-1.pooler.supabase.com/postgres`;
    expect(() => db.assertTarget({ env: 'dev', url: bare, refs })).toThrow(/5432/);
  });
});

describe('redaction', () => {
  it('removes the password and the database URL from text', () => {
    const url = databaseUrl(DEV_REF);
    const text = `connect failed for ${url} password=${PASSWORD}`;
    const out = db.redact(text, { url, password: PASSWORD });
    expect(out).not.toContain(PASSWORD);
    expect(out).not.toContain('postgresql://');
    expect(out).toContain('[redacted]');
  });

  it('redacts a decoded password when the URL still stores it encoded', () => {
    const decoded = 'p@ss w/rd#1';
    const encoded = encodeURIComponent(decoded);
    const url = `postgresql://postgres.${DEV_REF}:${encoded}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
    const secrets = { url, password: db.passwordFromUrl(url) };
    expect(new URL(url).password).toBe(encoded);
    expect(secrets.password).toBe(decoded);
    const leaked = `url ${url} raw ${decoded} encoded ${encoded} stored ${new URL(url).password}`;
    const out = db.redact(leaked, secrets);
    const fromEncoded = db.redact(leaked, { url, password: new URL(url).password });
    for (const text of [out, fromEncoded]) {
      expect(text).not.toContain(decoded);
      expect(text).not.toContain(encoded);
      expect(text).not.toContain('postgresql://');
    }
  });

  it('redacts child-process stderr before it is returned', async () => {
    const url = databaseUrl(DEV_REF);
    const result = await db.runCaptured(
      process.execPath,
      ['-e', 'console.error(process.argv[1])', url],
      { url, password: PASSWORD }
    );
    expect(result.code).toBe(0);
    expect(result.stderr).not.toContain(PASSWORD);
    expect(result.stderr).not.toContain(url);
    expect(result.stderr).not.toContain('postgresql://');
    expect(result.stderr).toContain('[redacted]');
  });

  it('redacts the URL when a command line is shown', () => {
    const url = databaseUrl(DEV_REF);
    const command = db.pushCommand(url, { dryRun: true, workdir: root });
    const shown = db.formatCommand(command.cmd, command.args, { url, password: PASSWORD });
    expect(shown).not.toContain(PASSWORD);
    expect(shown).not.toContain(url);
    expect(shown).toContain(`supabase@${db.SUPABASE_CLI_VERSION}`);
  });

  it('passes the decoded password to the child and requires ssl', () => {
    const decoded = 'p@ss w/rd#1';
    const url = `postgresql://postgres.${DEV_REF}:${encodeURIComponent(decoded)}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
    const env = db.scrubbedEnv({ url, password: db.passwordFromUrl(url) });
    expect(env.PGPASSWORD).toBe(decoded);
    expect(env.PGSSLMODE).toBe('require');
    expect(env.SUPABASE_DB_URL_DEV).toBeUndefined();
    expect(env.SUPABASE_DB_URL_PROD).toBeUndefined();
  });
});

describe('migration history', () => {
  const local = [
    { version: '20261124032500', name: 'profiles_username' },
    { version: '20261124120000', name: 'username_rpcs' }
  ];

  it('parses a migration filename into a version and a name', () => {
    expect(db.parseMigrationFileName('20261124120000_username_rpcs.sql')).toEqual({
      version: '20261124120000',
      name: 'username_rpcs',
      file: '20261124120000_username_rpcs.sql'
    });
    expect(db.parseMigrationFileName('not-a-migration.sql')).toBeNull();
  });

  it('allows a later pending file when earlier versions are already applied', () => {
    const history = db.checkHistory(local, [local[0]]);
    expect(history.ok).toBe(true);
    expect(history.blocks).toEqual([]);
    expect(history.pending).toEqual([local[1]]);
  });

  it('allows every local file when the remote history is empty', () => {
    const history = db.checkHistory(local, []);
    expect(history.ok).toBe(true);
    expect(history.pending).toEqual(local);
  });

  it('stops on a remote-only version', () => {
    const history = db.checkHistory(
      [local[0]],
      [local[0], { version: '20261125010101', name: 'made_on_the_server' }]
    );
    expect(history.ok).toBe(false);
    expect(history.blocks).toEqual([
      { kind: 'remote-only', version: '20261125010101', name: 'made_on_the_server' }
    ]);
  });

  it('stops when the same name is stored under a different version and prints fix-up SQL', () => {
    const history = db.checkHistory(local, [
      local[0],
      { version: '20261124143000', name: 'username_rpcs' }
    ]);
    expect(history.ok).toBe(false);
    expect(history.pending).toEqual([]);
    expect(history.blocks).toEqual([{
      kind: 'version-mismatch',
      name: 'username_rpcs',
      localVersion: '20261124120000',
      remoteVersion: '20261124143000',
      sql: "update supabase_migrations.schema_migrations set version='20261124120000' where version='20261124143000' and name='username_rpcs';"
    }]);
  });

  it('stops on a pending file whose version is older than a remote version', () => {
    const history = db.checkHistory(local, [local[1]]);
    expect(history.ok).toBe(false);
    expect(history.blocks).toEqual([{
      kind: 'out-of-order',
      version: '20261124032500',
      name: 'profiles_username'
    }]);
  });

  it('reports a version mismatch and an older pending file together', () => {
    const history = db.checkHistory(
      [
        { version: '20261124010000', name: 'earlier' },
        { version: '20261124120000', name: 'username_rpcs' }
      ],
      [{ version: '20261124143000', name: 'username_rpcs' }]
    );
    expect(history.ok).toBe(false);
    expect(history.blocks.map((block) => block.kind)).toEqual(['version-mismatch', 'out-of-order']);
  });

  it('stops when one version is recorded under a different name', () => {
    const history = db.checkHistory(local, [{
      version: '20261124032500',
      name: 'not_profiles_username'
    }]);
    expect(history.ok).toBe(false);
    expect(history.blocks[0]).toMatchObject({
      kind: 'name-differs',
      version: '20261124032500',
      localName: 'profiles_username',
      remoteName: 'not_profiles_username'
    });
  });

  it('does not run the fix-up SQL or any push when history is blocked', async () => {
    const history = db.checkHistory(local, [{ version: '20261124143000', name: 'username_rpcs' }]);
    const commands = db.commandsFor({
      command: 'apply',
      dbUrl: databaseUrl(DEV_REF),
      workdir: root,
      verifyPaths: [path.join(root, 'scripts/db/verify/20261124032500.sql')],
      pendingCount: 1
    });
    const run = jest.fn(async () => ({ code: 0 }));
    const result = await db.runSteps({ history, commands, run });
    expect(history.blocks.some((block) => block.sql)).toBe(true);
    expect(result.code).not.toBe(0);
    expect(run).not.toHaveBeenCalled();
  });
});

describe('commands', () => {
  const url = databaseUrl(DEV_REF);
  const verifyPaths = [
    path.join(root, 'scripts/db/verify/20261124032500.sql'),
    path.join(root, 'scripts/db/verify/20261124120000.sql')
  ];

  function joined(commands) {
    return commands.map((command) => [command.cmd, ...command.args].join(' '));
  }

  it('plans a dry run and applies that dry run before a real push, then verify', () => {
    const plan = db.commandsFor({ command: 'plan', dbUrl: url, workdir: root });
    const apply = db.commandsFor({
      command: 'apply', dbUrl: url, workdir: root, verifyPaths, pendingCount: 2
    });
    const verify = db.commandsFor({ command: 'verify', dbUrl: url, workdir: root, verifyPaths });
    const planText = joined(plan).join('\n');
    const applyText = joined(apply).join('\n');

    expect(plan).toHaveLength(1);
    expect(planText).toContain('db push');
    expect(planText).toContain('--dry-run');
    expect(planText).toContain(`supabase@${db.SUPABASE_CLI_VERSION}`);
    expect(planText).toContain(`--remote=${db.withoutPassword(url)}`);
    expect(planText).not.toContain('--db-url');
    expect(planText).not.toContain(PASSWORD);

    expect(applyText.indexOf('--dry-run')).toBeGreaterThan(-1);
    expect(applyText.indexOf('--dry-run')).toBeLessThan(applyText.lastIndexOf('db push'));
    expect(apply[1].args).not.toContain('--dry-run');
    expect(applyText).toContain(verifyPaths[0]);
    expect(applyText).toContain(verifyPaths[1]);
    expect(verify.map((command) => command.cmd)).toEqual(['psql', 'psql']);
    expect(joined(verify).join('\n')).toContain(verifyPaths[0]);

    for (const text of [planText, applyText, joined(verify).join('\n')]) {
      expect(text).not.toMatch(/pgtap/i);
      expect(text).not.toMatch(/tests\/db/);
      expect(text).not.toContain('--include-all');
    }
  });

  it('puts no password in any argument', () => {
    const decoded = 'p@ss w/rd#1';
    const encoded = encodeURIComponent(decoded);
    const secretUrl = `postgresql://postgres.${DEV_REF}:${encoded}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
    const commands = ['plan', 'apply', 'verify', 'status'].flatMap((command) => db.commandsFor({
      command,
      dbUrl: secretUrl,
      workdir: root,
      verifyPaths,
      pendingCount: 1
    }));
    for (const command of commands) {
      for (const entry of [command.cmd, ...command.args]) {
        expect(entry).not.toContain(decoded);
        expect(entry).not.toContain(encoded);
      }
    }
  });

  it('skips the push when nothing is pending', () => {
    const commands = db.commandsFor({
      command: 'apply', dbUrl: url, workdir: root, verifyPaths, pendingCount: 0
    });
    const pushes = commands.filter((command) => command.args.includes('push'));
    expect(pushes).toHaveLength(1);
    expect(pushes[0].args).toContain('--dry-run');
  });

  it('runs a verify file only for an applied version that has one', () => {
    const available = [
      { version: '20261124032500', path: verifyPaths[0] },
      { version: '20261124120000', path: verifyPaths[1] }
    ];
    expect(db.verifyFilesForVersions(['20261124120000', '20261124032500', '20261125000000'], available))
      .toEqual(verifyPaths);
    expect(db.verifyFilesForVersions(['20261124032500'], available)).toEqual([verifyPaths[0]]);
  });

  it('stops after a failed dry run and does not push', async () => {
    const history = { ok: true, blocks: [], pending: [] };
    const commands = db.commandsFor({
      command: 'apply', dbUrl: url, workdir: root, verifyPaths, pendingCount: 1
    });
    const run = jest.fn()
      .mockResolvedValueOnce({ code: 1 })
      .mockResolvedValue({ code: 0 });
    const result = await db.runSteps({ history, commands, run });
    expect(result.code).toBe(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(commands[0].args).toContain('--dry-run');
  });

  it('pins the supabase CLI at 3.3.0', () => {
    expect(db.SUPABASE_CLI_VERSION).toBe('3.3.0');
  });
});

describe('env and history text', () => {
  it('prefers the process environment over .env.db.local', () => {
    const fileText = [
      'SUPABASE_DB_URL_DEV=from-file',
      'export SUPABASE_DB_URL_PROD="from-prod-file"',
      '# comment',
      ''
    ].join('\n');
    expect(db.resolveDatabaseUrl({
      env: 'dev',
      processEnv: { SUPABASE_DB_URL_DEV: 'from-env' },
      fileText
    })).toBe('from-env');
    expect(db.resolveDatabaseUrl({
      env: 'prod',
      processEnv: {},
      fileText
    })).toBe('from-prod-file');
    expect(() => db.resolveDatabaseUrl({ env: 'dev', processEnv: {}, fileText: '' })).toThrow(
      /SUPABASE_DB_URL_DEV/
    );
  });

  it('parses history tuples and treats a missing history table as empty', () => {
    expect(db.parseHistoryTuples('20261124032500|profiles_username\n\n20261124120000|username_rpcs\n')).toEqual([
      { version: '20261124032500', name: 'profiles_username' },
      { version: '20261124120000', name: 'username_rpcs' }
    ]);
    expect(db.missingHistory('ERROR:  relation "supabase_migrations.schema_migrations" does not exist')).toBe(true);
    expect(db.missingHistory('ERROR:  schema "supabase_migrations" does not exist')).toBe(true);
    expect(db.missingHistory('password authentication failed')).toBe(false);
  });

  it('reads status, plan, apply and verify with --env', () => {
    expect(db.parseArgs(['plan', '--env', 'dev'])).toEqual({ command: 'plan', env: 'dev', confirm: undefined });
    expect(db.parseArgs(['apply', '--env=prod', `--confirm=${PROD_REF}`])).toEqual({
      command: 'apply',
      env: 'prod',
      confirm: PROD_REF
    });
    expect(() => db.parseArgs(['push', '--env', 'dev'])).toThrow(/status\|plan\|apply\|verify/);
    expect(() => db.parseArgs(['status'])).toThrow(/--env/);
  });
});

describe('verify.sql', () => {
  const sql = (version) => fs.readFileSync(path.join(root, 'scripts/db/verify', `${version}.sql`), 'utf8');

  it('checks the username objects and does not write or load pgTAP', () => {
    const profiles = sql('20261124032500');
    const functions = sql('20261124120000');
    expect(functions).toMatch(/has_function_privilege/);
    expect(functions).toMatch(/check_username/);
    expect(functions).toMatch(/set_username/);
    expect(functions).toMatch(/['"]anon['"]/);
    expect(functions).toMatch(/['"]authenticated['"]/);
    expect(functions).toMatch(/prosecdef/);
    expect(functions).toMatch(/search_path/);
    expect(profiles).toMatch(/relrowsecurity/);
    expect(profiles).toMatch(/pg_policy/);
    expect(profiles).toMatch(/profiles_select_own/);
    for (const text of [profiles, functions]) {
      expect(text).toMatch(/default_transaction_read_only/);
      expect(text.toLowerCase()).not.toMatch(/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|pgtap)\b/);
    }
  });
});

(process.env.LF_DB_LOCAL === '1' ? it : it.skip)(
  'verify.sql passes on local postgres built from the migrations',
  () => {
    const { spawnSync } = require('child_process');
    const name = 'lf-migrate-verify';
    const image = 'public.ecr.aws/supabase/postgres:17.12.0.002';
    const cleanup = () => spawnSync('podman', ['rm', '-f', name], { encoding: 'utf8' });
    const exec = (args, input) => spawnSync('podman', ['exec', '-i', name, ...args], {
      encoding: 'utf8',
      input
    });
    cleanup();
    try {
      const started = spawnSync('podman', [
        'run', '-d', '--name', name,
        '-e', 'POSTGRES_PASSWORD=postgres',
        '-e', 'POSTGRES_HOST=/var/run/postgresql',
        '-e', 'POSTGRES_DB=postgres',
        image
      ], { encoding: 'utf8' });
      if (started.status !== 0) {
        throw new Error(started.stderr || started.stdout);
      }
      let ready = false;
      for (let i = 0; i < 120; i += 1) {
        const logs = spawnSync('podman', ['logs', name], { encoding: 'utf8' });
        const text = `${logs.stdout || ''}${logs.stderr || ''}`;
        const ping = exec(['pg_isready', '-U', 'postgres', '-d', 'postgres']);
        if (text.includes('PostgreSQL init process complete') && ping.status === 0) {
          ready = true;
          break;
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
      }
      if (!ready) throw new Error('local postgres did not become ready');
      for (const file of ['20261124032500_profiles_username.sql', '20261124120000_username_rpcs.sql']) {
        const body = fs.readFileSync(path.join(root, 'supabase/migrations', file));
        const applied = exec(['psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '-'], body);
        if (applied.status !== 0) {
          throw new Error(applied.stderr || applied.stdout);
        }
      }
      let policyList = '';
      for (const version of ['20261124032500', '20261124120000']) {
        const verify = exec(
          ['psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '-'],
          fs.readFileSync(path.join(root, 'scripts/db/verify', `${version}.sql`))
        );
        if (verify.status !== 0) {
          throw new Error(verify.stderr || verify.stdout || `psql exited ${verify.status}`);
        }
        policyList += verify.stdout || '';
      }
      expect(policyList).toContain('profiles_select_own');
    } finally {
      cleanup();
    }
  },
  180000
);
