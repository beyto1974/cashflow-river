import { expect, test } from '@playwright/test';
import { amountOf, answer, openFresh, openSettings, setAmount } from './helpers';

test.describe('settings and ledgers', () => {
  test('the gear holds the forecast settings and the ledgers', async ({ page }) => {
    await openFresh(page);
    await openSettings(page);

    await expect(page.locator('dialog h3').first()).toHaveText('The forecast itself');
    await expect(page.locator('dialog #ledger-pick')).toBeVisible();
    await expect(page.locator('dialog').getByRole('button', { name: 'Export a file' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });

  test('changing the buffer rewrites the answer', async ({ page }) => {
    await openFresh(page);
    const before = await page.locator('.verdict').first().innerText();

    await openSettings(page);
    const buffer = page.locator('dialog input.mono').first();
    await buffer.fill('6000');
    await buffer.dispatchEvent('change');
    await page.keyboard.press('Escape');

    await expect(page.locator('.verdict').first()).not.toHaveText(before);
    await expect(page.locator('.verdict').first()).toContainText('€6,000');
  });

  test('a shorter horizon shortens the forecast', async ({ page }) => {
    await openFresh(page);
    await openSettings(page);
    const months = page.locator('dialog input[type="number"]');
    await months.fill('6');
    await months.dispatchEvent('change');
    await page.keyboard.press('Escape');

    await expect(page.locator('footer')).toContainText('runs 6 months');
  });

  test('carries every ledger out as text and back in again', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openFresh(page);
    await setAmount(page, 'Groceries', '177');

    await openSettings(page);
    await page.getByRole('button', { name: 'Copy as text' }).click();
    await expect(page.locator('dialog .note')).toContainText('Copied');
    const exported = await page.evaluate(() => navigator.clipboard.readText());
    expect(JSON.parse(exported).ledgers[0].document.scenario.lines.some((line: { amount: number }) => line.amount === -17700)).toBe(true);

    await page.getByRole('button', { name: 'Paste text' }).click();
    await page.getByLabel('Exported ledger text').fill(exported);
    await page.getByRole('button', { name: 'Import what is pasted' }).click();

    await expect(page.locator('dialog .note')).toContainText('Imported My ledger (imported)');
    await expect(page.locator('dialog #ledger-pick option')).toHaveCount(2);
  });

  test('says what is wrong with a file that is not a ledger', async ({ page }) => {
    await openFresh(page);
    await openSettings(page);
    await page.getByRole('button', { name: 'Paste text' }).click();
    await page.getByLabel('Exported ledger text').fill('{"hello":"world"}');
    await page.getByRole('button', { name: 'Import what is pasted' }).click();
    await expect(page.locator('dialog .error')).toContainText('not a Moraview export');
  });

  test('keeps a copy of a ledger apart from the original', async ({ page }) => {
    await openFresh(page);
    await setAmount(page, 'Groceries', '210');

    await openSettings(page);
    await page.getByLabel('Name for the copy').fill('If Sam goes part time');
    await page.getByRole('button', { name: 'Save a copy' }).click();
    await page.keyboard.press('Escape');

    await setAmount(page, 'Freelance invoices — Sam', '400');

    await openSettings(page);
    await page.locator('dialog #ledger-pick').selectOption('My ledger');
    await page.keyboard.press('Escape');

    await expect(amountOf(page, 'Freelance invoices — Sam')).toHaveValue('1120.00');
    await expect(amountOf(page, 'Groceries')).toHaveValue('210.00');
  });

  test('restores an earlier version', async ({ page }) => {
    await openFresh(page);
    await setAmount(page, 'Groceries', '250');

    await openSettings(page);
    await page.locator('dialog summary', { hasText: 'Earlier versions' }).click();
    await expect(page.locator('dialog details li')).not.toHaveCount(0);
    await page.locator('dialog details li').last().getByRole('button', { name: 'Restore' }).click();
    await page.keyboard.press('Escape');

    await expect(amountOf(page, 'Groceries')).toHaveValue('250.00');
  });

  test('documents the file format, generated from the code', async ({ page }) => {
    await openFresh(page);
    await openSettings(page);
    await page.locator('dialog summary', { hasText: 'The file format' }).click();

    const spec = page.locator('dialog pre').first();
    await expect(spec).toContainText('Every amount is an integer number of CENTS');
    await expect(spec).toContainText('biweekly');
    await expect(spec).toContainText('last-working-day');
    await expect(page.locator('dialog pre').nth(1)).toContainText('"moraview": 1');
  });

  test('asks before discarding the ledger for the example', async ({ page }) => {
    await openFresh(page);
    await setAmount(page, 'Groceries', '300');

    await page.getByRole('button', { name: 'Back to the example' }).click();
    await page.getByRole('button', { name: 'Keep it' }).click();
    await expect(amountOf(page, 'Groceries')).toHaveValue('300.00');

    await page.getByRole('button', { name: 'Back to the example' }).click();
    await page.getByRole('button', { name: /^Discard this ledger/ }).click();
    await expect(amountOf(page, 'Groceries')).toHaveValue('195.00');
    await expect(page.locator('footer')).toContainText('example figures');
  });
});

test.describe('printing', () => {
  test('leaves out the controls and opens the month table', async ({ page }) => {
    await openFresh(page);
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));

    await expect(page.locator('.printed')).toContainText('forecast from');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.views')!).display)).toBe('none');
    expect(await page.locator('table tbody tr').count()).toBeGreaterThan(20);
    await expect(answer(page)).toBeVisible();
  });
});
