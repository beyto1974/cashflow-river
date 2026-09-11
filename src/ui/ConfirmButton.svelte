<script lang="ts">
  interface Props {
    /** What the button says at rest. */
    label: string;
    /** What it says once it wants confirming — name the thing being destroyed. */
    confirm: string;
    onconfirm: () => void;
    /** Spoken name, for a button whose label is a symbol. */
    describe?: string | undefined;
    disabled?: boolean;
    title?: string | undefined;
    small?: boolean;
  }
  const { label, confirm, onconfirm, describe, disabled = false, title, small = false }: Props = $props();

  let asking = $state(false);
  let timer = 0;

  /* Left armed forever, the next click on a nearby control lands on "Really?".
     Twelve seconds is long enough to read it and short enough to forget. */
  function arm(): void {
    asking = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => (asking = false), 12_000) as unknown as number;
  }
  function disarm(): void {
    asking = false;
    if (timer) clearTimeout(timer);
    timer = 0;
  }
  $effect(() => disarm);
  /* A guarded action must stay guarded once armed: two rows can both be armed,
     and confirming one can be what disables the other. */
  $effect(() => {
    if (disabled) disarm();
  });
</script>

{#if asking}
  <span class="pair">
    <button
      type="button"
      class="button danger"
      class:small
      {disabled}
      onclick={() => {
        disarm();
        if (!disabled) onconfirm();
      }}
    >
      {confirm}
    </button>
    <button type="button" class="button ghost" class:small onclick={disarm}>Keep it</button>
  </span>
{:else}
  <button
    type="button"
    class="button ghost"
    class:small
    {disabled}
    {title}
    aria-label={describe ?? undefined}
    onclick={arm}>{label}</button
  >
{/if}

<style>
  .pair {
    display: inline-flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .button.small {
    font-size: 12px;
    padding: 2px 8px;
  }
</style>
