import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function inspectDemoDist(directory = 'dist', base = '/ikigai-space/') {
  const index = path.join(directory, 'index.html');
  if (!fs.existsSync(index)) return ['Demo index.html is missing.'];
  const html = fs.readFileSync(index, 'utf8'); const failures = [];
  if (!/<script[^>]+type="module"[^>]+src="/.test(html)) failures.push('Demo module entry is missing.');
  for (const [, ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(?:https?:|data:|#)/.test(ref)) continue;
    if (!ref.startsWith(base)) { failures.push(`Demo reference uses the wrong repository base: ${ref}`); continue; }
    const relative = ref.slice(base.length).split(/[?#]/, 1)[0];
    if (relative.split('/').includes('..') || !fs.existsSync(path.join(directory, relative))) failures.push(`Demo references a missing local file: ${ref}`);
  }
  return failures;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repository = process.env.GITHUB_REPOSITORY || 'ananta-sj/ikigai-space';
  const base = `/${repository.split('/').at(-1)}/`;
  const failures = inspectDemoDist(process.argv[2] || 'dist', base);
  if (failures.length) { for (const failure of failures) console.error(failure); process.exitCode = 1; }
  else console.log(`Demo artifact passed: entry/assets match deployment base ${base}.`);
}
