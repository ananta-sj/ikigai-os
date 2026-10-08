// Classify remaining legacy names in project-owned text, including historical docs.
// Never reads credentials, personal data, dependency trees or native build output.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
const root = process.cwd();
const skip = new Set(['.git', 'node_modules', 'target', '.audit-work', '.agents', '.codex', '.aws']);
const extensions = new Set(['.md', '.json', '.html', '.css', '.ts', '.tsx', '.mjs', '.rs', '.toml', '.lock', '.yml', '.yaml', '.svg', '.txt', '.webmanifest']);
const records = []; let scanned = 0;
function classify(file, line, token, tail) {
  if (/^(?:MIGRATION_|RELEASE_EVIDENCE_|PRODUCT_AUDIT_|UI_SMOKE_CHECKLIST_V0\.25)/.test(file)) return 'historical version record; retained for accurate provenance';
  if (['RELEASE_AUDIT_HANDOFF.md', 'REBRANDING_SPACE.md'].includes(file)) return 'compatibility/audit documentation identifying earlier names';
  if (/^\s+Seed\b/.test(tail)) return 'preserved canonical logo family name, not the complete product';
  if (file === 'scripts/audit-branding.mjs' || file === 'scripts/audit-branding-browser.mjs') return 'legacy-name detection pattern or compatibility test';
  // The Japanese concept "ikigai" is not a legacy product name.
  // Only exempt its explicit definition in the README.
  if (
    file === 'Readme.md' &&
    token.toLowerCase() === 'ikigai' &&
    /^\s*<small>\s*ikigai\s*\(生き甲斐\)\s*<\/small>\s*$/i.test(line)
  ) {
    return 'Japanese concept definition; not product branding';
  }
  if (token.toLowerCase() !== 'ikigai' && token.toLowerCase() !== 'ikigai os') return 'technical identifier/path/URL; preserved for compatibility';
  if (/^\s*(?:\/\/|\/\*|\*|#)/.test(line) && !file.endsWith('.md')) return 'internal source comment';
  return 'REVIEW: possible public legacy product name';
}
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (item.isSymbolicLink()) continue;
    const absolute = join(dir, item.name);
    if (item.isDirectory()) { if (!skip.has(item.name)) walk(absolute); continue; }
    if (!item.isFile() || item.name.startsWith('.env') || (!extensions.has(extname(item.name)) && !['.gitignore', 'LICENSE'].includes(item.name))) continue;
    const file = relative(root, absolute).replaceAll('\\', '/');
    const content = readFileSync(absolute, 'utf8'); if (content.includes('\0')) continue; scanned++;
    for (const [index, line] of content.split(/\r?\n/).entries()) {
      for (const match of line.matchAll(/\bikigai(?:[\s_-]+os)?(?![\s_-]+space)/ig)) {
        const start = match.index; const left = line.slice(0, start).match(/[A-Za-z0-9_.:/-]*$/)?.[0] || '';
        const right = line.slice(start + match[0].length).match(/^[A-Za-z0-9_.:/-]*/)?.[0] || '';
        const token = left + match[0] + right;
        records.push({ file, line: index + 1, column: start + 1, token, classification: classify(file, line, token, line.slice(start + match[0].length)) });
      }
    }
  }
}
walk(root);
const counts = {}; for (const row of records) counts[row.classification] = (counts[row.classification] || 0) + 1;
const review = records.filter(row => row.classification.startsWith('REVIEW'));
mkdirSync('.audit-work/rebranding', { recursive: true });
writeFileSync('.audit-work/rebranding/remaining-names.json', JSON.stringify({ scannedFiles: scanned, counts, review, occurrences: records }, null, 2) + '\n');
console.log(JSON.stringify({ scannedFiles: scanned, counts, review }, null, 2));
if (review.length) process.exitCode = 1;
