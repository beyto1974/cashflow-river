<script lang="ts">
  import { formatSigned } from '../domain/money';
  import { perMonth } from '../domain/schedule';
  import { isRecurring, type Line } from '../domain/types';
  import type { LedgerState } from './state.svelte';
  import LineRow from './LineRow.svelte';
  import AddLine from './AddLine.svelte';
  import AccountsStrip from './AccountsStrip.svelte';

  interface Props {
    ledger: LedgerState;
  }
  const { ledger }: Props = $props();

  const coming = $derived(ledger.scenario.lines.filter((line) => isRecurring(line) && line.amount >= 0));
  const going = $derived(ledger.scenario.lines.filter((line) => isRecurring(line) && line.amount < 0));
  const oneOffs = $derived(
    ledger.scenario.lines.filter((line) => !isRecurring(line)).sort((a, b) => (a.kind === 'planned' && b.kind === 'planned' ? a.date.localeCompare(b.date) : 0))
  );

  function monthlyTotal(lines: Line[]): number {
    return lines.reduce(
      (sum, line) => (line.muted || !isRecurring(line) ? sum : sum + perMonth(line.amount, line.cadence)),
      0
    );
  }
  function plannedTotal(lines: Line[]): number {
    return lines.reduce((sum, line) => (line.muted ? sum : sum + line.amount), 0);
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
    <p class="hint">Amounts are per occurrence. Click a line to change how it repeats, when it starts or stops, or to
      delete it. Untick to see the river without it.</p>
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
          open={ledger.editing === line.id}
          onedit={(id) => ledger.edit(id)}
          onpatch={(patch) => ledger.updateLine(line.id, patch)}
          onremove={() => ledger.removeLine(line.id)}
          ontoggle={() => ledger.toggleMute(line.id)}
        />
      {/each}
      {#if group.lines.length === 0}
        <p class="hint">Nothing here yet.</p>
      {/if}
    </section>
  {/each}

  <section class="group">
    <h2>Add a line</h2>
    <AddLine defaultDate={ledger.forecast.asOf} onadd={(line) => ledger.addLine(line)} />
  </section>

  <section class="group">
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
            const parsed = Number((event.currentTarget as HTMLInputElement).value.replace(/[^\d.-]/g, ''));
            if (Number.isFinite(parsed)) ledger.setBuffer(Math.round(parsed * 100));
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
