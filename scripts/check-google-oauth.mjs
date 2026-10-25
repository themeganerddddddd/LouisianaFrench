#!/usr/bin/env node
/**
 * Local Google OAuth check — no Expo Go / emulator required.
 *
 * 1) Prints what resolveAuthRedirect would return (storeClient vs standalone).
 * 2) Probes whether Supabase+Google accept several redirect URLs.
 * 3) Optional live login: starts http://127.0.0.1:8765/auth/callback,
 *    opens the browser, exchanges the returned code.
 *
 * Usage:
 *   node scripts/check-google-oauth.mjs           # decision table + probe
 *   node scripts/check-google-oauth.mjs --live    # desktop browser login
 *
 * Before --live, add this to Supabase → Auth → Redirect URLs:
 *   http://127.0.0.1:8765/auth/callback
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);

const LIVE_REDIRECT = 'http://127.0.0.1:8765/auth/callback';
const STANDALONE = 'com.westleysturhan.louisianafrench://auth/callback';
const EXPO_EMULATOR = 'exp://10.0.2.2:8082/--/auth/callback';
const EXPO_LAN = 'exp://172.16.0.103:8082/--/auth/callback';
const EXPO_GO_EXAMPLE = 'exp://127.0.0.1:8081/--/auth/callback';

function printRedirectDecisionTable() {
  const source = readFileSync(
    new URL('../src/identity/connector.js', import.meta.url),
    'utf8'
  );
  const alwaysCreateURL = /createURL\(['"]auth\/callback['"]\)/.test(source);
  const hardcodesStandaloneForOauth =
    /redirectTo\s*=\s*STANDALONE_AUTH_REDIRECT/.test(source) &&
    !/resolveAuthRedirect\(/.test(source);

  console.log('resolveAuthRedirect (Linking.createURL):\n');
  console.log('• Expo Go runtime → exp://<host>:port/--/auth/callback');
  console.log(`  example: ${EXPO_GO_EXAMPLE}`);
  console.log('• Release / dev build → app scheme');
  console.log(`  example: ${STANDALONE}`);
  console.log('');

  if (alwaysCreateURL && !hardcodesStandaloneForOauth) {
    console.log('OK: connector always uses Linking.createURL("auth/callback").\n');
  } else {
    console.warn('WARN: connector may still hardcode the standalone OAuth redirect.\n');
  }
}

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of text.split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) process.env[match[1]] = match[2].trim();
    }
  } catch {
    /* optional */
  }
}

function requireEnv() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (.env.local).');
    process.exit(1);
  }
  return { url, key };
}

async function googleErrorForRedirect(supabaseUrl, anonKey, redirectTo) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, detectSessionInUrl: false, flowType: 'pkce' }
  });
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true }
  });
  if (error || !data?.url) {
    return { ok: false, stage: 'supabase', detail: error?.message || 'no authorize url' };
  }

  const authorize = data.url;
  const res = await fetch(authorize, {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 LouisianaFrench-oauth-check' }
  });
  const location = res.headers.get('location') || '';
  if (!location.includes('accounts.google.com')) {
    const body = await res.text().catch(() => '');
    return {
      ok: false,
      stage: 'supabase-redirect',
      detail: `status ${res.status}; expected Google Location`,
      authorize,
      body: body.slice(0, 200)
    };
  }

  const google = new URL(location);
  const html = await fetch(location, {
    headers: { 'User-Agent': 'Mozilla/5.0 LouisianaFrench-oauth-check' }
  }).then((r) => r.text());

  const mismatch = /redirect_uri_mismatch/i.test(html);
  const invalid = /request is invalid|Error 400/i.test(html);
  return {
    ok: !mismatch && !invalid,
    stage: 'google',
    authorize,
    googleClientId: google.searchParams.get('client_id'),
    googleRedirectUri: google.searchParams.get('redirect_uri'),
    supabaseRedirectTo: redirectTo,
    error: mismatch ? 'redirect_uri_mismatch' : invalid ? 'invalid_request' : null
  };
}

