import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = name => path.join(root, name);
const read = name => fs.readFileSync(file(name), 'utf8');
const uiSources = [
  'src/legacy-ui/foundation.js',
  'src/legacy-ui/clinical.js',
  'src/legacy-ui/sync.js',
  'src/legacy-ui/bootstrap.js'
];

function fail(message) {
  console.error(`Release verification failed: ${message}`);
  process.exit(1);
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
        return Function(`"use strict"; return (${literal});`)();
      }
    }
  }
  fail('Could not parse RELEASE_HISTORY.');
}

const generated = spawnSync(process.execPath, [file('scripts/generate-runtime.mjs'), '--check'], { cwd: root, stdio: 'inherit' });
if (generated.status !== 0) fail('generated compatibility artifacts do not match their modular source.');

const release = JSON.parse(read('release.json'));
const version = String(release.version || '').trim();
if (!/^\d+(?:\.\d+)+$/.test(version)) fail('release.json has an invalid version.');

const core = read('app-core.js');
const coreVersion = core.match(/var APP_VERSION = '([^']+)';/)?.[1];
if (coreVersion !== version) fail(`APP_VERSION is ${coreVersion || 'missing'}, expected ${version}.`);

const history = releaseHistory(read(uiSources[0]));
if (!history.length || history[0].version !== version) fail('The newest RELEASE_HISTORY version does not match release.json.');
if (history[0].title !== release.title) fail('The newest RELEASE_HISTORY title does not match release.json.');
const expectedPolicy = ['quiet', 'normal', 'important'].includes(release.update_policy) ? release.update_policy : 'normal';
if ((history[0].policy || 'normal') !== expectedPolicy) fail('The newest RELEASE_HISTORY update policy does not match release.json.');

const packageJson = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
if (packageJson.version !== version) fail('package.json version does not match release.json.');
if (lock.version !== version || lock.packages?.['']?.version !== version) fail('package-lock.json version does not match release.json.');

for (const name of ['index.html', 'manifest.webmanifest', 'service-worker.js', 'styles.css', ...uiSources]) {
  const source = read(name);
  const refs = Array.from(source.matchAll(/\?v=(\d+(?:\.\d+)+)/g), match => match[1]);
  if (!refs.length && !uiSources.includes(name)) fail(`${name} has no versioned asset references to verify.`);
  const stale = [...new Set(refs.filter(item => item !== version))];
  if (stale.length) fail(`${name} contains stale asset version(s): ${stale.join(', ')}.`);
}

const cacheVersion = read('service-worker.js').match(/CACHE_NAME = 'anaesthetic-night-roster-v([^']+)'/)?.[1];
if (cacheVersion !== version.replaceAll('.', '-')) fail('The service-worker cache name does not match release.json.');
for (const name of ['app-ui.js', 'domain-logic.js', 'runtime-foundation.js']) {
  if (!read(name).startsWith('/* GENERATED FILE.')) fail(`${name} must remain a generated compatibility artifact.`);
}

console.log(`Release ${version} metadata, modular runtime source, generated assets and PWA cache references are aligned.`);
