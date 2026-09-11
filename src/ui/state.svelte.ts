import { addMonths, compareDates, monthKey, today, type MonthKey, type PlainDate } from '../domain/dates';
import type { Cents } from '../domain/money';
import { project, projectBand, type BandedForecast, type Forecast } from '../domain/forecast';
import { byMonth, monthlyRhythm, type MonthSummary, type Rhythm } from '../domain/rollups';
import { summarise, type Summary } from '../domain/summary';
import { applyChange, suggestFixes, type Fix } from '../domain/fixes';
import { applyWhatIf, isNeutral, NEUTRAL, type WhatIf } from '../domain/whatIf';
import { compare, type Comparison } from '../domain/comparison';
import { advanceTo, applyPatch, switchKind } from '../domain/scenarioOps';
import { freezeScenario } from '../domain/freeze';
import type { Account, Line, LinePatch, Scenario } from '../domain/types';
import type { LedgerStore, Revision } from '../persistence/ports';
import { exportLedgers, importLedgers } from '../persistence/transfer';
import { DEFAULT_PREFERENCES, type ForecastView, type PreferenceStore } from '../persistence/preferences';

export interface LedgerState {
  readonly scenario: Scenario;
  /** The likely reading; `banded` carries the band around it and the warnings. */
  readonly forecast: Forecast;
  readonly banded: BandedForecast;
  readonly months: MonthSummary[];
  readonly rhythm: Rhythm;
  /** The answer in a sentence, plus the tight stretches behind it. */
  readonly summary: Summary;
  /** The what-if dials, and whether they are doing anything. */
  readonly dials: WhatIf;
  readonly dialsTouched: boolean;
  setDial(dial: keyof WhatIf, value: number): void;
  resetDials(): void;
  /** Writes the dials into the ledger as real edits. */
  keepDials(): void;
  /** The named ledgers this browser holds, and the versions of this one. */
  readonly ledgerNames: string[];
  readonly ledgerName: string;
  readonly history: Revision[];
  selectLedger(name: string): void;
  saveLedgerAs(name: string): boolean;
  removeLedger(name: string): void;
  restoreRevision(revision: number): void;
  /** Which reading of the forecast is on screen, and which sections are folded. */
  readonly view: ForecastView;
  setView(view: ForecastView): void;
  isFolded(section: string): boolean;
  toggleSection(section: string): void;
  /** Every ledger in this browser, as one JSON file's worth of text. */
  exportAll(): string;
  /** Adds a bundle's ledgers alongside these ones, overwriting nothing. */
  importAll(text: string): string[];
  /** The pinned baseline to compare against, and the comparison itself. */
  readonly baseline: Scenario | null;
  readonly comparison: Comparison | null;
  pinBaseline(): void;
  clearBaseline(): void;
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
  /** Searched on demand: one projection per candidate change. */
  fixes(): Fix[];
  /** Applies the change to the figures it was searched against, dials included. */
  applyFix(fix: Fix): void;
  reset(): void;
}

/**
 * The one place the scenario changes. Every mutation writes through to the
 * store, and the forecast is derived rather than kept, so nothing can hold a
 * projection that no longer matches the ledger.
 */
