<script lang="ts">
  import { firstOfMonth, isPlainDate, plainDate, type MonthKey } from '../domain/dates';
  import { formatEUR } from '../domain/money';
  import type { LedgerState } from './state.svelte';
  import { BANDS } from './bands';
  import { distanceFrom, longDate, longMonth, shortMonth } from './format';
  import LedgerPanel from './LedgerPanel.svelte';
  import RiverChart from './RiverChart.svelte';
  import MonthDetail from './MonthDetail.svelte';
  import MonthTable from './MonthTable.svelte';

  interface Props {
    ledger: LedgerState;
  }
  const { ledger }: Props = $props();

  const day = $derived(ledger.forecast.dayAt(ledger.target) ?? ledger.forecast.days[0]!);
  const edge = $derived(ledger.banded.band.find((candidate) => candidate.date === ledger.target));
  const worst = $derived(edge?.low ?? day.balance);
  const best = $derived(edge?.high ?? day.balance);
  const selected = $derived(
    ledger.months.find((month) => month.month === ledger.selectedMonth) ?? ledger.months[0]!
  );
  const distance = $derived(distanceFrom(ledger.forecast.asOf, ledger.target));

  /** A date outside the horizon is clamped, so the field is rewritten to match. */
  function pickDate(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    if (isPlainDate(input.value)) ledger.setTarget(plainDate(input.value));
    input.value = ledger.target;
  }
  function pickMonth(month: MonthKey): void {
    ledger.selectMonth(month);
    const middle = `${month}-15`;
    ledger.setTarget(isPlainDate(middle) && ledger.forecast.dayAt(plainDate(middle)) ? plainDate(middle) : firstOfMonth(month));
  }
</script>

<div class="sheet">
  <header>
    <h1>Cashflow <em>River</em></h1>
    <p class="stand">Every line you keep sends water into the month it falls in. Edit a line on the left and the river
      re-cuts — including the bed it leaves behind, which is your balance.</p>
  </header>

  <div class="askline">
    <span class="lead">On</span>
    <input
      type="date"
      value={ledger.target}
      min={ledger.forecast.asOf}
      max={ledger.forecast.horizon}
      onchange={pickDate}
      aria-label="Date to read the balance on"
    />
    <span class="lead">the accounts hold</span>
    <span class="answer mono" class:short={day.balance < 0}>{formatEUR(day.balance)}</span>
    {#if ledger.banded.hasRange}
      <span class="spread">
        somewhere between <b class="mono">{formatEUR(worst, { cents: false })}</b> and
        <b class="mono">{formatEUR(best, { cents: false })}</b>
      </span>
    {/if}
    <span class="aside">
      · {distance}, starting from {formatEUR(ledger.forecast.opening)}{worst < ledger.forecast.buffer
        ? ` · could be under the ${formatEUR(ledger.forecast.buffer, { cents: false })} buffer`
        : ''}
    </span>
  </div>

  <div class="board">
    <LedgerPanel {ledger} />

    <main>
      <RiverChart
        forecast={ledger.forecast}
        months={ledger.months}
        target={ledger.target}
        selectedMonth={ledger.selectedMonth}
        onselect={pickMonth}
        band={ledger.banded.hasRange ? ledger.banded.band : undefined}
      />

      <div class="legend">
        {#each BANDS as band (band.key)}
          <span><i style:background={band.color}></i>{band.label}</span>
        {/each}
        <span><i class="net-key"></i>net for the month</span>
        {#if ledger.banded.hasRange}
          <span><i class="cone-key"></i>where the guesses could put it</span>
        {/if}
        {#if ledger.banded.warnings.firstNegative}
          <span><i class="red-key"></i>overdrawn</span>
        {/if}
      </div>

      <MonthDetail month={selected} monthName={longMonth(selected.month)} />
      <MonthTable months={ledger.months} monthName={shortMonth} />
    </main>
  </div>

  <footer>
    <span>
      {ledger.isSample
        ? 'These are example figures — an illustration, not your accounts.'
        : 'Your own figures, kept in this browser only.'}
      The forecast starts on {longDate(ledger.forecast.asOf)} and runs {ledger.scenario.horizonMonths} months.
    </span>
    <button type="button" class="button ghost" onclick={() => ledger.reset()}>Back to the example</button>
  </footer>
</div>

<style>
  .sheet {
    max-width: 1280px;
    margin: 0 auto;
    padding-inline: 20px;
    padding-block: 26px 52px;
  }
  header {
    border-bottom: 2px solid var(--ink);
    padding-bottom: 12px;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 12px 26px;
  }
  h1 {
    font-family: 'Newsreader', Georgia, serif;
    font-weight: 600;
    font-size: clamp(1.9rem, 4.6vw, 2.9rem);
    line-height: 1;
    letter-spacing: -0.015em;
    margin: 0;
  }
  h1 em {
    font-style: italic;
    font-weight: 400;
    color: var(--ink-2);
  }
  .stand {
    flex: 1 1 220px;
    color: var(--ink-2);
    font-size: 13px;
    max-width: 46ch;
    margin: 0;
  }
  .askline {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    padding: 14px 0 0;
  }
  .lead {
    font-family: 'Newsreader', Georgia, serif;
    font-size: clamp(1.05rem, 2.4vw, 1.35rem);
  }
  .answer {
    font-size: clamp(1.35rem, 3.4vw, 1.9rem);
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .answer.short {
    color: var(--critical);
  }
  .aside {
    color: var(--ink-2);
    font-size: 13px;
  }
  .board {
    display: grid;
    grid-template-columns: minmax(300px, 350px) minmax(0, 1fr);
    gap: 30px;
    margin-top: 26px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .board {
      grid-template-columns: 1fr;
    }
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    padding: 8px 2px 2px;
    font-size: 12px;
    color: var(--ink-2);
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .legend i {
    width: 9px;
    height: 9px;
    border-radius: 2px;
    display: inline-block;
  }
  .legend i.net-key {
    height: 2px;
    border-radius: 0;
    background: var(--ink);
  }
  .legend i.cone-key {
    background: color-mix(in oklab, var(--accent) 30%, transparent);
    border: 1px solid var(--accent);
  }
  .legend i.red-key {
    background: color-mix(in oklab, var(--critical) 45%, transparent);
    border: 1px solid var(--critical);
  }
  .spread {
    font-size: 13px;
    color: var(--ink-2);
  }
  .spread b {
    color: var(--ink);
    font-weight: 600;
  }
  footer {
    margin-top: 26px;
    padding-top: 12px;
    border-top: 1px solid var(--rule);
    color: var(--ink-3);
    font-size: 12.5px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px 16px;
    align-items: center;
    justify-content: space-between;
  }
</style>
