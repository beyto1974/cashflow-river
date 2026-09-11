import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { project, projectBand } from '../src/domain/forecast';
import { byMonth } from '../src/domain/rollups';
import { sampleScenario } from '../src/data/sample';
import { euros } from '../src/domain/money';
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

describe('pointing at the bed panel', () => {
  it('maps an x to a day, clamped to the forecast', async () => {
    const { dayIndexAt } = await import('../src/ui/chart/riverModel');
    const days = forecast.days.length;
    expect(dayIndexAt(geometry, geometry.pad.left, days)).toBe(0);
    expect(dayIndexAt(geometry, geometry.width - geometry.pad.right, days)).toBe(days - 1);
    expect(dayIndexAt(geometry, -500, days)).toBe(0);
    expect(dayIndexAt(geometry, 99_999, days)).toBe(days - 1);
    const middle = dayIndexAt(geometry, (geometry.pad.left + geometry.width - geometry.pad.right) / 2, days);
    expect(middle).toBeGreaterThan(days * 0.45);
    expect(middle).toBeLessThan(days * 0.55);
  });

  it('knows the bed panel from the flow panel above it', async () => {
    const { inBed } = await import('../src/ui/chart/riverModel');
    expect(inBed(geometry, geometry.bed.top + 10)).toBe(true);
    expect(inBed(geometry, geometry.flow.midY)).toBe(false);
  });
});

describe('the bed panel shows the guesses and the red', () => {
  const scenario = sampleScenario();
  const banded = projectBand(scenario);
  const withBand = riverGeometry({
    forecast: banded.likely,
    months: byMonth(banded.likely),
    width: 900,
    target: plainDate('2027-03-02'),
    band: banded.band
  });

  it('draws a cone only when there is a band to draw', () => {
    expect(withBand.bed.conePath).toBeTruthy();
    expect(withBand.bed.conePath?.endsWith('Z')).toBe(true);
    expect(geometry.bed.conePath).toBeUndefined();
  });

  it('fits the cone inside the panel, so the scale covers both edges', () => {
    const numbers = (withBand.bed.conePath ?? '')
      .split(/[ML]/)
      .filter(Boolean)
      .map((pair) => Number(pair.trim().split(' ')[1]));
    const bottom = withBand.bed.top + withBand.bed.height;
    for (const y of numbers) {
      expect(y).toBeGreaterThanOrEqual(withBand.bed.top - 0.01);
      expect(y).toBeLessThanOrEqual(bottom + 0.01);
    }
  });

  it('marks the stretches that go below zero in their own paths', () => {
    expect(withBand.bed.negativeAreas.length).toBeGreaterThan(0);
    expect(withBand.bed.negativeLines.length).toBe(withBand.bed.negativeAreas.length);
  });

  it('shades the whole area below zero, so the red zone reads at a glance', () => {
    const zone = withBand.bed.redZone!;
    expect(zone).not.toBeNull();
    expect(zone.y).toBe(withBand.bed.zeroY);
    expect(zone.y + zone.height).toBeCloseTo(withBand.bed.top + withBand.bed.height, 1);
  });

  it('gives every overdrawn stretch a mark wide enough to see', () => {
    // A two-day dip on a thirty-month scale is a few pixels of nothing without it.
    expect(withBand.bed.negativeSpans).toHaveLength(withBand.bed.negativeAreas.length);
    for (const span of withBand.bed.negativeSpans) {
      expect(span.width).toBeGreaterThanOrEqual(2);
      expect(span.x).toBeGreaterThanOrEqual(withBand.pad.left - 0.01);
      expect(span.x + span.width).toBeLessThanOrEqual(withBand.width - withBand.pad.right + 0.01);
    }
  });

  it('has nothing to mark when the balance never goes negative', () => {
    const healthy = project({
      ...scenario,
      accounts: scenario.accounts.map((account) => ({ ...account, balance: euros(40_000), inForecast: true }))
    });
    const flush = riverGeometry({ forecast: healthy, months: byMonth(healthy), width: 900, target: healthy.asOf });
    expect(flush.bed.negativeAreas).toEqual([]);
    expect(flush.bed.negativeSpans).toEqual([]);
    expect(flush.bed.zeroY).toBeNull();
    expect(flush.bed.redZone).toBeNull();
  });
});
