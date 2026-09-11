import { CATEGORIES } from '../domain/types';
import { cadenceKeys } from '../domain/schedule';
import { DUE_RULES } from '../domain/dueDates';
import { SCHEMA_VERSION } from './codec';
import { BUNDLE_VERSION } from './transfer';

export interface FormatSpec {
  /** The prose a person — or a model — needs to write a file this app accepts. */
  text: string;
  /** A complete, importable bundle. */
  example: string;
}

/**
 * The import format, written out from the constants the code actually validates
 * against, so the documentation cannot drift away from the parser. Meant to be
 * copied wholesale into a conversation with a model: "here is the format, here
 * is my situation, write me the file".
 */
export function formatSpec(): FormatSpec {
  const cadences = cadenceKeys();
  const rules = Object.keys(DUE_RULES);

  const text = `Moraview import format (bundle version ${BUNDLE_VERSION}, scenario schema ${SCHEMA_VERSION})

A file is one JSON object:

{
  "moraview": ${BUNDLE_VERSION},
  "current": "<name of the ledger to open>",
  "ledgers": [
    { "name": "<ledger name>", "document": { "schemaVersion": ${SCHEMA_VERSION}, "scenario": { ... } } }
  ]
}

Two conventions run through the whole file:

- Every amount is an integer number of CENTS. 2940.00 is written 294000.
  Income is positive, spending is NEGATIVE. There are no decimals anywhere.
- Every date is a calendar day as "YYYY-MM-DD". No times, no zones.

A scenario:

{
  "label": "<a description of the household>",
  "asOf": "<the day the forecast starts, usually today>",
  "horizonMonths": <whole number, 1 to 600>,
  "buffer": <cents the household wants to keep in the current accounts>,
  "accounts": [
    { "id": "<unique>", "name": "<what it is called>", "balance": <cents>, "inForecast": true }
  ],
  "lines": [ ... ],
  "holidays": ["<days the banks are shut, on top of every weekend>"]
}

Set "inForecast": false for an account held outside the forecast, such as a
savings pot the household is not spending from.

A recurring line — something that happens again and again:

{
  "kind": "recurring",
  "id": "<unique across all lines>",
  "label": "<what it is>",
  "amount": <cents, negative for spending>,
  "category": "<one of: ${CATEGORIES.join(', ')}>",
  "cadence": "<one of: ${cadences.join(', ')}>",
  "anchor": "<a date it falls due; every later occurrence is counted from here>",
  "from": "<optional: not before this date>",
  "to": "<optional: not after this date>",
  "dueRule": "<optional, one of: ${rules.join(', ')}>",
  "indexation": { "ratePerYear": <basis points, 200 means 2.00% a year>, "from": "<date the rises are counted from>" },
  "estimate": true,
  "range": { "low": <cents, the modest end>, "high": <cents, the far end> }
}

A one-off:

{ "kind": "planned", "id": "<unique>", "label": "<what it is>", "amount": <cents>, "category": "<as above>", "date": "<when>" }

Notes that matter:

- "estimate": true says the household is guessing. Add "range" with it: both
  ends carry the same sign as the amount, and the amount must sit between them.
  The forecast draws a band from these and warns from the worse edge.
- "anchor" fixes the day of the month. A line anchored on the 31st falls on the
  28th in February and back on the 31st in March; it does not drift.
- "dueRule" is when the money actually moves: a standing order on the 1st
  usually leaves on the next working day, a salary arrives the working day
  before a weekend. "last-working-day" is ignored on weekly and biweekly lines.
- "indexation" compounds on whole anniversaries of its "from" date.
- Unknown fields are dropped on import. Anything malformed is refused with the
  name of the field that is wrong.`;

  const example = `{
  "moraview": ${BUNDLE_VERSION},
  "current": "My ledger",
  "ledgers": [
    {
      "name": "My ledger",
      "document": {
        "schemaVersion": ${SCHEMA_VERSION},
        "scenario": {
          "label": "One salary, a flat and a car",
          "asOf": "2026-09-11",
          "horizonMonths": 24,
          "buffer": 150000,
          "accounts": [
            { "id": "current", "name": "Current account", "balance": 218040, "inForecast": true },
            { "id": "savings", "name": "Savings", "balance": 640000, "inForecast": false }
          ],
          "lines": [
            {
              "kind": "recurring", "id": "salary", "label": "Salary", "amount": 241000,
              "category": "salary", "cadence": "monthly", "anchor": "2026-09-25",
              "dueRule": "previous-working-day"
            },
            {
              "kind": "recurring", "id": "rent", "label": "Rent", "amount": -89500,
              "category": "housing", "cadence": "monthly", "anchor": "2026-10-01",
              "dueRule": "next-working-day",
              "indexation": { "ratePerYear": 250, "from": "2027-01-01" }
            },
            {
              "kind": "recurring", "id": "groceries", "label": "Groceries", "amount": -14000,
              "category": "living", "cadence": "weekly", "anchor": "2026-09-12",
              "estimate": true, "range": { "low": -11000, "high": -19000 }
            },
            {
              "kind": "recurring", "id": "car-insurance", "label": "Car insurance", "amount": -48000,
              "category": "insurance", "cadence": "yearly", "anchor": "2027-02-14"
            },
            {
              "kind": "planned", "id": "tyres", "label": "Winter tyres", "amount": -32000,
              "category": "transport", "date": "2026-11-06"
            }
          ],
          "holidays": ["2026-12-25", "2026-12-26", "2027-01-01"]
        }
      }
    }
  ]
}
`;

  return { text, example };
}
