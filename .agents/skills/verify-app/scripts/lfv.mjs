#!/usr/bin/env node
// Drive Louisiana Languages on an isolated Android emulator through Expo Go.
// Usage: lfv.mjs <up|doctor|open|dump|tap|wait|type|key|swipe|shot|rec-start|rec-stop|logs|down> [args]
// Run `lfv.mjs help` for details. State lives in $TMPDIR/lfv-<port>/; evidence in tmp/verify/<stamp>/.

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const PORT = Number(process.env.LFV_PORT || 8097);
const EMU_PORT = Number(process.env.LFV_EMU_PORT || 5580);
const AVD = process.env.LFV_AVD || 'lf-api35';
const SERIAL = `emulator-${EMU_PORT}`;
const RUN_DIR = join(tmpdir(), `lfv-${PORT}`);
const STATE = join(RUN_DIR, 'state.json');
const METRO_SESSION = `lfv-metro-${PORT}`;
const EXPO_GO = 'host.exp.exponent';
const APP_URL = `exp://127.0.0.1:${PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const die = (msg) => {
  console.error(`lfv: ${msg}`);
  process.exit(1);
};

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}
function trySh(cmd, args, opts) {
  try {
    return sh(cmd, args, opts);
  } catch {
    return null;
  }
}
const adb = (...args) => sh('adb', ['-s', SERIAL, ...args]);
const tryAdb = (...args) => trySh('adb', ['-s', SERIAL, ...args]);

function loadState() {
  return existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
}
function saveState(patch) {
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(STATE, JSON.stringify({ ...loadState(), ...patch }, null, 2));
}
function evidenceDir() {
  const s = loadState();
  if (s.evidenceDir) return s.evidenceDir;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = process.env.LFV_EVIDENCE || join(ROOT, 'tmp', 'verify', stamp);
  mkdirSync(dir, { recursive: true });
  saveState({ evidenceDir: dir });
  return dir;
}

const deviceAttached = () => (trySh('adb', ['devices']) || '').split('\n').some((l) => l.startsWith(`${SERIAL}\t`));
const bootCompleted = () => tryAdb('shell', 'getprop', 'sys.boot_completed') === '1';
const metroStatus = () => trySh('curl', ['-s', '--max-time', '2', `http://localhost:${PORT}/status`]);
const metroRunning = () => trySh('tmux', ['has-session', '-t', METRO_SESSION]) !== null;
const pidAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

async function until(check, timeoutMs, label) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await check()) return;
    await sleep(1000);
  }
  die(`timed out after ${timeoutMs / 1000}s waiting for ${label}`);
}

function expoGoApk() {
  const cache = join(homedir(), '.expo', 'android-apk-cache');
  const sdk = JSON.parse(readFileSync(join(ROOT, 'node_modules', 'expo', 'package.json'), 'utf8')).version.split('.')[0];
  const apk = existsSync(cache) && readdirSync(cache).filter((f) => f.startsWith(`Expo-Go-${sdk}.`)).sort().pop();
  if (!apk) die(`no Expo Go ${sdk}.x APK in ${cache}; run \`npx expo start --android\` once against any device to download it`);
  return join(cache, apk);
}

// ---- UI tree -------------------------------------------------------------

function dumpNodes() {
  // uiautomator refuses to dump while an animation is running; retry briefly.
  for (let i = 0; i < 5; i++) {
    // A dump can hang indefinitely while the app is starting; time it out and retry.
    const out = trySh('adb', ['-s', SERIAL, 'exec-out', 'uiautomator', 'dump', '/dev/tty'], { timeout: 15000 });
    if (out && out.includes('<hierarchy')) return parseNodes(out.slice(out.indexOf('<?xml'), out.lastIndexOf('</hierarchy>') + 12));
    spawnSync('sleep', ['0.5']);
  }
  die('uiautomator dump failed (is the screen on and the app in front?)');
}

