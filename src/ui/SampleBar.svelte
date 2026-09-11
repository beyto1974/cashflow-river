<script lang="ts">
  interface Props {
    /** Clears the example away. No confirmation: there is nothing of theirs to lose. */
    onclear: () => void;
  }
  const { onclear }: Props = $props();
</script>

<!-- An aside rather than a live region: it is there from the first paint and
     never changes, so it belongs in the reading order, not in an announcement. -->
<aside class="bar no-print" aria-label="Example data">
  <span class="tag">Example figures</span>
  <p>
    This is a made-up household<span class="aside">, so there is something to read</span>. Type over any line to
    make the ledger yours, or
  </p>
  <button type="button" class="button" onclick={onclear}>clear the example</button>
</aside>

<style>
  /* Sticky rather than dismissible: it goes by itself the moment the ledger
     stops being the example, which is the only thing that should make it go. */
  .bar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    margin: 0 -20px 10px;
    padding: 8px 20px;
    background: color-mix(in oklab, var(--warning) 16%, var(--paper));
    border-bottom: 1px solid color-mix(in oklab, var(--warning) 45%, var(--rule));
    font-size: 13px;
  }
  .tag {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--tight-ink, var(--ink));
    background: var(--warning);
    border-radius: 3px;
    padding: 1px 5px;
    white-space: nowrap;
  }
  p {
    margin: 0;
    color: var(--ink-2);
  }
  .button {
    font-size: 12.5px;
    padding: 3px 10px;
  }
  /* Tighter on a phone, where two notices at once would fill the screen. */
  @media screen and (max-width: 620px) {
    .bar {
      gap: 4px 8px;
      padding: 6px 20px;
      font-size: 12px;
    }
    .aside {
      display: none;
    }
    .button {
      font-size: 12px;
      padding: 2px 8px;
    }
  }
</style>
