<script lang="ts">
  import { formatSigned, parseAmount } from '../domain/money';
  import { isPlainDate, plainDate } from '../domain/dates';
  import { perMonth } from '../domain/schedule';
  import { isRecurring, type Line } from '../domain/types';
  import { isCounted } from '../domain/lineStatus';
  import type { LedgerState } from './state.svelte';
  import LineRow from './LineRow.svelte';
  import AddLine from './AddLine.svelte';
  import AccountsStrip from './AccountsStrip.svelte';
  import Dials from './Dials.svelte';
  import Ledgers from './Ledgers.svelte';

  interface Props {
    ledger: LedgerState;
  }
  const { ledger }: Props = $props();

  const coming = $derived(ledger.scenario.lines.filter((line) => isRecurring(line) && line.amount >= 0));
  const going = $derived(ledger.scenario.lines.filter((line) => isRecurring(line) && line.amount < 0));
  const oneOffs = $derived(
    ledger.scenario.lines.filter((line) => !isRecurring(line)).sort((a, b) => (a.kind === 'planned' && b.kind === 'planned' ? a.date.localeCompare(b.date) : 0))
  );

  /* Subtotals count what the forecast counts: nothing muted, nothing ended. */
  function monthlyTotal(lines: Line[]): number {
    return lines.reduce(
      (sum, line) =>
        !isRecurring(line) || !isCounted(line, ledger.scenario.asOf) ? sum : sum + perMonth(line.amount, line.cadence),
      0
    );
  }
  function plannedTotal(lines: Line[]): number {
    return lines.reduce((sum, line) => (isCounted(line, ledger.scenario.asOf) ? sum + line.amount : sum), 0);
  }

  const groups = $derived([
    { title: 'Coming in', lines: coming, subtitle: `${formatSigned(monthlyTotal(coming), { cents: false })} / month` },
    { title: 'Going out', lines: going, subtitle: `${formatSigned(monthlyTotal(going), { cents: false })} / month` },
    { title: 'One-offs you have planned', lines: oneOffs, subtitle: `${formatSigned(plannedTotal(oneOffs), { cents: false })} in total` }
  ]);
</script>

<aside>
  <div>
    <h2>The lines</h2>
    <p class="hint no-print">Amounts are per occurrence. Click a line to change how it repeats, when it starts or
      stops, or to delete it. Untick to see the river without it.</p>
  </div>

  <AccountsStrip
    accounts={ledger.scenario.accounts}
    opening={ledger.forecast.opening}
    onpatch={(id, patch) => ledger.updateAccount(id, patch)}
    onadd={() => ledger.addAccount()}
    onremove={(id) => ledger.removeAccount(id)}
  />

  {#each groups as group (group.title)}
    <section class="group">
      <div class="head">
        <h2>{group.title}</h2>
        <span class="subtotal mono">{group.subtitle}</span>
      </div>
      {#each group.lines as line (line.id)}
        <LineRow
          {line}
          asOf={ledger.scenario.asOf}
          open={ledger.editing === line.id}
          onedit={(id) => ledger.edit(id)}
          onpatch={(patch) => ledger.updateLine(line.id, patch)}
          onkind={(kind) => ledger.changeKind(line.id, kind)}
          onremove={() => ledger.removeLine(line.id)}
          ontoggle={() => ledger.toggleMute(line.id)}
        />
      {/each}
      {#if group.lines.length === 0}
        <p class="hint">Nothing here yet.</p>
      {/if}
    </section>
  {/each}

  <section class="group no-print">
    <h2>Add a line</h2>
    <AddLine defaultDate={ledger.forecast.asOf} onadd={(line) => ledger.addLine(line)} />
  </section>

  <Ledgers
    names={ledger.ledgerNames}
    current={ledger.ledgerName}
    history={ledger.history}
    onselect={(name) => ledger.selectLedger(name)}
    onsaveas={(name) => ledger.saveLedgerAs(name)}
    onremove={(name) => ledger.removeLedger(name)}
    onrestore={(revision) => ledger.restoreRevision(revision)}
  />

  <Dials
    dials={ledger.dials}
    touched={ledger.dialsTouched}
    rhythm={ledger.rhythm}
    onset={(dial, value) => ledger.setDial(dial, value)}
    onreset={() => ledger.resetDials()}
    onkeep={() => ledger.keepDials()}
  />

  <section class="group no-print">
    <h2>The forecast itself</h2>
    <div class="settings">
      <label>
        <span>Buffer to keep</span>
        <input
          type="text"
          inputmode="decimal"
          class="mono"
          value={(ledger.scenario.buffer / 100).toFixed(0)}
          onchange={(event) => {
            const input = event.currentTarget as HTMLInputElement;
            const parsed = parseAmount(input.value);
            if (parsed === null) input.value = (ledger.scenario.buffer / 100).toFixed(0);
            else ledger.setBuffer(Math.abs(parsed));
          }}
        />
      </label>
      <label>
        <span>Starts on</span>
        <input
          type="date"
          value={ledger.scenario.asOf}
          onchange={(event) => {
            const input = event.currentTarget as HTMLInputElement;
            if (isPlainDate(input.value)) ledger.setAsOf(plainDate(input.value));
            else input.value = ledger.scenario.asOf;
          }}
        />
      </label>
      <label>
        <span>Months ahead</span>
        <input
          type="number"
          min="1"
          max="120"
          class="mono"
          value={ledger.scenario.horizonMonths}
          onchange={(event) => ledger.setHorizon(Number((event.currentTarget as HTMLInputElement).value))}
        />
      </label>
    </div>
  </section>
</aside>

<style>
  aside {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  h2 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 6px;
  }
  .group {
    border-top: 1px solid var(--ink);
    padding-top: 8px;
  }
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .subtotal {
    font-size: 12.5px;
    color: var(--ink-2);
    font-weight: 500;
  }
  .hint {
    font-size: 11.5px;
    color: var(--ink-3);
    margin: 4px 0 0;
  }
  .settings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .settings label:first-child {
    grid-column: 1 / -1;
  }
  .settings label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .settings span {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
</style>