export function createLedgerState(
  store: LedgerStore,
  sample: Scenario,
  now: PlainDate = today(),
  preferences: PreferenceStore = { load: () => DEFAULT_PREFERENCES, save: () => {} }
): LedgerState {
  const saved0 = preferences.load();
  const saved = store.load();
  /* A stored ledger is dated the day it was last saved. Roll it forward so the
     forecast starts today, folding what has happened since into the balance. */
  const rolled = saved ? advanceTo(saved, now) : null;
  if (rolled && rolled !== saved) store.save(rolled);

  /* Raw rather than proxied, and frozen: the projection is memoised on this
     object's identity, so the only way the ledger changes is by being replaced
     in commit(). A write through it now throws instead of leaving a forecast
     that never updates again. */
  let scenario = $state.raw<Scenario>(freezeScenario(rolled ?? sample));
  let fromSample = $state(saved === null);
  let target = $state<PlainDate>(project(scenario).low.date);
  let selected = $state<MonthKey | null>(null);
  let editing = $state<string | null>(null);
  let dials = $state<WhatIf>({ ...NEUTRAL });
  let baseline = $state.raw<Scenario | null>(null);
  /* Bumped whenever storage changes under us, so the ledger list and the
     version history are read again rather than cached stale. */
  let storeVersion = $state(0);
  let view = $state<ForecastView>(saved0.view);
  let folded = $state<string[]>(saved0.collapsed);

  function rememberView(): void {
    preferences.save({ view, collapsed: folded });
  }

  /* The dials are a layer: the forecast is of the scenario as dialled, while the
     ledger on screen stays the household's own figures. */
  const dialled = $derived(applyWhatIf(scenario, dials));
  const banded = $derived(projectBand(dialled));
  const forecast = $derived(banded.likely);
  const months = $derived(byMonth(forecast));
  const rhythm = $derived(monthlyRhythm(dialled));
  const summary = $derived(summarise(banded, scenario.buffer, target));
  const comparison = $derived(baseline ? compare(baseline, dialled) : null);

  function commit(next: Scenario): void {
    scenario = freezeScenario(next);
    fromSample = false;
    store.save(scenario);
    storeVersion += 1;
    target = clampToHorizon(scenario, target);
  }

  function openCurrent(): void {
    const saved = store.load();
    /* Same roll-forward as on first load: a ledger saved three weeks ago must
       not open on a forecast that starts three weeks ago. */
    const rolledSaved = saved ? advanceTo(saved, now) : null;
    if (rolledSaved && rolledSaved !== saved) store.save(rolledSaved);
    scenario = freezeScenario(rolledSaved ?? sample);
    fromSample = saved === null;
    target = project(scenario).low.date;
    selected = null;
    editing = null;
    baseline = null;
    dials = { ...NEUTRAL };
    storeVersion += 1;
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
    get summary() { return summary; },
    get dials() { return dials; },
    get ledgerNames() {
      void storeVersion;
      return store.names();
    },
    get ledgerName() {
      void storeVersion;
      return store.current();
    },
    get history() {
      void storeVersion;
      return store.history();
    },

    selectLedger(name) {
      store.select(name);
      openCurrent();
    },
    saveLedgerAs(name) {
      const saved = store.saveAs(name, scenario);
      if (saved) storeVersion += 1;
      return saved;
    },
    removeLedger(name) {
      store.remove(name);
      openCurrent();
    },
    restoreRevision(revision) {
      const restored = store.restore(revision);
      if (restored) commit(advanceTo(restored, now));
    },

    get view() { return view; },
    setView(next) {
      view = next;
      rememberView();
    },
    isFolded(section) {
      return folded.includes(section);
    },
    toggleSection(section) {
      folded = folded.includes(section) ? folded.filter((name) => name !== section) : [...folded, section];
      rememberView();
    },

    exportAll() {
      return exportLedgers(store);
    },
    importAll(text) {
      const result = importLedgers(store, text);
      openCurrent();
      return result.imported;
    },

    get baseline() { return baseline; },
    get comparison() { return comparison; },

    pinBaseline() {
      baseline = freezeScenario(dialled);
    },
    clearBaseline() {
      baseline = null;
    },
    get dialsTouched() { return !isNeutral(dials); },

    setDial(dial, value) {
      dials = { ...dials, [dial]: value };
    },
    resetDials() {
      dials = { ...NEUTRAL };
    },
    keepDials() {
      if (isNeutral(dials)) return;
      commit(applyWhatIf(scenario, dials));
      dials = { ...NEUTRAL };
    },
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
    /**
     * Moving the start date forward folds what has fallen due in between into
     * the balance, exactly as loading a stored ledger does — otherwise a payment
     * whose working-day rule shifts it before the new start is simply lost.
     * Moving it back only re-opens days that are projected again anyway.
     */
    setAsOf(date) {
      commit(compareDates(date, scenario.asOf) > 0 ? advanceTo(scenario, date) : { ...scenario, asOf: date });
    },
    fixes() {
      return suggestFixes(dialled);
    },
    applyFix(fix) {
      /* The search runs on the dialled figures, so the change has to land on
         them: applying it to the undialled ledger would write an amount derived
         from a dialled one. Baking the dials in is the honest reading of "do
         it", and the dials go back to neutral because they are now the ledger. */
      commit(applyChange(dialled, fix.change));
      dials = { ...NEUTRAL };
    },
    reset() {
      store.clear();
      scenario = freezeScenario(sample);
      fromSample = true;
      target = project(scenario).low.date;
      selected = null;
      editing = null;
      /* The history keys went with the ledger, and the dials and the pinned
         baseline belonged to it too. */
      baseline = null;
      dials = { ...NEUTRAL };
      storeVersion += 1;
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
