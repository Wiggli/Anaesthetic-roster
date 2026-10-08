const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const size = file => fs.statSync(path.join(root, file)).size;
const kib = value => Math.round(value / 1024);

const budgets = {
  'app-ui.js': 451 * 1024, // Retained release history grows with each published patch.
  'app-core.js': 100 * 1024,
  'runtime-foundation.js': 64 * 1024,
  'chat.js': 100 * 1024,
  'styles.css': 280 * 1024,
  'chat.css': 64 * 1024
};

for (const [file, limit] of Object.entries(budgets)) {
  const actual = size(file);
  assert.ok(actual <= limit, `${file} is ${kib(actual)} KiB and exceeds its ${kib(limit)} KiB source budget`);
}

const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) {
  const files = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(?:js|css)$/.test(entry.name)) files.push(full);
    }
  };
  walk(dist);
  const total = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  const largestJs = files.filter(file => file.endsWith('.js')).reduce((max, file) => Math.max(max, fs.statSync(file).size), 0);
  assert.ok(total <= 2500 * 1024, `built JS/CSS is ${kib(total)} KiB and exceeds the 2500 KiB budget`);
  assert.ok(largestJs <= 1100 * 1024, `largest built JS asset is ${kib(largestJs)} KiB and exceeds the 1100 KiB budget`);
}

console.log('Source and built performance budgets passed.');
