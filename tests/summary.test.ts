import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { projectBand } from '../src/domain/forecast';
import { summarise } from '../src/domain/summary';
import { sampleScenario } from '../src/data/sample';
import type { Scenario } from '../src/domain/types';

function summaryOf(scenario: Scenario) {
  return summarise(projectBand(scenario), scenario.buffer);
}

const longDateOf = (date: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`));

describe('summarise', () => {
  it('says so plainly when the buffer holds all the way out', () => {
    const comfortable: Scenario = {
      ...sampleScenario(),
      accounts: [{ id: 'a', name: 'Current', balance: euros(80_000), inForecast: true }]
    };
    const summary = summaryOf(comfortable);
    expect(summary.tone).toBe('clear');
    expect(summary.sentence).toMatch(/holds/);
    expect(summary.sentence).toContain('€2,500');
  });

  it('states the likely reading, and warns separately about the guesses', () => {
    const scenario = sampleScenario();
    const banded = projectBand(scenario);
    const summary = summarise(banded, scenario.buffer);
    expect(summary.tone).toBe('red');
    // the sentence itself is the likely reading
    expect(summary.sentence).toMatch(/^You are fine until 24 October 2026/);
    expect(summary.sentence).toMatch(/overdrawn/);
    expect(summary.sentence).toMatch(/€912/);
    // the guesses are a separate, clearly conditional claim
    expect(summary.risk).toMatch(/^If the guessed lines go against you/);
    expect(summary.risk).toContain(longDateOf(banded.warnings.firstUnderBuffer!.date));
  });

  it('warns about the guesses even when the likely reading never dips', () => {
    const tightOnGuesses: Scenario = {
      label: 'Guessy', asOf: plainDate('2026-09-10'), horizonMonths: 2, buffer: euros(500),
      accounts: [{ id: 'a', name: 'Current', balance: euros(700), inForecast: true }],
      lines: [
        {
          kind: 'recurring', id: 'food', label: 'Groceries', amount: euros(-100), category: 'living',
          cadence: 'monthly', anchor: plainDate('2026-09-15'), estimate: true,
          range: { low: euros(-60), high: euros(-260) }
        }
      ]
    };
    const summary = summaryOf(tightOnGuesses);
    expect(summary.likelyStretches).toEqual([]);
    expect(summary.sentence).toMatch(/holds all the way/);
    expect(summary.risk).toMatch(/If the guessed lines go against you it dips under €500/);
    expect(summary.tone).toBe('tight');
  });

  it('is tight rather than red when the buffer is dented but nothing goes below zero', () => {
    const dented: Scenario = {
      label: 'Dented', asOf: plainDate('2026-09-10'), horizonMonths: 3, buffer: euros(500),
      accounts: [{ id: 'a', name: 'Current', balance: euros(600), inForecast: true }],
      lines: [
        {
          kind: 'planned', id: 'dip', label: 'Boiler service', amount: euros(-150),
          category: 'housing', date: plainDate('2026-10-01')
        },
        {
          kind: 'recurring', id: 'pay', label: 'Pay', amount: euros(200), category: 'salary',
          cadence: 'monthly', anchor: plainDate('2026-10-15')
        }
      ]
    };
    const summary = summaryOf(dented);
    expect(summary.tone).toBe('tight');
    expect(summary.sentence).not.toMatch(/overdrawn/);
    expect(summary.sentence).toMatch(/short of it/);
  });

  it('counts the stretches when there is more than one', () => {
    const summary = summaryOf(sampleScenario());
    expect(summary.likelyStretches.length).toBeGreaterThan(1);
    expect(summary.sentence).toContain('stretches');
  });

  it('says nothing about the guesses when they change nothing', () => {
    const certain: Scenario = {
      label: 'Certain', asOf: plainDate('2026-09-10'), horizonMonths: 2, buffer: euros(500),
      accounts: [{ id: 'a', name: 'Current', balance: euros(5_000), inForecast: true }],
      lines: []
    };
    expect(summaryOf(certain).risk).toBeUndefined();
  });

  it('starts from the first day when the very first day is already short', () => {
    const broke: Scenario = {
      ...sampleScenario(),
      accounts: [{ id: 'a', name: 'Current', balance: euros(-500), inForecast: true }]
    };
    const summary = summaryOf(broke);
    expect(summary.sentence).toMatch(/^You are already/);
    expect(summary.tone).toBe('red');
  });

  it('reads the low edge, so a household is warned about the guesses going wrong', () => {
    const scenario = sampleScenario();
    const banded = projectBand(scenario);
    const summary = summarise(banded, scenario.buffer);
    expect(summary.stretches[0]?.from).toBe(banded.warnings.firstUnderBuffer?.date);
  });

  it('mentions the date the read-out is on when asked to', () => {
    const scenario = sampleScenario();
    const summary = summarise(projectBand(scenario), scenario.buffer, plainDate('2027-03-02'));
    expect(summary.onTarget).toMatch(/2 March 2027/);
  });
});
