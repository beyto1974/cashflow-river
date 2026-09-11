<script lang="ts">
  import type { Revision } from '../persistence/ports';
  import FormatDocs from './FormatDocs.svelte';

  interface Props {
    names: string[];
    current: string;
    history: Revision[];
    onselect: (name: string) => void;
    onsaveas: (name: string) => boolean;
    onremove: (name: string) => void;
    onrestore: (revision: number) => void;
    onexport: () => string;
    onimport: (text: string) => string[];
  }
  const {
    names, current, history, onselect, onsaveas, onremove, onrestore, onexport, onimport
  }: Props = $props();

  let newName = $state('');
  let error = $state<string | null>(null);

  const stamp = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  function when(savedAt: string): string {
    const parsed = Date.parse(savedAt);
    return Number.isNaN(parsed) ? savedAt : stamp.format(new Date(parsed));
  }

  let transferNote = $state<string | null>(null);
  let transferError = $state<string | null>(null);
  let pasted = $state('');
  let showPaste = $state(false);

  function fileName(): string {
    return `moraview-${new Date().toISOString().slice(0, 10)}.json`;
  }

  /** A download where the page is allowed one, the clipboard where it is not. */
  function download(): void {
    transferError = null;
    const url = URL.createObjectURL(new Blob([onexport()], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName();
    link.click();
    URL.revokeObjectURL(url);
    transferNote = `Saved as ${fileName()}`;
  }

  async function copy(): Promise<void> {
    transferError = null;
    try {
      await navigator.clipboard.writeText(onexport());
      transferNote = 'Copied — paste it somewhere safe';
    } catch {
      transferError = 'This browser would not let the page copy. Use the file instead.';
    }
  }

  function take(text: string): void {
    try {
      const added = onimport(text);
      transferNote = `Imported ${added.join(', ')}`;
      transferError = null;
      pasted = '';
      showPaste = false;
    } catch (problem) {
      transferError = problem instanceof Error ? problem.message : 'That file could not be read.';
      transferNote = null;
    }
  }

  async function chooseFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) take(await file.text());
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

  <div class="transfer">
    <p class="eyebrow">Keep a copy off this browser</p>
    <div class="row">
      <button type="button" class="button ghost" onclick={download}>Export a file</button>
      <button type="button" class="button ghost" onclick={copy}>Copy as text</button>
    </div>
    <div class="row">
      <label class="button ghost file">
        Import a file
        <input type="file" accept="application/json,.json" onchange={chooseFile} />
      </label>
      <button type="button" class="button ghost" onclick={() => (showPaste = !showPaste)}>
        {showPaste ? 'Never mind' : 'Paste text'}
      </button>
    </div>
    {#if showPaste}
      <textarea bind:value={pasted} rows="4" placeholder="Paste an exported ledger here" aria-label="Exported ledger text"
      ></textarea>
      <button type="button" class="button" onclick={() => take(pasted)} disabled={pasted.trim() === ''}>
        Import what is pasted
      </button>
    {/if}
    {#if transferError}<p class="error" role="alert">{transferError}</p>{/if}
    {#if transferNote}<p class="note">{transferNote}</p>{/if}
    <p class="hint">
      An import never overwrites: a name that is taken comes in beside it, so you can delete whichever you do not want.
    </p>
    <FormatDocs />
  </div>

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
  .transfer {
    margin-top: 12px;
    border-top: 1px solid var(--hair);
    padding-top: 8px;
  }
  .transfer .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-top: 6px;
  }
  .file {
    position: relative;
    overflow: hidden;
    text-align: center;
  }
  .file input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  textarea {
    width: 100%;
    margin-top: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    border: 1px solid var(--rule);
    border-radius: 4px;
    background: var(--sheet);
    color: var(--ink);
    padding: 6px;
    resize: vertical;
  }
  .note {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--accent);
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