function parseNodes(xml) {
  const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#10;/g, '\n').replace(/&amp;/g, '&');
  const nodes = [];
  for (const m of xml.matchAll(/<node ([^>]*?)\/?>/g)) {
    const attrs = Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, unescape(v)]));
    const b = attrs.bounds?.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!b) continue;
    const [x1, y1, x2, y2] = b.slice(1).map(Number);
    nodes.push({ id: attrs['resource-id'] || '', text: attrs.text || '', desc: attrs['content-desc'] || '', clickable: attrs.clickable === 'true', x1, y1, x2, y2 });
  }
  return nodes;
}

// Selector forms: id:<testID>, text:<exact>, has:<substring of text or desc>, desc:<exact>.
// A bare value is treated as id:.
function matcher(selector) {
  const i = selector.indexOf(':');
  const kind = i > 0 ? selector.slice(0, i) : 'id';
  const value = i > 0 ? selector.slice(i + 1) : selector;
  const fns = {
    id: (n) => n.id === value,
    text: (n) => n.text === value,
    desc: (n) => n.desc === value,
    has: (n) => n.text.includes(value) || n.desc.includes(value)
  };
  if (!fns[kind]) die(`unknown selector kind "${kind}" (use id:, text:, desc:, has:)`);
  return fns[kind];
}

const visible = (n) => n.x2 > n.x1 && n.y2 > n.y1;
const findNode = (selector) => dumpNodes().filter(visible).find(matcher(selector));

async function waitFor(selector, timeoutMs = 20000) {
  let node;
  await until(() => (node = findNode(selector)), timeoutMs, selector);
  return node;
}

// ---- commands ------------------------------------------------------------

async function up() {
  if (deviceAttached() && !loadState().emuPid) die(`${SERIAL} already exists and was not started by lfv; pick another LFV_EMU_PORT`);
  if (!deviceAttached()) {
    // -read-only lets this AVD run next to a copy the user already has open, and discards
    // every install and app-data change on exit, so each `up` starts from an empty data dir.
    // -no-window selects qemu-system-*-headless, which segfaults on this Fedora host; the
    // windowed binary with a hidden window boots fine.
    const emu = spawn('emulator', ['-avd', AVD, '-port', String(EMU_PORT), '-read-only', '-qt-hide-window', '-no-audio', '-no-boot-anim', '-no-snapshot'], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore']
    });
    emu.unref();
    saveState({ emuPid: emu.pid, serial: SERIAL });
    console.error(`lfv: booting ${AVD} as ${SERIAL} (pid ${emu.pid})`);
  }
  await until(() => deviceAttached() && bootCompleted(), 240000, `${SERIAL} boot`);
  adb('shell', 'settings', 'put', 'global', 'window_animation_scale', '0');
  adb('shell', 'settings', 'put', 'global', 'transition_animation_scale', '0');
  adb('shell', 'settings', 'put', 'global', 'animator_duration_scale', '0');
  if (!tryAdb('shell', 'pm', 'path', EXPO_GO)) {
    console.error('lfv: installing Expo Go');
    adb('install', '-r', expoGoApk());
  }

  if (!metroRunning()) {
    mkdirSync(RUN_DIR, { recursive: true });
    const log = join(RUN_DIR, 'metro.log');
    sh('tmux', ['new-session', '-d', '-s', METRO_SESSION, '-c', ROOT, `CI=1 npx expo start --localhost --port ${PORT} 2>&1 | tee ${log}`]);
    saveState({ metroSession: METRO_SESSION, metroLog: log });
    console.error(`lfv: Metro starting on ${PORT} (tmux ${METRO_SESSION})`);
  }
  await until(() => metroStatus() === 'packager-status:running', 120000, `Metro on ${PORT}`);
  adb('reverse', `tcp:${PORT}`, `tcp:${PORT}`);
  await open();
  evidenceDir();
  console.log(`ready: ${SERIAL} running ${APP_URL}; evidence -> ${evidenceDir()}`);
}

