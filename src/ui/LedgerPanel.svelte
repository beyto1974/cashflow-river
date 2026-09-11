<script lang="ts">
  import { formatEUR, formatSigned } from '../domain/money';
  import { perMonth } from '../domain/schedule';
  import { isRecurring, type Line } from '../domain/types';
  import { isCounted } from '../domain/lineStatus';
  import type { LedgerState } from './state.svelte';
  import LineRow from './LineRow.svelte';
  import AddLine from './AddLine.svelte';
  import AccountsStrip from './AccountsStrip.svelte';
  import Dials from './Dials.svelte';
  import FoldSection from './FoldSection.svelte';

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
    <h2 class="lede">The lines</h2>
    <p class="hint no-print">Amounts are per occurrence. Click a line to change how it repeats, when it starts or
      stops, or to delete it. Untick to see the river without it.</p>
  </div>

  <FoldSection
    title="What you have now"
    note={formatEUR(ledger.forecast.opening)}
    folded={ledger.isFolded('What you have now')}
    ontoggle={() => ledger.toggleSection('What you have now')}
  >
    <AccountsStrip
      accounts={ledger.scenario.accounts}
      onpatch={(id, patch) => ledger.updateAccount(id, patch)}
      onadd={() => ledger.addAccount()}
      onremove={(id) => ledger.removeAccount(id)}
    />
  </FoldSection>

  <FoldSection
    title="What if…"
    note={`${formatSigned(ledger.rhythm.net, { cents: false })} / month`}
    folded={ledger.isFolded('What if…')}
    ontoggle={() => ledger.toggleSection('What if…')}
  >
    <Dials
      dials={ledger.dials}
      touched={ledger.dialsTouched}
      onset={(dial, value) => ledger.setDial(dial, value)}
      onreset={() => ledger.resetDials()}
      onkeep={() => ledger.keepDials()}
    />
  </FoldSection>

  {#each groups as group (group.title)}
    <FoldSection
      title={group.title}
      note={group.subtitle}
      count={group.lines.length}
      folded={ledger.isFolded(group.title)}
      ontoggle={() => ledger.toggleSection(group.title)}
    >
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
    </FoldSection>
  {/each}

  <FoldSection
    title="Add a line"
    folded={ledger.isFolded('Add a line')}
    ontoggle={() => ledger.toggleSection('Add a line')}
  >
    <AddLine defaultDate={ledger.forecast.asOf} onadd={(line) => ledger.addLine(line)} />
  </FoldSection>

</aside>

<style>
  aside {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  h2.lede {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 6px;
  }
  .hint {
    font-size: 11.5px;
    color: var(--ink-3);
    margin: 4px 0 0;
  }
</style>
