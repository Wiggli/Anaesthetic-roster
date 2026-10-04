import fs from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const baselineDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'visual-baseline');
const currentDir = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, 'visual-review');
const configPath = path.join(root, 'tests', 'visual-regression.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));
const diffDir = path.join(root, 'visual-diff');
fs.mkdirSync(diffDir, { recursive: true });

if (!fs.existsSync(baselineDir)) {
  console.log('No approved visual baseline artifact is available yet. Current screenshots will become the baseline after this release reaches main.');
  process.exit(0);
}
if (!fs.existsSync(currentDir)) {
  console.error('Current visual-review screenshots are missing.');
  process.exit(1);
}

const allowedForRelease = new Set((config.allow_changes?.[release.version] || []).map(String));
const maxRatio = Number(config.max_changed_ratio ?? 0.015);
let compared = 0;
let failures = 0;
let newSnapshots = 0;

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

for (const name of config.snapshots || []) {
  const current = path.join(currentDir, name);
  const baseline = path.join(baselineDir, name);
  if (!fs.existsSync(current)) {
    console.error(`::error::Required visual snapshot is missing: ${name}`);
    failures++;
    continue;
  }
  if (!fs.existsSync(baseline)) {
    console.log(`::notice::New visual snapshot has no main baseline yet: ${name}`);
    newSnapshots++;
    continue;
  }

  const before = readPng(baseline);
  const after = readPng(current);
  compared++;
  if (before.width !== after.width || before.height !== after.height) {
    const approved = allowedForRelease.has(name);
    const message = `Visual dimensions changed for ${name}: ${before.width}x${before.height} → ${after.width}x${after.height}`;
    if (approved) console.log(`::notice::Approved ${message}`);
    else {
      console.error(`::error::${message}`);
      failures++;
    }
    continue;
  }

  const diff = new PNG({ width: after.width, height: after.height });
  const changed = pixelmatch(before.data, after.data, diff.data, after.width, after.height, {
    threshold: 0.12,
    includeAA: false
  });
  const ratio = changed / Math.max(1, after.width * after.height);
  if (changed) PNG.sync.write(diff).length && fs.writeFileSync(path.join(diffDir, name), PNG.sync.write(diff));
  const approved = allowedForRelease.has(name);
  if (ratio > maxRatio && !approved) {
    console.error(`::error::Visual regression in ${name}: ${(ratio * 100).toFixed(2)}% of pixels changed, limit ${(maxRatio * 100).toFixed(2)}%.`);
    failures++;
  } else if (ratio > maxRatio && approved) {
    console.log(`::notice::Approved visual change in ${name}: ${(ratio * 100).toFixed(2)}% changed.`);
  } else {
    console.log(`Visual snapshot ${name}: ${(ratio * 100).toFixed(2)}% changed.`);
  }
}

console.log(`Visual regression summary: compared=${compared}, new=${newSnapshots}, failures=${failures}`);
if (failures) process.exit(1);
