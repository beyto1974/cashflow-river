import { bench, describe } from 'vitest';
import { sampleScenario } from '../src/data/sample';
import { project, projectBand } from '../src/domain/forecast';
import { byMonth } from '../src/domain/rollups';
import { summarise } from '../src/domain/summary';
import { suggestFixes } from '../src/domain/fixes';

/**
 * What a change costs. Run with `npm run bench`.
 *
 * Reads are memoised on the scenario object, so the figure that matters is the
 * first read after an edit: every component in the page then reads the same
 * projection for nothing. An edit has a sixteen-millisecond frame to fit in.
 */
const base = sampleScenario();
const edited = () => ({ ...base, buffer: base.buffer + Math.floor(Math.random() * 100) });

describe(`the example household: ${base.horizonMonths} months, ${base.lines.length} lines`, () => {
  bench('project, after an edit', () => {
    project(edited());
  });

  bench('projectBand, after an edit', () => {
    projectBand(edited());
  });

  bench('everything the page reads, after an edit', () => {
    const scenario = edited();
    const banded = projectBand(scenario);
    byMonth(banded.likely);
    summarise(banded, scenario.buffer);
  });

  bench('the same reads again, memoised', () => {
    const banded = projectBand(base);
    byMonth(banded.likely);
    summarise(banded, base.buffer);
  });
});

describe('on demand, not per keystroke', () => {
  bench(
    'suggestFixes',
    () => {
      suggestFixes(edited());
    },
    { iterations: 5, warmupIterations: 1 }
  );
});
