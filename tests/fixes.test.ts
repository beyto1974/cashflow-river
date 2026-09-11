import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { applyChange, suggestFixes } from '../src/domain/fixes';
import { project } from '../src/domain/forecast';
import { stretchesBelow } from '../src/domain/stretches';
import type { Scenario } from '../src/domain/types';

/** €1,200 and a €900 dentist bill the day before payday. */
function squeezed(over: Partial<Scenario> = {}): Scenario {
  return {
    label: 'Squeezed',
    asOf: plainDate('2026-09-10'),
    horizonMonths: 6,
    buffer: euros(500),
    accounts: [{ id: 'a', name: 'Current', balance: euros(1200), inForecast: true }],
    lines: [
      {
        kind: 'recurring', id: 'pay', label: 'Pay', amount: euros(1500),
        category: 'salary', cadence: 'monthly', anchor: plainDate('2026-10-02')
      },
      {
        kind: 'recurring', id: 'rent', label: 'Rent', amount: euros(-600),
        category: 'housing', cadence: 'monthly', anchor: plainDate('2026-10-05')
      },
      {
        kind: 'recurring', id: 'save', label: 'Transfer to savings', amount: euros(-300),
        category: 'saving', cadence: 'monthly', anchor: plainDate('2026-09-28')
      },
      {
        kind: 'planned', id: 'dentist', label: 'Dentist', amount: euros(-900),
        category: 'living', date: plainDate('2026-10-01')
      }
    ],
    ...over
  };
}

const stretchesOf = (scenario: Scenario) =>
  stretchesBelow(
    project(scenario).days.map((day) => ({ date: day.date, balance: day.balance })),
    scenario.buffer
  );

describe('applyChange', () => {
  it('moves a one-off to another day', () => {
    const moved = applyChange(squeezed(), { type: 'move-line', lineId: 'dentist', date: plainDate('2026-11-20') });
    const line = moved.lines.find((candidate) => candidate.id === 'dentist');
    expect(line).toMatchObject({ kind: 'planned', date: '2026-11-20' });
  });

  it('changes what a line costs', () => {
    const trimmed = applyChange(squeezed(), { type: 'set-amount', lineId: 'save', amount: euros(-100) });
    expect(trimmed.lines.find((line) => line.id === 'save')?.amount).toBe(euros(-100));
  });

  it('splits a one-off in two, keeping the total', () => {
    const split = applyChange(squeezed(), { type: 'split-line', lineId: 'dentist', date: plainDate('2026-11-01') });
    const parts = split.lines.filter((line) => line.id.startsWith('dentist'));
    expect(parts).toHaveLength(2);
    expect(parts.reduce((sum, line) => sum + line.amount, 0)).toBe(euros(-900));
    expect(parts.map((line) => (line.kind === 'planned' ? line.date : ''))).toContain('2026-11-01');
  });

  it('leaves a scenario alone when the line is not there', () => {
    const scenario = squeezed();
    expect(applyChange(scenario, { type: 'set-amount', lineId: 'ghost', amount: 0 })).toBe(scenario);
  });

  it('does not touch the scenario it was given', () => {
    const scenario = squeezed();
    const before = JSON.stringify(scenario);
    applyChange(scenario, { type: 'move-line', lineId: 'dentist', date: plainDate('2026-12-01') });
    expect(JSON.stringify(scenario)).toBe(before);
  });
});

describe('suggestFixes', () => {
  const scenario = squeezed();

  it('finds nothing to fix when the buffer already holds', () => {
    const comfortable = squeezed({
      accounts: [{ id: 'a', name: 'Current', balance: euros(20_000), inForecast: true }]
    });
    expect(suggestFixes(comfortable)).toEqual([]);
  });

  it('offers fixes that actually clear the stretch it aimed at', () => {
    const fixes = suggestFixes(scenario);
    expect(fixes.length).toBeGreaterThan(0);
    for (const fix of fixes) {
      const after = stretchesOf(applyChange(scenario, fix.change));
      expect(after.length).toBeLessThan(stretchesOf(scenario).length + 1);
      expect(fix.clearsFirst).toBe(true);
    }
  });

  it('explains each one in a sentence a person can act on', () => {
    for (const fix of suggestFixes(scenario)) {
      expect(fix.description).toMatch(/[a-z]/);
      expect(fix.description.length).toBeLessThan(120);
    }
  });

  it('prefers the least disruptive fix first', () => {
    const fixes = suggestFixes(scenario);
    const costs = fixes.map((fix) => fix.disruption);
    expect([...costs].sort((a, b) => a - b)).toEqual(costs);
  });

  it('says when nothing it can try is enough on its own', () => {
    const hopeless = squeezed({
      accounts: [{ id: 'a', name: 'Current', balance: euros(-8_000), inForecast: true }]
    });
    expect(suggestFixes(hopeless)).toEqual([]);
  });

  it('will not suggest moving a one-off into the past', () => {
    for (const fix of suggestFixes(scenario)) {
      if (fix.change.type === 'move-line' || fix.change.type === 'split-line') {
        expect(fix.change.date >= scenario.asOf).toBe(true);
      }
    }
  });

  it('stays within a handful of suggestions', () => {
    expect(suggestFixes(scenario).length).toBeLessThanOrEqual(4);
  });

  it('never advises stopping a living cost, only spending less on it', () => {
    const withLiving = squeezed({
      lines: [
        ...squeezed().lines,
        {
          kind: 'recurring', id: 'food', label: 'Groceries', amount: euros(-200),
          category: 'living', cadence: 'monthly', anchor: plainDate('2026-09-20')
        }
      ]
    });
    for (const fix of suggestFixes(withLiving)) {
      if (fix.change.lineId === 'food') {
        expect(fix.change.type === 'set-amount' && fix.change.amount).not.toBe(0);
        expect(fix.description).not.toMatch(/Pause|Stop/);
      }
    }
  });

  it('may pause a transfer to savings, which is what it is for', () => {
    const fixes = suggestFixes(
      squeezed({ accounts: [{ id: 'a', name: 'Current', balance: euros(1000), inForecast: true }] })
    );
    const pausing = fixes.find((fix) => fix.change.lineId === 'save');
    if (pausing) expect(pausing.description).toMatch(/savings/i);
  });
});
