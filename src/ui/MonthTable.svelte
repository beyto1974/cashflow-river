<script lang="ts">
  import { formatEUR, formatSigned, type Cents } from '../domain/money';
  import type { MonthSummary } from '../domain/rollups';

  interface Props {
    months: MonthSummary[];
    monthName: (month: string) => string;
    /** What counts as tight, so the table can mark the figure that is tight. */
    buffer: Cents;
    open: boolean;
    onopen: (open: boolean) => void;
  }
  const { months, monthName, buffer, open, onopen }: Props = $props();
</script>

<details {open} ontoggle={(event) => onopen((event.currentTarget as HTMLDetailsElement).open)}>
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
          <!-- A month that touched the buffer is marked down its edge; the red is
               spent on the two figures that are actually about the buffer, so an
               ordinary income or outgoing is not coloured as if it were wrong. -->
          <tr class:touched={month.daysUnderBuffer > 0} class:overdrawn={month.low < 0}>
            <td>{monthName(month.month)}</td>
            <td class="mono">{formatEUR(month.inflow, { cents: false })}</td>
            <td class="mono">{formatEUR(month.outflow, { cents: false })}</td>
            <td class="mono">{formatSigned(month.net, { cents: false })}</td>
            <td class="mono" class:tight={month.low < buffer && month.low >= 0} class:red={month.low < 0}>
              {formatEUR(month.low, { cents: false })}
            </td>
            <td class="mono" class:tight={month.daysUnderBuffer > 0}>{month.daysUnderBuffer || '—'}</td>
            <td class="mono" class:red={month.end < 0}>{formatEUR(month.end, { cents: false })}</td>
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
  tbody tr.touched td:first-child {
    box-shadow: inset 3px 0 0 var(--warning);
    padding-left: 8px;
  }
  tbody tr.overdrawn td:first-child {
    box-shadow: inset 3px 0 0 var(--critical);
  }
  td.tight {
    color: var(--warning);
  }
  td.red {
    color: var(--critical);
    font-weight: 600;
  }
</style>
