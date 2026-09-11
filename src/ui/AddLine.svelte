<script lang="ts">
  import { isPlainDate, plainDate } from '../domain/dates';
  import { parseAmount } from '../domain/money';
  import { CADENCES, cadenceKeys } from '../domain/schedule';
  import { CATEGORIES, type Cadence, type Category, type Line } from '../domain/types';
  import { CATEGORY_LABELS } from './bands';

  interface Props {
    /** Where a new one-off lands if no date is typed. */
    defaultDate: string;
    onadd: (line: Line) => void;
  }
  const { defaultDate, onadd }: Props = $props();

  let label = $state('');
  let amount = $state('');
  let direction = $state<'in' | 'out'>('out');
  let repeats = $state<Cadence | 'once'>('monthly');
  let dateDraft = $state<string | null>(null);
  const date = $derived(dateDraft ?? defaultDate);
  let category = $state<Category>('living');
  /* A number input bound with bind:value hands over a number, or null when the
     field is empty — not a string. */
  let times = $state<number | null>(null);
  let error = $state<string | null>(null);

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    const cents = parseAmount(amount);
    if (cents === null || cents === 0) {
      error = 'Type an amount, for example 42.50';
      return;
    }
    if (!isPlainDate(date)) {
      error = 'Pick the date it falls on';
      return;
    }
    error = null;
    const size = Math.abs(cents);
    const shared = {
      id: `own-${Date.now().toString(36)}`,
      label: label.trim() === '' ? 'New line' : label.trim(),
      amount: direction === 'in' ? size : -size,
      category
    };
    /* A one-off has no count at all, so a stale number left behind by switching
       away from "repeats" must not block the form with a field nobody can see. */
    const count = repeats === 'once' || times === null ? undefined : times;
    if (count !== undefined && (!Number.isInteger(count) || count < 1)) {
      error = 'How many times must be a whole number, or left empty to repeat for ever';
      return;
    }

    onadd(
      repeats === 'once'
        ? { ...shared, kind: 'planned', date: plainDate(date) }
        : {
            ...shared,
            kind: 'recurring',
            cadence: repeats,
            anchor: plainDate(date),
            ...(count === undefined ? {} : { times: count })
          }
    );
    label = '';
    amount = '';
    times = null;
    dateDraft = null;
  }
</script>

<form onsubmit={submit} class="no-print">
  <input type="text" placeholder="What is it? e.g. Piano lessons" bind:value={label} aria-label="What is it" />
  <input type="text" inputmode="decimal" placeholder="Amount" bind:value={amount} aria-label="Amount" class="mono" />
  <select bind:value={direction} aria-label="Direction">
    <option value="out">goes out</option>
    <option value="in">comes in</option>
  </select>
  <select bind:value={repeats} aria-label="How often">
    {#each cadenceKeys() as key (key)}
      <option value={key}>{CADENCES[key].label}</option>
    {/each}
    <option value="once">once only</option>
  </select>
  <input
    type="date"
    value={date}
    oninput={(event) => (dateDraft = (event.currentTarget as HTMLInputElement).value)}
    aria-label="First date"
  />
  {#if repeats !== 'once'}
    <input type="number" min="1" max="600" bind:value={times} placeholder="how many times" aria-label="How many times" class="mono" />
  {/if}
  <select bind:value={category} aria-label="Counts as">
    {#each CATEGORIES as key (key)}
      <option value={key}>{CATEGORY_LABELS[key]}</option>
    {/each}
  </select>
  <button type="submit" class="button">Add it to the river</button>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</form>

<style>
  form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px;
  }
  input[type='text']:first-child,
  button,
  .error {
    grid-column: 1 / -1;
  }
  .error {
    margin: 2px 0 0;
    font-size: 12.5px;
    color: var(--critical);
  }
</style>
