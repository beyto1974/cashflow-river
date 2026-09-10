import { addMonths, compareDates, monthKey, plainDate, type MonthKey, type PlainDate } from '../domain/dates';
import type { Cents } from '../domain/money';
import { project, type Forecast } from '../domain/forecast';
import { byMonth, monthlyRhythm, type MonthSummary, type Rhythm } from '../domain/rollups';
import type { Account, Line, Scenario } from '../domain/types';
import type { ScenarioStore } from '../persistence/ports';

export interface LedgerState {
  readonly scenario: Scenario;
  readonly forecast: Forecast;
  readonly months: MonthSummary[];
  readonly rhythm: Rhythm;
  readonly target: PlainDate;
  readonly selectedMonth: MonthKey;
  readonly editing: string | null;
  readonly isSample: boolean;
  setTarget(date: PlainDate): void;
  selectMonth(month: MonthKey): void;
  edit(lineId: string | null): void;
  updateLine(id: string, patch: Partial<Line>): void;
  addLine(line: Line): void;
  removeLine(id: string): void;
  toggleMute(id: string): void;
  updateAccount(id: string, patch: Partial<Account>): void;
  addAccount(): void;
  removeAccount(id: string): void;
  setBuffer(buffer: Cents): void;
  setHorizon(months: number): void;
  reset(): void;
}

/**
 * The one place the scenario changes. Every mutation writes through to the
 * store, and the forecast is derived rather than kept, so nothing can hold a
 * projection that no longer matches the ledger.
 */
export function createLedgerState(store: ScenarioStore, sample: Scenario): LedgerState {
  const saved = store.load();
  let scenario = $state<Scenario>(saved ?? sample);
  let fromSample = $state(saved === null);
  let target = $state<PlainDate>(clampToHorizon(scenario, plainDate('2027-03-02')));
  let selected = $state<MonthKey | null>(null);
  let editing = $state<string | null>(null);

  const forecast = $derived(project(scenario));
  const months = $derived(byMonth(forecast));
  const rhythm = $derived(monthlyRhythm(scenario));

  function commit(next: Scenario): void {
    scenario = next;
    fromSample = false;
    store.save(next);
    target = clampToHorizon(next, target);
  }
  function mapLines(change: (line: Line) => Line): void {
    commit({ ...scenario, lines: scenario.lines.map(change) });
  }

  return {
    get scenario() { return scenario; },
    get forecast() { return forecast; },
    get months() { return months; },
    get rhythm() { return rhythm; },
    get target() { return target; },
    get selectedMonth() { return selected ?? monthKey(forecast.low.date); },
    get editing() { return editing; },
    get isSample() { return fromSample; },

    setTarget(date) {
      target = clampToHorizon(scenario, date);
      selected = monthKey(target);
    },
    selectMonth(month) { selected = month; },
    edit(lineId) { editing = lineId; },

    updateLine(id, patch) {
      mapLines((line) => (line.id === id ? ({ ...line, ...patch } as Line) : line));
    },
    addLine(line) {
      commit({ ...scenario, lines: [...scenario.lines, line] });
      editing = line.id;
    },
    removeLine(id) {
      commit({ ...scenario, lines: scenario.lines.filter((line) => line.id !== id) });
      if (editing === id) editing = null;
    },
    toggleMute(id) {
      mapLines((line) => (line.id === id ? { ...line, muted: !line.muted } : line));
    },

    updateAccount(id, patch) {
      commit({
        ...scenario,
        accounts: scenario.accounts.map((account) => (account.id === id ? { ...account, ...patch } : account))
      });
    },
    addAccount() {
      commit({
        ...scenario,
        accounts: [
          ...scenario.accounts,
          { id: `account-${Date.now().toString(36)}`, name: 'New account', balance: 0, inForecast: true }
        ]
      });
    },
    removeAccount(id) {
      if (scenario.accounts.length === 1) return;
      commit({ ...scenario, accounts: scenario.accounts.filter((account) => account.id !== id) });
    },

    setBuffer(buffer) { commit({ ...scenario, buffer: Math.max(0, buffer) }); },
    setHorizon(horizonMonths) {
      commit({ ...scenario, horizonMonths: Math.min(600, Math.max(1, Math.round(horizonMonths))) });
    },
    reset() {
      store.clear();
      scenario = sample;
      fromSample = true;
      target = clampToHorizon(sample, plainDate('2027-03-02'));
      selected = null;
      editing = null;
    }
  };
}

/** Keeps the read-out date inside the forecast without projecting again. */
function clampToHorizon(scenario: Scenario, date: PlainDate): PlainDate {
  const horizon = addMonths(scenario.asOf, Math.max(1, scenario.horizonMonths));
  if (compareDates(date, scenario.asOf) < 0) return scenario.asOf;
  if (compareDates(date, horizon) > 0) return horizon;
  return date;
}
