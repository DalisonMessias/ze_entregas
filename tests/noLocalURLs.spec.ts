import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { test, expect } from 'vitest';

const root = process.cwd();
const includeDirs = ['components', 'src', 'api'];
const disallowed = [/https?:\/\/localhost/i, /https?:\/\/127\.0\.0\.1/i];

function scanFile(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const hits: string[] = [];
  for (const re of disallowed) {
    const m = text.match(re);
    if (m) hits.push(`${m[0]} in ${relative(root, file)}`);
  }
  return hits;
}

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  let results: string[] = [];
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) results = results.concat(walk(full));
    else if (/\.(ts|tsx|js)$/.test(name)) results = results.concat(scanFile(full));
  }
  return results;
}

test('não há URLs locais fixas (localhost/127.0.0.1) no código', () => {
  const hits: string[] = [];
  for (const d of includeDirs) {
    const p = join(root, d);
    try { hits.push(...walk(p)); } catch {}
  }
  expect(hits).toEqual([]);
});
