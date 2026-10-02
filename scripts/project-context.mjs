import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const state = readJson('.project-state.json');
const release = readJson('release.json');

const git = args => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
};

const branch = git(['branch', '--show-current']) || '(detached or unavailable)';
const sha = git(['rev-parse', '--short', 'HEAD']) || '(unavailable)';
const dirty = git(['status', '--porcelain']);

console.log('Anaesthetic Night Roster project context');
console.log(`Branch: ${branch}`);
console.log(`Commit: ${sha}`);
console.log(`Working tree: ${dirty ? 'modified' : 'clean'}`);
console.log(`Release: ${release.version} · ${release.title}`);
console.log(`Database schema: ${state.databaseSchema}`);
console.log(`Fast verification: ${state.developerCommands.fastVerify}`);
console.log(`Full verification: ${state.developerCommands.fullVerify}`);
console.log(`Required CI check: ${state.ci.requiredCheck}`);
console.log('Read first:');
for (const file of state.continuity.readFirst) console.log(`  - ${file}`);
if (state.pendingWork.length) {
  console.log('Pending work:');
  for (const item of state.pendingWork) console.log(`  - ${item}`);
}
if (state.knownIssues.length) {
  console.log('Known issues:');
  for (const item of state.knownIssues) console.log(`  - ${item}`);
}
