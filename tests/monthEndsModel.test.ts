import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { project } from '../src/domain/forecast';
import { byMonth } from '../src/domain/rollups';
import { sampleScenario } from '../src/data/sample';
import { monthEndsModel } from '../src/ui/chart/monthEndsModel';

const scenario = sampleScenario(plainDate('2026-09-11'));
const forecast = project(scenario);
const months = byMonth(forecast);
const model = monthEndsModel({ months, buffer: scenario.buffer, width: 900, height: 260 });

describe('monthEndsModel', () => {
  it('draws one bar per month, in order, inside the frame', () => {
    expect(model.bars).toHaveLength(months.length);
    const xs = model.bars.map((bar) => bar.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    for (const bar of model.bars) {
      expect(bar.x).toBeGreaterThanOrEqual(model.pad.left);
      expect(bar.x + bar.width).toBeLessThanOrEqual(model.width - model.pad.right + 0.01);
      expect(bar.y).toBeGreaterThanOrEqual(0);
      expect(bar.y + bar.height).toBeLessThanOrEqual(model.height + 0.01);
    }
  });

  it('is the balance each month closes at, not what moved in it', () => {
    model.bars.forEach((bar, index) => {
      expect(bar.value).toBe(months[index]?.end);
      expect(bar.balance).toBe(months[index]?.end);
    });
  });

  it('can be the month total in or the month total out instead', () => {
    const incoming = monthEndsModel({ months, buffer: scenario.buffer, width: 900, measure: 'in' });
    const outgoing = monthEndsModel({ months, buffer: scenario.buffer, width: 900, measure: 'out' });

    incoming.bars.forEach((bar, index) => expect(bar.value).toBe(months[index]?.inflow));
    /* Money out is drawn as a magnitude, upwards, like money in. */
    outgoing.bars.forEach((bar, index) => expect(bar.value).toBe(-(months[index]?.outflow as number)));
    for (const bar of outgoing.bars) expect(bar.value).toBeGreaterThanOrEqual(0);

    /* Neither total answers to the buffer, so the line is not drawn. */
    expect(incoming.bufferY).toBeNull();
    expect(outgoing.bufferY).toBeNull();
    expect(model.bufferY).not.toBeNull();
  });

  it('keeps the closing balance on every bar, whichever measure is drawn', () => {
    const outgoing = monthEndsModel({ months, buffer: scenario.buffer, width: 900, measure: 'out' });
    outgoing.bars.forEach((bar, index) => expect(bar.balance).toBe(months[index]?.end));
  });

  it('bands only the closing balance, since a total is not tight or clear', () => {
    const incoming = monthEndsModel({ months, buffer: scenario.buffer, width: 900, measure: 'in' });
    expect(incoming.bars.every((bar) => bar.band === 'clear')).toBe(true);
  });

  it('grows bars away from the zero line, both ways', () => {
    /* The example never closes a month in the red — the dips happen mid-month —
       so the downward case is built rather than borrowed. */
    const mixed = monthEndsModel({
      months: [
        { ...months[0]!, end: euros(1200) },
        { ...months[1]!, end: euros(-450) },
        { ...months[2]!, end: euros(800) }
      ],
      buffer: euros(500),
      width: 900,
      height: 260
    });

    const [up, down] = [mixed.bars[0]!, mixed.bars[1]!];
    expect(up.y + up.height).toBeCloseTo(mixed.zeroY, 1);
    expect(down.y).toBeCloseTo(mixed.zeroY, 1);
    expect(down.band).toBe('red');
    for (const bar of model.bars.filter((candidate) => candidate.value > 0)) {
      expect(bar.y + bar.height).toBeCloseTo(model.zeroY, 1);
    }
  });

  it('bands each bar by what it means rather than by its size alone', () => {
    for (const bar of model.bars) {
      if (bar.value < 0) expect(bar.band).toBe('red');
      else if (bar.value < scenario.buffer) expect(bar.band).toBe('tight');
      else expect(bar.band).toBe('clear');
    }
  });

  it('marks the buffer, and labels ticks the chart actually reaches', () => {
    expect(model.bufferY).toBeGreaterThanOrEqual(0);
    expect(model.bufferY).toBeLessThanOrEqual(model.height);
    const reach = model.bars.map((bar) => bar.value);
    for (const tick of model.ticks) {
      expect(tick.value).toBeLessThanOrEqual(Math.max(...reach, scenario.buffer) * 1.1);
      expect(tick.label).toMatch(/€/);
    }
  });

  it('labels every second month at a comfortable width, every fourth when narrow', () => {
    const wide = monthEndsModel({ months, buffer: scenario.buffer, width: 1000, height: 260 });
    const narrow = monthEndsModel({ months, buffer: scenario.buffer, width: 380, height: 260 });
    expect(wide.bars.filter((bar) => bar.label !== undefined).length).toBeGreaterThan(
      narrow.bars.filter((bar) => bar.label !== undefined).length
    );
  });

  it('has nothing to draw without months', () => {
    const empty = monthEndsModel({ months: [], buffer: euros(100), width: 800, height: 200 });
    expect(empty.bars).toEqual([]);
    expect(empty.ticks).toEqual([]);
  });
});
