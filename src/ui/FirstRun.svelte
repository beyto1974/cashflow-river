<script lang="ts">
  interface Props {
    ondismiss: () => void;
  }
  const { ondismiss }: Props = $props();
</script>

<aside class="note no-print" aria-labelledby="first-run-heading">
  <h2 id="first-run-heading">Before you type your own figures</h2>
  <p>
    Everything you enter is kept <strong>in this browser only</strong> — nothing is sent anywhere, and there is no
    account. That also means clearing this site's data, or opening the app in another browser, starts from the example
    again.
  </p>
  <p>
    So take a copy when it matters: the <strong>gear, top right</strong> holds <em>Export a file</em> and
    <em>Copy as text</em>, and either can be imported back here or into another browser. Every change also keeps a
    version you can restore from, in the same place.
  </p>
  <button type="button" class="button" onclick={ondismiss}>Understood — start from the example</button>
</aside>

<style>
  .note {
    margin-top: 14px;
    border: 1px solid var(--rule);
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    background: var(--sheet);
    padding: 12px 14px 14px;
    max-width: 70ch;
  }
  h2 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 6px;
  }
  p {
    margin: 0 0 8px;
    font-size: 13px;
    color: var(--ink-2);
  }
  strong {
    color: var(--ink);
    font-weight: 600;
  }
  em {
    font-style: normal;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    color: var(--ink);
  }
</style>
