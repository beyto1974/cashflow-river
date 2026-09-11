import type { PlainDate, MonthKey } from './dates';
import { formatEUR, type Cents } from './money';
import { project, type Forecast, type ForecastDay } from './forecast';
import { byMonth } from './rollups';
import type { Scenario } from './types';

export interface ComparedDay {
  date: PlainDate;
  baseline: Cents;
  variant: Cents;
}

export interface ComparedMonth {
  month: MonthKey;
  baseline: Cents;
  variant: Cents;
  /** Where the variant leaves the month, less where the baseline leaves it. */
  delta: Cents;
}

export interface Comparison {
  baseline: Forecast;
  variant: Forecast;
  days: ComparedDay[];
  months: ComparedMonth[];
  endDelta: Cents;
  baselineLow: ForecastDay;
  variantLow: ForecastDay;
  /** One line on what changing it did. */
  verdict: string;
}

/**
 * Two rivers side by side: what the household has now, and what it would have
 * with one thing changed. Both are projected over the longer of the two
 * horizons, so the beds can be drawn on one scale.
 */
export function compare(baselineScenario: Scenario, variantScenario: Scenario): Comparison {
  const baseline = project(baselineScenario);
  const variant = project(variantScenario);

  const length = Math.max(baseline.days.length, variant.days.length);
  const days: ComparedDay[] = [];
  for (let index = 0; index < length; index += 1) {
    const left = baseline.days[Math.min(index, baseline.days.length - 1)] as ForecastDay;
    const right = variant.days[Math.min(index, variant.days.length - 1)] as ForecastDay;
    const longer = baseline.days.length >= variant.days.length ? left : right;
    days.push({ date: longer.date, baseline: left.balance, variant: right.balance });
  }

  const baselineMonths = byMonth(baseline);
  const variantMonths = byMonth(variant);
  const monthKeys = [...new Set([...baselineMonths, ...variantMonths].map((month) => month.month))].sort();
  const months: ComparedMonth[] = monthKeys.map((month) => {
    const left = baselineMonths.find((candidate) => candidate.month === month)?.end ?? 0;
    const right = variantMonths.find((candidate) => candidate.month === month)?.end ?? 0;
    return { month, baseline: left, variant: right, delta: right - left };
  });

  const endDelta = (days[days.length - 1]?.variant ?? 0) - (days[days.length - 1]?.baseline ?? 0);
  const lowDelta = variant.low.balance - baseline.low.balance;

  return {
    baseline,
    variant,
    days,
    months,
    endDelta,
    baselineLow: baseline.low,
    variantLow: variant.low,
    verdict: verdictFor(endDelta, lowDelta)
  };
}

function verdictFor(endDelta: Cents, lowDelta: Cents): string {
  if (endDelta === 0 && lowDelta === 0) return 'This change leaves you no different.';
  const direction = endDelta >= 0 ? 'better off' : 'worse off';
  const size = formatEUR(Math.abs(endDelta), { cents: false });
  const lowNote =
    lowDelta === 0
      ? ''
      : lowDelta > 0
        ? `, and the tightest point is ${formatEUR(lowDelta, { cents: false })} easier`
        : `, though the tightest point is ${formatEUR(Math.abs(lowDelta), { cents: false })} harder`;
  return `It leaves you ${size} ${direction} by the end of the forecast${lowNote}.`;
}
