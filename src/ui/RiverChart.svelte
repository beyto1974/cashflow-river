<script lang="ts">
  import { addDays, daysBetween, type MonthKey, type PlainDate } from '../domain/dates';
  import { formatEUR, formatSigned } from '../domain/money';
  import type { BandDay, Forecast } from '../domain/forecast';
  import type { MonthSummary } from '../domain/rollups';
  import { columnAt, dayIndexAt, inBed, riverGeometry, type Column } from './chart/riverModel';
  import { trackPointer } from './pointerTracking';
  import { longMonth } from './format';

  interface Props {
    forecast: Forecast;
    months: MonthSummary[];
    target: PlainDate;
    selectedMonth: MonthKey;
    onselect: (month: MonthKey) => void;
    /** Dragging the needle answers "what about that day" without the date field. */
    onpick: (date: PlainDate) => void;
    /** The edges of the guesses, drawn as a band around the likely line. */
    band?: BandDay[] | undefined;
  }
  const { forecast, months, target, selectedMonth, onselect, onpick, band }: Props = $props();
  let dragging = $state(false);

  let frameWidth = $state(880);
  let plot = $state<SVGSVGElement | null>(null);
  let hovered = $state<Column | null>(null);
  let tip = $state({ x: 0, y: 0 });

  const geometry = $derived(
    riverGeometry({
      forecast,
      months,
      width: Math.max(frameWidth - 26, 320),
      target,
      ...(band ? { band } : {})
    })
  );
  const labelEvery = $derived(geometry.width < 620 ? 4 : geometry.width < 900 ? 2 : 1);

  /** Measured against the drawing, not its frame: the frame carries padding and
      a border, and the viewBox knows nothing about either. */
  function inPlot(event: PointerEvent): { x: number; y: number } | null {
    if (!plot) return null;
    const box = plot.getBoundingClientRect();
    if (box.width === 0) return null;
    const scale = geometry.width / box.width;
    return { x: (event.clientX - box.left) * scale, y: (event.clientY - box.top) * scale };
  }

  function move(event: PointerEvent): void {
    const frame = event.currentTarget as HTMLElement | null;
    const at = inPlot(event);
    if (!frame || !at) return;
    if (dragging) {
      pickAt(at.x);
      hovered = null;
      return;
    }
    const frameBox = frame.getBoundingClientRect();
    hovered = columnAt(geometry, at.x) ?? null;
    tip = { x: event.clientX - frameBox.left, y: event.clientY - frameBox.top };
  }

  function pickAt(x: number): void {
    const day = forecast.days[dayIndexAt(geometry, x, forecast.days.length)];
    if (day) onpick(day.date);
  }

  function grab(event: PointerEvent): void {
    const at = inPlot(event);
    if (!at || !inBed(geometry, at.y)) return;
    dragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    pickAt(at.x);
    event.preventDefault();
  }
  function step(delta: number): MonthKey | undefined {
    const index = months.findIndex((month) => month.month === selectedMonth);
    const next = months[Math.min(months.length - 1, Math.max(0, index + delta))];
    if (next) onselect(next.month);
    return next?.month;
  }
  /** Roving focus: arrow keys walk the months, Enter and Space pick one. */
  function keys(event: KeyboardEvent, month: MonthKey): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const next = step(event.key === 'ArrowLeft' ? -1 : 1);
      if (next) requestAnimationFrame(() => document.getElementById(`month-${next}`)?.focus());
    } else if (event.key === 'Enter' || event.key === ' ') {
      onselect(month);
    } else {
      return;
    }
    event.preventDefault();
  }

  const needleDate = $derived(forecast.dayAt(target) ?? forecast.days[0]!);
  const daysAcross = $derived(daysBetween(forecast.asOf, forecast.horizon));
  const horizonLabel = $derived(`${forecast.asOf} to ${addDays(forecast.asOf, daysAcross)}`);
</script>

<div
  class="frame"
  bind:clientWidth={frameWidth}
  use:trackPointer={{ move, leave: () => (hovered = null), down: grab, up: () => (dragging = false) }}
  class:dragging
  data-dragging={dragging}
  data-target={target}
