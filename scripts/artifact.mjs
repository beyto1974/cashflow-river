/**
 * Turns the single-file build into a publishable fragment.
 *
 * The Artifact host supplies the document — doctype, html, head, body — and
 * wraps whatever this writes, so the built page's own wrapper has to come off.
 * Everything else (the title, the font stylesheet, the inlined CSS and the
 * inlined module) is carried across untouched.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const source = new URL('../dist-app/index.html', import.meta.url).pathname;
const target = new URL('../dist-app/artifact.html', import.meta.url).pathname;

const html = readFileSync(source, 'utf8');

const head = between(html, '<head>', '</head>');
const body = between(html, '<body>', '</body>');

function between(text, open, close) {
  const from = text.indexOf(open);
  const to = text.indexOf(close);
  if (from === -1 || to === -1) throw new Error(`Could not find ${open} … ${close} in the build`);
  return text.slice(from + open.length, to).trim();
}

/* The charset and viewport metas are the host's job, and a crossorigin preconnect
   is pointless once the page is inlined. */
const carried = head
  .replace(/<meta charset="utf-8"[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/<link rel="preconnect"[^>]*>\s*/i, '')
  .replace(/\scrossorigin(=("[^"]*"|'[^']*'))?/gi, '');

const fragment = `${carried}\n\n${body}\n`;
writeFileSync(target, fragment);

/* Word boundaries, or <header> trips it. */
const forbidden = /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.exec(fragment);
if (forbidden) throw new Error(`The fragment still contains ${forbidden[0]}`);

console.log(`wrote dist-app/artifact.html (${(fragment.length / 1024).toFixed(1)} kB)`);
