import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(srcRoot).filter(file => /\.(?:ts|tsx|js|jsx)$/.test(file));
const requested = new Map();
const importPattern = /import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(importPattern)) {
    const names = match[1]
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => part.split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    for (const name of names) {
      const list = requested.get(name) ?? [];
      list.push(path.relative(root, file).replaceAll('\\', '/'));
      requested.set(name, list);
    }
  }
}

let lucide;
try { lucide = await import('lucide-react'); }
catch {
  console.log(`Lucide export audit skipped · dependencies are not installed (${requested.size} icon imports discovered).`);
  process.exit(0);
}

const missing = [...requested.entries()].filter(([name]) => !(name in lucide));
if (missing.length) {
  console.error(`Lucide export audit failed with ${missing.length} unsupported import${missing.length === 1 ? '' : 's'}:`);
  for (const [name, usedBy] of missing) console.error(`  FAIL  ${name} · ${usedBy.join(', ')}`);
  process.exit(1);
}

console.log(`Lucide export audit passed · ${requested.size} named icon imports verified.`);
