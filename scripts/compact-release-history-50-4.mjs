import fs from 'node:fs';

function locateHistory(source) {
  const marker = 'var RELEASE_HISTORY=';
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error('RELEASE_HISTORY marker not found');
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
        return { start, end: i + 1, entries: Function(`"use strict"; return (${literal});`)() };
      }
    }
  }
  throw new Error('Could not parse RELEASE_HISTORY');
}

const foundationPath = 'src/legacy-ui/foundation.js';
let foundation = fs.readFileSync(foundationPath, 'utf8');
const parsed = locateHistory(foundation);
if (!Array.isArray(parsed.entries) || parsed.entries.length < 89) throw new Error('Release history baseline is unexpectedly short');
const tuples = parsed.entries.map(entry => {
  const tuple = [String(entry.version), String(entry.date), String(entry.title), Array.from(entry.changes || [], String)];
  if (entry.policy != null) tuple.push(String(entry.policy));
  return tuple;
});
const compactLiteral = JSON.stringify(tuples);
const mapper = ".map(function(e){return{version:e[0],date:e[1],title:e[2],changes:e[3],policy:e[4]}})";
foundation = foundation.slice(0, parsed.start) + compactLiteral + mapper + foundation.slice(parsed.end);
fs.writeFileSync(foundationPath, foundation);

const releasePath = 'scripts/release.mjs';
let release = fs.readFileSync(releasePath, 'utf8');
const oldReleaseParser = `        const literal = source.slice(start, i + 1);\n        return { start, end: i + 1, entries: Function(\`"use strict"; return (\${literal});\`)() };`;
const newReleaseParser = `        const literal = source.slice(start, i + 1);\n        const raw = Function(\`"use strict"; return (\${literal});\`)();\n        const entries = raw.map(entry => Array.isArray(entry)\n          ? { version: entry[0], date: entry[1], title: entry[2], changes: entry[3], policy: entry[4] }\n          : entry);\n        return { start, end: i + 1, entries, compact: raw.every(Array.isArray) };`;
if (!release.includes(oldReleaseParser)) throw new Error('release.mjs parser block changed unexpectedly');
release = release.replace(oldReleaseParser, newReleaseParser);
const oldEntry = `  const entry = JSON.stringify({\n    version,\n    date: release.date,\n    title: release.title,\n    changes: release.changes,\n    policy: ['quiet', 'normal', 'important'].includes(release.update_policy) ? release.update_policy : 'normal'\n  });`;
const newEntry = `  const entryData = {\n    version,\n    date: release.date,\n    title: release.title,\n    changes: release.changes,\n    policy: ['quiet', 'normal', 'important'].includes(release.update_policy) ? release.update_policy : 'normal'\n  };\n  const entry = parsedHistory.compact\n    ? JSON.stringify([entryData.version, entryData.date, entryData.title, entryData.changes, entryData.policy])\n    : JSON.stringify(entryData);`;
if (!release.includes(oldEntry)) throw new Error('release.mjs insertion block changed unexpectedly');
release = release.replace(oldEntry, newEntry);
fs.writeFileSync(releasePath, release);

const verifyPath = 'scripts/verify-release.mjs';
let verify = fs.readFileSync(verifyPath, 'utf8');
const oldVerifyParser = `        const literal = source.slice(start, i + 1);\n        return Function(\`"use strict"; return (\${literal});\`)();`;
const newVerifyParser = `        const literal = source.slice(start, i + 1);\n        const raw = Function(\`"use strict"; return (\${literal});\`)();\n        return raw.map(entry => Array.isArray(entry)\n          ? { version: entry[0], date: entry[1], title: entry[2], changes: entry[3], policy: entry[4] }\n          : entry);`;
if (!verify.includes(oldVerifyParser)) throw new Error('verify-release.mjs parser block changed unexpectedly');
verify = verify.replace(oldVerifyParser, newVerifyParser);
fs.writeFileSync(verifyPath, verify);

console.log(`Compacted ${tuples.length} release-history entries without changing their runtime values.`);
