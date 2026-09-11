<script lang="ts">
  import type { Revision } from '../persistence/ports';
  import Ledgers from './Ledgers.svelte';

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
  const props: Props = $props();

  let panel = $state<HTMLDialogElement | null>(null);

  function open(): void {
    panel?.showModal();
  }
  function close(): void {
    panel?.close();
  }
  /* Clicking the backdrop lands on the dialog itself, never on its contents. */
  function maybeClose(event: MouseEvent): void {
    if (event.target === panel) close();
  }
</script>

<button type="button" class="gear no-print" onclick={open} aria-label="Ledgers and settings" title="Ledgers and settings">
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.7-1L15 3.5h-4l-.4 2.6c-.6.2-1.2.6-1.7 1l-2.3-1-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-1c.5.4 1.1.8 1.7 1l.4 2.6h4l.4-2.6c.6-.2 1.2-.6 1.7-1l2.3 1 2-3.4-2-1.5Z"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linejoin="round"
    />
  </svg>
</button>

<dialog bind:this={panel} onclick={maybeClose} class="no-print">
  <div class="sheet">
    <header>
      <h2>Ledgers and settings</h2>
      <button type="button" class="button ghost" onclick={close}>Done</button>
    </header>
    <Ledgers {...props} />
  </div>
</dialog>

<style>
  .gear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: var(--sheet);
    color: var(--ink-2);
  }
  .gear:hover {
    color: var(--ink);
    border-color: var(--ink-3);
  }
  dialog {
    border: 1px solid var(--rule);
    border-radius: 12px;
    background: var(--paper);
    color: var(--ink);
    padding: 0;
    max-width: min(560px, 94vw);
    width: 100%;
    max-height: 86vh;
    overflow: auto;
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.45);
  }
  .sheet {
    padding: 16px 18px 20px;
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  h2 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.35rem;
    font-weight: 600;
    margin: 0;
  }
</style>
