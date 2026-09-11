<script lang="ts">
  import { formatSpec } from '../persistence/formatSpec';

  const spec = formatSpec();
  let copied = $state<string | null>(null);

  async function copy(what: 'spec' | 'example'): Promise<void> {
    const text = what === 'spec' ? `${spec.text}\n\nA complete example:\n\n${spec.example}` : spec.example;
    try {
      await navigator.clipboard.writeText(text);
      copied = what === 'spec' ? 'Format copied — paste it to a model with your situation' : 'Example copied';
    } catch {
      copied = 'This browser would not let the page copy. Select the text below instead.';
    }
  }
</script>

<details class="no-print">
  <summary>The file format, for writing one by hand or with a model</summary>

  <p class="lead">
    Paste this to a model along with your own situation — "here is the format, I earn this, I pay that" — and import
    what it writes. Everything here is generated from the same constants the importer validates against, so it cannot
    drift out of date.
  </p>

  <div class="row">
    <button type="button" class="button ghost" onclick={() => copy('spec')}>Copy the format</button>
    <button type="button" class="button ghost" onclick={() => copy('example')}>Copy the example</button>
  </div>
  {#if copied}<p class="note">{copied}</p>{/if}

  <pre>{spec.text}</pre>
  <p class="eyebrow">A complete file, ready to import</p>
  <pre class="example">{spec.example}</pre>
</details>

<style>
  details {
    margin-top: 12px;
    border-top: 1px solid var(--hair);
    padding-top: 8px;
  }
  summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--ink-3);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .lead {
    font-size: 12.5px;
    color: var(--ink-2);
    margin: 8px 0;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .note {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--accent);
  }
  pre {
    margin: 8px 0 0;
    max-height: 320px;
    overflow: auto;
    background: var(--sheet-2);
    border: 1px solid var(--hair);
    border-radius: 4px;
    padding: 8px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    line-height: 1.45;
    white-space: pre;
    tab-size: 2;
  }
  pre.example {
    max-height: 260px;
  }
  .eyebrow {
    margin: 10px 0 0;
  }
</style>
