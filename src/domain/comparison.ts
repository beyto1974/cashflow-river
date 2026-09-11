import type { MonthKey, PlainDate } from './dates';
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
  /** Only the days both forecasts cover; comparing past that compares nothing. */
  days: ComparedDay[];
  months: ComparedMonth[];
  endDelta: Cents;
  baselineLow: ForecastDay;
  variantLow: ForecastDay;
  /** The window the comparison is honest over. */
  from: PlainDate;
  to: PlainDate;
  /** True when one side runs longer, so the comparison stops early. */
  clipped: boolean;
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

  /* Paired by date over the window both cover. Holding the shorter forecast flat
     past its end would credit the change with months it never touched — and the
     two sides can start on different days as well as end on them. */
  const variantByDate = new Map(variant.days.map((day) => [day.date, day]));
  const days: ComparedDay[] = [];
  for (const day of baseline.days) {
    const other = variantByDate.get(day.date);
    if (other) days.push({ date: day.date, baseline: day.balance, variant: other.balance });
  }

  const from = days[0]?.date ?? baseline.asOf;
  const to = days[days.length - 1]?.date ?? baseline.asOf;
  const clipped = baseline.days.length !== days.length || variant.days.length !== days.length;

  const inWindow = (date: PlainDate): boolean => date >= from && date <= to;
  const baselineMonths = byMonth(baseline).filter((month) => inWindow(`${month.month}-01` as PlainDate) || inWindow(to));
  const variantMonths = byMonth(variant);
  const monthKeys = [...new Set(days.map((day) => day.date.slice(0, 7)))].sort();
  const months: ComparedMonth[] = monthKeys.map((month) => {
    const left = baselineMonths.find((candidate) => candidate.month === month)?.end ?? 0;
    const right = variantMonths.find((candidate) => candidate.month === month)?.end ?? 0;
    return { month: month as ComparedMonth['month'], baseline: left, variant: right, delta: right - left };
  });

  const last = days[days.length - 1];
  const endDelta = last ? last.variant - last.baseline : 0;

  const lowOf = (forecast: Forecast): ForecastDay =>
    forecast.days
      .filter((day) => inWindow(day.date))
      .reduce((worst, day) => (day.balance < worst.balance ? day : worst), forecast.days[0] as ForecastDay);
  const baselineLow = lowOf(baseline);
  const variantLow = lowOf(variant);

  return {
    baseline,
    variant,
    days,
    months,
    endDelta,
    baselineLow,
    variantLow,
    from,
    to,
    clipped,
    verdict: verdictFor(endDelta, variantLow.balance - baselineLow.balance)
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
