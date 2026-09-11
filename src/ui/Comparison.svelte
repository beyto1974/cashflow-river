<script lang="ts">
  import { formatEUR } from '../domain/money';
  import type { Comparison } from '../domain/comparison';
  import { shortMonth } from './format';

  interface Props {
    comparison: Comparison | null;
    onpin: () => void;
    onclear: () => void;
  }
  const { comparison, onpin, onclear }: Props = $props();

  const widest = $derived(
    comparison ? Math.max(1, ...comparison.months.map((month) => Math.abs(month.delta))) : 1
  );
</script>

<section>
  {#if !comparison}
    <button type="button" class="button ghost no-print" onclick={onpin}>Pin this as the baseline</button>
    <p class="hint no-print">Then change something — a line, a dial, a date — and the two rivers are compared here.</p>
  {:else}
    <div class="head">
      <p class="eyebrow">Against the pinned baseline</p>
      <button type="button" class="button ghost no-print" onclick={onclear}>Drop the baseline</button>
    </div>
    <p class="verdict" class:worse={comparison.endDelta < 0}>{comparison.verdict}</p>
    <div class="strip">
      {#each comparison.months as month (month.month)}
        <div class="month" title={`${shortMonth(month.month)}: ${formatEUR(month.variant)} against ${formatEUR(month.baseline)}`}>
          <div class="bar">
            <i
              class:up={month.delta >= 0}
              style:height={`${Math.round((Math.abs(month.delta) / widest) * 26)}px`}
            ></i>
          </div>
          <span class="label">{shortMonth(month.month).slice(0, 3)}</span>
        </div>
      {/each}
    </div>
    <p class="hint">
      Each bar is where that month ends against the baseline. Worst point:
      <b class="mono">{formatEUR(comparison.variantLow.balance)}</b> against
      <b class="mono">{formatEUR(comparison.baselineLow.balance)}</b>.
    </p>
  {/if}
</section>

<style>
  section {
    margin-top: 18px;
    border-top: 1px solid var(--rule);
    padding-top: 10px;
  }
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .verdict {
    margin: 4px 0 8px;
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.05rem;
    color: var(--accent);
  }
  .verdict.worse {
    color: var(--critical);
  }
  .strip {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    overflow-x: auto;
    padding-bottom: 2px;
  }
  .month {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 22px;
  }
  .bar {
    display: flex;
    align-items: flex-end;
    height: 28px;
  }
  .bar i {
    display: block;
    width: 10px;
    min-height: 1px;
    border-radius: 2px 2px 0 0;
    background: var(--critical);
  }
  .bar i.up {
    background: var(--s-benefit);
  }
  .label {
    font-size: 9.5px;
    color: var(--ink-3);
  }
  .hint {
    font-size: 11.5px;
    color: var(--ink-3);
    margin: 6px 0 0;
  }
  .hint b {
    color: var(--ink-2);
  }
</style>
