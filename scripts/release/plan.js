'use strict';

const config = require('./config');

const PLATFORMS = ['ios', 'android', 'all'];
const BUILDS = ['production', 'preview'];
// Track name -> submit profile in eas.json (the profile sets the Play track).
const SUBMIT_PROFILES = {
  internal: 'production',
  closed: 'production-closed',
  open: 'production-open'
};
const COMMANDS = ['release', 'preflight', 'status'];
const VALUE_FLAGS = { '--platform': 'platform', '--build': 'build', '--track': 'track' };
const BOOLEAN_FLAGS = {
  '--no-submit': ['submit', false],
  '--submit-only': ['submitOnly', true],
  '--dry-run': ['dryRun', true],
  '--yes': ['yes', true]
};

function parseArgs(argv) {
  const options = {
    command: 'release',
    platform: 'all',
    build: 'production',
    track: null,
    submit: true,
    submitOnly: false,
    dryRun: false,
    yes: false
  };
  const args = [...argv];
  if (args[0] && !args[0].startsWith('-')) options.command = args.shift();
  if (!COMMANDS.includes(options.command)) {
    throw new Error(`Unknown command "${options.command}". Use: ${COMMANDS.join(', ')}`);
  }

  while (args.length) {
    const arg = args.shift();
    const eq = arg.indexOf('=');
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    if (BOOLEAN_FLAGS[flag]) {
      const [key, value] = BOOLEAN_FLAGS[flag];
      options[key] = value;
    } else if (VALUE_FLAGS[flag]) {
      const value = eq === -1 ? args.shift() : arg.slice(eq + 1);
      if (!value) throw new Error(`${flag} needs a value`);
      options[VALUE_FLAGS[flag]] = value;
    } else {
      throw new Error(`Unknown flag "${flag}"`);
    }
  }

  if (!PLATFORMS.includes(options.platform)) {
    throw new Error(`--platform must be one of: ${PLATFORMS.join(', ')}`);
  }
  if (!BUILDS.includes(options.build)) {
    throw new Error(`--build must be one of: ${BUILDS.join(', ')}`);
  }
  if (options.track && !SUBMIT_PROFILES[options.track]) {
    throw new Error(`--track must be one of: ${Object.keys(SUBMIT_PROFILES).join(', ')}`);
  }
  return options;
}

function platformsOf(platform) {
  return platform === 'all' ? ['ios', 'android'] : [platform];
}

function easSteps(options) {
  const submitProfile = SUBMIT_PROFILES[options.track || 'internal'];
  if (options.submitOnly) {
    return platformsOf(options.platform).map((platform) => [
      'submit', '--platform', platform, '--profile', submitProfile, '--latest', '--non-interactive'
    ]);
  }
  const args = ['build', '--platform', options.platform, '--profile', options.build, '--non-interactive'];
  if (options.build === 'production' && options.submit) {
    args.push(`--auto-submit-with-profile=${submitProfile}`);
  }
  return [args];
}

function optionErrors(options) {
  const errors = [];
  if (options.build === 'preview') {
    if (options.track) errors.push('--track only applies to production builds (preview builds are never uploaded to a store).');
    if (options.submitOnly) errors.push('--submit-only only applies to production builds.');
  }
  if (options.track && options.platform === 'ios') {
    errors.push('--track only applies to Android; iOS builds always go to TestFlight.');
  }
  if (options.submitOnly && !options.submit) {
    errors.push('--submit-only and --no-submit cannot be used together.');
  }
  return errors;
}

/**
 * Safety checks against the state of the checkout and the EAS environments.
 * `ctx` comes from the runner: { branch, hasTrackedChanges, matchesOrigin, environments }.
 */
function guardResults(options, ctx) {
  const errors = [];
  const warnings = [];
  const buildsProduction = options.build === 'production' && !options.submitOnly;

  if (buildsProduction) {
    if (ctx.branch !== 'main') errors.push(`Production builds must run from main (current branch: ${ctx.branch || 'detached'}).`);
    if (ctx.hasTrackedChanges) errors.push('Working tree has uncommitted changes to tracked files.');
    if (!ctx.matchesOrigin) errors.push('Local main does not match origin/main. Pull (or push) first.');
  } else if (options.build === 'preview' && ctx.hasTrackedChanges) {
    warnings.push('Working tree has uncommitted changes; this preview build will include them.');
  }

  if (!options.submitOnly) {
    const host = ctx.environments[options.build];
    if (!host) {
      errors.push(`EAS "${options.build}" environment has no EXPO_PUBLIC_SUPABASE_URL.`);
    } else if (host !== config.supabaseHosts[options.build]) {
      errors.push(
        `EAS "${options.build}" environment points at ${host}, expected ${config.supabaseHosts[options.build]}.`
      );
    }
  }
  return { errors, warnings };
}

function summaryLines(options, ctx) {
  if (options.submitOnly) {
    return [`Submit latest ${options.platform} production build to ${options.track || 'internal'} track / TestFlight`];
  }
  const database = options.build === 'production' ? 'prod Supabase project' : 'dev Supabase project';
  const destination =
    options.build === 'production' && options.submit
      ? `TestFlight + Play ${options.track || 'internal'} track`
      : options.build === 'production'
        ? 'EAS only (no store upload)'
        : 'install links only (no store upload)';
  return [
    `${options.build} build · ${options.platform} · app version ${ctx.appVersion}`,
    `Database: ${database} (${ctx.environments[options.build] || 'unknown'})`,
    `Destination: ${destination}`
  ];
}

function planRelease(options, ctx) {
  const guard = guardResults(options, ctx);
  return {
    errors: [...optionErrors(options), ...guard.errors],
    warnings: guard.warnings,
    summary: summaryLines(options, ctx),
    steps: easSteps(options)
  };
}

module.exports = { parseArgs, planRelease };
