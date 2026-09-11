/**
 * How the page was left: which reading of the forecast was on screen, and which
 * sections of the ledger were folded. Per browser, not per ledger — it is about
 * the window, not the household's figures, so it is kept apart from them.
 */
export type ForecastView = 'river' | 'balance' | 'grid';

const VIEWS: ForecastView[] = ['river', 'balance', 'grid'];

export interface Preferences {
  view: ForecastView;
  /** Section headings that were folded shut. */
  collapsed: string[];
  /** Disclosure panels — the month table, the version list — left open. */
  opened: string[];
}

export const PREFERENCES_KEY = 'moraview.view.v1';
export const DEFAULT_PREFERENCES: Preferences = { view: 'river', collapsed: [], opened: [] };

export interface PreferenceStore {
  load(): Preferences;
  save(preferences: Preferences): void;
}

function names(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

export function createPreferenceStore(storage: Storage | undefined): PreferenceStore {
  return {
    load(): Preferences {
      if (!storage) return DEFAULT_PREFERENCES;
      try {
        const raw = storage.getItem(PREFERENCES_KEY);
        if (!raw) return DEFAULT_PREFERENCES;
        const parsed = JSON.parse(raw) as Partial<Preferences>;
        return {
          view: VIEWS.includes(parsed.view as ForecastView) ? (parsed.view as ForecastView) : 'river',
          collapsed: names(parsed.collapsed),
          opened: names(parsed.opened)
        };
      } catch {
        return DEFAULT_PREFERENCES;
      }
    },

    save(preferences: Preferences): void {
      if (!storage) return;
      try {
        storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
      } catch {
        /* out of quota, or storage blocked — the session still works */
      }
    }
  };
}
