import { describe, expect, it } from 'vitest';
import { decodeScenario, encodeScenario, safeDecodeScenario, SCHEMA_VERSION } from '../src/persistence/codec';
import { tinyScenario } from './fixtures';

describe('codec', () => {
  it('round-trips a scenario', () => {
    const scenario = tinyScenario();
    expect(decodeScenario(JSON.parse(encodeScenario(scenario)))).toEqual(scenario);
  });

  it('stamps the schema version it wrote', () => {
    expect(JSON.parse(encodeScenario(tinyScenario())).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('rejects a payload from a newer schema', () => {
    const document = JSON.parse(encodeScenario(tinyScenario()));
    document.schemaVersion = SCHEMA_VERSION + 1;
    expect(() => decodeScenario(document)).toThrow(/schema/i);
  });

  it('names the field that is wrong', () => {
    const document = JSON.parse(encodeScenario(tinyScenario()));
    document.scenario.asOf = 'yesterday';
    expect(() => decodeScenario(document)).toThrow(/asOf/);
  });

  it('refuses amounts that are not whole cents', () => {
    const document = JSON.parse(encodeScenario(tinyScenario()));
    document.scenario.lines[0].amount = 12.5;
    expect(() => decodeScenario(document)).toThrow(/amount/);
  });

  it('refuses a category or cadence it does not know', () => {
    const withCategory = JSON.parse(encodeScenario(tinyScenario()));
    withCategory.scenario.lines[0].category = 'crypto';
    expect(() => decodeScenario(withCategory)).toThrow(/category/);

    const withCadence = JSON.parse(encodeScenario(tinyScenario()));
    withCadence.scenario.lines[0].cadence = 'fortnightly';
    expect(() => decodeScenario(withCadence)).toThrow(/cadence/);
  });

  it('drops fields it does not know rather than storing them', () => {
    const document = JSON.parse(encodeScenario(tinyScenario()));
    document.scenario.lines[0].mystery = 'hello';
    expect(decodeScenario(document).lines[0]).not.toHaveProperty('mystery');
  });

  it('answers null instead of throwing when asked safely', () => {
    expect(safeDecodeScenario('not json')).toBeNull();
    expect(safeDecodeScenario(null)).toBeNull();
    expect(safeDecodeScenario(encodeScenario(tinyScenario()))?.label).toBe('Tiny');
  });
});
