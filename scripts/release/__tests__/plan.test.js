const { parseArgs, planRelease } = require('../plan');
const config = require('../config');

const goodContext = (overrides = {}) => ({
  appVersion: '1.0.3',
  branch: 'main',
  hasTrackedChanges: false,
  matchesOrigin: true,
  environments: { production: config.supabaseHosts.production, preview: config.supabaseHosts.preview },
  ...overrides
});

const plan = (argv, context) => planRelease(parseArgs(argv), goodContext(context));

describe('parseArgs', () => {
  it('defaults to a production release of both platforms that submits', () => {
    expect(parseArgs([])).toMatchObject({
      command: 'release', platform: 'all', build: 'production', track: null, submit: true, submitOnly: false
    });
  });

  it('reads value flags with a space or an equals sign', () => {
    expect(parseArgs(['--platform', 'ios', '--build=preview'])).toMatchObject({ platform: 'ios', build: 'preview' });
  });

  it('takes a leading subcommand', () => {
    expect(parseArgs(['preflight', '--yes']).command).toBe('preflight');
  });

  it.each([
    [['--platform', 'web'], /--platform/],
    [['--build', 'staging'], /--build/],
    [['--track', 'prod'], /--track/],
    [['--platform'], /needs a value/],
    [['--nope'], /Unknown flag/],
    [['deploy'], /Unknown command/]
  ])('rejects %j', (argv, message) => {
    expect(() => parseArgs(argv)).toThrow(message);
  });
});

describe('planRelease commands', () => {
  it('builds production for both platforms and auto-submits to the internal track', () => {
    expect(plan([]).steps).toEqual([[
      'build', '--platform', 'all', '--profile', 'production', '--non-interactive',
      '--auto-submit-with-profile=production'
    ]]);
  });

  it.each([
    ['closed', 'production-closed'],
    ['open', 'production-open']
  ])('maps the %s track to submit profile %s', (track, profile) => {
    expect(plan(['--platform', 'android', '--track', track]).steps[0]).toContain(
      `--auto-submit-with-profile=${profile}`
    );
  });

  it('builds without submitting when --no-submit is set', () => {
    const step = plan(['--no-submit']).steps[0];
    expect(step.some((arg) => arg.startsWith('--auto-submit'))).toBe(false);
  });

  it('builds a preview with the preview profile and never submits', () => {
    const result = plan(['--build', 'preview', '--platform', 'android']);
    expect(result.errors).toEqual([]);
    expect(result.steps).toEqual([['build', '--platform', 'android', '--profile', 'preview', '--non-interactive']]);
  });

  it('submits the latest build per platform with --submit-only', () => {
    expect(plan(['--submit-only', '--track', 'closed']).steps).toEqual([
      ['submit', '--platform', 'ios', '--profile', 'production-closed', '--latest', '--non-interactive'],
      ['submit', '--platform', 'android', '--profile', 'production-closed', '--latest', '--non-interactive']
    ]);
  });
});

describe('planRelease guards', () => {
  it('rejects option combinations that make no sense', () => {
    expect(plan(['--build', 'preview', '--track', 'open']).errors[0]).toMatch(/--track/);
    expect(plan(['--build', 'preview', '--submit-only']).errors[0]).toMatch(/--submit-only/);
    expect(plan(['--platform', 'ios', '--track', 'open']).errors[0]).toMatch(/Android/);
    expect(plan(['--submit-only', '--no-submit']).errors[0]).toMatch(/cannot be used together/);
  });

  it('requires production builds to come from an up-to-date, clean main', () => {
    expect(plan([], { branch: 'feat/x' }).errors[0]).toMatch(/must run from main/);
    expect(plan([], { hasTrackedChanges: true }).errors[0]).toMatch(/uncommitted/);
    expect(plan([], { matchesOrigin: false }).errors[0]).toMatch(/origin\/main/);
  });

  it('lets preview builds run from any branch and only warns about a dirty tree', () => {
    const result = plan(['--build', 'preview'], { branch: 'feat/x', hasTrackedChanges: true });
    expect(result.errors).toEqual([]);
    expect(result.warnings[0]).toMatch(/uncommitted/);
  });

  it('does not check the checkout when only submitting an existing build', () => {
    expect(plan(['--submit-only'], { branch: 'feat/x', environments: {} }).errors).toEqual([]);
  });

  it('refuses a missing or swapped Supabase environment', () => {
    expect(plan([], { environments: {} }).errors[0]).toMatch(/no EXPO_PUBLIC_SUPABASE_URL/);
    const swapped = { production: config.supabaseHosts.preview, preview: config.supabaseHosts.production };
    expect(plan([], { environments: swapped }).errors[0]).toMatch(/expected/);
    expect(plan(['--build', 'preview'], { environments: swapped }).errors[0]).toMatch(/expected/);
  });
});

describe('summary', () => {
  it('names the database and destination', () => {
    const production = plan([]).summary.join('\n');
    expect(production).toMatch(/prod Supabase project/);
    expect(production).toMatch(/TestFlight \+ Play internal track/);
    expect(plan(['--build', 'preview']).summary.join('\n')).toMatch(/dev Supabase project[\s\S]*install links only/);
  });
});
