<script lang="ts">
  import type { WhatIf } from '../domain/whatIf';

  interface Props {
    dials: WhatIf;
    touched: boolean;
    onset: (dial: keyof WhatIf, value: number) => void;
    onreset: () => void;
    onkeep: () => void;
  }
  const { dials, touched, onset, onreset, onkeep }: Props = $props();

  const SLIDERS: { key: keyof WhatIf; label: string; min: number; max: number }[] = [
    { key: 'income', label: 'Everything coming in', min: 60, max: 130 },
    { key: 'daily', label: 'Day to day and the car', min: 60, max: 150 },
    { key: 'saving', label: 'Transfers to savings', min: 0, max: 150 }
  ];

  /* A drag fires an input event per pixel. One recompute per frame is plenty,
     and the projection costs about five milliseconds. */
  let pending: Partial<Record<keyof WhatIf, number>> = {};
  let frame = 0;

  function drop(): void {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    pending = {};
  }

  function schedule(dial: keyof WhatIf, value: number): void {
    pending[dial] = value;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const queued = pending;
      pending = {};
      for (const key of Object.keys(queued) as (keyof WhatIf)[]) onset(key, queued[key] as number);
    });
  }

  /* Baking the dials in or putting them back returns them to neutral. A frame
     queued by the drag's last input event would otherwise fire afterwards and
     apply the same change a second time, on top of itself. Cancelling only on
     the way to neutral leaves a live drag alone — cancelling on every change
     would swallow the last value of a quick flick. */
  $effect(() => {
    if (!touched) drop();
  });
  $effect(() => drop);

  function reading(value: number): string {
    if (value === 1) return 'as it is';
    return `${value > 1 ? '+' : ''}${Math.round((value - 1) * 100)}%`;
  }
</script>

<div class="no-print">
  <p class="hint">These dials sit over your ledger without changing it. The lines on the left stay as you typed them.</p>

  {#each SLIDERS as slider (slider.key)}
    <div class="slider">
      <label for={`dial-${slider.key}`}>{slider.label}</label>
      <span class="read">{reading(dials[slider.key])}</span>
      <input
        id={`dial-${slider.key}`}
        type="range"
        min={slider.min}
        max={slider.max}
        step="5"
        value={Math.round(dials[slider.key] * 100)}
        oninput={(event) => schedule(slider.key, Number((event.currentTarget as HTMLInputElement).value) / 100)}
      />
    </div>
  {/each}

  {#if touched}
    <div class="actions">
      <button type="button" class="button ghost" onclick={onreset}>Put the dials back</button>
      <button type="button" class="button" onclick={onkeep}>Keep these figures</button>
    </div>
  {/if}
</div>

<style>
  .hint {
    font-size: 11.5px;
    color: var(--ink-3);
    margin: 0 0 8px;
  }
  .slider {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 10px;
    align-items: center;
    margin-bottom: 8px;
  }
  label {
    font-size: 13px;
  }
  .read {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--accent);
  }
  input[type='range'] {
    grid-column: 1 / -1;
    width: 100%;
    accent-color: var(--accent);
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
</style>
