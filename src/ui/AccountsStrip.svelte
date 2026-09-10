<script lang="ts">
  import { formatEUR, type Cents } from '../domain/money';
  import type { Account } from '../domain/types';
  import AmountInput from './AmountInput.svelte';

  interface Props {
    accounts: Account[];
    opening: Cents;
    onpatch: (id: string, patch: Partial<Account>) => void;
    onadd: () => void;
    onremove: (id: string) => void;
  }
  const { accounts, opening, onpatch, onadd, onremove }: Props = $props();
</script>

<section>
  <div class="head">
    <h2>What you have now</h2>
    <span class="total mono" title="The accounts counted in the forecast">{formatEUR(opening)}</span>
  </div>

  {#each accounts as account (account.id)}
    <div class="account" class:out={!account.inForecast}>
      <input
        type="text"
        value={account.name}
        aria-label="Account name"
        oninput={(event) => onpatch(account.id, { name: (event.currentTarget as HTMLInputElement).value })}
      />
      <AmountInput
        value={account.balance}
        label={`${account.name} balance`}
        onchange={(balance) => onpatch(account.id, { balance })}
      />
      <label class="count" title="Count this account in the forecast">
        <input
          type="checkbox"
          checked={account.inForecast}
          onchange={(event) => onpatch(account.id, { inForecast: (event.currentTarget as HTMLInputElement).checked })}
        />
        <span class="sr">Count {account.name} in the forecast</span>
      </label>
      <button
        type="button"
        class="drop"
        onclick={() => onremove(account.id)}
        disabled={accounts.length === 1}
        aria-label={`Remove ${account.name}`}>×</button
      >
    </div>
  {/each}

  <button type="button" class="button ghost add" onclick={onadd}>Add an account</button>
  <p class="hint">Untick an account to hold it outside the forecast — a savings pot you are not spending from.</p>
</section>

<style>
  section {
    border-top: 1px solid var(--ink);
    padding-top: 8px;
  }
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  h2 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 6px;
  }
  .total {
    font-size: 13px;
    font-weight: 600;
  }
  .account {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 84px 22px 18px;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
    border-bottom: 1px solid var(--hair);
  }
  .account.out input[type='text'] {
    color: var(--ink-3);
  }
  .count input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
  }
  .drop {
    background: none;
    border: 0;
    color: var(--ink-3);
    font-size: 15px;
    line-height: 1;
    padding: 0;
  }
  .drop:hover:not(:disabled) {
    color: var(--critical);
  }
  .drop:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .add {
    margin-top: 8px;
  }
  .hint {
    font-size: 11.5px;
    color: var(--ink-3);
    margin: 6px 0 0;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
