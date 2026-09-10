<script lang="ts">
  import { formatEUR, isNegative, parseAmount, type Cents } from '../domain/money';

  interface Props {
    value: Cents;
    label: string;
    onchange: (value: Cents) => void;
    /**
     * 'keep' holds the sign of the current value, because a direction control
     * owns it. 'typed' takes the sign from what is typed, for a balance that
     * can genuinely be negative.
     */
    sign?: 'keep' | 'typed';
    id?: string;
    align?: 'left' | 'right';
  }
  const { value, label, onchange, sign = 'keep', id, align = 'right' }: Props = $props();

  const text = $derived(((sign === 'typed' ? value : Math.abs(value)) / 100).toFixed(2));
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
    onchange(sign === 'typed' ? cents : isNegative(value) ? -Math.abs(cents) : Math.abs(cents));
  }

  /** Leaving the field with something unreadable in it puts the amount back. */
  function settle(event: Event): void {
    commit(event);
    if (invalid) {
      invalid = false;
      draft = null;
    }
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
  onblur={settle}
/>

<style>
  input {
    width: 100%;
  }
  input[aria-invalid='true'] {
    border-color: var(--critical);
  }
</style>
