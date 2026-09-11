/**
 * What a change costs. Run with `npm run bench`.
 *
 * Reads are memoised on the scenario object, so the number that matters is the
 * first read after an edit — every component in the page then reads the same
 * projection for nothing.
 */
import { sampleScenario } from '../src/data/sample.ts';
import { project, projectBand } from '../src/domain/forecast.ts';
import { byMonth } from '../src/domain/rollups.ts';
import { summarise } from '../src/domain/summary.ts';
import { suggestFixes } from '../src/domain/fixes.ts';

const base = sampleScenario();
const edited = () => ({ ...base, buffer: base.buffer + Math.floor(Math.random() * 100) });

function time(label, work, runs = 40) {
  work();
  const started = performance.now();
  for (let index = 0; index < runs; index += 1) work();
  const each = (performance.now() - started) / runs;
  console.log(`${label.padEnd(44)} ${each.toFixed(2)} ms`);
}

console.log(`Example household: ${base.horizonMonths} months, ${base.lines.length} lines\n`);
time('project, after an edit', () => project(edited()));
time('projectBand, after an edit', () => projectBand(edited()));
time('everything the page reads, after an edit', () => {
  const scenario = edited();
  const banded = projectBand(scenario);
  byMonth(banded.likely);
  summarise(banded, scenario.buffer);
});
time('the same reads again, memoised', () => {
  const banded = projectBand(base);
  byMonth(banded.likely);
  summarise(banded, base.buffer);
}, 200);
time('suggestFixes (on demand, not per keystroke)', () => suggestFixes(edited()), 5);
