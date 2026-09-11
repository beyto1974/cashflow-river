import { monthKey, type MonthKey, type PlainDate } from '../../domain/dates';
import type { Cents } from '../../domain/money';
import type { Forecast } from '../../domain/forecast';

/**
 * Which comfort band a balance falls in. The thresholds are multiples of the
 * buffer, so the whole grid re-reads itself when the buffer changes.
 */
export type Band = 'red' | 'tight' | '1' | '2' | '3' | '4' | '5';

export function bandOf(balance: Cents, buffer: Cents): Band {
  if (balance < 0) return 'red';
  if (balance < buffer) return 'tight';
  const over = buffer > 0 ? balance / buffer : balance / 100_000;
  if (over < 1.6) return '1';
  if (over < 2.6) return '2';
  if (over < 4) return '3';
  if (over < 6) return '4';
  return '5';
}

export const BAND_MEANING: Record<Band, string> = {
  red: 'overdrawn',
  tight: 'under the buffer',
  1: 'only just clear',
  2: 'thin',
  3: 'comfortable',
  4: 'roomy',
  5: 'well ahead'
};

export interface Cell {
  date: PlainDate;
  balance: Cents;
  band: Band;
  /** A one-off falls on this day. */
  planned: boolean;
  /** The day the forecast starts. */
  today: boolean;
  /** How many movements are booked, for the hover readout. */
  movements: number;
}

export interface GridRow {
  dayOfMonth: number;
  /** One entry per month column; null where that day does not exist. */
  cells: (Cell | null)[];
}

export interface GridModel {
  months: { month: MonthKey; label: string }[];
  years: { year: string; span: number }[];
  rows: GridRow[];
  underBuffer: number;
  buffer: Cents;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The Runway Grid: every day of the forecast as one cell, months across and day
 * of month down. No aggregation — it is the same daily balance the bed panel
 * draws, read as a calendar instead of a line.
 */
export function gridModel(forecast: Forecast, buffer: Cents): GridModel {
  const byDate = new Map<PlainDate, Cell>();
  let underBuffer = 0;

  for (const day of forecast.days) {
    if (day.balance < buffer) underBuffer += 1;
    byDate.set(day.date, {
      date: day.date,
      balance: day.balance,
      band: bandOf(day.balance, buffer),
      planned: day.movements.some((movement) => movement.planned),
      today: day.date === forecast.asOf,
      movements: day.movements.length
    });
  }

  const months: { month: MonthKey; label: string }[] = [];
  for (const day of forecast.days) {
    const key = monthKey(day.date);
    if (months[months.length - 1]?.month === key) continue;
    months.push({ month: key, label: MONTH_NAMES[Number(key.slice(5)) - 1] ?? key });
  }

  const years: { year: string; span: number }[] = [];
  for (const { month } of months) {
    const year = month.slice(0, 4);
    const last = years[years.length - 1];
    if (last?.year === year) last.span += 1;
    else years.push({ year, span: 1 });
  }

  const rows: GridRow[] = [];
  for (let dayOfMonth = 1; dayOfMonth <= 31; dayOfMonth += 1) {
    rows.push({
      dayOfMonth,
      cells: months.map(
        ({ month }) => byDate.get(`${month}-${String(dayOfMonth).padStart(2, '0')}` as PlainDate) ?? null
      )
    });
  }

  return { months, years, rows, underBuffer, buffer };
}
