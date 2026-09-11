<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    /** The figure that belongs beside the heading — a subtotal, a rhythm. */
    note?: string | undefined;
    /** How many rows are inside, shown while folded as well as open. */
    count?: number | undefined;
    folded: boolean;
    ontoggle: () => void;
    children: Snippet;
  }
  const { title, note, count, folded, ontoggle, children }: Props = $props();
</script>

<section class="group">
  <div class="head">
    <button type="button" class="fold" aria-expanded={!folded} onclick={ontoggle}>
      <span class="chevron" aria-hidden="true">{folded ? '▸' : '▾'}</span>
      <h2>{title}</h2>
      {#if count !== undefined}<span class="count">{count}</span>{/if}
    </button>
    {#if note}<span class="note mono">{note}</span>{/if}
  </div>
  {#if !folded}
    {@render children()}
  {/if}
</section>

<style>
  .group {
    border-top: 1px solid var(--ink);
    padding-top: 8px;
  }
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .fold {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    background: none;
    border: 0;
    padding: 0;
    color: inherit;
    text-align: left;
  }
  .fold:hover h2 {
    text-decoration: underline;
  }
  h2 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 6px;
  }
  .chevron {
    color: var(--ink-3);
    font-size: 11px;
  }
  .count {
    font-size: 11.5px;
    color: var(--ink-3);
  }
  .note {
    font-size: 12.5px;
    color: var(--ink-2);
    font-weight: 500;
  }
</style>
