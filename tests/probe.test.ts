import { expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros, withSign } from '../src/domain/money';
import { applyPatch, switchKind } from '../src/domain/scenarioOps';
import { encodeScenario, safeDecodeScenario } from '../src/persistence/codec';
import { projectBand } from '../src/domain/forecast';
import type { RecurringLine, Scenario } from '../src/domain/types';

const groceries: RecurringLine = {
  kind: 'recurring', id: 'food', label: 'Groceries', amount: euros(-200),
  category: 'living', cadence: 'monthly', anchor: plainDate('2026-09-15'),
  estimate: true, range: { low: euros(-160), high: euros(-260) }
};
const base: Scenario = {
  label: 'X', asOf: plainDate('2026-09-10'), horizonMonths: 6, buffer: euros(500),
  accounts: [{ id: 'a', name: 'C', balance: euros(700), inForecast: true }],
  lines: [groceries]
};

it('amount edit outside range makes the saved scenario undecodable', () => {
  const edited = applyPatch(groceries, { amount: euros(-400) });
  const scenario = { ...base, lines: [edited] };
  const text = encodeScenario(scenario);
  console.log('decoded after amount edit:', safeDecodeScenario(text));
  expect(safeDecodeScenario(text)).toBeNull();
});

it('flipping the direction leaves the range with the old sign', () => {
  const flipped = applyPatch(groceries, { amount: withSign(groceries.amount, 'in') });
  console.log('flipped line:', JSON.stringify(flipped));
  const banded = projectBand({ ...base, lines: [flipped] });
  console.log('band width after flip (cents):', banded.band.at(-1)!.high - banded.band.at(-1)!.low);
  console.log('decoded after flip:', safeDecodeScenario(encodeScenario({ ...base, lines: [flipped] })));
});

it('switchKind drops the range but keeps estimate', () => {
  const planned = switchKind(groceries, 'planned', plainDate('2026-10-01'));
  console.log('after switchKind:', JSON.stringify(planned));
  expect('range' in planned).toBe(false);
});
