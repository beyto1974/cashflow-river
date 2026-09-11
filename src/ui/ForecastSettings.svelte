<script lang="ts">
  import { isPlainDate, plainDate, type PlainDate } from '../domain/dates';
  import { formatEUR, parseAmount, type Cents } from '../domain/money';

  interface Props {
    buffer: Cents;
    asOf: PlainDate;
    horizonMonths: number;
    onbuffer: (buffer: Cents) => void;
    onasof: (date: PlainDate) => void;
    onhorizon: (months: number) => void;
  }
  const { buffer, asOf, horizonMonths, onbuffer, onasof, onhorizon }: Props = $props();

  function setBuffer(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const parsed = parseAmount(input.value);
    if (parsed === null) input.value = (buffer / 100).toFixed(0);
    else onbuffer(Math.abs(parsed));
  }
  function setAsOf(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    if (isPlainDate(input.value)) onasof(plainDate(input.value));
    else input.value = asOf;
  }
</script>

<div class="fields">
  <label>
    <span>Buffer to keep</span>
    <input type="text" inputmode="decimal" class="mono" value={(buffer / 100).toFixed(0)} onchange={setBuffer} />
    <small>The floor you want to stay above. Everything under it counts as a tight day.</small>
  </label>
  <label>
    <span>Forecast starts on</span>
    <input type="date" value={asOf} onchange={setAsOf} />
    <small>Moving this forward folds what has fallen due since into the balance.</small>
  </label>
  <label>
    <span>Months ahead</span>
    <input
      type="number"
      min="1"
      max="120"
      class="mono"
      value={horizonMonths}
      onchange={(event) => onhorizon(Number((event.currentTarget as HTMLInputElement).value))}
    />
    <small>How far the river and the grid run. Currently {formatEUR(buffer, { cents: false })} buffer over {horizonMonths} months.</small>
  </label>
</div>

<style>
  .fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  label {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 120px;
    align-items: baseline;
    gap: 2px 10px;
  }
  span {
    font-size: 13.5px;
  }
  small {
    grid-column: 1 / -1;
    font-size: 11.5px;
    color: var(--ink-3);
  }
</style>
