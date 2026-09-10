import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { projectBand } from '../src/domain/forecast';
import { stretchesBelow, tightStretches } from '../src/domain/stretches';
import { sampleScenario } from '../src/data/sample';
import type { Scenario } from '../src/domain/types';

const series = (...balances: number[]) =>
  balances.map((balance, index) => ({
    date: plainDate(`2026-09-${String(index + 1).padStart(2, '0')}`),
    balance: euros(balance)
  }));

describe('stretchesBelow', () => {
  it('finds nothing when the series stays above the line', () => {
    expect(stretchesBelow(series(100, 200, 300), euros(50))).toEqual([]);
  });

  it('reads a single day as a stretch of one', () => {
    const found = stretchesBelow(series(100, 10, 100), euros(50));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ from: '2026-09-02', to: '2026-09-02', days: 1 });
  });

  it('joins consecutive days into one stretch', () => {
    const found = stretchesBelow(series(100, 40, 30, 20, 100), euros(50));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ from: '2026-09-02', to: '2026-09-04', days: 3 });
  });

  it('keeps two dips apart when the balance recovers between them', () => {
    const found = stretchesBelow(series(100, 20, 100, 10, 100), euros(50));
    expect(found.map((stretch) => stretch.from)).toEqual(['2026-09-02', '2026-09-04']);
  });

  it('names the deepest day and how far below the line it goes', () => {
    const found = stretchesBelow(series(100, 40, 5, 30, 100), euros(50));
    expect(found[0]?.deepest).toMatchObject({ date: '2026-09-03', balance: euros(5) });
    expect(found[0]?.shortfall).toBe(euros(45));
  });

  it('says when a stretch goes past being merely tight', () => {
    const tight = stretchesBelow(series(100, 20, 100), euros(50));
    const red = stretchesBelow(series(100, -20, 100), euros(50));
    expect(tight[0]?.overdrawn).toBe(false);
    expect(red[0]?.overdrawn).toBe(true);
  });

  it('handles a series that starts and ends below the line', () => {
    const found = stretchesBelow(series(10, 10, 100, 10), euros(50));
    expect(found).toHaveLength(2);
    expect(found[0]).toMatchObject({ from: '2026-09-01', to: '2026-09-02', days: 2 });
    expect(found[1]).toMatchObject({ from: '2026-09-04', to: '2026-09-04' });
  });
});

describe('tightStretches', () => {
  it('reads the low edge of the band, so a guess that goes wrong still counts', () => {
    const banded = projectBand(sampleScenario());
    const stretches = tightStretches(banded, sampleScenario().buffer);
    expect(stretches.length).toBeGreaterThan(0);
    expect(stretches[0]?.from).toBe(banded.warnings.firstUnderBuffer?.date);
    expect(stretches.some((stretch) => stretch.overdrawn)).toBe(true);
  });

  it('is empty for a household with room to spare', () => {
    const comfortable: Scenario = {
      ...sampleScenario(),
      accounts: [{ id: 'a', name: 'Current', balance: euros(80_000), inForecast: true }]
    };
    expect(tightStretches(projectBand(comfortable), comfortable.buffer)).toEqual([]);
  });
});
