import { describe, expect, it } from 'vitest';
import { euros } from '../src/domain/money';
import { sankeyModel, type BandTotal } from '../src/ui/chart/sankeyModel';

const bands = (...amounts: [string, number][]): BandTotal[] =>
  amounts.map(([key, euro]) => ({ key, label: key, color: `var(--s-${key})`, amount: euros(euro) }));

describe('sankeyModel', () => {
  const model = sankeyModel({
    bands: bands(['salary', 4000], ['benefit', 350], ['bills', -1700], ['daily', -1200], ['plans', -400]),
    width: 800
  });

  it('puts what comes in on the left and what goes out on the right', () => {
    const sides = Object.fromEntries(model.nodes.map((node) => [node.key, node.side]));
    expect(sides.salary).toBe('in');
    expect(sides.benefit).toBe('in');
    expect(sides.bills).toBe('out');
    expect(sides.plans).toBe('out');

    const income = model.nodes.filter((node) => node.side === 'in');
    const spending = model.nodes.filter((node) => node.side === 'out');
    for (const node of income) expect(node.x).toBeLessThan(model.hub.x);
    for (const node of spending) expect(node.x).toBeGreaterThan(model.hub.x);
  });

  it('balances the two sides, naming what is left over', () => {
    // 4,350 in against 3,300 out: 1,050 is left
    const leftOver = model.nodes.find((node) => node.key === 'left-over');
    expect(leftOver?.amount).toBe(euros(1050));
    expect(model.inflow).toBe(euros(4350));
    expect(model.outflow).toBe(euros(3300));
    const out = model.nodes.filter((node) => node.side === 'out').reduce((sum, node) => sum + node.amount, 0);
    expect(out).toBe(model.inflow);
  });

  it('calls a shortfall what it is when more goes out than comes in', () => {
    const short = sankeyModel({ bands: bands(['salary', 1000], ['bills', -1500]), width: 800 });
    const gap = short.nodes.find((node) => node.key === 'shortfall');
    expect(gap?.side).toBe('in');
    expect(gap?.amount).toBe(euros(500));
    expect(short.nodes.find((node) => node.key === 'left-over')).toBeUndefined();
  });

  it('scales heights to the amounts, not to the number of bands', () => {
    const bills = model.nodes.find((node) => node.key === 'bills')!;
    const daily = model.nodes.find((node) => node.key === 'daily')!;
    expect(bills.height / daily.height).toBeCloseTo(1700 / 1200, 1);
  });

  it('keeps every node inside the frame', () => {
    for (const node of model.nodes) {
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y + node.height).toBeLessThanOrEqual(model.height + 0.01);
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(model.width + 0.01);
    }
  });

  it('draws a ribbon per band, each closed and coloured like its node', () => {
    expect(model.links).toHaveLength(model.nodes.length);
    for (const link of model.links) {
      expect(link.path.startsWith('M')).toBe(true);
      expect(link.path.endsWith('Z')).toBe(true);
      expect(link.color).toMatch(/^var\(--/);
    }
  });

  it('stacks the ribbons on the hub in the order of their nodes', () => {
    const incoming = model.links.filter((link) => link.side === 'in');
    const ys = incoming.map((link) => link.hubY);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });

  it('has nothing to draw for a period with no movement', () => {
    const empty = sankeyModel({ bands: [], width: 800 });
    expect(empty.nodes).toEqual([]);
    expect(empty.links).toEqual([]);
    expect(empty.inflow).toBe(0);
  });

  it('ignores a band that nets to nothing', () => {
    const quiet = sankeyModel({ bands: bands(['salary', 1000], ['daily', 0], ['bills', -1000]), width: 800 });
    expect(quiet.nodes.some((node) => node.key === 'daily')).toBe(false);
  });
});

describe('the frame leaves room for what is written in it', () => {
  const model = sankeyModel({
    bands: bands(['salary', 4000], ['benefit', 350], ['bills', -1700], ['daily', -1200], ['plans', -400]),
    width: 800,
    height: 300
  });

  it('keeps the hub clear of the top, where its total is written', () => {
    expect(model.hub.y).toBeGreaterThanOrEqual(20);
  });

  it('keeps the lowest node clear of the bottom, where its figure is written', () => {
    const lowest = model.nodes.reduce((low, node) => Math.max(low, node.y + node.height), 0);
    expect(lowest).toBeLessThanOrEqual(model.height - 14);
  });
});
