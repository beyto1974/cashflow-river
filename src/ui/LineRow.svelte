<script lang="ts">
  import { formatSigned } from '../domain/money';
  import { CADENCES } from '../domain/schedule';
  import { isRecurring, type Line } from '../domain/types';
  import { bandFor } from './bands';
  import { shortDate } from './format';
  import AmountInput from './AmountInput.svelte';
  import LineEditor from './LineEditor.svelte';

  interface Props {
    line: Line;
    open: boolean;
    onedit: (id: string | null) => void;
    onpatch: (patch: Partial<Line>) => void;
    onkind: (kind: Line['kind']) => void;
    onremove: () => void;
    ontoggle: () => void;
  }
  const { line, open, onedit, onpatch, onkind, onremove, ontoggle }: Props = $props();

  const band = $derived(bandFor(line.category));
  const when = $derived(
    isRecurring(line)
      ? `${CADENCES[line.cadence].label}${line.to ? `, until ${shortDate(line.to)}` : ''}`
      : shortDate(line.date)
  );
</script>

<div class="row" class:muted={line.muted === true}>
  <span class="swatch" style:background={band.color} title={band.label}></span>

  <button type="button" class="name" onclick={() => onedit(open ? null : line.id)} aria-expanded={open}>
    <span class="label">{line.label}</span>
    <span class="when">{when}{line.estimate ? ' · est.' : ''}</span>
  </button>

  <span class="amount" title={formatSigned(line.amount)}>
    <AmountInput value={line.amount} label={`${line.label} amount`} onchange={(amount) => onpatch({ amount })} />
  </span>

  <label class="keep">
    <input type="checkbox" checked={line.muted !== true} onchange={ontoggle} />
    <span class="sr">Count {line.label} in the forecast</span>
  </label>
</div>

{#if open}
  <LineEditor {line} {onpatch} {onkind} {onremove} onclose={() => onedit(null)} />
{/if}

<style>
  .row {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) 84px 22px;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
    border-bottom: 1px solid var(--hair);
  }
  .swatch {
    width: 9px;
    height: 9px;
    border-radius: 2px;
  }
  .name {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    background: none;
    border: 0;
    padding: 2px 0;
    text-align: left;
    min-width: 0;
    color: inherit;
  }
  .name:hover .label {
    text-decoration: underline;
  }
  .label {
    font-size: 13px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .when {
    font-size: 11px;
    color: var(--ink-3);
  }
  .keep input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
  }
  .muted .label,
  .muted .when {
    opacity: 0.45;
    text-decoration: line-through;
  }
  .muted .amount {
    opacity: 0.45;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
