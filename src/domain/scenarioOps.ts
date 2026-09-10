import { compareDates, type PlainDate } from './dates';
import { addCents, isNegative, withSign, type Cents } from './money';
import { project } from './forecast';
import { isRecurring, type AmountRange, type Line, type LinePatch, type Scenario } from './types';

/**
 * Moves the scenario's start date forward to `date`, folding everything that
 * has fallen due in the meantime into the balance.
 *
 * Account balances mean "what was in the account at the start of `asOf`", so
 * the fold covers `asOf` up to, but not including, the new date: a movement on
 * the new start date is still ahead. Spent one-offs are removed; recurring
 * lines stay. The net lands on the first account inside the forecast, which is
 * where a real transfer would have shown up.
 */
export function advanceTo(scenario: Scenario, date: PlainDate): Scenario {
  if (compareDates(date, scenario.asOf) <= 0) return scenario;

  const elapsed = project({ ...scenario, horizonMonths: Math.max(1, scenario.horizonMonths) });
  const moved = addCents(
    ...elapsed.days
      .filter((day) => compareDates(day.date, date) < 0)
      .map((day) => day.moved)
  );

  const target = scenario.accounts.find((account) => account.inForecast);
  const accounts = target
    ? scenario.accounts.map((account) =>
        account.id === target.id ? { ...account, balance: account.balance + moved } : account
      )
    : scenario.accounts;

  return {
    ...scenario,
    asOf: date,
    accounts,
    lines: scenario.lines.filter((line) => isRecurring(line) || compareDates(line.date, date) >= 0)
  };
}

/**
 * Turns a line into the other kind without leaving the fields of the kind it
 * left behind — a stale `to` date would otherwise re-apply if the line were
 * switched back.
 */
export function switchKind(line: Line, kind: Line['kind'], fallbackDate: PlainDate): Line {
  if (line.kind === kind) return line;

  /* Built by dropping the other kind's fields rather than by listing the shared
     ones, so a new optional field is carried across instead of being lost. */
  const shared = { ...line } as Record<string, unknown>;
  for (const field of ['kind', 'cadence', 'anchor', 'from', 'to', 'date']) delete shared[field];

  return kind === 'planned'
    ? ({ ...shared, kind: 'planned', date: isRecurring(line) ? line.anchor : fallbackDate } as unknown as Line)
    : ({
        ...shared,
        kind: 'recurring',
        cadence: 'monthly',
        anchor: isRecurring(line) ? line.anchor : line.date
      } as unknown as Line);
}

/**
 * Applies a patch to a line, dropping any field the patch sets to undefined so
 * an optional field can actually be removed rather than stored as undefined.
 */
export function applyPatch(line: Line, patch: LinePatch): Line {
  const merged: Record<string, unknown> = { ...line };
  for (const [field, value] of Object.entries(patch)) {
    if (value === undefined) delete merged[field];
    else merged[field] = value;
  }
  const patched = merged as unknown as Line;
  return patched.range ? { ...patched, range: normaliseRange(patched.range, patched.amount) } : patched;
}

/**
 * A range has to point the same way as its amount and contain it. Otherwise a
 * direction change leaves an income line with a spending guess, and the stored
 * scenario stops loading at all.
 */
export function normaliseRange(range: AmountRange, amount: Cents): AmountRange {
  const direction = isNegative(amount) ? 'out' : 'in';
  const size = Math.abs(amount);
  /* `low` holds the modest end and `high` the far end, measured as sizes, so the
     comparison works the same for money in and money out. */
  const modest = Math.min(Math.min(Math.abs(range.low), Math.abs(range.high)), size);
  const far = Math.max(Math.max(Math.abs(range.low), Math.abs(range.high)), size);

  return { low: withSign(modest, direction), high: withSign(far, direction) };
}
