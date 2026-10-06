import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = name => path.join(root, name);
const read = name => fs.readFileSync(file(name), 'utf8');
const write = (name, value) => {
  const target = file(name);
  const current = fs.readFileSync(target, 'utf8');
  if (current !== value) fs.writeFileSync(target, value);
};
const uiSources = [
  'src/legacy-ui/foundation.js',
  'src/legacy-ui/account.js',
  'src/legacy-ui/clinical.js',
  'src/legacy-ui/sync.js',
  'src/legacy-ui/bootstrap.js'
];

function fail(message) {
  console.error(`Release sync failed: ${message}`);
  process.exit(1);
}

function compareVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const delta = (left[i] || 0) - (right[i] || 0);
    if (delta) return delta;
  }
  return 0;
}

function releaseHistory(source) {
  const marker = 'var RELEASE_HISTORY=';
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) fail('src/legacy-ui/foundation.js is missing RELEASE_HISTORY.');
  const start = source.indexOf('[', markerIndex + marker.length);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === '[') depth++;
    if (char === ']') {
      depth--;
      if (depth === 0) {
        const literal = source.slice(start, i + 1);
        const raw = Function(`"use strict"; return (${literal});`)();
        const entries = raw.map(entry => Array.isArray(entry)
          ? { version: entry[0], date: entry[1], title: entry[2], changes: entry[3], policy: entry[4] }
          : entry);
        return { start, end: i + 1, entries, compact: raw.every(Array.isArray) };
      }
    }
  }
  fail('Could not parse RELEASE_HISTORY.');
}

const release = JSON.parse(read('release.json'));
const version = String(release.version || '').trim();
if (!/^\d+(?:\.\d+)+$/.test(version)) fail('release.json has an invalid version.');
if (!String(release.title || '').trim()) fail('release.json must contain a title.');
if (!String(release.date || '').trim()) fail('release.json must contain a date.');
if (!Array.isArray(release.changes) || release.changes.length < 1 || release.changes.some(item => !String(item).trim())) {
  fail('release.json must contain at least one non-empty change.');
}

let core = read('app-core.js');
if (!/var APP_VERSION = '[^']+';/.test(core)) fail('app-core.js is missing APP_VERSION.');
core = core.replace(/var APP_VERSION = '[^']+';/, `var APP_VERSION = '${version}';`);
write('app-core.js', core);

let foundation = read(uiSources[0]);
const parsedHistory = releaseHistory(foundation);
const latest = parsedHistory.entries[0];
if (!latest) fail('RELEASE_HISTORY is empty.');
if (latest.version !== version) {
  if (compareVersions(version, latest.version) <= 0) {
    fail(`release.json version ${version} must be newer than RELEASE_HISTORY ${latest.version}.`);
  }
  const entryData = {
    version,
    date: release.date,
    title: release.title,
    changes: release.changes,
    policy: ['quiet', 'normal', 'important'].includes(release.update_policy) ? release.update_policy : 'normal'
  };
  const entry = parsedHistory.compact
    ? JSON.stringify([entryData.version, entryData.date, entryData.title, entryData.changes, entryData.policy])
    : JSON.stringify(entryData);
  foundation = foundation.slice(0, parsedHistory.start + 1) + `\n  ${entry},` + foundation.slice(parsedHistory.start + 1);
} else if (latest.title !== release.title) {
  fail('release.json title does not match the existing newest release-history entry. Bump the version instead of rewriting released history.');
}
foundation = foundation.replace(/\/\* Anaesthetic Night Roster V\d+(?:\.\d+)+ interface, staffing, allocation and PWA features\. \*\//,
  `/* Anaesthetic Night Roster V${version} interface, staffing, allocation and PWA features. */`);
write(uiSources[0], foundation);

for (const name of uiSources) {
  const source = read(name);
  write(name, source.replace(/\?v=\d+(?:\.\d+)+/g, `?v=${version}`));
}

for (const name of ['index.html', 'manifest.webmanifest', 'styles.css', 'theme-bootstrap.js', 'night-intelligence.js']) {
  const source = read(name);
  if (!/\?v=\d+(?:\.\d+)+/.test(source)) fail(`${name} has no versioned asset reference.`);
  write(name, source.replace(/\?v=\d+(?:\.\d+)+/g, `?v=${version}`));
}

let worker = read('service-worker.js');
if (!/anaesthetic-night-roster-v\d+(?:-\d+)+/.test(worker)) fail('service-worker.js is missing the cache version.');
worker = worker
  .replace(/anaesthetic-night-roster-v\d+(?:-\d+)+/, `anaesthetic-night-roster-v${version.replaceAll('.', '-')}`)
  .replace(/\?v=\d+(?:\.\d+)+/g, `?v=${version}`);
write('service-worker.js', worker);

const packageJson = JSON.parse(read('package.json'));
packageJson.version = version;
write('package.json', JSON.stringify(packageJson, null, 2) + '\n');

const lock = JSON.parse(read('package-lock.json'));
lock.version = version;
if (!lock.packages || !lock.packages['']) fail('package-lock.json is missing the root package.');
lock.packages[''].version = version;
write('package-lock.json', JSON.stringify(lock, null, 2) + '\n');

if (fs.existsSync(file('.project-state.json'))) {
  const projectState = JSON.parse(read('.project-state.json'));
  projectState.currentRelease = version;
  projectState.lastReleaseDate = release.date;
  write('.project-state.json', JSON.stringify(projectState, null, 2) + '\n');
}

const generated = spawnSync(process.execPath, [file('scripts/generate-runtime.mjs')], { cwd: root, stdio: 'inherit' });
if (generated.status !== 0) process.exit(generated.status || 1);
const verify = spawnSync(process.execPath, [file('scripts/verify-release.mjs')], { cwd: root, stdio: 'inherit' });
if (verify.status !== 0) process.exit(verify.status || 1);
console.log(`Release ${version} references are synchronised. Commit release.json, modular source and generated compatibility artifacts together.`);
