import { addMonths, compareDates, monthKey, today, type MonthKey, type PlainDate } from '../domain/dates';
import type { Cents } from '../domain/money';
import { project, projectBand, type BandedForecast, type Forecast } from '../domain/forecast';
import { byMonth, monthlyRhythm, type MonthSummary, type Rhythm } from '../domain/rollups';
import { advanceTo, applyPatch, switchKind } from '../domain/scenarioOps';
import type { Account, Line, LinePatch, Scenario } from '../domain/types';
import type { ScenarioStore } from '../persistence/ports';

export interface LedgerState {
  readonly scenario: Scenario;
  /** The likely reading; `banded` carries the band around it and the warnings. */
  readonly forecast: Forecast;
  readonly banded: BandedForecast;
  readonly months: MonthSummary[];
  readonly rhythm: Rhythm;
  readonly target: PlainDate;
  readonly selectedMonth: MonthKey;
  readonly editing: string | null;
  readonly isSample: boolean;
  setTarget(date: PlainDate): void;
  selectMonth(month: MonthKey): void;
  edit(lineId: string | null): void;
  updateLine(id: string, patch: LinePatch): void;
  changeKind(id: string, kind: Line['kind']): void;
  addLine(line: Line): void;
  removeLine(id: string): void;
  toggleMute(id: string): void;
  updateAccount(id: string, patch: Partial<Account>): void;
  addAccount(): void;
  removeAccount(id: string): void;
  setBuffer(buffer: Cents): void;
  setHorizon(months: number): void;
  setAsOf(date: PlainDate): void;
  reset(): void;
}

/**
 * The one place the scenario changes. Every mutation writes through to the
 * store, and the forecast is derived rather than kept, so nothing can hold a
 * projection that no longer matches the ledger.
 */
export function createLedgerState(store: ScenarioStore, sample: Scenario, now: PlainDate = today()): LedgerState {
  const saved = store.load();
  /* A stored ledger is dated the day it was last saved. Roll it forward so the
     forecast starts today, folding what has happened since into the balance. */
  const rolled = saved ? advanceTo(saved, now) : null;
  if (rolled && rolled !== saved) store.save(rolled);

  let scenario = $state<Scenario>(rolled ?? sample);
  let fromSample = $state(saved === null);
  let target = $state<PlainDate>(project(rolled ?? sample).low.date);
  let selected = $state<MonthKey | null>(null);
  let editing = $state<string | null>(null);

  const banded = $derived(projectBand(scenario));
  const forecast = $derived(banded.likely);
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
    get banded() { return banded; },
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
      mapLines((line) => (line.id === id ? applyPatch(line, patch) : line));
    },
    changeKind(id, kind) {
      mapLines((line) => (line.id === id ? switchKind(line, kind, scenario.asOf) : line));
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
    setAsOf(date) {
      commit({ ...scenario, asOf: date });
    },
    reset() {
      store.clear();
      scenario = sample;
      fromSample = true;
      target = project(sample).low.date;
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
