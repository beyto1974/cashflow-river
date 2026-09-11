<script lang="ts">
  import type { MonthKey } from '../domain/dates';
  import { formatEUR } from '../domain/money';
  import type { Forecast } from '../domain/forecast';
  import type { MonthSummary } from '../domain/rollups';
  import { monthEndsModel, type Measure } from './chart/monthEndsModel';
  import { longMonth } from './format';
  import { trackPointer } from './pointerTracking';

  interface Props {
    forecast: Forecast;
    months: MonthSummary[];
    selectedMonth: MonthKey;
    onselect: (month: MonthKey) => void;
  }
  const { forecast, months, selectedMonth, onselect }: Props = $props();

  let frameWidth = $state(880);
  let hovered = $state<MonthKey | null>(null);
  let measure = $state<Measure>('end');

  const MEASURES: { key: Measure; label: string; caption: string }[] = [
    { key: 'end', label: 'Ends at', caption: 'WHERE EACH MONTH LEAVES YOU — CLOSING BALANCE' },
    { key: 'in', label: 'Money in', caption: 'WHAT CAME IN EACH MONTH' },
    { key: 'out', label: 'Money out', caption: 'WHAT WENT OUT EACH MONTH' }
  ];

  const model = $derived(
    monthEndsModel({
      months,
      buffer: forecast.buffer,
      width: Math.max(frameWidth - 26, 320),
      height: frameWidth < 620 ? 210 : 270,
      measure
    })
  );

  const shown = $derived(hovered ?? selectedMonth);
  const reading = $derived.by(() => {
    const bar = model.bars.find((candidate) => candidate.month === shown);
    if (!bar) return 'Point at a month to read it.';
    /* Whichever measure is drawn, the month is described in full: the bar is one
       figure, and the other two are what make sense of it. */
    return `${longMonth(bar.month)}${bar.summary.partial ? ' (part month)' : ''} · in ${formatEUR(
      bar.summary.inflow
    )} · out ${formatEUR(bar.summary.outflow)} · ends at ${formatEUR(bar.balance)} · lowest ${formatEUR(
      bar.summary.low
    )}`;
  });
</script>

<section class="frame" bind:clientWidth={frameWidth} use:trackPointer={{ move: () => {}, leave: () => (hovered = null) }}>
  <div class="head">
    <div class="measures no-print" role="group" aria-label="What the bars show">
      {#each MEASURES as option (option.key)}
        <button
          type="button"
          class:on={measure === option.key}
          aria-pressed={measure === option.key}
          onclick={() => (measure = option.key)}
        >
          {option.label}
        </button>
      {/each}
    </div>
    <p class="caption">
      {MEASURES.find((option) => option.key === measure)?.caption}{model.bars.some((bar) => bar.summary.partial)
        ? ' — HOLLOW BARS ARE PART MONTHS'
        : ''}
    </p>
  </div>

  <svg
    viewBox={`0 0 ${model.width} ${model.height}`}
    width={model.width}
    height={model.height}
    role="img"
    aria-label={`The balance at the end of each of the next ${model.bars.length} months.`}
  >
    {#each model.ticks as tick (tick.value)}
      <line x1={model.pad.left} x2={model.width - model.pad.right} y1={tick.y} y2={tick.y} class="hair" />
      <text x={model.pad.left - 7} y={tick.y + 3.5} text-anchor="end" class="tick mono">{tick.label}</text>
    {/each}

    <line x1={model.pad.left} x2={model.width - model.pad.right} y1={model.zeroY} y2={model.zeroY} class="zero" />

    {#each model.bars as bar (bar.month)}
      <rect
        x={bar.x}
        y={bar.y}
        width={bar.width}
        height={bar.height}
        rx="2"
        class="bar"
        data-band={bar.band}
        data-measure={measure}
        data-partial={bar.summary.partial ? 1 : 0}
        class:current={bar.month === selectedMonth}
      />
      {#if bar.label}
        <text
          x={bar.x + bar.width / 2}
          y={model.height - 8}
          text-anchor="middle"
          class="month"
          class:on={bar.month === selectedMonth}
        >
          {bar.label}
        </text>
      {/if}
      <rect
        x={bar.x - 2}
        y={model.pad.top}
        width={bar.width + 4}
        height={model.height - model.pad.top - model.pad.bottom}
        fill="transparent"
        class="hit"
        role="button"
        tabindex={bar.month === selectedMonth ? 0 : -1}
        aria-label={`${longMonth(bar.month)}${bar.summary.partial ? ', a part month,' : ':'} ${
          measure === 'end' ? 'ends at' : measure === 'in' ? 'money in' : 'money out'
        } ${formatEUR(bar.value)}`}
        onpointerenter={() => (hovered = bar.month)}
        onfocus={() => (hovered = bar.month)}
        onclick={() => onselect(bar.month)}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onselect(bar.month);
          }
        }}
      />
    {/each}
    {#if model.bufferY !== null}
      <line
        x1={model.pad.left}
        x2={model.width - model.pad.right}
        y1={model.bufferY}
        y2={model.bufferY}
        class="buffer"
      />
      <text x={model.pad.left + 4} y={model.bufferY - 5} class="buffer-label">
        buffer {formatEUR(forecast.buffer, { cents: false })}
      </text>
    {/if}
  </svg>

  <p class="reading" aria-live="polite">{reading}</p>
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
    gap: 6px 16px;
  }
  .caption {
    margin: 0 0 4px;
    font-size: 10px;
    letter-spacing: 0.12em;
    color: var(--ink-3);
  }
  .measures {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    background: var(--sheet-2);
    border: 1px solid var(--rule);
    border-radius: 999px;
  }
  .measures button {
    font-size: 11.5px;
    color: var(--ink-2);
    background: none;
    border: 0;
    border-radius: 999px;
    padding: 2px 10px;
  }
  .measures button.on {
    background: var(--ink);
    color: var(--paper);
    font-weight: 600;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .hair {
    stroke: var(--hair);
    stroke-width: 1;
  }
  .zero {
    stroke: var(--ink-3);
    stroke-width: 1;
  }
  .buffer {
    stroke: var(--warning);
    stroke-width: 1.5;
    stroke-dasharray: 2 4;
  }
  .buffer-label {
    font-size: 10px;
    fill: var(--warning);
    /* Drawn over the bars, so it carries a halo of the surface behind it. */
    stroke: var(--sheet);
    stroke-width: 3;
    paint-order: stroke;
  }
  .tick {
    font-size: 10px;
    fill: var(--ink-3);
  }
  .month {
    font-size: 10px;
    fill: var(--ink-3);
  }
  .month.on {
    fill: var(--ink);
    font-weight: 600;
  }
  .bar {
    fill: var(--accent);
  }
  .bar[data-band='tight'] {
    fill: var(--warning);
  }
  .bar[data-band='red'] {
    fill: var(--critical);
  }
  /* The two totals are not good or bad, so they take the band colours the river
     uses for the same two directions. */
  .bar[data-measure='in'] {
    fill: var(--s-salary);
  }
  .bar[data-measure='out'] {
    fill: var(--s-bills);
  }
  .bar.current {
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  /* The first and last months are shorter than a month, so their totals are not
     comparable with the rest — drawn hollow rather than as a short bar. */
  .bar[data-partial='1'] {
    fill-opacity: 0.32;
    stroke: currentColor;
    stroke-width: 1;
    stroke-dasharray: 3 2;
  }
  .hit {
    cursor: pointer;
  }
  .reading {
    margin: 8px 0 0;
    font-size: 12.5px;
    color: var(--ink-2);
    min-height: 18px;
  }
</style>
