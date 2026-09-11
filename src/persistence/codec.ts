import { isPlainDate, type PlainDate } from '../domain/dates';
import {
  CATEGORIES, type Account, type AmountRange, type Category, type Indexation, type Line, type Scenario
} from '../domain/types';
import { CADENCES } from '../domain/schedule';
import { normaliseRange } from '../domain/scenarioOps';
import { DUE_RULES, type DueRule } from '../domain/dueDates';
import type { Cadence } from '../domain/types';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'moraview.scenario.v1';

export class ScenarioFormatError extends Error {}

interface StoredDocument {
  schemaVersion: number;
  scenario: Scenario;
}

export function encodeScenario(scenario: Scenario): string {
  const document: StoredDocument = { schemaVersion: SCHEMA_VERSION, scenario };
  return JSON.stringify(document, null, 2);
}

function fail(field: string, why: string): never {
  throw new ScenarioFormatError(`${field} ${why}`);
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(field, 'is not an object');
  return value as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(field, 'is not text');
  return value as string;
}

function asCents(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) fail(field, 'is not a whole number of cents');
  return value;
}

function asDate(value: unknown, field: string): PlainDate {
  const text = asString(value, field);
  if (!isPlainDate(text)) fail(field, 'is not a calendar date (YYYY-MM-DD)');
  return text as PlainDate;
}

function asCategory(value: unknown, field: string): Category {
  const text = asString(value, field);
  if (!(CATEGORIES as readonly string[]).includes(text)) fail(field, `is not a known category: ${text}`);
  return text as Category;
}

function asCadence(value: unknown, field: string): Cadence {
  const text = asString(value, field);
  if (!Object.prototype.hasOwnProperty.call(CADENCES, text)) fail(field, `is not a known cadence: ${text}`);
  return text as Cadence;
}

function asCount(value: unknown, at: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10_000) {
    fail(at, 'is not a whole number of occurrences between 1 and 10000');
  }
  return value as number;
}

function asDueRule(value: unknown, at: string): DueRule {
  const text = asString(value, at);
  if (!Object.prototype.hasOwnProperty.call(DUE_RULES, text)) fail(at, `is not a known payment-day rule: ${text}`);
  return text as DueRule;
}

function asIndexation(value: unknown, at: string): Indexation {
  const raw = asRecord(value, at);
  const rate = raw.ratePerYear;
  if (typeof rate !== 'number' || !Number.isInteger(rate) || rate < 0 || rate > 100_000) {
    fail(`${at}.ratePerYear`, 'is not a whole number of basis points between 0 and 100000');
  }
  return { ratePerYear: rate as number, from: asDate(raw.from, `${at}.from`) };
}

/**
 * A range is normalised rather than refused: it has to point the same way as the
 * amount and contain it, and a scenario that has drifted is worth loading with
 * the range widened, not throwing away.
 */
function asRange(value: unknown, at: string, amount: number): AmountRange {
  const raw = asRecord(value, at);
  return normaliseRange(
    { low: asCents(raw.low, `${at}.low`), high: asCents(raw.high, `${at}.high`) },
    amount
  );
}

function asAccount(value: unknown, index: number): Account {
  const raw = asRecord(value, `accounts[${index}]`);
  return {
    id: asString(raw.id, `accounts[${index}].id`),
    name: asString(raw.name, `accounts[${index}].name`),
    balance: asCents(raw.balance, `accounts[${index}].balance`),
    inForecast: raw.inForecast !== false
  };
}

/** Reads only the fields the model knows, so stray keys are dropped, not stored. */
function asLine(value: unknown, index: number): Line {
  const at = `lines[${index}]`;
  const raw = asRecord(value, at);
  const amount = asCents(raw.amount, `${at}.amount`);
  const shared = {
    id: asString(raw.id, `${at}.id`),
    label: asString(raw.label, `${at}.label`),
    amount,
    category: asCategory(raw.category, `${at}.category`),
    ...(raw.estimate === true ? { estimate: true as const } : {}),
    ...(raw.range === undefined ? {} : { range: asRange(raw.range, `${at}.range`, amount) }),
    ...(raw.muted === true ? { muted: true as const } : {})
  };

  if (raw.kind === 'planned') {
    return { ...shared, kind: 'planned', date: asDate(raw.date, `${at}.date`) };
  }
  if (raw.kind === 'recurring') {
    return {
      ...shared,
      kind: 'recurring',
      cadence: asCadence(raw.cadence, `${at}.cadence`),
      anchor: asDate(raw.anchor, `${at}.anchor`),
      ...(raw.from === undefined ? {} : { from: asDate(raw.from, `${at}.from`) }),
      ...(raw.to === undefined ? {} : { to: asDate(raw.to, `${at}.to`) }),
      ...(raw.indexation === undefined ? {} : { indexation: asIndexation(raw.indexation, `${at}.indexation`) }),
      ...(raw.dueRule === undefined ? {} : { dueRule: asDueRule(raw.dueRule, `${at}.dueRule`) }),
      ...(raw.times === undefined ? {} : { times: asCount(raw.times, `${at}.times`) })
    };
  }
  return fail(`${at}.kind`, 'is neither "recurring" nor "planned"');
}

/** Validates a stored document and returns the scenario inside it. */
export function decodeScenario(document: unknown): Scenario {
  const outer = asRecord(document, 'document');
  const version = outer.schemaVersion;
  if (typeof version !== 'number' || version > SCHEMA_VERSION) {
    fail('schemaVersion', `is newer than this build understands (${String(version)} > ${SCHEMA_VERSION})`);
  }

  const raw = asRecord(outer.scenario, 'scenario');
  const horizon = raw.horizonMonths;
  if (typeof horizon !== 'number' || !Number.isInteger(horizon) || horizon < 1 || horizon > 600) {
    fail('horizonMonths', 'is not a whole number of months between 1 and 600');
  }
  const accounts = raw.accounts;
  if (!Array.isArray(accounts) || accounts.length === 0) fail('accounts', 'is empty');
  const lines = raw.lines;
  if (!Array.isArray(lines)) fail('lines', 'is not a list');

  const holidays = raw.holidays;
  if (holidays !== undefined && !Array.isArray(holidays)) fail('holidays', 'is not a list of dates');

  return {
    label: asString(raw.label, 'label'),
    asOf: asDate(raw.asOf, 'asOf'),
    horizonMonths: horizon as number,
    buffer: asCents(raw.buffer, 'buffer'),
    accounts: accounts.map(asAccount),
    lines: lines.map(asLine),
    ...(holidays === undefined
      ? {}
      : { holidays: holidays.map((value, index) => asDate(value, `holidays[${index}]`)) })
  };
}

/** For reading storage that may hold anything at all. */
export function safeDecodeScenario(text: string | null | undefined): Scenario | null {
  if (!text) return null;
  try {
    return decodeScenario(JSON.parse(text));
  } catch {
    return null;
  }
}
