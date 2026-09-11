<script lang="ts">
  interface Props {
    /** What the button says at rest. */
    label: string;
    /** What it says once it wants confirming — name the thing being destroyed. */
    confirm: string;
    onconfirm: () => void;
    disabled?: boolean;
    title?: string;
    small?: boolean;
  }
  const { label, confirm, onconfirm, disabled = false, title, small = false }: Props = $props();

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
</script>

{#if asking}
  <span class="pair">
    <button
      type="button"
      class="button danger"
      class:small
      onclick={() => {
        disarm();
        onconfirm();
      }}
    >
      {confirm}
    </button>
    <button type="button" class="button ghost" class:small onclick={disarm}>Keep it</button>
  </span>
{:else}
  <button type="button" class="button ghost" class:small {disabled} {title} onclick={arm}>{label}</button>
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
