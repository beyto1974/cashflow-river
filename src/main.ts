import './ui/app.css';
import { mount } from 'svelte';
import App from './ui/App.svelte';
import { createLedgerStore } from './persistence/ledgerStore';
import { createPreferenceStore } from './persistence/preferences';
import { emptyScenario, sampleScenario } from './data/sample';
import { today } from './domain/dates';
import { createLedgerState } from './ui/state.svelte';
import { applyTheme } from './ui/theme';

const storage = ((): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined; /* a browser set to block site data throws on the accessor */
  }
})();

const preferences = createPreferenceStore(storage);

/* Before the first paint, so a chosen theme never flashes the other one. */
applyTheme(preferences.load().theme);

const ledger = createLedgerState(
  createLedgerStore(storage),
  sampleScenario(today()),
  emptyScenario(today()),
  today(),
  preferences
);

export default mount(App, {
  target: document.getElementById('app') as HTMLElement,
  props: { ledger }
});