async function probe(supabaseUrl, anonKey) {
  const candidates = [
    ['standalone scheme (release build)', STANDALONE],
    ['Expo Go on emulator', EXPO_EMULATOR],
    ['Expo Go on LAN phone', EXPO_LAN],
    ['local desktop live test', LIVE_REDIRECT]
  ];

  console.log(`Supabase: ${supabaseUrl}\n`);
  console.log('Probe: can Supabase hand Google a URL that Google accepts?\n');

  for (const [label, redirectTo] of candidates) {
    process.stdout.write(`• ${label}\n  redirectTo: ${redirectTo}\n`);
    try {
      const result = await googleErrorForRedirect(supabaseUrl, anonKey, redirectTo);
      if (result.ok) {
        console.log('  OK — Google sign-in page loads (no redirect_uri_mismatch)');
        console.log(`  Google redirect_uri: ${result.googleRedirectUri}`);
      } else {
        console.log(`  FAIL @ ${result.stage}: ${result.error || result.detail}`);
        if (result.googleRedirectUri) {
          console.log(`  Google redirect_uri: ${result.googleRedirectUri}`);
        }
      }
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
    }
    console.log('');
  }

  await printAdbDeepLinkMatrix();

  console.log('Notes:');
  console.log('- Google redirect_uri must be https://<project>.supabase.co/auth/v1/callback on the Web client.');
  console.log('- Expo Go cannot open com.westleysturhan.louisianafrench:// (adb: DEAD).');
  console.log('- BLOCKER: Supabase Auth rejects redirect URLs whose host is a raw IPv4');
  console.log('  (https://github.com/supabase/auth/issues/2039).');
  console.log('  exp://172.x.x.x:8081/--/… is allow-listed but still replaced by Site URL.');
  console.log('  Workarounds:');
  console.log('    1) npx expo start --tunnel   (hostname, not IP)');
  console.log('    2) npx expo run:android      (dev build; app scheme works)');
  console.log('- Supabase Redirect URLs: exp://** plus the app scheme.');
  console.log('- Desktop proof: npm run check:google-oauth -- --live');
}

async function printAdbDeepLinkMatrix() {
  console.log('ADB deep-link resolve (needs a connected device/emulator):\n');
  try {
    await execFileAsync('adb', ['get-state'], { timeout: 3000 });
  } catch {
    console.log('  (skipped — adb not ready)\n');
    return;
  }

  const urls = [STANDALONE, EXPO_EMULATOR, EXPO_LAN, LIVE_REDIRECT];
  for (const url of urls) {
    try {
      const { stdout, stderr } = await execFileAsync(
        'adb',
        [
          'shell',
          'cmd',
          'package',
          'resolve-activity',
          '--brief',
          '-a',
          'android.intent.action.VIEW',
          '-d',
          url
        ],
        { timeout: 5000 }
      );
      const line = `${stdout}${stderr}`
        .trim()
        .split('\n')
        .filter(Boolean)
        .pop();
      const ok = line && !/No activity found/i.test(line);
      console.log(`• ${ok ? 'OK' : 'DEAD'}  ${url}`);
      console.log(`    → ${line || '(empty)'}`);
    } catch (err) {
      console.log(`• ERR   ${url}`);
      console.log(`    → ${err.stderr || err.message}`);
    }
  }
  console.log('');
}

function openInBrowser(url) {
  const platform = process.platform;
  if (platform === 'darwin') execFile('open', [url]);
  else if (platform === 'linux') execFile('xdg-open', [url]);
  else execFile('cmd', ['/c', 'start', url]);
}

async function live(supabaseUrl, anonKey) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, detectSessionInUrl: false, flowType: 'pkce' }
  });

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: LIVE_REDIRECT, skipBrowserRedirect: true }
  });
  if (error || !data?.url) {
    console.error('Could not start OAuth:', error?.message || 'no url');
    console.error(`Add ${LIVE_REDIRECT} to Supabase Redirect URLs and retry.`);
    process.exit(1);
  }

  const server = createServer(async (req, res) => {
    try {
      const arrived = new URL(req.url, LIVE_REDIRECT);
      if (arrived.pathname !== '/auth/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const code = arrived.searchParams.get('code');
      const err = arrived.searchParams.get('error');
      if (err) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>OAuth error</h1><pre>${err}</pre>`);
        console.error('Provider error:', err, arrived.searchParams.get('error_description'));
        server.close();
        process.exit(1);
      }
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Missing code</h1>');
        console.error('Callback had no code. Full URL:', arrived.href);
        server.close();
        process.exit(1);
      }

      const exchanged = await client.auth.exchangeCodeForSession(code);
      if (exchanged.error || !exchanged.data?.session) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>Exchange failed</h1><pre>${exchanged.error?.message || 'no session'}</pre>`);
        console.error('exchangeCodeForSession failed:', exchanged.error?.message);
        server.close();
        process.exit(1);
      }

      const user = exchanged.data.session.user;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        `<h1>Google sign-in works</h1><p>${user.email || user.id}</p><p>You can close this tab.</p>`
      );
      console.log('\nSUCCESS');
      console.log('  id:', user.id);
      console.log('  email:', user.email);
      console.log('  name:', user.user_metadata?.full_name || user.user_metadata?.display_name || '(none)');
      console.log('Supabase + Google web client are fine. Phone/Expo Go issues are redirect/deep-link only.');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end('Server error');
      server.close();
      process.exit(1);
    }
  });

  await new Promise((resolve) => server.listen(8765, '127.0.0.1', resolve));
  console.log(`Listening for callback on ${LIVE_REDIRECT}`);
  console.log('Opening Google sign-in in your desktop browser…');
  console.log('(If the browser errors immediately, add that URL to Supabase Redirect URLs.)\n');
  console.log(data.url);
  openInBrowser(data.url);
}

loadEnvLocal();
const { url, key } = requireEnv();
const liveMode = process.argv.includes('--live');
if (liveMode) {
  await live(url, key);
} else {
  printRedirectDecisionTable();
  await probe(url, key);
}
