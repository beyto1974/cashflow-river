import './ui/app.css';
import { mount } from 'svelte';
import App from './ui/App.svelte';
import { createLocalStore } from './persistence/localStore';
import { sampleScenario } from './data/sample';
import { createLedgerState } from './ui/state.svelte';

const storage = ((): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined; /* a browser set to block site data throws on the accessor */
  }
})();

const ledger = createLedgerState(createLocalStore(storage), sampleScenario());

export default mount(App, {
  target: document.getElementById('app') as HTMLElement,
  props: { ledger }
});
