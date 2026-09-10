import { describe, expect, it } from 'vitest';
import { addCents, euros, formatEUR, formatSigned, parseAmount, toEuros } from '../src/domain/money';

describe('money is integer cents', () => {
  it('turns euros into cents without float dust', () => {
    expect(euros(2940)).toBe(294_000);
    expect(euros(66.98)).toBe(6_698);
    expect(euros(-1142.5)).toBe(-114_250);
  });

  it('adds without accumulating float error', () => {
    // The float engine reported 2142.0199999999995 for this sum.
    const parts = [euros(5368.3), euros(-3226.28)];
    expect(addCents(...parts)).toBe(euros(2142.02));
  });

  it('reads a typed amount', () => {
    expect(parseAmount('1,234.56')).toBe(123_456);
    expect(parseAmount('1234.56')).toBe(123_456);
    expect(parseAmount('1 234.56')).toBe(123_456);
    expect(parseAmount('€ 195')).toBe(19_500);
    expect(parseAmount('-62.30')).toBe(-6_230);
    expect(parseAmount('1,500')).toBe(150_000); // a comma groups
  });

  it('refuses what is not an amount', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('later')).toBeNull();
  });

  it('rounds half away from zero, so a cent never vanishes', () => {
    expect(parseAmount('0.005')).toBe(1);
    expect(parseAmount('-0.005')).toBe(-1);
  });

  it('formats with no gap after the symbol', () => {
    expect(formatEUR(294_000)).toBe('€2,940.00');
    expect(formatEUR(294_000, { cents: false })).toBe('€2,940');
    expect(formatEUR(-6_230)).toBe('-€62.30');
    expect(formatSigned(6_230)).toBe('+€62.30');
    expect(formatSigned(-6_230)).toBe('-€62.30');
  });

  it('converts back to euros for display maths only', () => {
    expect(toEuros(123_456)).toBeCloseTo(1234.56, 10);
  });
});
