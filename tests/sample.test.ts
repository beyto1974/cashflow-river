import { describe, expect, it } from 'vitest';
import { sampleScenario } from '../src/data/sample';
import { decodeScenario, encodeScenario } from '../src/persistence/codec';
import { project, projectBand } from '../src/domain/forecast';
import { byMonth } from '../src/domain/rollups';
import { daysBetween, plainDate, type PlainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';

/* The example is dated from whatever day it is opened, so the story it tells —
   a tight autumn about six weeks out — holds whenever someone looks at it. */
const openedOn = ['2026-09-10', '2027-02-17', '2028-12-29'].map(plainDate);

describe('the sample household', () => {
  for (const today of openedOn) {
    describe(`opened on ${today}`, () => {
      const scenario = sampleScenario(today);
      const forecast = project(scenario);

      it('starts today', () => {
        expect(scenario.asOf).toBe(today);
        expect(forecast.days[0]?.date).toBe(today);
      });

      it('is a valid scenario by its own codec', () => {
        expect(decodeScenario(JSON.parse(encodeScenario(scenario)))).toEqual(scenario);
      });

      it('opens on the two current accounts, not the savings', () => {
        expect(forecast.opening).toBe(euros(3590.55));
      });

      it('runs out of buffer within a couple of months, and goes overdrawn after that', () => {
        const untilTight = daysBetween(today, forecast.firstUnderBuffer?.date as PlainDate);
        const untilRed = daysBetween(today, forecast.firstNegative?.date as PlainDate);
        // Opened late in a month the tight patch arrives sooner, which is true to
        // life: the rent is days away and the salary a month off.
        expect(untilTight).toBeGreaterThan(0);
        expect(untilTight).toBeLessThan(70);
        expect(untilRed).toBeGreaterThan(untilTight);
        expect(untilRed).toBeLessThan(115);
        expect(forecast.low.balance).toBeLessThan(0);
      });

      it('recovers later in the forecast, so it is not merely a disaster', () => {
        expect(forecast.days.at(-1)!.balance).toBeGreaterThan(forecast.opening);
      });

      it('covers 30 months of calendar months', () => {
        expect(byMonth(forecast)).toHaveLength(31); // 30 whole months plus the closing part-month
      });

      it('carries guesses, so the band has width', () => {
        expect(projectBand(scenario).hasRange).toBe(true);
      });

      it('closes the banks on days inside the forecast', () => {
        expect(scenario.holidays?.length).toBeGreaterThan(0);
        expect(scenario.holidays?.every((date) => date >= today)).toBe(true);
      });
    });
  }

  it('pays the salary on a working day', () => {
    // 27 September 2026 is a Sunday, and the salary is paid the working day before
    const forecast = project(sampleScenario(plainDate('2026-09-10')));
    expect(forecast.dayAt(plainDate('2026-09-25'))?.movements.some((m) => m.lineId === 'salary-1')).toBe(true);
    expect(forecast.dayAt(plainDate('2026-09-27'))?.movements.some((m) => m.lineId === 'salary-1')).toBe(false);
  });
});
