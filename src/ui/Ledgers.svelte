<script lang="ts">
  import type { Revision } from '../persistence/ports';

  interface Props {
    names: string[];
    current: string;
    history: Revision[];
    onselect: (name: string) => void;
    onsaveas: (name: string) => boolean;
    onremove: (name: string) => void;
    onrestore: (revision: number) => void;
  }
  const { names, current, history, onselect, onsaveas, onremove, onrestore }: Props = $props();

  let newName = $state('');
  let error = $state<string | null>(null);

  const stamp = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  function when(savedAt: string): string {
    const parsed = Date.parse(savedAt);
    return Number.isNaN(parsed) ? savedAt : stamp.format(new Date(parsed));
  }

  function saveAs(event: SubmitEvent): void {
    event.preventDefault();
    if (newName.trim() === '') {
      error = 'Give the copy a name';
      return;
    }
    if (!onsaveas(newName)) {
      error = 'There is already a ledger with that name';
      return;
    }
    error = null;
    newName = '';
  }
</script>

<section class="group no-print">
  <h2>Ledgers</h2>
  <p class="hint">Keep the household's own figures and the variants worth keeping side by side.</p>

  <div class="pick">
    <label for="ledger-pick" class="sr">Which ledger</label>
    <select id="ledger-pick" value={current} onchange={(event) => onselect((event.currentTarget as HTMLSelectElement).value)}>
      {#each names as name (name)}
        <option value={name}>{name}</option>
      {/each}
    </select>
    <button
      type="button"
      class="button ghost"
      onclick={() => onremove(current)}
      disabled={names.length === 1}
      title={names.length === 1 ? 'The last ledger stays' : `Delete ${current}`}
    >
      Delete
    </button>
  </div>

  <form onsubmit={saveAs}>
    <input type="text" bind:value={newName} placeholder="Copy it as… e.g. If Sam goes part time" aria-label="Name for the copy" />
    <button type="submit" class="button ghost">Save a copy</button>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </form>

  {#if history.length > 0}
    <details>
      <summary>Earlier versions ({history.length})</summary>
      <ul>
        {#each history as entry (entry.revision)}
          <li>
            <span>Version {entry.revision} · {when(entry.savedAt)}</span>
            <button type="button" class="button ghost small" onclick={() => onrestore(entry.revision)}>Restore</button>
          </li>
        {/each}
      </ul>
      <p class="hint">Restoring saves a new version, so nothing is lost by trying one.</p>
    </details>
  {/if}
</section>

<style>
  .group {
    border-top: 1px solid var(--ink);
    padding-top: 8px;
  }
  h2 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 6px;
  }
  .hint {
    font-size: 11.5px;
    color: var(--ink-3);
    margin: 4px 0 8px;
  }
  .pick {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
  }
  form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
    margin-top: 8px;
  }
  .error {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 12px;
    color: var(--critical);
  }
  details {
    margin-top: 10px;
  }
  summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--ink-3);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  ul {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 3px 0;
    border-bottom: 1px solid var(--hair);
    font-size: 12.5px;
  }
  .button.small {
    font-size: 12px;
    padding: 2px 8px;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
