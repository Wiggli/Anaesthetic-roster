const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
const read = file => fs.readFileSync(path.join(dist, file), 'utf8');
const html = read('index.html');
const worker = read('service-worker.js');
const manifest = JSON.parse(read('manifest.webmanifest'));
const version = '37.42';

for (const file of ['app-core.js', 'app-ui.js', 'push.js', 'chat.js', 'styles.css', 'chat.css',
  'theme-bootstrap.js', 'release.json', 'icon-192.png', 'icon-512.png', 'mater-dei-logo.png']) {
  assert.ok(fs.existsSync(path.join(dist, file)), `${file} must ship with the build`);
}
for (const file of ['AGENTS.md', 'package.json', 'package-lock.json', 'tests', 'supabase', '.git']) {
  assert.ok(!fs.existsSync(path.join(dist, file)), `${file} must not ship to Pages`);
}
assert.equal(manifest.id, './');
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.match(html, new RegExp(`app-core\\.js\\?v=${version.replace('.', '\\.')}`));
assert.match(html, /id="reactLaunchMotto"/);
const moduleAsset = html.match(/src="\.\/(assets\/[^" ]+\.js)"/);
assert.ok(moduleAsset, 'React entry must be a built module');
assert.ok(fs.existsSync(path.join(dist, moduleAsset[1])));
assert.ok(worker.includes(moduleAsset[1]), 'custom worker must precache the React entry');
const navigationAsset = fs.readdirSync(path.join(dist, 'assets')).find(file => /^navigation-.*\.js$/.test(file));
assert.ok(navigationAsset, 'signed-in navigation must be a separate lazy asset');
assert.ok(worker.includes(`assets/${navigationAsset}`), 'custom worker must precache the offline navigation chunk');
const helpAsset = fs.readdirSync(path.join(dist, 'assets')).find(file => /^screen-info-.*\.js$/.test(file));
assert.ok(helpAsset, 'screen help must be a separate on-demand asset');
assert.ok(worker.includes(`assets/${helpAsset}`), 'custom worker must precache offline screen help');
assert.match(html, /id="reactNavigation"/, 'working HTML navigation must remain as an optional-module fallback');
assert.ok(worker.includes(`anaesthetic-night-roster-v${version.replace('.', '-')}`));
assert.match(worker, /ACTIVATE_UPDATE/);
assert.match(worker, /GET_CACHE_VERSION/);
assert.match(worker, /notificationclick/);
assert.match(worker, /requestUrl\.origin !== self\.location\.origin && !isSupabaseLibrary\(requestUrl\)/);
assert.match(worker, /event\.request\.mode === "navigate"/);
assert.doesNotMatch(worker, /caches\.put\([^\n]*supabase/i);
assert.equal(JSON.parse(read('release.json')).version, version);
console.log('Pages artifact, installed identity and custom worker checks passed.');
