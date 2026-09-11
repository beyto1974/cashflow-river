import { describe, expect, it } from 'vitest';
import { plainDate } from '../src/domain/dates';
import { euros } from '../src/domain/money';
import { project } from '../src/domain/forecast';
import { sampleScenario } from '../src/data/sample';
import { gridModel, bandOf } from '../src/ui/chart/gridModel';

const scenario = sampleScenario(plainDate('2026-09-11'));
const forecast = project(scenario);
const grid = gridModel(forecast, scenario.buffer);

describe('bandOf', () => {
  const buffer = euros(2500);

  it('reads overdrawn, tight and the comfort bands off the buffer', () => {
    expect(bandOf(euros(-1), buffer)).toBe('red');
    expect(bandOf(euros(0), buffer)).toBe('tight');
    expect(bandOf(euros(2499), buffer)).toBe('tight');
    expect(bandOf(euros(2500), buffer)).toBe('1');
    expect(bandOf(euros(3900), buffer)).toBe('1'); // 1.56 × the buffer
    expect(bandOf(euros(6000), buffer)).toBe('2');
    expect(bandOf(euros(9000), buffer)).toBe('3');
    expect(bandOf(euros(14000), buffer)).toBe('4');
    expect(bandOf(euros(20000), buffer)).toBe('5');
  });

  it('re-reads itself when the buffer changes', () => {
    expect(bandOf(euros(3000), euros(2500))).toBe('1'); // 1.2 × the buffer
    expect(bandOf(euros(3000), euros(500))).toBe('5'); // 6 × the buffer
  });

  it('copes with no buffer at all, reading against a thousand instead', () => {
    expect(bandOf(euros(-5), 0)).toBe('red');
    expect(bandOf(euros(500), 0)).toBe('1');
    expect(bandOf(euros(5000), 0)).toBe('4');
    expect(bandOf(euros(9000), 0)).toBe('5');
  });
});

describe('gridModel', () => {
  it('lays the forecast out as months across and days down', () => {
    expect(grid.months[0]?.month).toBe('2026-09');
    expect(grid.months.length).toBe(31);
    expect(grid.rows).toHaveLength(31);
    expect(grid.rows[0]?.dayOfMonth).toBe(1);
    expect(grid.rows.at(-1)?.dayOfMonth).toBe(31);
  });

  it('leaves a cell empty where the day is outside the forecast or the month', () => {
    const september = grid.rows[0]?.cells[0]; // 1 September, before the forecast starts
    expect(september).toBeNull();
    const februaryThirtieth = grid.rows[29]?.cells[grid.months.findIndex((m) => m.month === '2027-02')];
    expect(februaryThirtieth).toBeNull();
  });

  it('gives every day inside the forecast a cell with its balance and band', () => {
    const cells = grid.rows.flatMap((row) => row.cells).filter((cell) => cell !== null);
    expect(cells).toHaveLength(forecast.days.length);
    // a cell is what the accounts close at that evening, not what they opened on
    const first = cells.find((cell) => cell!.date === forecast.asOf);
    expect(first?.balance).toBe(forecast.days[0]?.balance);
    expect(first?.band).toBe(bandOf(forecast.days[0]!.balance, scenario.buffer));
  });

  it('marks the days a one-off falls on, and today', () => {
    const cells = grid.rows.flatMap((row) => row.cells).filter((cell) => cell !== null);
    expect(cells.filter((cell) => cell!.planned).length).toBeGreaterThan(0);
    expect(cells.filter((cell) => cell!.today)).toHaveLength(1);
  });

  it('labels the years once, above their months', () => {
    expect(grid.years[0]?.year).toBe('2026');
    expect(grid.years.reduce((sum, year) => sum + year.span, 0)).toBe(grid.months.length);
  });

  it('says how many days sit under the buffer, for the legend', () => {
    expect(grid.underBuffer).toBe(forecast.days.filter((day) => day.balance < scenario.buffer).length);
  });
});

describe('a very long horizon', () => {
  it('shows the first stretch of months and says how many it is leaving out', () => {
    const long = project({ ...scenario, horizonMonths: 240 });
    const capped = gridModel(long, scenario.buffer);
    expect(capped.months).toHaveLength(60);
    expect(capped.monthsHidden).toBe(181); // 241 calendar months in a 240-month horizon
    expect(capped.rows[0]?.cells).toHaveLength(60);
  });

  it('leaves a normal horizon alone', () => {
    expect(grid.monthsHidden).toBe(0);
  });
});
