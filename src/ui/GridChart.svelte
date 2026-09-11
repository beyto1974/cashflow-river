<script lang="ts">
  import { addDays, addMonths, type PlainDate } from '../domain/dates';
  import { formatEUR } from '../domain/money';
  import type { Forecast } from '../domain/forecast';
  import { BAND_MEANING, gridModel } from './chart/gridModel';
  import { shortDate } from './format';
  import { trackPointer } from './pointerTracking';

  interface Props {
    forecast: Forecast;
    /** The day the read-out is answering for. */
    target: PlainDate;
    onpick: (date: PlainDate) => void;
  }
  const { forecast, target, onpick }: Props = $props();

  const grid = $derived(gridModel(forecast, forecast.buffer));
  let hovered = $state<PlainDate | null>(null);

  const readout = $derived.by(() => {
    const day = forecast.dayAt(hovered ?? target);
    if (!day) return 'Point at a day to read its closing balance.';
    const moves = day.movements.length;
    return `${shortDate(day.date)} closes at ${formatEUR(day.balance)} · ${
      moves === 0 ? 'nothing booked' : `${moves} ${moves === 1 ? 'movement' : 'movements'} booked`
    }`;
  });

  /** Arrow keys walk a day at a time, or a month sideways. */
  function keys(event: KeyboardEvent, date: PlainDate): void {
    const step = { ArrowUp: -1, ArrowDown: 1 }[event.key];
    let next: PlainDate | null = null;
    if (step !== undefined) next = addDays(date, step);
    else if (event.key === 'ArrowLeft') next = addMonths(date, -1);
    else if (event.key === 'ArrowRight') next = addMonths(date, 1);
    else if (event.key === 'Enter' || event.key === ' ') next = date;
    else return;

    event.preventDefault();
    if (next && forecast.dayAt(next)) {
      onpick(next);
      requestAnimationFrame(() => document.getElementById(`cell-${next}`)?.focus());
    }
  }
</script>

