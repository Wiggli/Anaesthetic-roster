import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = name => path.join(root, name);
const read = name => fs.readFileSync(file(name), 'utf8');
const write = (name, value) => {
  const target = file(name);
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== value) fs.writeFileSync(target, value);
};

const uiSources = [
  'src/legacy-ui/foundation.js',
  'src/legacy-ui/clinical.js',
  'src/legacy-ui/sync.js',
  'src/legacy-ui/bootstrap.js'
];

function classicFromTypedSource(name) {
  return read(name)
    .replace(/^\/\* .*? TypeScript source of truth\. Generated browser JavaScript is written by scripts\/generate-runtime\.mjs\. \*\/\n/, '')
    .replace(/([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*any(?=\s*[,)=])/g, '$1');
}

const generatedHeader = '/* GENERATED FILE. Edit the source modules under src/, then run npm run generate:runtime. */\n';
const expected = {
  'domain-logic.js': generatedHeader + classicFromTypedSource('src/domain-logic.ts'),
  'runtime-foundation.js': generatedHeader + classicFromTypedSource('src/runtime-foundation.ts'),
  'app-ui.js': generatedHeader + uiSources.map(read).join('\n')
};

if (process.argv.includes('--check')) {
  for (const [name, value] of Object.entries(expected)) {
    if (!fs.existsSync(file(name)) || read(name) !== value) {
      console.error(name + ' is stale. Run npm run generate:runtime and commit the generated compatibility artifact.');
      process.exitCode = 1;
    }
  }
  if (process.exitCode) process.exit(process.exitCode);
} else {
  for (const [name, value] of Object.entries(expected)) write(name, value);
}
console.log('Runtime compatibility artifacts are aligned with modular source.');
