<script lang="ts">
  import { dayOfMonth } from '../domain/dates';
  import { formatEUR, formatSigned } from '../domain/money';
  import type { MonthSummary } from '../domain/rollups';
  import { bandFor } from './bands';

  interface Props {
    month: MonthSummary;
    monthName: string;
  }
  const { month, monthName }: Props = $props();

  const movements = $derived(
    [...month.movements].sort((a, b) =>
      a.date === b.date ? Math.abs(b.amount) - Math.abs(a.amount) : a.date.localeCompare(b.date)
    )
  );
</script>

<section class="month-detail">
  <div class="head">
    <h3>{monthName}</h3>
    <div class="sums">
      <span>In <b class="mono">{formatEUR(month.inflow, { cents: false })}</b></span>
      <span>Out <b class="mono">{formatEUR(month.outflow, { cents: false })}</b></span>
      <span>Net <b class="mono">{formatSigned(month.net, { cents: false })}</b></span>
      <span>Ends at <b class="mono">{formatEUR(month.end, { cents: false })}</b></span>
    </div>
  </div>

  {#if movements.length === 0}
    <p class="empty">Nothing falls due in this month.</p>
  {:else}
    <ul>
      {#each movements as movement, index (`${movement.lineId}-${movement.date}-${index}`)}
        <li>
          <i style:background={bandFor(movement.category).color}></i>
          <span class="when mono">{dayOfMonth(movement.date)}</span>
          <span class="label">{movement.label}{movement.planned ? ' · planned' : ''}</span>
          <span class="amount mono" class:amount-in={movement.amount >= 0}>{formatSigned(movement.amount)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  section {
    margin-top: 22px;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 16px;
    border-bottom: 1px solid var(--ink);
    padding-bottom: 6px;
  }
  h3 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.25rem;
    margin: 0;
    font-weight: 600;
  }
  .sums {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .sums b {
    color: var(--ink);
    font-weight: 600;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    columns: 2;
    column-gap: 30px;
  }
  @media (max-width: 640px) {
    ul {
      columns: 1;
    }
  }
  li {
    display: grid;
    grid-template-columns: 10px 26px minmax(0, 1fr) 92px;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    border-bottom: 1px solid var(--hair);
    font-size: 13px;
    break-inside: avoid;
  }
  i {
    width: 9px;
    height: 9px;
    border-radius: 2px;
  }
  .when {
    color: var(--ink-3);
    font-size: 12px;
    text-align: right;
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .amount {
    text-align: right;
    font-weight: 500;
  }
  .empty {
    font-size: 13px;
    color: var(--ink-3);
  }
</style>
