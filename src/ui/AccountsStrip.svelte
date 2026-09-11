<script lang="ts">
  import type { Account } from '../domain/types';
  import AmountInput from './AmountInput.svelte';
  import ConfirmButton from './ConfirmButton.svelte';

  interface Props {
    accounts: Account[];
    onpatch: (id: string, patch: Partial<Account>) => void;
    onadd: () => void;
    onremove: (id: string) => void;
  }
  const { accounts, onpatch, onadd, onremove }: Props = $props();
</script>

<div>
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
        sign="typed"
        onchange={(balance) => onpatch(account.id, { balance })}
      />
      <label class="count no-print" title="Count this account in the forecast">
        <input
          type="checkbox"
          checked={account.inForecast}
          onchange={(event) => onpatch(account.id, { inForecast: (event.currentTarget as HTMLInputElement).checked })}
        />
        <span class="sr">Count {account.name} in the forecast</span>
      </label>
      <span class="drop no-print">
        <ConfirmButton
          label="×"
          confirm={`Remove ${account.name}`}
          onconfirm={() => onremove(account.id)}
          disabled={accounts.length === 1}
          title={accounts.length === 1 ? 'The last account stays' : `Remove ${account.name}`}
          small
        />
      </span>
    </div>
  {/each}

  <button type="button" class="button ghost add no-print" onclick={onadd}>Add an account</button>
  <p class="hint no-print">Untick an account to hold it outside the forecast — a savings pot you are not spending from.
    A balance can be negative: type <span class="mono">-320.50</span> for an account in the red.</p>
</div>

<style>
  .account {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 84px 22px auto;
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
    display: inline-flex;
    justify-content: flex-end;
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
