import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import type { Scenario } from '../src/domain/types';
import type { ScenarioStore } from '../src/persistence/ports';
import { createLedgerState } from '../src/ui/state.svelte';
import { tinyScenario } from './fixtures';

function recordingStore(initial: Scenario | null = null): ScenarioStore & { saves: Scenario[] } {
  const saves: Scenario[] = [];
  return {
    saves,
    load: () => initial,
    save: (scenario) => void saves.push(scenario),
    clear: () => void saves.push(tinyScenario())
  };
}

describe('ledger state', () => {
  it('opens on the example when nothing is stored, and says so', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario());
    expect(ledger.isSample).toBe(true);
    expect(ledger.forecast.opening).toBe(euros(1500));
  });

  it('prefers what was stored', () => {
    const stored = tinyScenario({ label: 'Mine', buffer: euros(50) });
    const ledger = createLedgerState(recordingStore(stored), tinyScenario());
    expect(ledger.isSample).toBe(false);
    expect(ledger.scenario.label).toBe('Mine');
  });

  it('writes every change through to the store and reprojects', () => {
    const store = recordingStore();
    const ledger = createLedgerState(store, tinyScenario());
    const before = ledger.forecast.days.at(-1)!.balance;

    ledger.updateLine('pay', { amount: euros(3000) });

    expect(store.saves).toHaveLength(1);
    expect(ledger.isSample).toBe(false);
    expect(ledger.forecast.days.at(-1)!.balance).toBeGreaterThan(before);
  });

  it('keeps the read-out date inside the horizon when the horizon shrinks', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario());
    ledger.setTarget(plainDate('2027-02-01'));
    expect(ledger.target).toBe('2027-02-01');

    ledger.setHorizon(2);
    expect(ledger.target).toBe('2026-11-10');
    expect(ledger.forecast.dayAt(ledger.target)).toBeDefined();
  });

  it('adds, mutes and removes lines', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario());
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

  it('will not remove the last account', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario());
    ledger.removeAccount('a');
    expect(ledger.scenario.accounts).toHaveLength(1);
  });

  it('goes back to the example on reset', () => {
    const ledger = createLedgerState(recordingStore(), tinyScenario());
    ledger.updateLine('pay', { label: 'Wages' });
    ledger.reset();
    expect(ledger.isSample).toBe(true);
    expect(ledger.scenario.lines[0]?.label).toBe('Salary');
  });
});
