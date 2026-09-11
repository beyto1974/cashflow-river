import { isNegative, type Cents } from '../../domain/money';

/** One band's net movement over the period being drawn. */
export interface BandTotal {
  key: string;
  label: string;
  /** A CSS custom property, so the ribbon re-themes with the page. */
  color: string;
  /** Signed: income positive, spending negative. */
  amount: Cents;
}

export interface SankeyNode {
  key: string;
  label: string;
  color: string;
  side: 'in' | 'out';
  /** Always positive: the side says which way it goes. */
  amount: Cents;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SankeyLink {
  key: string;
  label: string;
  color: string;
  side: 'in' | 'out';
  amount: Cents;
  /** Where the ribbon meets the hub, for stacking. */
  hubY: number;
  path: string;
}

export interface SankeyModel {
  width: number;
  height: number;
  nodes: SankeyNode[];
  links: SankeyLink[];
  hub: { x: number; y: number; width: number; height: number };
  inflow: Cents;
  outflow: Cents;
}

export interface SankeyInput {
  bands: BandTotal[];
  width: number;
  height?: number;
}

const NODE_WIDTH = 12;
const GAP = 6;
const SIDE_MARGIN = 118;
/* Room for the total above the hub, and for the last label's figure below. */
const PAD_TOP = 24;
const PAD_BOTTOM = 18;

/**
 * Where the money came from and where it went, over one period.
 *
 * Both sides are made to balance: whatever income is not spent becomes a "left
 * over" destination, and spending beyond income becomes a "shortfall" source.
 * Without that the diagram would quietly imply the books balance when they do
 * not.
 */
export function sankeyModel({ bands, width, height = 300 }: SankeyInput): SankeyModel {
  const hubWidth = NODE_WIDTH + 2;
  const hub = { x: (width - hubWidth) / 2, y: 0, width: hubWidth, height: 0 };
  const moving = bands.filter((band) => band.amount !== 0);

  const inflow = moving.filter((band) => !isNegative(band.amount)).reduce((sum, band) => sum + band.amount, 0);
  const outflow = moving.filter((band) => isNegative(band.amount)).reduce((sum, band) => sum - band.amount, 0);

  if (moving.length === 0 || (inflow === 0 && outflow === 0)) {
    return { width, height, nodes: [], links: [], hub, inflow: 0, outflow: 0 };
  }

  const sources: BandTotal[] = moving.filter((band) => !isNegative(band.amount));
  const sinks: BandTotal[] = moving
    .filter((band) => isNegative(band.amount))
    .map((band) => ({ ...band, amount: -band.amount }));

  /* The two sides are made to balance, and the difference is named. */
  if (inflow > outflow) {
    sinks.push({ key: 'left-over', label: 'Left over', color: 'var(--accent)', amount: inflow - outflow });
  } else if (outflow > inflow) {
    sources.push({ key: 'shortfall', label: 'Shortfall', color: 'var(--critical)', amount: outflow - inflow });
  }

  const total = Math.max(inflow, outflow);
  const column = (entries: BandTotal[]): number => Math.max(entries.length - 1, 0) * GAP;
  const room = Math.max(height - PAD_TOP - PAD_BOTTOM, 60);
  const plot = Math.max(room - Math.max(column(sources), column(sinks)), 40);
  const scale = plot / total;

  hub.height = total * scale;
  hub.y = PAD_TOP + (room - hub.height) / 2;

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  let sourceY = PAD_TOP + (room - (total * scale + column(sources))) / 2;
  let hubIn = hub.y;
  for (const band of sources) {
    const nodeHeight = band.amount * scale;
    nodes.push({
      key: band.key, label: band.label, color: band.color, side: 'in', amount: band.amount,
      x: SIDE_MARGIN - NODE_WIDTH, y: sourceY, width: NODE_WIDTH, height: nodeHeight
    });
    links.push({
      key: band.key, label: band.label, color: band.color, side: 'in', amount: band.amount,
      hubY: hubIn,
      path: ribbon(SIDE_MARGIN, sourceY, hub.x, hubIn, nodeHeight)
    });
    sourceY += nodeHeight + GAP;
    hubIn += nodeHeight;
  }

  let sinkY = PAD_TOP + (room - (total * scale + column(sinks))) / 2;
  let hubOut = hub.y;
  for (const band of sinks) {
    const nodeHeight = band.amount * scale;
    nodes.push({
      key: band.key, label: band.label, color: band.color, side: 'out', amount: band.amount,
      x: width - SIDE_MARGIN, y: sinkY, width: NODE_WIDTH, height: nodeHeight
    });
    links.push({
      key: band.key, label: band.label, color: band.color, side: 'out', amount: band.amount,
      hubY: hubOut,
      path: ribbon(hub.x + hub.width, hubOut, width - SIDE_MARGIN, sinkY, nodeHeight)
    });
    sinkY += nodeHeight + GAP;
    hubOut += nodeHeight;
  }

  return { width, height, nodes, links, hub, inflow, outflow };
}

/** A ribbon of constant thickness, curved between two verticals. */
function ribbon(fromX: number, fromY: number, toX: number, toY: number, thickness: number): string {
  const bend = (toX - fromX) / 2;
  const top = `M${fromX.toFixed(1)} ${fromY.toFixed(1)} C${(fromX + bend).toFixed(1)} ${fromY.toFixed(1)}, ${(
    toX - bend
  ).toFixed(1)} ${toY.toFixed(1)}, ${toX.toFixed(1)} ${toY.toFixed(1)}`;
  const down = `L${toX.toFixed(1)} ${(toY + thickness).toFixed(1)}`;
  const back = `C${(toX - bend).toFixed(1)} ${(toY + thickness).toFixed(1)}, ${(fromX + bend).toFixed(1)} ${(
    fromY + thickness
  ).toFixed(1)}, ${fromX.toFixed(1)} ${(fromY + thickness).toFixed(1)}`;
  return `${top} ${down} ${back} Z`;
}
