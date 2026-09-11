import type { MonthKey } from '../../domain/dates';
import { formatEUR, type Cents } from '../../domain/money';
import type { MonthSummary } from '../../domain/rollups';

export type EndBand = 'red' | 'tight' | 'clear';

/** What the bars are the height of. */
export type Measure = 'end' | 'in' | 'out';

export interface MonthBar {
  month: MonthKey;
  /** The figure this bar is the height of, under the current measure. */
  value: Cents;
  /** What the accounts close the month at, whichever measure is drawn. */
  balance: Cents;
  band: EndBand;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Shown only where there is room for it. */
  label?: string;
  summary: MonthSummary;
}

export interface EndTick {
  value: Cents;
  y: number;
  label: string;
}

export interface MonthEndsModel {
  width: number;
  height: number;
  measure: Measure;
  pad: { left: number; right: number; top: number; bottom: number };
  bars: MonthBar[];
  ticks: EndTick[];
  zeroY: number;
  /** Only meaningful for the closing balance; null for the two totals. */
  bufferY: number | null;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  return [1, 2, 2.5, 5, 10].map((multiple) => multiple * magnitude).find((step) => step >= raw) ?? magnitude * 10;
}

export interface MonthEndsInput {
  months: MonthSummary[];
  buffer: Cents;
  width: number;
  height?: number;
  measure?: Measure;
}

/**
 * One bar per month, as tall as the balance that month closes at.
 *
 * The river answers what moved; this answers where it left you, which is the
 * question people actually ask of a month — and unlike the daily line it does
 * not need reading, only glancing at.
 */
export function monthEndsModel({
  months,
  buffer,
  width,
  height = 260,
  measure = 'end'
}: MonthEndsInput): MonthEndsModel {
  const pad = { left: width < 560 ? 46 : 60, right: 12, top: 16, bottom: 24 };
  const inner = Math.max(width - pad.left - pad.right, 40);
  const plot = Math.max(height - pad.top - pad.bottom, 40);

  if (months.length === 0) {
    return { width, height, measure, pad, bars: [], ticks: [], zeroY: pad.top + plot, bufferY: null };
  }

  /* The two totals are magnitudes, so they are drawn upwards; only the closing
     balance can go below the line, and only it answers to the buffer. */
  const valueOf = (month: MonthSummary): Cents =>
    measure === 'end' ? month.end : measure === 'in' ? month.inflow : -month.outflow;

  const values = months.map(valueOf);
  const low = Math.min(0, ...values);
  const high = Math.max(measure === 'end' ? buffer : 0, ...values, low + 1);
  const span = high - low;
  const y = (value: Cents): number => pad.top + (1 - (value - low) / span) * plot;

  const slot = inner / months.length;
  const barWidth = Math.max(slot - 4, 2);
  const every = width < 480 ? 4 : width < 760 ? 3 : 2;
  const zeroY = y(0);

  const bars: MonthBar[] = months.map((summary, index) => {
    const value = valueOf(summary);
    const top = value >= 0 ? y(value) : zeroY;
    const barHeight = Math.max(Math.abs(y(value) - zeroY), 1);
    const monthNumber = Number(summary.month.slice(5)) - 1;

    return {
      month: summary.month,
      value,
      balance: summary.end,
      band:
        measure !== 'end'
          ? 'clear'
          : value < 0
            ? 'red'
            : value < buffer
              ? 'tight'
              : 'clear',
      x: pad.left + index * slot + (slot - barWidth) / 2,
      y: top,
      width: barWidth,
      height: barHeight,
      ...(index % every === 0
        ? { label: `${MONTH_NAMES[monthNumber] ?? summary.month}${monthNumber === 0 ? ` ’${summary.month.slice(2, 4)}` : ''}` }
        : {}),
      summary
    };
  });

  const step = niceStep(span / 4);
  const ticks: EndTick[] = [];
  for (let value = Math.ceil(low / step) * step; value <= high; value += step) {
    ticks.push({ value, y: y(value), label: formatEUR(value, { cents: false }) });
  }

  return { width, height, measure, pad, bars, ticks, zeroY, bufferY: measure === 'end' ? y(buffer) : null };
}
