<script lang="ts">
  import { isPlainDate, plainDate, today } from '../domain/dates';
  import { CATEGORIES, type Cadence, type Category, type Line } from '../domain/types';
  import { CADENCES, cadenceKeys } from '../domain/schedule';
  import { CATEGORY_LABELS } from './bands';
  import AmountInput from './AmountInput.svelte';

  interface Props {
    line: Line;
    onpatch: (patch: Partial<Line>) => void;
    onremove: () => void;
    onclose: () => void;
  }
  const { line, onpatch, onremove, onclose }: Props = $props();

  const direction = $derived(line.amount >= 0 ? 'in' : 'out');

  function setDirection(next: string): void {
    const size = Math.abs(line.amount);
    onpatch({ amount: next === 'in' ? size : -size });
  }
  function setDate(field: 'anchor' | 'date' | 'from' | 'to', value: string): void {
    if (value === '') {
      if (field === 'from' || field === 'to') onpatch({ [field]: undefined } as Partial<Line>);
      return;
    }
    if (!isPlainDate(value)) return;
    onpatch({ [field]: plainDate(value) } as Partial<Line>);
  }
  function setEstimate(isGuess: boolean): void {
    const patch: Partial<Line> = isGuess ? { estimate: true } : {};
    onpatch(isGuess ? patch : ({ estimate: false } as Partial<Line>));
  }
  function setKind(kind: string): void {
    if (kind === line.kind) return;
    onpatch(
      kind === 'planned'
        ? ({ kind: 'planned', date: line.kind === 'recurring' ? line.anchor : today() } as Partial<Line>)
        : ({ kind: 'recurring', cadence: 'monthly', anchor: line.kind === 'planned' ? line.date : today() } as Partial<Line>)
    );
  }
</script>

<div class="editor">
  <label class="field wide">
    <span>What is it</span>
    <input
      type="text"
      value={line.label}
      oninput={(event) => onpatch({ label: (event.currentTarget as HTMLInputElement).value })}
    />
  </label>

  <div class="field">
    <span>Amount</span>
    <AmountInput value={line.amount} label="Amount" align="left" onchange={(amount) => onpatch({ amount })} />
  </div>

  <label class="field">
    <span>Direction</span>
    <select value={direction} onchange={(event) => setDirection((event.currentTarget as HTMLSelectElement).value)}>
      <option value="out">goes out</option>
      <option value="in">comes in</option>
    </select>
  </label>

  <label class="field">
    <span>Kind</span>
    <select value={line.kind} onchange={(event) => setKind((event.currentTarget as HTMLSelectElement).value)}>
      <option value="recurring">repeats</option>
      <option value="planned">one-off</option>
    </select>
  </label>

  {#if line.kind === 'recurring'}
    <label class="field">
      <span>How often</span>
      <select
        value={line.cadence}
        onchange={(event) => onpatch({ cadence: (event.currentTarget as HTMLSelectElement).value as Cadence } as Partial<Line>)}
      >
        {#each cadenceKeys() as key (key)}
          <option value={key}>{CADENCES[key].label}</option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span>Falls due</span>
      <input type="date" value={line.anchor} onchange={(event) => setDate('anchor', (event.currentTarget as HTMLInputElement).value)} />
    </label>
    <label class="field">
      <span>Starts (optional)</span>
      <input type="date" value={line.from ?? ''} onchange={(event) => setDate('from', (event.currentTarget as HTMLInputElement).value)} />
    </label>
    <label class="field">
      <span>Ends (optional)</span>
      <input type="date" value={line.to ?? ''} onchange={(event) => setDate('to', (event.currentTarget as HTMLInputElement).value)} />
    </label>
  {:else}
    <label class="field">
      <span>On</span>
      <input type="date" value={line.date} onchange={(event) => setDate('date', (event.currentTarget as HTMLInputElement).value)} />
    </label>
  {/if}

  <label class="field">
    <span>Counts as</span>
    <select
      value={line.category}
      onchange={(event) => onpatch({ category: (event.currentTarget as HTMLSelectElement).value as Category })}
    >
      {#each CATEGORIES as category (category)}
        <option value={category}>{CATEGORY_LABELS[category]}</option>
      {/each}
    </select>
  </label>

  <label class="check">
    <input
      type="checkbox"
      checked={line.estimate === true}
      onchange={(event) => setEstimate((event.currentTarget as HTMLInputElement).checked)}
    />
    <span>This amount is a guess</span>
  </label>

  <div class="actions">
    <button type="button" class="button ghost" onclick={onclose}>Done</button>
    <button type="button" class="button danger" onclick={onremove}>Delete this line</button>
  </div>
</div>

<style>
  .editor {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 10px;
    padding: 10px 2px 12px;
    border-bottom: 1px solid var(--hair);
    background: var(--sheet-2);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .field.wide {
    grid-column: 1 / -1;
  }
  .field > span {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .check {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
  .check input {
    accent-color: var(--accent);
    width: 15px;
    height: 15px;
  }
  .actions {
    grid-column: 1 / -1;
    display: flex;
    gap: 8px;
    justify-content: space-between;
  }
</style>