<section class="frame">
  <p class="caption">
    EVERY DAY, MONTHS ACROSS AND DAY OF MONTH DOWN{grid.monthsHidden > 0
      ? ` — FIRST ${grid.months.length} MONTHS, ${grid.monthsHidden} MORE NOT SHOWN`
      : ''}
  </p>

  <div class="scroll" use:trackPointer={{ move: () => {}, leave: () => (hovered = null) }}>
    <table aria-label="Projected closing balance for every day of the forecast">
      <thead>
        <tr>
          <th class="dom"></th>
          {#each grid.years as year (year.year)}
            <th class="year" colspan={year.span} scope="col">{year.year}</th>
          {/each}
        </tr>
        <tr>
          <th class="dom"></th>
          {#each grid.months as month (month.month)}
            <th scope="col">{month.label}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each grid.rows as row (row.dayOfMonth)}
          <tr>
            <th class="dom" scope="row">{row.dayOfMonth}</th>
            {#each row.cells as cell, index (grid.months[index]?.month ?? index)}
              {#if cell}
                <td>
                  <button
                    type="button"
                    id={`cell-${cell.date}`}
                    class="cell"
                    class:selected={cell.date === target}
                    class:today={cell.today}
                    data-band={cell.band}
                    data-plan={cell.planned ? 1 : 0}
                    tabindex={cell.date === target ? 0 : -1}
                    aria-label={`${shortDate(cell.date)}: ${formatEUR(cell.balance, { cents: false })}, ${
                      BAND_MEANING[cell.band]
                    }`}
                    onpointerenter={() => (hovered = cell.date)}
                    onfocus={() => (hovered = cell.date)}
                    onclick={() => onpick(cell.date)}
                    onkeydown={(event) => keys(event, cell.date)}
                  ></button>
                </td>
              {:else}
                <td class="blank"></td>
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <p class="readout" aria-live="polite">{readout}</p>

  <div class="legend">
    <span><i data-band="red"></i>overdrawn</span>
    <span><i data-band="tight"></i>under {formatEUR(grid.buffer, { cents: false })}</span>
    <span class="ramp">
      {#each ['1', '2', '3', '4', '5'] as band (band)}<i data-band={band}></i>{/each}
      {formatEUR(grid.buffer, { cents: false })} → {formatEUR(grid.buffer * 6, { cents: false })} and up
    </span>
    <span><i data-band="3" data-plan="1"></i>a one-off falls here</span>
    <span class="count">{grid.underBuffer} of {forecast.days.length} days under the buffer</span>
  </div>
</section>

<style>
  .frame {
    background: var(--sheet);
    border: 1px solid var(--rule);
    border-radius: 10px;
    padding: 10px 12px 12px;
  }
  .caption {
    margin: 0 0 8px;
    font-size: 10px;
    letter-spacing: 0.12em;
    color: var(--ink-3);
    text-align: right;
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: separate;
    border-spacing: 2px;
    table-layout: fixed;
  }
  th {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-3);
    padding: 0 0 3px;
  }
  th.year {
    color: var(--ink);
    text-align: left;
    border-bottom: 1px solid var(--rule);
    padding-bottom: 2px;
  }
  th.dom {
    width: 20px;
    text-align: right;
    padding-right: 4px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: 0;
    text-transform: none;
  }
  td {
    width: 20px;
    height: 15px;
    padding: 0;
  }
  .cell {
    display: block;
    width: 100%;
    height: 15px;
    border: 0;
    border-radius: 2px;
    padding: 0;
    position: relative;
    cursor: pointer;
  }
  /* The same single-hue ramp the bed panel's scale implies: pale is thin, deep
     is comfortable, amber is under the buffer, hatched red is overdrawn. */
  .cell[data-band='1'],
  .legend i[data-band='1'] {
    background: #cde2fb;
  }
  .cell[data-band='2'],
  .legend i[data-band='2'] {
    background: #9ec5f4;
  }
  .cell[data-band='3'],
  .legend i[data-band='3'] {
    background: #5598e7;
  }
  .cell[data-band='4'],
  .legend i[data-band='4'] {
    background: #256abf;
  }
  .cell[data-band='5'],
  .legend i[data-band='5'] {
    background: #104281;
  }
  .cell[data-band='tight'],
  .legend i[data-band='tight'] {
    background: var(--warning);
  }
  .cell[data-band='red'],
  .legend i[data-band='red'] {
    background: repeating-linear-gradient(
      45deg,
      var(--critical) 0 3px,
      color-mix(in srgb, var(--critical) 62%, #000) 3px 6px
    );
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) .cell[data-band='1'],
    :root:not([data-theme='light']) .legend i[data-band='1'] {
      background: #0d366b;
    }
    :root:not([data-theme='light']) .cell[data-band='2'],
    :root:not([data-theme='light']) .legend i[data-band='2'] {
      background: #1c5cab;
    }
    :root:not([data-theme='light']) .cell[data-band='3'],
    :root:not([data-theme='light']) .legend i[data-band='3'] {
      background: #2a78d6;
    }
    :root:not([data-theme='light']) .cell[data-band='4'],
    :root:not([data-theme='light']) .legend i[data-band='4'] {
      background: #5598e7;
    }
    :root:not([data-theme='light']) .cell[data-band='5'],
    :root:not([data-theme='light']) .legend i[data-band='5'] {
      background: #9ec5f4;
    }
  }
  :root[data-theme='dark'] .cell[data-band='1'],
  :root[data-theme='dark'] .legend i[data-band='1'] {
    background: #0d366b;
  }
  :root[data-theme='dark'] .cell[data-band='2'],
  :root[data-theme='dark'] .legend i[data-band='2'] {
    background: #1c5cab;
  }
  :root[data-theme='dark'] .cell[data-band='3'],
  :root[data-theme='dark'] .legend i[data-band='3'] {
    background: #2a78d6;
  }
  :root[data-theme='dark'] .cell[data-band='4'],
  :root[data-theme='dark'] .legend i[data-band='4'] {
    background: #5598e7;
  }
  :root[data-theme='dark'] .cell[data-band='5'],
  :root[data-theme='dark'] .legend i[data-band='5'] {
    background: #9ec5f4;
  }
  .cell[data-plan='1']::after,
  .legend i[data-plan='1']::after {
    content: '';
    position: absolute;
    inset: auto 2px 2px auto;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--paper);
  }
  .cell.selected {
    outline: 2px solid var(--ink);
    outline-offset: 1px;
    z-index: 2;
  }
  .cell.today {
    box-shadow: inset 0 0 0 2px var(--ink);
  }
  .cell:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .blank {
    background: none;
  }
  .readout {
    margin: 8px 0 0;
    font-size: 12.5px;
    color: var(--ink-2);
    min-height: 18px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 5px 14px;
    margin-top: 8px;
    font-size: 11.5px;
    color: var(--ink-2);
    align-items: center;
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .legend i {
    width: 20px;
    height: 11px;
    border-radius: 2px;
    display: inline-block;
    position: relative;
  }
  .legend .ramp i {
    border-radius: 0;
  }
  .legend .ramp i:first-of-type {
    border-radius: 2px 0 0 2px;
  }
  .legend .ramp i:last-of-type {
    border-radius: 0 2px 2px 0;
  }
  .legend .count {
    color: var(--ink-3);
  }
</style>
