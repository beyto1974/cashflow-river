<script lang="ts">
  import { firstOfMonth, isPlainDate, plainDate, type MonthKey } from '../domain/dates';
  import { formatEUR } from '../domain/money';
  import type { LedgerState } from './state.svelte';
  import { BANDS } from './bands';
  import { tick } from 'svelte';
  import { worstFirst } from '../domain/stretches';
  import { distanceFrom, longDate, longMonth, shortDate, shortMonth } from './format';
  import LedgerPanel from './LedgerPanel.svelte';
  import RiverChart from './RiverChart.svelte';
  import GridChart from './GridChart.svelte';
  import MonthDetail from './MonthDetail.svelte';
  import MonthTable from './MonthTable.svelte';
  import FixPanel from './FixPanel.svelte';
  import Comparison from './Comparison.svelte';
  import ConfirmButton from './ConfirmButton.svelte';
  import Settings from './Settings.svelte';

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
  const shown = $derived(worstFirst(ledger.summary.likelyStretches, 6));
  let verdictEl = $state<HTMLElement | null>(null);

  /**
   * The answer as one sentence for a screen reader, settled rather than live:
   * dragging the needle changes the date many times a second, and a live region
   * that follows every frame reads out a stream of balances.
   */
  const answerSentence = $derived(
    `On ${longDate(ledger.target)} the accounts hold ${formatEUR(day.balance)}${
      ledger.banded.hasRange ? `, somewhere between ${formatEUR(worst)} and ${formatEUR(best)}` : ''
    }.`
  );
  let spokenAnswer = $state('');
  $effect(() => {
    const settling = answerSentence;
    const timer = setTimeout(() => (spokenAnswer = settling), 600);
    return () => clearTimeout(timer);
  });



  /** A date outside the horizon is clamped, so the field is rewritten to match. */
  function pickDate(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    if (isPlainDate(input.value)) ledger.setTarget(plainDate(input.value));
    input.value = ledger.target;
  }
  /* A closed <details> prints as its summary alone, so the month table would be
     a heading with nothing under it. Opened for the print, restored after. */
  $effect(() => {
    let reopened: HTMLDetailsElement[] = [];
    const open = (): void => {
      reopened = [...document.querySelectorAll('details:not([open])')] as HTMLDetailsElement[];
      for (const details of reopened) details.open = true;
    };
    const close = (): void => {
      for (const details of reopened) details.open = false;
      reopened = [];
    };
    window.addEventListener('beforeprint', open);
    window.addEventListener('afterprint', close);
    return () => {
      window.removeEventListener('beforeprint', open);
      window.removeEventListener('afterprint', close);
    };
  });

  const monthIndex = $derived(ledger.months.findIndex((month) => month.month === ledger.selectedMonth));

  function stepMonth(delta: number): void {
    const next = ledger.months[monthIndex + delta];
    if (next) pickMonth(next.month);
  }

  function pickMonth(month: MonthKey): void {
    ledger.selectMonth(month);
    const middle = `${month}-15`;
    ledger.setTarget(isPlainDate(middle) && ledger.forecast.dayAt(plainDate(middle)) ? plainDate(middle) : firstOfMonth(month));
  }
</script>

