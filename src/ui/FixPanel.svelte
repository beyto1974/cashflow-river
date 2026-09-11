<script lang="ts">
  import type { Fix } from '../domain/fixes';

  interface Props {
    /** Searching runs a projection per candidate, so it only happens on a click. */
    find: () => Fix[];
    apply: (fix: Fix) => void;
    /** How many tight stretches there are to fix. */
    stretches: number;
  }
  const { find, apply, stretches }: Props = $props();

  let fixes = $state<Fix[] | null>(null);
  let searching = $state(false);

  function search(): void {
    searching = true;
    /* Let the button's pressed state paint before the search blocks. */
    requestAnimationFrame(() => {
      fixes = find();
      searching = false;
    });
  }
</script>

<section>
  {#if fixes === null}
    <button type="button" class="button ghost" onclick={search} disabled={searching}>
      {searching ? 'Looking…' : `What would fix ${stretches > 1 ? 'the first one' : 'it'}?`}
    </button>
  {:else if fixes.length === 0}
    <p class="none">
      Nothing I can change on a single line clears it. It would take more than one move — spending less on
      several lines, or bringing money in.
    </p>
    <button type="button" class="button ghost" onclick={search}>Look again</button>
  {:else}
    <p class="eyebrow">Smallest changes that clear it</p>
    <ul>
      {#each fixes as fix (fix.description)}
        <li>
          <span class="what">
            {fix.description}
            {#if fix.clearsAll}<b class="all">clears every tight stretch</b>{/if}
          </span>
          <button type="button" class="button" onclick={() => { apply(fix); fixes = null; }}>Do it</button>
        </li>
      {/each}
    </ul>
    <button type="button" class="button ghost" onclick={() => (fixes = null)}>Never mind</button>
  {/if}
</section>

<style>
  section {
    margin-top: 12px;
  }
  ul {
    list-style: none;
    margin: 6px 0 8px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 70ch;
  }
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 0;
    border-bottom: 1px solid var(--hair);
    font-size: 13.5px;
  }
  .what {
    min-width: 0;
  }
  .all {
    display: inline-block;
    margin-left: 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--s-benefit);
  }
  .none {
    font-size: 13px;
    color: var(--ink-2);
    max-width: 66ch;
    margin: 0 0 8px;
  }
</style>
