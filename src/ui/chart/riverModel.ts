import { compareDates, daysBetween, monthKey, type MonthKey, type PlainDate } from '../../domain/dates';
import { formatEUR, type Cents } from '../../domain/money';
import type { Forecast } from '../../domain/forecast';
import type { MonthSummary } from '../../domain/rollups';
import { BANDS, bandFor } from '../bands';

export interface RiverInput {
  forecast: Forecast;
  months: MonthSummary[];
  width: number;
  /** The date the readout is answering for; the needle sits here. */
  target: PlainDate;
}

export interface Segment {
  bandKey: string;
  color: string;
  label: string;
  amount: Cents;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Column {
  month: MonthKey;
  label: string;
  /** January carries the year, the rest carry the month. */
  isYearStart: boolean;
  x: number;
  width: number;
  /** The full-height hover target, wider than the bar. */
  slotX: number;
  slotWidth: number;
  segments: Segment[];
  netY: number;
  summary: MonthSummary;
}

export interface Tick {
  value: Cents;
  y: number;
  label: string;
}

export interface RiverGeometry {
  width: number;
  height: number;
  pad: { left: number; right: number; top: number };
  flow: {
    height: number;
    midY: number;
    columns: Column[];
    ticks: Tick[];
    labelY: number;
  };
  bed: {
    top: number;
    height: number;
    linePath: string;
    areaPath: string;
    bufferY: number;
    zeroY: number | null;
    lowPoint: { x: number; y: number; label: string };
    needle: { x: number; y: number };
    highLabel: { y: number; text: string };
    lowLabel: { y: number; text: string };
  };
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  return [1, 2, 2.5, 5, 10].map((multiple) => multiple * magnitude).find((step) => step >= raw) ?? magnitude * 10;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/**
 * Pure geometry for the two panels: the monthly flow around its axis, and the
 * balance those flows leave behind. Nothing here touches the DOM, so it can be
 * checked on its own.
 */
export function riverGeometry({ forecast, months, width, target }: RiverInput): RiverGeometry {
  const narrow = width < 620;
  const pad = { left: narrow ? 46 : 60, right: 12, top: 18 };
  const flowHeight = narrow ? 168 : 214;
  const bedHeight = narrow ? 92 : 116;
  const axisBand = 42;

  const inner = Math.max(width - pad.left - pad.right, 40);
  const slotWidth = inner / Math.max(months.length, 1);
  const barWidth = Math.max(slotWidth - 4, 3);
  const midY = pad.top + flowHeight / 2;

  const peak = Math.max(1, ...months.map((month) => Math.max(month.inflow, -month.outflow)));
  const flowScale = (flowHeight / 2 - 20) / peak;

  const columns: Column[] = months.map((summary, index) => {
    const slotX = pad.left + index * slotWidth;
    const x = slotX + (slotWidth - barWidth) / 2;

    const totals = new Map<string, Cents>();
    for (const movement of summary.movements) {
      const band = bandFor(movement.category);
      totals.set(band.key, (totals.get(band.key) ?? 0) + movement.amount);
    }

    let up = midY;
    let down = midY;
    const segments: Segment[] = [];
    for (const band of BANDS) {
      const amount = totals.get(band.key) ?? 0;
      if (amount === 0) continue;
      const height = Math.abs(amount) * flowScale;
      if (height < 0.5) continue;
      let y: number;
      if (amount > 0) {
        up -= height;
        y = up;
        up -= 2; /* a 2px gap of surface between segments */
      } else {
        y = down;
        down += height + 2;
      }
      segments.push({
        bandKey: band.key, color: band.color, label: band.label,
        amount, x, y, width: barWidth, height
      });
    }

    const month = Number(summary.month.slice(5)) - 1;
    return {
      month: summary.month,
      label: MONTH_NAMES[month] ?? summary.month,
      isYearStart: month === 0,
      x, width: barWidth, slotX, slotWidth,
      segments,
      netY: midY - summary.net * flowScale,
      summary
    };
  });

  const step = niceStep(peak / 2);
  const ticks: Tick[] = [];
  for (let value = step; value <= peak; value += step) {
    for (const direction of [1, -1]) {
      ticks.push({
        value: value * direction,
        y: midY - value * direction * flowScale,
        label: formatEUR(value * direction, { cents: false })
      });
    }
  }

  /* the bed: one point per pixel of width, no more */
  const bedTop = pad.top + flowHeight + axisBand;
  const low = Math.min(0, forecast.low.balance);
  const high = Math.max(...forecast.days.map((day) => day.balance), low + 1);
  const span = high - low;
  const bedY = (balance: Cents): number => bedTop + (1 - (balance - low) / span) * bedHeight;
  const xOfDay = (index: number): number =>
    pad.left + (forecast.days.length > 1 ? index / (forecast.days.length - 1) : 0) * inner;

  const stride = Math.max(1, Math.ceil(forecast.days.length / inner));
  const points: string[] = [];
  for (let index = 0; index < forecast.days.length; index += stride) {
    const day = forecast.days[index]!;
    points.push(`${points.length ? 'L' : 'M'}${xOfDay(index).toFixed(1)} ${bedY(day.balance).toFixed(1)}`);
  }
  const lastIndex = forecast.days.length - 1;
  points.push(`L${xOfDay(lastIndex).toFixed(1)} ${bedY(forecast.days[lastIndex]!.balance).toFixed(1)}`);
  const linePath = points.join(' ');
  const baseY = bedY(Math.max(low, 0));
  const areaPath = `${linePath} L${xOfDay(lastIndex).toFixed(1)} ${baseY.toFixed(1)} L${pad.left.toFixed(1)} ${baseY.toFixed(1)} Z`;

  const lowIndex = daysBetween(forecast.asOf, forecast.low.date);
  const targetDay = forecast.dayAt(target) ?? forecast.days[0]!;
  const targetIndex = clamp(daysBetween(forecast.asOf, targetDay.date), 0, lastIndex);

  return {
    width,
    height: bedTop + bedHeight + 20,
    pad,
    flow: {
      height: flowHeight,
      midY,
      columns,
      ticks,
      labelY: pad.top + flowHeight + 18
    },
    bed: {
      top: bedTop,
      height: bedHeight,
      linePath,
      areaPath,
      bufferY: clamp(bedY(forecast.buffer), bedTop, bedTop + bedHeight),
      zeroY: low < 0 ? bedY(0) : null,
      lowPoint: {
        x: xOfDay(lowIndex),
        y: bedY(forecast.low.balance),
        label: `Lowest: ${formatEUR(forecast.low.balance)} on ${forecast.low.date}`
      },
      needle: { x: xOfDay(targetIndex), y: bedY(targetDay.balance) },
      highLabel: { y: bedY(high) + 8, text: formatEUR(high, { cents: false }) },
      lowLabel: { y: bedY(low) - 2, text: formatEUR(low, { cents: false }) }
    }
  };
}

/** Which month column a pointer at this x belongs to. */
export function columnAt(geometry: RiverGeometry, x: number): Column | undefined {
  return geometry.flow.columns.find((column) => x >= column.slotX && x < column.slotX + column.slotWidth);
}

export function monthOf(date: PlainDate): MonthKey {
  return monthKey(date);
}

export function isWithin(date: PlainDate, forecast: Forecast): boolean {
  return compareDates(date, forecast.asOf) >= 0 && compareDates(date, forecast.horizon) <= 0;
}
