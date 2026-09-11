import { beforeEach, describe, expect, it } from 'vitest';
import { createPreferenceStore, DEFAULT_PREFERENCES } from '../src/persistence/preferences';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value)
  };
}

describe('preference store', () => {
  let storage: Storage;
  const store = () => createPreferenceStore(storage);

  beforeEach(() => {
    storage = fakeStorage();
  });

  it('starts on the river with nothing folded', () => {
    expect(store().load()).toEqual(DEFAULT_PREFERENCES);
  });

  it('remembers the view and which sections are folded', () => {
    store().save({ view: 'grid', collapsed: ['Going out', 'One-offs you have planned'] });
    expect(store().load()).toEqual({ view: 'grid', collapsed: ['Going out', 'One-offs you have planned'] });
  });

  it('ignores a view it does not know', () => {
    storage.setItem('moraview.view.v1', JSON.stringify({ view: 'spreadsheet', collapsed: [] }));
    expect(store().load().view).toBe('river');
  });

  it('ignores collapsed entries that are not names', () => {
    storage.setItem('moraview.view.v1', JSON.stringify({ view: 'grid', collapsed: ['Going out', 7, null] }));
    expect(store().load()).toEqual({ view: 'grid', collapsed: ['Going out'] });
  });

  it('falls back to the defaults for anything unreadable', () => {
    storage.setItem('moraview.view.v1', '{{{');
    expect(store().load()).toEqual(DEFAULT_PREFERENCES);
  });

  it('stays quiet when the browser blocks storage', () => {
    const blocked = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); }
    } as unknown as Storage;
    const preferences = createPreferenceStore(blocked);
    expect(() => preferences.save({ view: 'grid', collapsed: [] })).not.toThrow();
    expect(preferences.load()).toEqual(DEFAULT_PREFERENCES);
  });

  it('works with no storage at all', () => {
    const preferences = createPreferenceStore(undefined);
    preferences.save({ view: 'grid', collapsed: ['x'] });
    expect(preferences.load()).toEqual(DEFAULT_PREFERENCES);
  });
});
