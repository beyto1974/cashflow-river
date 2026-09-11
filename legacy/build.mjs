// Inlines src/*.js into the templates so every artifact ships as one file.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const src = new URL('./', import.meta.url).pathname;
const dist = new URL('../dist/', import.meta.url).pathname;

/* The built copies are not kept in the repo, so the directory may not exist. */
mkdirSync(dist, { recursive: true });

const templates = readdirSync(src).filter((f) => f.endsWith('.html'));
for (const file of templates) {
  const html = readFileSync(join(src, file), 'utf8').replace(
    /<!--\s*inline:([\w.-]+)\s*-->/g,
    (_, name) => `<script>\n${readFileSync(join(src, name), 'utf8').trim()}\n</script>`
  );
  writeFileSync(join(dist, file), html);
  console.log(`built dist/${file}  (${(html.length / 1024).toFixed(1)} kB)`);
}
