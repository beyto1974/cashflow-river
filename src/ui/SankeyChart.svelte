<script lang="ts">
  import { addMonths, compareDates, plainDate, type MonthKey } from '../domain/dates';
  import { formatEUR, type Cents } from '../domain/money';
  import type { Forecast } from '../domain/forecast';
  import { movementsBetween } from '../domain/rollups';
  import { BANDS, bandFor } from './bands';
  import { sankeyModel, type BandTotal } from './chart/sankeyModel';
  import { longMonth } from './format';

  interface Props {
    forecast: Forecast;
    /** The month the rest of the page is showing, for the "this month" period. */
    selectedMonth: MonthKey;
  }
  const { forecast, selectedMonth }: Props = $props();

  type Period = 'month' | 'year' | 'all';
  let period = $state<Period>('year');
  let hovered = $state<string | null>(null);
  let frameWidth = $state(880);

  const window = $derived.by(() => {
    if (period === 'month') {
      const first = plainDate(`${selectedMonth}-01`);
      const from = compareDates(first, forecast.asOf) < 0 ? forecast.asOf : first;
      const next = addMonths(plainDate(`${selectedMonth}-01`), 1);
      const to = compareDates(next, forecast.horizon) < 0 ? next : forecast.horizon;
      return { from, to, label: longMonth(selectedMonth) };
    }
    if (period === 'year') {
      const year = addMonths(forecast.asOf, 12);
      const to = compareDates(year, forecast.horizon) < 0 ? year : forecast.horizon;
      return { from: forecast.asOf, to, label: 'the next twelve months' };
    }
    return { from: forecast.asOf, to: forecast.horizon, label: 'the whole forecast' };
  });

  /* One node per band rather than per line: twenty-odd ribbons would be a
     thicket, and the bands are the question anyone asks of a flow diagram. */
  const totals = $derived.by((): BandTotal[] => {
    const breakdown = movementsBetween(forecast, window.from, window.to);
    const byBand = new Map<string, Cents>();
    for (const line of breakdown.lines) {
      const band = bandFor(line.category);
      byBand.set(band.key, (byBand.get(band.key) ?? 0) + line.amount);
    }
    return BANDS.filter((band) => byBand.has(band.key)).map((band) => ({
      key: band.key,
      label: band.label,
      color: band.color,
      amount: byBand.get(band.key) as Cents
    }));
  });

  const model = $derived(
    sankeyModel({
      bands: totals,
      width: Math.max(frameWidth - 26, 320),
      height: frameWidth < 620 ? 260 : 320
    })
  );

  const rows = $derived(
    [...model.nodes].sort((a, b) => (a.side === b.side ? b.amount - a.amount : a.side === 'in' ? -1 : 1))
  );
</script>

<section class="frame" bind:clientWidth={frameWidth}>
  <div class="head">
    <p class="caption">WHERE IT CAME FROM, WHERE IT WENT — {window.label.toUpperCase()}</p>
    <div class="periods no-print" role="group" aria-label="Period to add up">
      {#each [['month', 'This month'], ['year', 'Next 12 months'], ['all', 'Whole forecast']] as [key, label] (key)}
        <button
          type="button"
          class:on={period === key}
          aria-pressed={period === key}
          onclick={() => (period = key as Period)}
        >
          {label}
        </button>
      {/each}
    </div>
  </div>

  {#if model.nodes.length === 0}
    <p class="empty">Nothing moves in {window.label}.</p>
  {:else}
    <svg
      viewBox={`0 0 ${model.width} ${model.height}`}
      width={model.width}
      height={model.height}
      role="img"
      aria-label={`${formatEUR(model.inflow)} came in and ${formatEUR(model.outflow)} went out over ${window.label}.`}
    >
      {#each model.links as link (link.key)}
        <path
          d={link.path}
          fill={link.color}
          fill-opacity={hovered === null || hovered === link.key ? 0.42 : 0.12}
          class="ribbon"
        >
          <title>{link.label}: {formatEUR(link.amount)}</title>
        </path>
      {/each}

      <rect x={model.hub.x} y={model.hub.y} width={model.hub.width} height={model.hub.height} class="hub" />
      <text x={model.hub.x + model.hub.width / 2} y={model.hub.y - 8} text-anchor="middle" class="hub-label mono">
        {formatEUR(Math.max(model.inflow, model.outflow), { cents: false })}
      </text>

      {#each model.nodes as node (node.key)}
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          fill={node.color}
          onpointerenter={() => (hovered = node.key)}
          onpointerleave={() => (hovered = null)}
          role="presentation"
        />
        <text
          x={node.side === 'in' ? node.x - 8 : node.x + node.width + 8}
          y={node.y + node.height / 2 + 3.5}
          text-anchor={node.side === 'in' ? 'end' : 'start'}
          class="label"
          class:faint={node.height < 13}
        >
          {node.label}
        </text>
        {#if node.height >= 13}
          <text
            x={node.side === 'in' ? node.x - 8 : node.x + node.width + 8}
            y={node.y + node.height / 2 + 15}
            text-anchor={node.side === 'in' ? 'end' : 'start'}
            class="amount mono"
          >
            {formatEUR(node.amount, { cents: false })}
          </text>
        {/if}
      {/each}
    </svg>

    <div class="reading">
      <table>
        <caption>{window.label}, in figures</caption>
        <thead>
          <tr><th>Where</th><th>Direction</th><th>Amount</th></tr>
        </thead>
        <tbody>
          {#each rows as node (node.key)}
            <tr>
              <td><i style:background={node.color}></i>{node.label}</td>
              <td>{node.side === 'in' ? 'in' : 'out'}</td>
              <td class="mono">{formatEUR(node.amount)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .frame {
    background: var(--sheet);
    border: 1px solid var(--rule);
    border-radius: 10px;
    padding: 10px 12px 12px;
    max-width: 100%;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px 16px;
  }
  .caption {
    margin: 0 0 6px;
    font-size: 10px;
    letter-spacing: 0.12em;
    color: var(--ink-3);
  }
  .periods {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    background: var(--sheet-2);
    border: 1px solid var(--rule);
    border-radius: 999px;
  }
  .periods button {
    font-size: 11.5px;
    color: var(--ink-2);
    background: none;
    border: 0;
    border-radius: 999px;
    padding: 2px 10px;
  }
  .periods button.on {
    background: var(--ink);
    color: var(--paper);
    font-weight: 600;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .ribbon {
    transition: fill-opacity 120ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .ribbon {
      transition: none;
    }
  }
  .hub {
    fill: var(--ink);
  }
  .hub-label {
    font-size: 11px;
    fill: var(--ink-2);
  }
  .label {
    font-size: 11px;
    fill: var(--ink);
  }
  .label.faint {
    font-size: 10px;
    fill: var(--ink-3);
  }
  .amount {
    font-size: 10px;
    fill: var(--ink-3);
  }
  .empty {
    font-size: 13px;
    color: var(--ink-3);
  }
  .reading {
    margin-top: 10px;
    overflow-x: auto;
  }
  caption {
    text-align: left;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
    padding-bottom: 4px;
  }
  table {
    border-collapse: collapse;
    font-size: 12.5px;
    min-width: 260px;
  }
  th,
  td {
    text-align: right;
    padding: 3px 10px 3px 0;
    border-bottom: 1px solid var(--hair);
    white-space: nowrap;
  }
  th:first-child,
  td:first-child {
    text-align: left;
  }
  thead th {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
    font-weight: 600;
  }
  td i {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 2px;
    margin-right: 6px;
  }
</style>
