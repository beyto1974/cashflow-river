import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStore } from '../src/persistence/localStore';
import { tinyScenario } from './fixtures';

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

describe('local store', () => {
  let storage: Storage;
  beforeEach(() => { storage = fakeStorage(); });

  it('saves and loads', () => {
    const store = createLocalStore(storage);
    store.save(tinyScenario());
    expect(store.load()?.label).toBe('Tiny');
  });

  it('forgets on clear', () => {
    const store = createLocalStore(storage);
    store.save(tinyScenario());
    store.clear();
    expect(store.load()).toBeNull();
  });

  it('treats unreadable content as nothing saved', () => {
    storage.setItem('moraview.scenario.v1', '{{{');
    expect(createLocalStore(storage).load()).toBeNull();
  });

  it('stays quiet when the browser blocks storage', () => {
    const blocked = {
      ...fakeStorage(),
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); }
    } as unknown as Storage;
    const store = createLocalStore(blocked);
    expect(() => store.save(tinyScenario())).not.toThrow();
    expect(store.load()).toBeNull();
  });

  it('does not touch storage it was not given', () => {
    const store = createLocalStore(undefined);
    expect(store.load()).toBeNull();
    expect(() => store.save(tinyScenario())).not.toThrow();
    expect(vi.isMockFunction(store.save)).toBe(false);
  });
});
