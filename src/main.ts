import './ui/app.css';
import { mount } from 'svelte';
import App from './ui/App.svelte';
import { createLedgerStore } from './persistence/ledgerStore';
import { sampleScenario } from './data/sample';
import { today } from './domain/dates';
import { createLedgerState } from './ui/state.svelte';

const storage = ((): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined; /* a browser set to block site data throws on the accessor */
  }
})();

const ledger = createLedgerState(createLedgerStore(storage), sampleScenario(today()));

export default mount(App, {
  target: document.getElementById('app') as HTMLElement,
  props: { ledger }
});