<div class="sheet">
  <p class="sr-only" role="status" aria-live="polite">{ledger.announcement}</p>

  <header>
    <h1>Cashflow <em>River</em></h1>
    <p class="stand no-print">Every line you keep sends water into the month it falls in. Edit a line on the left and
      the river re-cuts — including the bed it leaves behind, which is your balance.</p>
    <p class="printed print-only">
      {ledger.ledgerName} · forecast from {longDate(ledger.forecast.asOf)}, {ledger.scenario.horizonMonths} months
      ahead · buffer {formatEUR(ledger.forecast.buffer, { cents: false })}
    </p>
    <div class="tools no-print">
      <button type="button" class="button ghost" onclick={() => window.print()}>Print this</button>
      <Settings
        buffer={ledger.scenario.buffer}
        asOf={ledger.scenario.asOf}
        horizonMonths={ledger.scenario.horizonMonths}
        onbuffer={(buffer) => ledger.setBuffer(buffer)}
        onasof={(date) => ledger.setAsOf(date)}
        onhorizon={(months) => ledger.setHorizon(months)}
        names={ledger.ledgerNames}
        current={ledger.ledgerName}
        history={ledger.history}
        onselect={(name) => ledger.selectLedger(name)}
        onsaveas={(name) => ledger.saveLedgerAs(name)}
        onremove={(name) => ledger.removeLedger(name)}
        onrestore={(revision) => ledger.restoreRevision(revision)}
        onexport={() => ledger.exportAll()}
        onimport={(text) => ledger.importAll(text)}
        isOpen={(panel) => ledger.isOpen(panel)}
        setOpen={(panel, open) => ledger.setOpen(panel, open)}
      />
    </div>
  </header>

  <div class="askline">
    <span class="lead" aria-hidden="true">On</span>
    <input
      class="no-print"
      type="date"
      value={ledger.target}
      min={ledger.forecast.asOf}
      max={ledger.forecast.horizon}
      onchange={pickDate}
      aria-label="Date to read the balance on"
    />
    <span class="print-only lead" aria-hidden="true">{longDate(ledger.target)}</span>
    <span class="lead" aria-hidden="true">the accounts hold</span>
    <span class="answer mono" class:short={day.balance < 0} aria-hidden="true">{formatEUR(day.balance)}</span>
    {#if ledger.banded.hasRange}
      <span class="spread" aria-hidden="true">
        somewhere between <b class="mono">{formatEUR(worst, { cents: false })}</b> and
        <b class="mono">{formatEUR(best, { cents: false })}</b>
      </span>
    {/if}
    <span class="aside" aria-hidden="true">
      · {distance}, starting from {formatEUR(ledger.forecast.opening)}{worst < ledger.forecast.buffer
        ? ledger.banded.hasRange
          ? ` · could be under the ${formatEUR(ledger.forecast.buffer, { cents: false })} buffer`
          : ` · under the ${formatEUR(ledger.forecast.buffer, { cents: false })} buffer`
        : ''}
    </span>
  </div>

  <p class="sr-only" aria-live="polite">{spokenAnswer}</p>

  <p class="verdict" data-tone={ledger.summary.tone} tabindex="-1" bind:this={verdictEl}>
    {ledger.summary.sentence}
  </p>

  {#if ledger.summary.risk}
    <p class="risk">{ledger.summary.risk}</p>
  {/if}

  {#if ledger.summary.likelyStretches.length > 0}
    <div class="stretches">
      <span class="eyebrow">
        Tight stretches{ledger.summary.likelyStretches.length > shown.length
          ? ` · the ${shown.length} worst of ${ledger.summary.likelyStretches.length}`
          : ''}
      </span>
      {#each shown as stretch (stretch.from)}
        <button
          type="button"
          class="stretch"
          class:red={stretch.overdrawn}
          onclick={() => ledger.setTarget(stretch.deepest.date)}
        >
          {shortDate(stretch.from)} → {shortDate(stretch.to)}
          <b class="mono">{stretch.overdrawn ? formatEUR(stretch.deepest.balance) : `-${formatEUR(stretch.shortfall)}`}</b>
          <span class="days">{stretch.days}d</span>
        </button>
      {/each}
    </div>
  {/if}

  {#if ledger.summary.likelyStretches.length > 0}
    <FixPanel
      find={() => ledger.fixes()}
      apply={async (fix) => {
        ledger.applyFix(fix);
        /* The outcome is a changed sentence, so put the reader on it — after the
           re-render, or focus lands on the old text. */
        await tick();
        verdictEl?.focus();
      }}
      stretches={ledger.summary.likelyStretches.length}
    />
  {/if}

  <div class="board">
    <LedgerPanel {ledger} />

    <main>
      <div class="views no-print" role="group" aria-label="How to read the forecast">
        {#each [['river', 'River'], ['balance', 'Balance'], ['grid', 'Grid']] as [key, label] (key)}
          <button
            type="button"
            class:on={ledger.view === key}
            aria-pressed={ledger.view === key}
            onclick={() => ledger.setView(key as 'river' | 'balance' | 'grid')}
          >
            {label}
          </button>
        {/each}
      </div>

      <div class="chart-hold">
      {#if ledger.view === 'grid'}
        <GridChart forecast={ledger.forecast} target={ledger.target} onpick={(date) => ledger.setTarget(date)} />
      {:else}
      <RiverChart
        panels={ledger.view === 'balance' ? 'bed' : 'both'}
        forecast={ledger.forecast}
        months={ledger.months}
        target={ledger.target}
        selectedMonth={ledger.selectedMonth}
        onselect={pickMonth}
        onpick={(date) => ledger.setTarget(date)}
        band={ledger.banded.hasRange ? ledger.banded.band : undefined}
      />

      <div class="legend">
        {#if ledger.view !== 'balance'}
          {#each BANDS as band (band.key)}
            <span><i style:background={band.color}></i>{band.label}</span>
          {/each}
          <span><i class="net-key"></i>net for the month</span>
        {:else}
          <span><i class="line-key"></i>the balance, day by day</span>
        {/if}
        <span class="drag-hint no-print">drag along the lower panel to read any day</span>
        {#if ledger.banded.hasRange}
          <span><i class="cone-key"></i>where the guesses could put it</span>
        {/if}
        {#if ledger.banded.warnings.firstNegative}
          <span><i class="red-key"></i>overdrawn</span>
        {/if}
      </div>
      {/if}
      </div>

      <Comparison
        comparison={ledger.comparison}
        onpin={() => ledger.pinBaseline()}
        onclear={() => ledger.clearBaseline()}
      />

      <MonthDetail
        month={selected}
        monthName={longMonth(selected.month)}
        onprev={() => stepMonth(-1)}
        onnext={() => stepMonth(1)}
        hasPrev={monthIndex > 0}
        hasNext={monthIndex >= 0 && monthIndex < ledger.months.length - 1}
      />
      <MonthTable
        months={ledger.months}
        monthName={shortMonth}
        buffer={ledger.forecast.buffer}
        open={ledger.isOpen('month table')}
        onopen={(open) => ledger.setOpen('month table', open)}
      />
    </main>
  </div>

  <footer>
    <span>
      {ledger.isSample
        ? 'These are example figures — an illustration, not your accounts.'
        : 'Your own figures, kept in this browser only.'}
      The forecast starts on {longDate(ledger.forecast.asOf)} and runs {ledger.scenario.horizonMonths} months.
    </span>
    <span class="no-print">
      <ConfirmButton
        label="Back to the example"
        confirm="Discard this ledger and its versions"
        onconfirm={() => ledger.reset()}
      />
    </span>
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
  .printed {
    flex: 1 1 220px;
    color: var(--ink-2);
    font-size: 12px;
    margin: 0;
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 8px;
    align-self: flex-end;
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
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .verdict {
    margin: 14px 0 0;
    font-family: 'Newsreader', Georgia, serif;
    font-size: clamp(1rem, 2.2vw, 1.2rem);
    line-height: 1.4;
    max-width: 68ch;
    border-left: 3px solid var(--accent);
    padding-left: 12px;
  }
  .verdict[data-tone='tight'] {
    border-left-color: var(--warning);
  }
  .verdict[data-tone='red'] {
    border-left-color: var(--critical);
  }
  .verdict:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
  }
  .risk {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--ink-2);
    max-width: 68ch;
    padding-left: 15px;
  }
  .stretches {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    margin-top: 10px;
  }
  .stretch {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    font-size: 12.5px;
    background: var(--sheet);
    color: var(--ink-2);
    border: 1px solid var(--rule);
    border-radius: 999px;
    padding: 3px 10px;
  }
  .stretch:hover {
    color: var(--ink);
    border-color: var(--ink-3);
  }
  .stretch b {
    color: var(--warning);
    font-weight: 600;
  }
  .stretch.red b {
    color: var(--critical);
  }
  .stretch .days {
    color: var(--ink-3);
  }
  .board {
    display: grid;
    grid-template-columns: minmax(300px, 350px) minmax(0, 1fr);
    gap: 30px;
    margin-top: 26px;
    align-items: start;
  }
  /* Both tracks must be allowed to be narrower than their content, or a wide
     table inside one pushes the whole page sideways. */
  .board > :global(*) {
    min-width: 0;
    max-width: 100%;
  }
  @media screen and (max-width: 900px) {
    .board {
      grid-template-columns: minmax(0, 1fr);
      gap: 20px;
    }
    /* The forecast comes first on a narrow screen: it is the answer, and the
       ledger below it is the working surface. */
    .board main {
      order: -1;
    }
  }
  .views {
    display: inline-flex;
    gap: 2px;
    margin-bottom: 8px;
    padding: 2px;
    background: var(--sheet-2);
    border: 1px solid var(--rule);
    border-radius: 999px;
  }
  .views button {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ink-2);
    background: none;
    border: 0;
    border-radius: 999px;
    padding: 3px 14px;
  }
  .views button.on {
    background: var(--ink);
    color: var(--paper);
    font-weight: 600;
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
  .legend .drag-hint {
    color: var(--ink-3);
    font-style: italic;
  }
  .legend i.line-key {
    height: 2px;
    border-radius: 0;
    background: var(--accent);
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
