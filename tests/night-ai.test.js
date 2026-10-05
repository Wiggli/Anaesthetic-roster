const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'night-ai.js'), 'utf8');
const edge = fs.readFileSync(path.join(root, 'supabase/functions/night-roster-ai/index.ts'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'theme-bootstrap.js'), 'utf8');

assert.match(client, /window\.NightRosterAI=/, 'Night AI must expose its progressive client API');
assert.match(client, /roster:personal-night/, 'Night AI must use the existing personal-night model');
assert.match(client, /roster:night/, 'Night AI must use the existing deterministic night model');
assert.match(client, /roster:recent-activity/, 'Night AI must use the existing recent activity model');
assert.match(client, /patient information/i, 'Night AI must visibly guard against patient information');
assert.doesNotMatch(client, /api\.openai\.com/, 'The browser must never call OpenAI directly');
assert.doesNotMatch(client, /OPENAI_API_KEY/, 'The browser bundle must never contain an OpenAI secret');

assert.match(edge, /OPENAI_API_KEY/, 'The model key must stay in the Edge Function environment');
assert.match(edge, /https:\/\/api\.openai\.com\/v1\/responses/, 'The Edge Function must use the Responses API');
assert.match(edge, /store:\s*false/, 'Model requests must disable response storage');
assert.match(edge, /allowed_users/, 'Only approved roster accounts may use the AI endpoint');
assert.match(edge, /roster engine, not AI/i, 'Allocation explanations must keep the deterministic roster engine authoritative');
assert.match(edge, /patient information/i, 'The server prompt must prohibit patient information');
assert.match(edge, /not_configured/, 'The endpoint must provide a safe fallback when the model key is not configured');
assert.doesNotMatch(edge, /\.from\([^)]*\)\.insert\(/, 'Night AI must not create database records');
assert.doesNotMatch(edge, /\.from\([^)]*\)\.update\(/, 'Night AI must not mutate roster records');
assert.doesNotMatch(edge, /\.from\([^)]*\)\.delete\(/, 'Night AI must not delete roster records');

assert.match(bootstrap, /night-ai\.js\?v=/, 'Night AI runtime must be loaded by the reviewed bootstrap');
assert.match(bootstrap, /night-ai\.css\?v=/, 'Night AI styles must be loaded by the reviewed bootstrap');

console.log('Night Roster AI safety and architecture contracts passed.');