async function open() {
  tryAdb('shell', 'am', 'force-stop', EXPO_GO);
  // Starting Expo Go right after force-stop often closes it at once, back to the launcher.
  await sleep(1500);
  const launch = () => adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', APP_URL, EXPO_GO);
  launch();
  // First bundle on a cold Metro takes ~1-2 min. Ready = a screen of this app, not Expo Go chrome.
  // A fresh Expo Go opens its developer-menu card over the app on first launch; dismiss it.
  await until(() => {
    const nodes = dumpNodes();
    if (nodes.some((n) => n.id.startsWith('com.google.android.apps.nexuslauncher:'))) {
      launch();
      return false;
    }
    if (nodes.some((n) => n.text.startsWith('This is the developer menu'))) {
      const next = nodes.find((n) => n.text === 'Continue');
      if (next) tapNode(next);
      return false;
    }
    if (nodes.some((n) => n.text.startsWith('SDK version'))) {
      const close = nodes.find((n) => n.desc === 'Close');
      if (close) tapNode(close);
      return false;
    }
    return nodes.some((n) => ['language-select-scroll', 'home-scroll'].includes(n.id));
  }, 240000, 'the app to render (language-select-scroll or home-scroll)');
  // Expo Go's floating "Tools" gear sits on top of id:home-language-flag and swallows its taps.
  if (findNode('desc:Tools')) {
    await tap('desc:Tools');
    await waitFor('has:SDK version');
    swipe('up');
    await tap('text:Tools button');
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK');
    await until(() => !findNode('desc:Tools') && !findNode('has:SDK version'), 10000, 'the Tools gear to hide');
  }
  console.error('lfv: app is on screen');
}

function swipe(direction) {
  const [a, b] = direction === 'down' ? [700, 1800] : [1800, 700];
  adb('shell', 'input', 'swipe', '540', String(a), '540', String(b), '300');
}

function doctor() {
  const s = loadState();
  const checks = [
    ['emulator started by lfv', Boolean(s.emuPid && pidAlive(s.emuPid))],
    [`${SERIAL} attached and booted`, deviceAttached() && bootCompleted()],
    ['Expo Go installed', Boolean(deviceAttached() && tryAdb('shell', 'pm', 'path', EXPO_GO))],
    [`Metro on ${PORT} serves ${ROOT}`, metroStatus() === 'packager-status:running' && metroRunning()],
    [`adb reverse tcp:${PORT}`, (tryAdb('reverse', '--list') || '').includes(`tcp:${PORT}`)],
    ['Expo Go in front', (tryAdb('shell', 'dumpsys', 'activity', 'activities') || '').match(/topResumedActivity=.*host\.exp\.exponent/) !== null]
  ];
  for (const [name, ok] of checks) console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (s.evidenceDir) console.log(`evidence: ${s.evidenceDir}`);
  process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
}

function dump(raw) {
  for (const n of dumpNodes().filter(visible)) {
    if (!raw && !n.id && !n.text && !n.desc) continue;
    const label = [n.id && `id:${n.id}`, n.text && `text:${JSON.stringify(n.text)}`, n.desc && `desc:${JSON.stringify(n.desc)}`].filter(Boolean).join(' ');
    console.log(`${label}${n.clickable ? ' [tap]' : ''} @${(n.x1 + n.x2) >> 1},${(n.y1 + n.y2) >> 1}`);
  }
}

const tapNode = (n) => adb('shell', 'input', 'tap', String((n.x1 + n.x2) >> 1), String((n.y1 + n.y2) >> 1));

async function tap(selector) {
  tapNode(await waitFor(selector, 10000));
  console.error(`lfv: tapped ${selector}`);
}

