#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const includeDirs = ['components', 'src', 'api'];
const disallowed = [/https?:\/\/localhost/i, /https?:\/\/127\.0\.0\.1/i, /(https?:\/\/[^\s/'"`]+:\d{2,5})/];

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const hits = [];
  disallowed.forEach((re) => {
    const m = text.match(re);
    if (m) hits.push({ pattern: re.source, sample: m[0] });
  });
  if (hits.length) {
    console.error(`Disallowed URL(s) in ${path.relative(root, file)}:`);
    hits.forEach(h => console.error(`  - ${h.sample} (/${h.pattern}/)`));
    return true;
  }
  return false;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let found = false;
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) found = walk(full) || found;
    else if (/\.(ts|tsx|js)$/.test(e.name)) found = scanFile(full) || found;
  }
  return found;
}

let any = false;
for (const d of includeDirs) {
  const p = path.join(root, d);
  if (fs.existsSync(p)) any = walk(p) || any;
}

if (any) {
  console.error('Local URL policy violation.');
  process.exit(1);
} else {
  console.log('Local URL check passed.');
}
