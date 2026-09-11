import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import type { Scenario } from '../src/domain/types';
import type { LedgerStore } from '../src/persistence/ports';
import { createLedgerState } from '../src/ui/state.svelte';
import { tinyScenario } from './fixtures';

const emptyFixture = (): Scenario =>
  tinyScenario({ label: 'Empty', lines: [], accounts: [{ id: 'a', name: 'Current', balance: 0, inForecast: true }] });

function recordingStore(initial: Scenario | null = null): LedgerStore & { saves: Scenario[] } {
  const saves: Scenario[] = [];
  let held = initial;
  return {
    saves,
    load: () => held,
    save: (scenario) => {
      held = scenario;
      saves.push(scenario);
    },
    clear: () => {
      held = null;
    },
    history: () => saves.map((_, index) => ({ revision: index + 1, savedAt: '2026-09-11T09:00:00.000Z' })),
    restore: (revision) => saves[revision - 1] ?? null,
    names: () => ['My ledger'],
    current: () => 'My ledger',
    select: () => {},
    saveAs: () => true,
    remove: () => {}
  };
}

describe('ledger state', () => {
  it('rolls a stored ledger forward to today and saves the roll', () => {
    const stored = tinyScenario({ label: 'Mine' }); // dated 2026-09-10
    const store = recordingStore(stored);
    const ledger = createLedgerState(store, tinyScenario(), emptyFixture(), plainDate('2026-10-05'));

    expect(ledger.scenario.asOf).toBe('2026-10-05');
    // salary on 27 September and the boiler service on 2 October have happened
    expect(ledger.forecast.opening).toBe(euros(1500 + 2500 - 190));
    expect(store.saves[0]?.asOf).toBe('2026-10-05');
  });

  it('opens with the needle on the lowest point rather than a fixed date', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    expect(ledger.target).toBe(ledger.forecast.low.date);
  });

  it('changes a line between repeating and one-off without keeping stale fields', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    ledger.updateLine('pay', { to: plainDate('2027-01-01') } as never);
    ledger.changeKind('pay', 'planned');
    ledger.changeKind('pay', 'recurring');

    const line = ledger.scenario.lines.find((candidate) => candidate.id === 'pay');
    expect(line).not.toHaveProperty('to');
    expect(line).toMatchObject({ kind: 'recurring', cadence: 'monthly' });
  });

  it('opens on the example when nothing is stored, and says so', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    expect(ledger.isSample).toBe(true);
    expect(ledger.forecast.opening).toBe(euros(1500));
  });

  it('prefers what was stored', () => {
    const stored = tinyScenario({ label: 'Mine', buffer: euros(50) });
    const ledger = createLedgerState(recordingStore(stored), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    expect(ledger.isSample).toBe(false);
    expect(ledger.scenario.label).toBe('Mine');
  });

  it('writes every change through to the store and reprojects', () => {
    const store = recordingStore();
    const ledger = createLedgerState(store, tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    const before = ledger.forecast.days.at(-1)!.balance;

    ledger.updateLine('pay', { amount: euros(3000) });

    expect(store.saves).toHaveLength(1);
    expect(ledger.isSample).toBe(false);
    expect(ledger.forecast.days.at(-1)!.balance).toBeGreaterThan(before);
  });

  it('keeps the read-out date inside the horizon when the horizon shrinks', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    ledger.setTarget(plainDate('2027-02-01'));
    expect(ledger.target).toBe('2027-02-01');

    ledger.setHorizon(2);
    expect(ledger.target).toBe('2026-11-10');
    expect(ledger.forecast.dayAt(ledger.target)).toBeDefined();
  });

  it('adds, mutes and removes lines', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    ledger.addLine({
      kind: 'planned', id: 'new', label: 'Tyres', amount: euros(-320),
      category: 'transport', date: plainDate('2026-10-10')
    });
    expect(ledger.scenario.lines).toHaveLength(3);
    expect(ledger.editing).toBe('new');

    ledger.toggleMute('new');
    expect(ledger.scenario.lines.find((line) => line.id === 'new')?.muted).toBe(true);

    ledger.removeLine('new');
    expect(ledger.scenario.lines).toHaveLength(2);
    expect(ledger.editing).toBeNull();
  });

  it('folds what has happened when the start date is moved forward', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    const opening = ledger.forecast.opening;

    ledger.setAsOf(plainDate('2026-10-05'));

    expect(ledger.scenario.asOf).toBe('2026-10-05');
    // the salary on 27 September and the boiler service on 2 October are behind us now
    expect(ledger.forecast.opening).toBe(opening + euros(2500) - euros(190));
    expect(ledger.scenario.lines.some((line) => line.id === 'fix')).toBe(false);
  });

  it('moves the start date back without inventing money', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    const opening = ledger.forecast.opening;
    ledger.setAsOf(plainDate('2026-08-01'));
    expect(ledger.scenario.asOf).toBe('2026-08-01');
    expect(ledger.forecast.opening).toBe(opening);
  });

  it('carries every ledger out and back in again', () => {
    const store = recordingStore();
    const ledger = createLedgerState(store, tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    ledger.updateLine('pay', { label: 'Wages' });

    const text = ledger.exportAll();
    expect(JSON.parse(text).ledgers[0].document.scenario.lines[0].label).toBe('Wages');
    // the ledger it came from is still here, so the copy arrives beside it
    expect(ledger.importAll(text)).toEqual(['My ledger (imported)']);
  });

  it('hands out a frozen ledger, so nothing can go stale behind the memo', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    expect(Object.isFrozen(ledger.scenario)).toBe(true);
    expect(Object.isFrozen(ledger.scenario.lines[0])).toBe(true);
    expect(() => {
      (ledger.scenario.lines[0] as { amount: number }).amount = 1;
    }).toThrow(TypeError);

    ledger.updateLine('pay', { label: 'Wages' });
    expect(Object.isFrozen(ledger.scenario)).toBe(true);
  });

  it('will not remove the last account', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    ledger.removeAccount('a');
    expect(ledger.scenario.accounts).toHaveLength(1);
  });

  it('rolls a ledger forward when switching to it, not only on first load', () => {
    const stored = tinyScenario({ label: 'Mine' }); // dated 2026-09-10
    const store = recordingStore(stored);
    const ledger = createLedgerState(store, tinyScenario(), emptyFixture(), plainDate('2026-10-05'));

    ledger.selectLedger('My ledger');
    expect(ledger.scenario.asOf).toBe('2026-10-05');
  });

  it('drops the dials, the baseline and the history when it goes back to the example', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    ledger.updateLine('pay', { label: 'Wages' });
    ledger.setDial('income', 0.8);
    ledger.pinBaseline();

    ledger.reset();

    expect(ledger.dialsTouched).toBe(false);
    expect(ledger.baseline).toBeNull();
    expect(ledger.comparison).toBeNull();
  });

  it('applies a fix to the figures it was searched against', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    ledger.setDial('income', 0.5);
    const fixes = ledger.fixes();
    if (fixes.length > 0) {
      const promised = fixes[0]!;
      ledger.applyFix(promised);
      // the dials are now part of the ledger rather than a layer over it
      expect(ledger.dialsTouched).toBe(false);
      expect(ledger.scenario.lines.find((line) => line.id === 'pay')?.amount).toBe(euros(1250));
    }
  });

  it('clears to an empty ledger when asked, keeping a version behind it', () => {
    const store = recordingStore();
    const ledger = createLedgerState(store, tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    ledger.updateLine('pay', { label: 'Wages' });

    ledger.startEmpty();

    expect(ledger.scenario.lines).toEqual([]);
    expect(ledger.scenario.accounts).toHaveLength(1);
    expect(ledger.forecast.opening).toBe(0);
    expect(ledger.isSample).toBe(false);
    /* The ledger before it was saved, so it can be restored. */
    expect(store.saves.some((saved) => saved.lines.some((line) => line.label === 'Wages'))).toBe(true);
  });

  it('goes back to the example on reset', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario(), emptyFixture(), plainDate('2026-09-10'));
    ledger.updateLine('pay', { label: 'Wages' });
    ledger.reset();
    expect(ledger.isSample).toBe(true);
    expect(ledger.scenario.lines[0]?.label).toBe('Salary');
  });
});
