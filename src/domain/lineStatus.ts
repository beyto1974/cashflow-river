import { compareDates, type PlainDate } from './dates';
import { isRecurring, type Line } from './types';

/**
 * Where a line stands relative to the start of the forecast. A line that has
 * ended contributes nothing, and the ledger should say so rather than showing
 * an amount that never lands.
 */
export type LineStatus = 'muted' | 'ended' | 'starts-later' | 'active';

export function lineStatus(line: Line, asOf: PlainDate): LineStatus {
  if (line.muted) return 'muted';
  if (isRecurring(line)) {
    if (line.to && compareDates(line.to, asOf) < 0) return 'ended';
    if (line.from && compareDates(line.from, asOf) > 0) return 'starts-later';
    return 'active';
  }
  return compareDates(line.date, asOf) < 0 ? 'ended' : 'active';
}

/** True when the line still puts money through the forecast at some point. */
export function isCounted(line: Line, asOf: PlainDate): boolean {
  const status = lineStatus(line, asOf);
  return status === 'active' || status === 'starts-later';
}
