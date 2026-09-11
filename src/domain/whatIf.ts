import { scale } from './money';
import { isRecurring, type Category, type Line, type Scenario } from './types';
import { normaliseRange } from './scenarioOps';

/**
 * The dials from the Horizon Dial prototype, as a layer over the scenario
 * rather than an edit to it: a household can ask "what if my hours were cut" and
 * throw the answer away without having touched its ledger.
 */
export interface WhatIf {
  /** Everything coming in, scaled. */
  income: number;
  /** Day-to-day spending, scaled. */
  daily: number;
  /** What is left of the transfers to savings. */
  saving: number;
}

export const NEUTRAL: WhatIf = { income: 1, daily: 1, saving: 1 };

export function isNeutral(dials: WhatIf): boolean {
  return dials.income === 1 && dials.daily === 1 && dials.saving === 1;
}

const GROUPS: Record<keyof WhatIf, Category[]> = {
  income: ['salary', 'benefit'],
  daily: ['living', 'transport'],
  saving: ['saving']
};

function factorFor(category: Category, dials: WhatIf): number {
  for (const key of Object.keys(GROUPS) as (keyof WhatIf)[]) {
    if (GROUPS[key].includes(category)) return dials[key];
  }
  return 1;
}

/** Housing, insurance, tax and travel are left alone: they are not dials. */
export function applyWhatIf(scenario: Scenario, dials: WhatIf): Scenario {
  if (isNeutral(dials)) return scenario;

  return {
    ...scenario,
    lines: scenario.lines.map((line) => {
      const factor = factorFor(line.category, dials);
      if (factor === 1) return line;
      const amount = scale(line.amount, factor);
      const scaled: Line = isRecurring(line) ? { ...line, amount } : { ...line, amount };
      return line.range ? { ...scaled, range: normaliseRange(scaleRange(line.range, factor), amount) } : scaled;
    })
  };
}

function scaleRange(range: { low: number; high: number }, factor: number) {
  return { low: scale(range.low, factor), high: scale(range.high, factor) };
}