function type(text) {
  // `input text` needs spaces as %s and shell metacharacters escaped.
  const escaped = text.replace(/([\\'"`$&|;<>()*?#~!])/g, '\\$1').replace(/ /g, '%s');
  adb('shell', 'input', 'text', escaped);
}

function shot(name) {
  const file = join(evidenceDir(), name.endsWith('.png') ? name : `${name}.png`);
  writeFileSync(file, execFileSync('adb', ['-s', SERIAL, 'exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 }));
  console.log(file);
}

function recStart(name) {
  const remote = '/sdcard/lfv-rec.mp4';
  const rec = spawn('adb', ['-s', SERIAL, 'shell', 'screenrecord', '--bit-rate', '4000000', remote], { detached: true, stdio: 'ignore' });
  rec.unref();
  saveState({ rec: { pid: rec.pid, remote, name: name.endsWith('.mp4') ? name : `${name}.mp4` } });
  console.error('lfv: recording (max 180s); stop with rec-stop');
}

async function recStop() {
  const { rec } = loadState();
  if (!rec) die('no recording in progress');
  tryAdb('shell', 'pkill', '-INT', 'screenrecord');
  await sleep(1500);
  const file = join(evidenceDir(), rec.name);
  adb('pull', rec.remote, file);
  saveState({ rec: null });
  console.log(file);
}

function down() {
  const s = loadState();
  if (s.rec) tryAdb('shell', 'pkill', '-INT', 'screenrecord');
  if (metroRunning()) trySh('tmux', ['kill-session', '-t', METRO_SESSION]);
  if (s.emuPid) {
    tryAdb('emu', 'kill');
    if (pidAlive(s.emuPid)) process.kill(s.emuPid, 'SIGTERM');
  }
  // Keep the evidence dir; drop only run state.
  if (existsSync(STATE)) writeFileSync(STATE, JSON.stringify({ lastEvidenceDir: s.evidenceDir }, null, 2));
  console.log(`down. evidence kept at ${s.evidenceDir || '(none captured)'}`);
}

const HELP = `lfv — drive Louisiana Languages on an isolated emulator (${SERIAL}, Metro ${PORT})
  up                    boot ${AVD} read-only, install Expo Go, start Metro, open the app
  doctor                read-only health check; exit 1 if anything is off
  open                  force-stop Expo Go and reopen the app (keeps app data)
  dump [--raw]          list on-screen nodes: id:/text:/desc: handles, [tap], centre
  tap <sel>             wait up to 10s for <sel>, tap its centre
  wait <sel> [secs]     wait for <sel> (default 20s); exit 1 on timeout
  type <text>           type into the focused field
  key <KEYCODE>         e.g. BACK, ENTER, TAB
  swipe up|down         scroll the screen
  shot <name>           screenshot -> evidence dir (prints path)
  rec-start <name>      start screen recording; rec-stop pulls the .mp4 to the evidence dir
  logs                  last 60 lines of Metro output (JS errors land here)
  down                  stop Metro and the emulator lfv started; evidence is kept
Selectors: id:<testID> (default), text:<exact>, desc:<exact>, has:<substring>.
Env: LFV_PORT, LFV_EMU_PORT, LFV_AVD, LFV_EVIDENCE.`;

const [cmd, ...args] = process.argv.slice(2);
const commands = {
  up,
  doctor,
  open,
  dump: () => dump(args.includes('--raw')),
  tap: () => tap(args[0] || die('tap needs a selector')),
  wait: async () => {
    await waitFor(args[0] || die('wait needs a selector'), Number(args[1] || 20) * 1000);
  },
  type: () => type(args.join(' ')),
  key: () => adb('shell', 'input', 'keyevent', `KEYCODE_${(args[0] || die('key needs a name')).toUpperCase()}`),
  swipe: () => swipe(args[0]),
  shot: () => shot(args[0] || die('shot needs a name')),
  'rec-start': () => recStart(args[0] || die('rec-start needs a name')),
  'rec-stop': recStop,
  logs: () => console.log((existsSync(join(RUN_DIR, 'metro.log')) ? readFileSync(join(RUN_DIR, 'metro.log'), 'utf8') : '').split('\n').slice(-60).join('\n')),
  down,
  help: () => console.log(HELP)
};
if (!commands[cmd]) {
  console.log(HELP);
  process.exit(cmd ? 1 : 0);
}
await commands[cmd]();
