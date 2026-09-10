<script lang="ts">
  import { isPlainDate, plainDate } from '../domain/dates';
  import { directionOf, isNegative, parseAmount, withSign, type Direction } from '../domain/money';
  import { CATEGORIES, type Cadence, type Category, type Line, type LinePatch } from '../domain/types';
  import type { Cents } from '../domain/money';
  import { CADENCES, cadenceKeys } from '../domain/schedule';
  import { DUE_RULES, type DueRule } from '../domain/dueDates';
  import { CATEGORY_LABELS } from './bands';
  import AmountInput from './AmountInput.svelte';

  interface Props {
    line: Line;
    onpatch: (patch: LinePatch) => void;
    onkind: (kind: Line['kind']) => void;
    onremove: () => void;
    onclose: () => void;
  }
  const { line, onpatch, onkind, onremove, onclose }: Props = $props();

  const direction = $derived(directionOf(line.amount));

  function setDirection(next: string): void {
    onpatch({ amount: withSign(line.amount, next as Direction) });
  }

  /**
   * A refused value has to be written back to the input: the model did not
   * change, so nothing would re-render it and the field would sit there empty
   * while the line kept its old date.
   */
  function setDate(event: Event, field: 'anchor' | 'date' | 'from' | 'to'): void {
    const input = event.currentTarget as HTMLInputElement;
    const value = input.value;
    const optional = field === 'from' || field === 'to';

    if (value === '') {
      if (optional) onpatch({ [field]: undefined });
      else input.value = current(field);
      return;
    }
    if (!isPlainDate(value)) {
      input.value = current(field);
      return;
    }
    onpatch({ [field]: plainDate(value) });
  }

  function current(field: 'anchor' | 'date' | 'from' | 'to'): string {
    if (field === 'date') return line.kind === 'planned' ? line.date : '';
    if (line.kind !== 'recurring') return '';
    return field === 'anchor' ? line.anchor : (line[field] ?? '');
  }
  function setEstimate(isGuess: boolean): void {
    onpatch(
      isGuess
        ? { estimate: true, range: line.range ?? suggestedRange() }
        : { estimate: undefined, range: undefined }
    );
  }

  /** A first guess at how wrong the guess might be: a fifth either way. */
  function suggestedRange(): { low: Cents; high: Cents } {
    const spread = Math.round(Math.abs(line.amount) * 0.2);
    return isNegative(line.amount)
      ? { low: line.amount + spread, high: line.amount - spread }
      : { low: line.amount - spread, high: line.amount + spread };
  }

  /** Both ends keep the sign of the amount, and the amount stays between them. */
  function setRangeEnd(event: Event, end: 'low' | 'high'): void {
    const input = event.currentTarget as HTMLInputElement;
    const parsed = parseAmount(input.value);
    const range = line.range ?? suggestedRange();
    if (parsed === null) {
      input.value = (Math.abs(range[end]) / 100).toFixed(2);
      return;
    }
    const signed = withSign(parsed, directionOf(line.amount));
    const next = { ...range, [end]: signed };
    const inside = Math.min(next.low, next.high) <= line.amount && line.amount <= Math.max(next.low, next.high);
    if (!inside) {
      input.value = (Math.abs(range[end]) / 100).toFixed(2);
      return;
    }
    onpatch({ range: next });
  }
  /** A rate of nought — or an empty field — means the line simply does not rise. */
  function setRate(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const text = input.value.trim().replace('%', '');
    if (text === '') {
      onpatch({ indexation: undefined });
      return;
    }
    const percent = Number(text);
    if (!Number.isFinite(percent) || percent < 0) {
      input.value = line.kind === 'recurring' && line.indexation ? (line.indexation.ratePerYear / 100).toString() : '';
      return;
    }
    const ratePerYear = Math.round(percent * 100);
    if (ratePerYear === 0) {
      onpatch({ indexation: undefined });
      return;
    }
    const from = line.kind === 'recurring' ? (line.indexation?.from ?? line.anchor) : plainDate(fallback());
    onpatch({ indexation: { ratePerYear, from } });
  }

  function setRiseDate(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    if (line.kind !== 'recurring' || !line.indexation) return;
    if (!isPlainDate(input.value)) {
      input.value = line.indexation.from;
      return;
    }
    onpatch({ indexation: { ...line.indexation, from: plainDate(input.value) } });
  }

  function fallback(): string {
    return line.kind === 'planned' ? line.date : line.anchor;
  }

  function setKind(kind: string): void {
    if (kind !== line.kind) onkind(kind as Line['kind']);
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
      <input type="date" value={line.anchor} onchange={(event) => setDate(event, 'anchor')} />
    </label>
    <label class="field">
      <span>Starts (optional)</span>
      <input type="date" value={line.from ?? ''} onchange={(event) => setDate(event, 'from')} />
    </label>
    <label class="field">
      <span>Ends (optional)</span>
      <input type="date" value={line.to ?? ''} onchange={(event) => setDate(event, 'to')} />
    </label>
    <label class="field">
      <span>Money moves</span>
      <select
        value={line.dueRule ?? 'exact'}
        onchange={(event) => {
          const rule = (event.currentTarget as HTMLSelectElement).value as DueRule;
          onpatch({ dueRule: rule === 'exact' ? undefined : rule });
        }}
      >
        {#each Object.entries(DUE_RULES) as [rule, spec] (rule)}
          <option value={rule}>{spec.label}</option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span>Rises % a year</span>
      <input
        type="text"
        inputmode="decimal"
        class="mono"
        value={line.indexation ? (line.indexation.ratePerYear / 100).toString() : ''}
        placeholder="0"
        onchange={(event) => setRate(event)}
      />
    </label>
    <label class="field">
      <span>Rising from</span>
      <input
        type="date"
        value={line.indexation?.from ?? ''}
        disabled={!line.indexation}
        onchange={(event) => setRiseDate(event)}
      />
    </label>
  {:else}
    <label class="field">
      <span>On</span>
      <input type="date" value={line.date} onchange={(event) => setDate(event, 'date')} />
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

  {#if line.estimate && line.range}
    <div class="field">
      <span>Could be as little as</span>
      <input
        type="text"
        inputmode="decimal"
        class="mono"
        value={(Math.abs(line.range.low) / 100).toFixed(2)}
        onchange={(event) => setRangeEnd(event, 'low')}
        aria-label="Smallest this could be"
      />
    </div>
    <div class="field">
      <span>Or as much as</span>
      <input
        type="text"
        inputmode="decimal"
        class="mono"
        value={(Math.abs(line.range.high) / 100).toFixed(2)}
        onchange={(event) => setRangeEnd(event, 'high')}
        aria-label="Largest this could be"
      />
    </div>
    <p class="note">The forecast draws a band between these two, and warns you from the worse edge.</p>
  {/if}

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
  .note {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 11.5px;
    color: var(--ink-3);
  }
  .actions {
    grid-column: 1 / -1;
    display: flex;
    gap: 8px;
    justify-content: space-between;
  }
</style>
