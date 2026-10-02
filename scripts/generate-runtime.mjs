import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

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

function transpileClassic(name) {
  const source = read(name);
  const result = ts.transpileModule(source, {
    fileName: name,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
      removeComments: false,
      newLine: ts.NewLineKind.LineFeed
    },
    reportDiagnostics: true
  });
  const errors = (result.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    const message = ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: value => value,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n'
    });
    throw new Error(message);
  }
  return result.outputText;
}

const generatedHeader = '/* GENERATED FILE. Edit the source modules under src/, then run npm run generate:runtime. */\n';
write('domain-logic.js', generatedHeader + transpileClassic('src/domain-logic.ts'));
write('runtime-foundation.js', generatedHeader + transpileClassic('src/runtime-foundation.ts'));
write('app-ui.js', generatedHeader + uiSources.map(read).join('\n'));

if (process.argv.includes('--check')) {
  const expected = {
    'domain-logic.js': generatedHeader + transpileClassic('src/domain-logic.ts'),
    'runtime-foundation.js': generatedHeader + transpileClassic('src/runtime-foundation.ts'),
    'app-ui.js': generatedHeader + uiSources.map(read).join('\n')
  };
  for (const [name, value] of Object.entries(expected)) {
    if (read(name) !== value) {
      console.error(name + ' is stale. Run npm run generate:runtime and commit the generated compatibility artifact.');
      process.exitCode = 1;
    }
  }
  if (process.exitCode) process.exit(process.exitCode);
}
console.log('Runtime compatibility artifacts are aligned with modular source.');
