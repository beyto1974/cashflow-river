<script lang="ts">
  import { formatEUR, parseAmount, type Cents } from '../domain/money';

  interface Props {
    value: Cents;
    label: string;
    /** Keeps the sign of the current value; direction is chosen elsewhere. */
    onchange: (value: Cents) => void;
    id?: string;
    align?: 'left' | 'right';
  }
  const { value, label, onchange, id, align = 'right' }: Props = $props();

  const text = $derived((Math.abs(value) / 100).toFixed(2));
  let draft = $state<string | null>(null);
  let invalid = $state(false);

  function commit(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const cents = parseAmount(input.value);
    if (cents === null) {
      invalid = true;
      return;
    }
    invalid = false;
    draft = null;
    onchange(value < 0 ? -Math.abs(cents) : Math.abs(cents));
  }
</script>

<input
  {id}
  type="text"
  inputmode="decimal"
  class="mono"
  style:text-align={align}
  aria-label={label}
  aria-invalid={invalid}
  title={formatEUR(value)}
  value={draft ?? text}
  oninput={(event) => (draft = (event.currentTarget as HTMLInputElement).value)}
  onchange={commit}
  onblur={commit}
/>

<style>
  input {
    width: 100%;
  }
  input[aria-invalid='true'] {
    border-color: var(--critical);
  }
</style>
