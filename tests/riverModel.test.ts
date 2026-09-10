import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { project } from '../src/domain/forecast';
import { byMonth } from '../src/domain/rollups';
import { sampleScenario } from '../src/data/sample';
import { riverGeometry } from '../src/ui/chart/riverModel';

const forecast = project(sampleScenario());
const months = byMonth(forecast);
const geometry = riverGeometry({ forecast, months, width: 900, target: plainDate('2027-03-02') });

describe('river geometry', () => {
  it('draws one column per month, left to right, inside the plot', () => {
    expect(geometry.flow.columns).toHaveLength(months.length);
    const xs = geometry.flow.columns.map((column) => column.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    expect(xs[0]).toBeGreaterThanOrEqual(geometry.pad.left);
    const last = geometry.flow.columns.at(-1)!;
    expect(last.x + last.width).toBeLessThanOrEqual(geometry.width - geometry.pad.right + 0.01);
  });

  it('puts money in above the axis and money out below it', () => {
    for (const column of geometry.flow.columns) {
      for (const segment of column.segments) {
        if (segment.amount > 0) expect(segment.y + segment.height).toBeLessThanOrEqual(geometry.flow.midY + 0.01);
        else expect(segment.y).toBeGreaterThanOrEqual(geometry.flow.midY - 0.01);
      }
    }
  });

  it('scales heights to the amounts', () => {
    const column = geometry.flow.columns.find((c) => c.month === '2026-12')!;
    const income = column.segments.filter((segment) => segment.amount > 0);
    const tallest = income.reduce((a, b) => (a.height > b.height ? a : b));
    const biggest = income.reduce((a, b) => (a.amount > b.amount ? a : b));
    expect(tallest.bandKey).toBe(biggest.bandKey);
  });

  it('labels gridlines with values the chart actually reaches', () => {
    const peak = Math.max(...months.map((month) => Math.max(month.inflow, -month.outflow)));
    for (const tick of geometry.flow.ticks) {
      expect(Math.abs(tick.value)).toBeLessThanOrEqual(peak);
      expect(tick.label.length).toBeGreaterThan(0);
    }
  });

  it('keeps the buffer line, the low point and the needle inside the bed panel', () => {
    const { bed } = geometry;
    const bottom = bed.top + bed.height;
    for (const y of [bed.bufferY, bed.lowPoint.y, bed.needle.y]) {
      expect(y).toBeGreaterThanOrEqual(bed.top - 0.01);
      expect(y).toBeLessThanOrEqual(bottom + 0.01);
    }
    expect(bed.linePath.startsWith('M')).toBe(true);
    expect(bed.areaPath.endsWith('Z')).toBe(true);
  });

  it('moves the needle with the target date', () => {
    const earlier = riverGeometry({ forecast, months, width: 900, target: plainDate('2026-10-01') });
    expect(earlier.bed.needle.x).toBeLessThan(geometry.bed.needle.x);
  });

  it('never scales by zero when a month has no movement at all', () => {
    const empty = project({ ...sampleScenario(), lines: [] });
    const flat = riverGeometry({ forecast: empty, months: byMonth(empty), width: 600, target: empty.asOf });
    expect(Number.isFinite(flat.flow.midY)).toBe(true);
    expect(flat.flow.columns.every((column) => column.segments.length === 0)).toBe(true);
    expect(Number.isFinite(flat.bed.needle.y)).toBe(true);
  });
});
