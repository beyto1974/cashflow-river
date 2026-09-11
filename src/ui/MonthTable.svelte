<script lang="ts">
  import { formatEUR, formatSigned } from '../domain/money';
  import type { MonthSummary } from '../domain/rollups';

  interface Props {
    months: MonthSummary[];
    monthName: (month: string) => string;
  }
  const { months, monthName }: Props = $props();
</script>

<details>
  <summary>The same river as a table</summary>
  <p class="print-only caption">Month by month</p>
  <div class="scroll">
    <table>
      <thead>
        <tr>
          <th>Month</th><th>In</th><th>Out</th><th>Net</th><th>Lowest</th><th>Days under buffer</th><th>Ends at</th>
        </tr>
      </thead>
      <tbody>
        {#each months as month (month.month)}
          <tr class:under={month.daysUnderBuffer > 0}>
            <td>{monthName(month.month)}</td>
            <td class="mono">{formatEUR(month.inflow, { cents: false })}</td>
            <td class="mono">{formatEUR(month.outflow, { cents: false })}</td>
            <td class="mono">{formatSigned(month.net, { cents: false })}</td>
            <td class="mono">{formatEUR(month.low, { cents: false })}</td>
            <td class="mono">{month.daysUnderBuffer || '—'}</td>
            <td class="mono">{formatEUR(month.end, { cents: false })}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</details>

<style>
  details {
    margin-top: 26px;
    border-top: 1px solid var(--rule);
    padding-top: 12px;
  }
  .caption {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.05rem;
    margin: 8px 0 0;
  }
  summary {
    cursor: pointer;
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-3);
    font-weight: 600;
  }
  .scroll {
    overflow-x: auto;
    margin-top: 10px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 13px;
  }
  th,
  td {
    text-align: right;
    padding: 5px 10px;
    border-bottom: 1px solid var(--hair);
    white-space: nowrap;
  }
  th:first-child,
  td:first-child {
    text-align: left;
  }
  thead th {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
    font-weight: 600;
  }
  tbody tr.under td {
    color: var(--critical);
  }
</style>
