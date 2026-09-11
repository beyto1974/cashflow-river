<script lang="ts">
  import type { Theme } from '../persistence/preferences';
  import { applyTheme } from './theme';

  interface Props {
    theme: Theme;
    onset: (theme: Theme) => void;
  }
  const { theme, onset }: Props = $props();

  const CHOICES: { key: Theme; label: string; title: string }[] = [
    { key: 'auto', label: 'Auto', title: 'Follow the light or dark setting of this device' },
    { key: 'light', label: 'Light', title: 'Always light' },
    { key: 'dark', label: 'Dark', title: 'Always dark' }
  ];

  $effect(() => applyTheme(theme));
</script>

<div class="themes no-print" role="group" aria-label="Theme">
  {#each CHOICES as choice (choice.key)}
    <button
      type="button"
      class:on={theme === choice.key}
      aria-pressed={theme === choice.key}
      title={choice.title}
      onclick={() => onset(choice.key)}
    >
      {choice.label}
    </button>
  {/each}
</div>

<style>
  .themes {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    background: var(--sheet-2);
    border: 1px solid var(--rule);
    border-radius: 999px;
  }
  .themes button {
    font-size: 11.5px;
    color: var(--ink-2);
    background: none;
    border: 0;
    border-radius: 999px;
    padding: 3px 9px;
  }
  .themes button.on {
    background: var(--ink);
    color: var(--paper);
    font-weight: 600;
  }
</style>