>
  <p class="sr-only" id="river-summary">
    Money in and out per month from {horizonLabel}, above and below the axis, with the balance it leaves behind. On
    {target} the balance is {formatEUR(needleDate.balance)}. Each month is a button: use the left and right arrow keys to
    walk them.
  </p>
  <svg
    bind:this={plot}
    viewBox={`0 0 ${geometry.width} ${geometry.height}`}
    width={geometry.width}
    height={geometry.height}
    role="group"
    aria-describedby="river-summary"
    aria-label="Monthly flow and the balance it leaves"
  >
    <text x={geometry.width - geometry.pad.right} y="13" text-anchor="end" class="caption">
      MONTHLY FLOW — IN ABOVE, OUT BELOW
    </text>

    {#each geometry.flow.ticks as tick (tick.value)}
      <line x1={geometry.pad.left} x2={geometry.width - geometry.pad.right} y1={tick.y} y2={tick.y} class="hair" />
      <text x={geometry.pad.left - 7} y={tick.y + 3.5} text-anchor="end" class="tick mono">{tick.label}</text>
    {/each}

    <line
      x1={geometry.pad.left}
      x2={geometry.width - geometry.pad.right}
      y1={geometry.flow.midY}
      y2={geometry.flow.midY}
      class="axis"
    />

    {#each geometry.flow.columns as column, index (column.month)}
      {#if column.month === selectedMonth}
        <rect
          x={column.x - 2}
          y={geometry.pad.top + 4}
          width={column.width + 4}
          height={geometry.flow.height - 6}
          class="picked"
        />
      {/if}
      {#each column.segments as segment (segment.bandKey)}
        <rect x={segment.x} y={segment.y} width={segment.width} height={segment.height} rx="1.5" fill={segment.color}>
          <title>{column.month} · {segment.label} {formatSigned(segment.amount, { cents: false })}</title>
        </rect>
      {/each}
      <line x1={column.x - 1.5} x2={column.x + column.width + 1.5} y1={column.netY} y2={column.netY} class="net" />
      {#if index % labelEvery === 0}
        <text
          x={column.slotX + column.slotWidth / 2}
          y={geometry.flow.labelY}
          text-anchor="middle"
          class:current={column.month === selectedMonth}
          class="month"
        >
          {column.label}{column.isYearStart ? ` ’${column.month.slice(2, 4)}` : ''}
        </text>
      {/if}
    {/each}

    <text x={geometry.width - geometry.pad.right} y={geometry.bed.top - 7} text-anchor="end" class="caption">
      THE BED IT LEAVES — BALANCE
    </text>
    <text x={geometry.pad.left - 7} y={geometry.bed.highLabel.y} text-anchor="end" class="tick mono">
      {geometry.bed.highLabel.text}
    </text>
    <text x={geometry.pad.left - 7} y={geometry.bed.lowLabel.y} text-anchor="end" class="tick mono">
      {geometry.bed.lowLabel.text}
    </text>

    <path d={geometry.bed.areaPath} class="bed-area" />
    {#if geometry.bed.redZone}
      <rect
        x={geometry.pad.left}
        y={geometry.bed.redZone.y}
        width={geometry.width - geometry.pad.left - geometry.pad.right}
        height={geometry.bed.redZone.height}
        class="red-zone"
      />
    {/if}
    {#if geometry.bed.conePath}
      <path d={geometry.bed.conePath} class="cone">
        <title>How far out the guessed lines could put the balance</title>
      </path>
    {/if}
    {#each geometry.bed.negativeAreas as area, index (index)}
      <path d={area} class="in-the-red" />
    {/each}
    <line
      x1={geometry.pad.left}
      x2={geometry.width - geometry.pad.right}
      y1={geometry.bed.bufferY}
      y2={geometry.bed.bufferY}
      class="buffer"
    />
    <text x={geometry.width - geometry.pad.right} y={geometry.bed.bufferY - 5} text-anchor="end" class="buffer-label">
      buffer {formatEUR(forecast.buffer, { cents: false })}
    </text>
    {#if geometry.bed.zeroY !== null}
      <line x1={geometry.pad.left} x2={geometry.width - geometry.pad.right} y1={geometry.bed.zeroY} y2={geometry.bed.zeroY} class="zero" />
    {/if}
    <path d={geometry.bed.linePath} class="bed-line" />
    {#each geometry.bed.negativeLines as stretch, index (index)}
      <path d={stretch} class="red-line">
        <title>Overdrawn</title>
      </path>
    {/each}
    {#each geometry.bed.negativeSpans as span, index (index)}
      <rect x={span.x} y={(geometry.bed.zeroY ?? geometry.bed.top) - 2} width={span.width} height="4" class="red-rug">
        <title>Overdrawn on these days</title>
      </rect>
    {/each}
    <circle cx={geometry.bed.lowPoint.x} cy={geometry.bed.lowPoint.y} r="3.5" class="low">
      <title>{geometry.bed.lowPoint.label}</title>
    </circle>
    <text
      x={Math.min(geometry.bed.lowPoint.x + 8, geometry.width - geometry.pad.right)}
      y={geometry.bed.lowPoint.y + 14}
      text-anchor={geometry.bed.lowPoint.x > geometry.width * 0.8 ? 'end' : 'start'}
      class="low-label mono"
    >
      lowest {formatEUR(forecast.low.balance, { cents: false })}
    </text>
    <line
      x1={geometry.bed.needle.x}
      x2={geometry.bed.needle.x}
      y1={geometry.bed.top}
      y2={geometry.bed.top + geometry.bed.height}
      class="needle"
    />
    <circle cx={geometry.bed.needle.x} cy={geometry.bed.needle.y} r="4.5" class="needle-knob" />
    <circle cx={geometry.bed.needle.x} cy={geometry.bed.needle.y} r="10" class="needle-grip" />

    {#each geometry.flow.columns as column (column.month)}
      <rect
        id={`month-${column.month}`}
        x={column.slotX}
        y="4"
        width={column.slotWidth}
        height={geometry.height - 8}
        fill="transparent"
        class="hit"
        role="button"
        tabindex={column.month === selectedMonth ? 0 : -1}
        aria-label={`${longMonth(column.month)}: net ${formatSigned(column.summary.net)}, ends at ${formatEUR(column.summary.end)}`}
        onclick={() => onselect(column.month)}
        onkeydown={(event) => keys(event, column.month)}
      />
    {/each}
  </svg>

  {#if hovered}
    <div class="tip" style:left={`${Math.min(tip.x + 14, frameWidth - 190)}px`} style:top={`${tip.y + 12}px`}>
      <div class="tip-head">{longMonth(hovered.month)}</div>
      {#each hovered.segments as segment (segment.bandKey)}
        <div class="tip-row">
          <span><i style:background={segment.color}></i>{segment.label}</span>
          <span class="mono">{formatSigned(segment.amount, { cents: false })}</span>
        </div>
      {/each}
      <div class="tip-row total">
        <span>In</span><span class="mono">{formatEUR(hovered.summary.inflow, { cents: false })}</span>
      </div>
      <div class="tip-row">
        <span>Out</span><span class="mono">{formatEUR(hovered.summary.outflow, { cents: false })}</span>
      </div>
      <div class="tip-row">
        <span><b>{hovered.summary.net >= 0 ? 'Gains' : 'Loses'}</b></span>
        <span class="mono" class:up={hovered.summary.net >= 0} class:down={hovered.summary.net < 0}>
          {formatSigned(hovered.summary.net, { cents: false })}
        </span>
      </div>
      <div class="tip-row">
        <span>Ends at</span><span class="mono">{formatEUR(hovered.summary.end, { cents: false })}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .frame {
    touch-action: pan-y;
    background: var(--sheet);
    border: 1px solid var(--rule);
    border-radius: 10px;
    padding: 12px 12px 8px;
    position: relative;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .frame:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .caption {
    font-size: 10px;
    fill: var(--ink-3);
    letter-spacing: 0.12em;
  }
  .tick {
    font-size: 10px;
    fill: var(--ink-3);
  }
  .month {
    font-size: 10px;
    fill: var(--ink-3);
  }
  .month.current {
    fill: var(--ink);
    font-weight: 600;
  }
  .hair {
    stroke: var(--hair);
    stroke-width: 1;
  }
  .axis {
    stroke: var(--ink);
    stroke-width: 1;
  }
  .net {
    stroke: var(--ink);
    stroke-width: 2;
  }
  .picked {
    fill: none;
    stroke: var(--ink);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .bed-area {
    fill: var(--accent);
    fill-opacity: 0.13;
  }
  .bed-line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
  }
  .cone {
    fill: var(--accent);
    fill-opacity: 0.16;
  }
  .in-the-red {
    fill: var(--critical);
    fill-opacity: 0.28;
  }
  .red-line {
    fill: none;
    stroke: var(--critical);
    stroke-width: 2.5;
  }
  .red-rug {
    fill: var(--critical);
  }
  .red-zone {
    fill: var(--critical);
    fill-opacity: 0.09;
  }
  .buffer {
    stroke: var(--warning);
    stroke-width: 1.5;
    stroke-dasharray: 2 4;
  }
  .buffer-label {
    font-size: 10px;
    fill: var(--warning);
  }
  .zero {
    stroke: var(--ink-3);
    stroke-width: 1;
  }
  .low {
    fill: var(--critical);
  }
  .low-label {
    font-size: 10px;
    fill: var(--critical);
  }
  .needle {
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  .needle-knob {
    fill: var(--ink);
  }
  .needle-grip {
    fill: none;
    stroke: var(--ink);
    stroke-opacity: 0.3;
    stroke-width: 1.5;
  }
  .frame.dragging {
    cursor: ew-resize;
  }
  .hit {
    cursor: pointer;
  }
  .tip {
    position: absolute;
    pointer-events: none;
    background: var(--ink);
    color: var(--tip-ink);
    border-radius: 6px;
    padding: 7px 9px;
    font-size: 12px;
    min-width: 170px;
    box-shadow: 0 10px 24px -14px rgba(0, 0, 0, 0.6);
    z-index: 3;
  }
  .tip-head {
    font-weight: 600;
    margin-bottom: 4px;
  }
  .tip-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .tip-row i {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    margin-right: 5px;
  }
  .tip-row.total {
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid color-mix(in oklab, var(--tip-ink) 30%, transparent);
  }
  .tip-row .up {
    color: var(--s-benefit);
  }
  .tip-row .down {
    color: var(--s-moving);
  }
</style>
