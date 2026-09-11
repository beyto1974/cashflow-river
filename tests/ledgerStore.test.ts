import { beforeEach, describe, expect, it } from 'vitest';
import { createLedgerStore } from '../src/persistence/ledgerStore';
import { tinyScenario } from './fixtures';
import { euros } from '../src/domain/money';

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

describe('ledger store', () => {
  let storage: Storage;
  let now: number;
  const clock = () => new Date(now).toISOString();
  const store = () => createLedgerStore(storage, clock);

  beforeEach(() => {
    storage = fakeStorage();
    now = Date.parse('2026-09-11T09:00:00Z');
  });

  it('starts with one ledger and nothing in it', () => {
    const ledgers = store();
    expect(ledgers.names()).toEqual(['My ledger']);
    expect(ledgers.current()).toBe('My ledger');
    expect(ledgers.load()).toBeNull();
  });

  it('saves and loads the current ledger', () => {
    const ledgers = store();
    ledgers.save(tinyScenario());
    expect(store().load()?.label).toBe('Tiny');
  });

  it('keeps a revision per save, newest first', () => {
    const ledgers = store();
    ledgers.save(tinyScenario({ label: 'One' }));
    now += 120_000;
    ledgers.save(tinyScenario({ label: 'Two' }));

    const history = ledgers.history();
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ revision: 2, savedAt: '2026-09-11T09:02:00.000Z' });
    expect(history[1]?.revision).toBe(1);
  });

  it('coalesces a flurry of edits into one revision', () => {
    const ledgers = store();
    ledgers.save(tinyScenario({ label: 'a' }));
    now += 2_000;
    ledgers.save(tinyScenario({ label: 'b' }));
    now += 2_000;
    ledgers.save(tinyScenario({ label: 'c' }));

    expect(ledgers.history()).toHaveLength(1);
    expect(ledgers.load()?.label).toBe('c');
  });

  it('restores an earlier revision without losing the later one', () => {
    const ledgers = store();
    ledgers.save(tinyScenario({ label: 'before' }));
    now += 120_000;
    ledgers.save(tinyScenario({ label: 'after' }));

    expect(ledgers.restore(1)?.label).toBe('before');
    expect(ledgers.history().some((entry) => entry.revision === 2)).toBe(true);
  });

  it('answers nothing for a revision it does not have', () => {
    expect(store().restore(99)).toBeNull();
  });

  it('caps the history rather than growing forever', () => {
    const ledgers = store();
    for (let index = 0; index < 30; index += 1) {
      now += 120_000;
      ledgers.save(tinyScenario({ buffer: euros(index) }));
    }
    const history = ledgers.history();
    expect(history).toHaveLength(20);
    expect(history[0]?.revision).toBe(30);
  });

  it('keeps ledgers apart, each with its own history', () => {
    const ledgers = store();
    ledgers.save(tinyScenario({ label: 'household' }));
    ledgers.saveAs('What if Sam goes part time', tinyScenario({ label: 'variant' }));

    expect(ledgers.names()).toEqual(['My ledger', 'What if Sam goes part time']);
    expect(ledgers.current()).toBe('What if Sam goes part time');
    expect(ledgers.load()?.label).toBe('variant');

    ledgers.select('My ledger');
    expect(ledgers.load()?.label).toBe('household');
    expect(ledgers.history()).toHaveLength(1);
  });

  it('remembers which ledger was open', () => {
    const ledgers = store();
    ledgers.saveAs('Variant', tinyScenario({ label: 'variant' }));
    expect(store().current()).toBe('Variant');
    expect(store().load()?.label).toBe('variant');
  });

  it('removes a ledger and falls back to another', () => {
    const ledgers = store();
    ledgers.save(tinyScenario({ label: 'household' }));
    ledgers.saveAs('Variant', tinyScenario({ label: 'variant' }));
    ledgers.remove('Variant');

    expect(ledgers.names()).toEqual(['My ledger']);
    expect(ledgers.current()).toBe('My ledger');
    expect(ledgers.load()?.label).toBe('household');
  });

  it('will not remove the last ledger', () => {
    const ledgers = store();
    ledgers.save(tinyScenario());
    ledgers.remove('My ledger');
    expect(ledgers.names()).toEqual(['My ledger']);
  });

  it('refuses a name it already has, rather than overwriting', () => {
    const ledgers = store();
    ledgers.saveAs('Variant', tinyScenario({ label: 'first' }));
    expect(ledgers.saveAs('Variant', tinyScenario({ label: 'second' }))).toBe(false);
    expect(ledgers.load()?.label).toBe('first');
  });

  it('clears the ledger it is on, history and all', () => {
    const ledgers = store();
    ledgers.save(tinyScenario());
    ledgers.clear();
    expect(ledgers.load()).toBeNull();
    expect(ledgers.history()).toEqual([]);
  });

  it('keeps two names apart even when they would slug the same', () => {
    const ledgers = store();
    ledgers.save(tinyScenario({ label: 'original' }));
    expect(ledgers.saveAs('my ledger!', tinyScenario({ label: 'copy' }))).toBe(true);

    expect(ledgers.load()?.label).toBe('copy');
    ledgers.select('My ledger');
    expect(ledgers.load()?.label).toBe('original');
    expect(ledgers.history()).toHaveLength(1);
  });

  it('adopts a ledger saved by the single-ledger build', () => {
    const legacy = JSON.stringify({ schemaVersion: 1, scenario: tinyScenario({ label: 'from before' }) });
    storage.setItem('moraview.scenario.v1', legacy);

    const ledgers = store();
    expect(ledgers.names()).toEqual(['My ledger']);
    expect(ledgers.load()?.label).toBe('from before');
    expect(ledgers.history()).toHaveLength(1);
  });

  it('leaves the old key alone once it has moved on', () => {
    storage.setItem('moraview.scenario.v1', JSON.stringify({ schemaVersion: 1, scenario: tinyScenario({ label: 'old' }) }));
    const first = store();
    first.save(tinyScenario({ label: 'new' }));
    expect(store().load()?.label).toBe('new');
  });

  it('reads an index written before ledgers had ids', () => {
    storage.setItem('moraview.ledgers.v1', JSON.stringify({ current: 'My ledger', names: ['My ledger'] }));
    storage.setItem(
      'moraview.ledger.my-ledger.v1',
      JSON.stringify({ schemaVersion: 1, scenario: tinyScenario({ label: 'kept' }) })
    );
    expect(store().load()?.label).toBe('kept');
  });

  it('stays quiet when the browser blocks storage', () => {
    const blocked = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); }
    } as unknown as Storage;
    const ledgers = createLedgerStore(blocked, clock);
    expect(() => ledgers.save(tinyScenario())).not.toThrow();
    expect(ledgers.load()).toBeNull();
    expect(ledgers.names()).toEqual(['My ledger']);
    expect(ledgers.history()).toEqual([]);
  });
});
