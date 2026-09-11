import { expect, test } from '@playwright/test';
import { amountOf, answer, openFresh, openSection, setAmount } from './helpers';

test.describe('the ledger', () => {
  test('edits a line in place, with every field the line has', async ({ page }) => {
    await openFresh(page);
    await page.getByRole('button', { name: /^Groceries/ }).first().click();

    const editor = page.locator('.editor');
    await expect(editor.getByLabel('How often')).toHaveValue('weekly');
    await expect(editor.getByLabel('Direction')).toHaveValue('out');
    await expect(editor.getByLabel('Smallest this could be')).toBeVisible();

    await editor.getByLabel('How often').selectOption('monthly');
    await expect(page.locator('.row', { hasText: 'Groceries' }).first()).toContainText('every month');
  });

  test('mutes a line without losing it', async ({ page }) => {
    await openFresh(page);
    const before = await answer(page).innerText();
    await page.getByLabel('Count Mortgage in the forecast').uncheck();
    await expect(answer(page)).not.toHaveText(before);
    await expect(page.locator('.row', { hasText: 'Mortgage' })).toContainText('Mortgage');
    await page.getByLabel('Count Mortgage in the forecast').check();
    await expect(answer(page)).toHaveText(before);
  });

  test('adds a line that repeats a fixed number of times', async ({ page }) => {
    await openFresh(page);
    await openSection(page, /Add a line/);

    await page.getByPlaceholder('What is it? e.g. Piano lessons').fill('Evening course');
    await page.getByPlaceholder('Amount').fill('75');
    await page.getByLabel('How many times').fill('6');
    await page.getByRole('button', { name: 'Add it to the river' }).click();

    await expect(page.locator('.row', { hasText: 'Evening course' })).toContainText('every month, 6 times');
  });

  test('asks before deleting a line, and takes no for an answer', async ({ page }) => {
    await openFresh(page);
    await page.getByRole('button', { name: /^Subscriptions \+ gym/ }).first().click();

    await page.getByRole('button', { name: 'Delete this line' }).click();
    await page.getByRole('button', { name: 'Keep it' }).click();
    await expect(page.locator('.row', { hasText: 'Subscriptions + gym' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete this line' }).click();
    await page.getByRole('button', { name: /^Delete Subscriptions/ }).click();
    await expect(page.locator('.row', { hasText: 'Subscriptions + gym' })).toHaveCount(0);
  });

  test('takes a negative balance for an account in the red', async ({ page }) => {
    await openFresh(page);
    await openSection(page, /What you have now/);
    const field = page.getByLabel('Current account balance');
    await field.fill('-320.50');
    await field.press('Enter');
    await expect(field).toHaveValue('-320.50');
    await expect(page.locator('.askline')).toContainText('€859.65');
  });

  test('puts an unreadable amount back rather than keeping it', async ({ page }) => {
    await openFresh(page);
    await setAmount(page, 'Groceries', 'nonsense');
    await amountOf(page, 'Groceries').press('Tab');
    await expect(amountOf(page, 'Groceries')).toHaveValue('195.00');
  });

  test('folds a section, and remembers it across a reload', async ({ page }) => {
    await openFresh(page);
    const rows = await page.locator('.row').count();

    await page.getByRole('button', { name: /Going out/ }).click();
    await expect(page.locator('.row')).not.toHaveCount(rows);

    await page.reload();
    await expect(page.getByRole('button', { name: /Going out/ })).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('the what-if dials', () => {
  test('change the forecast without touching the ledger, and can be kept', async ({ page }) => {
    await openFresh(page);
    await openSection(page, /What if/);

    const salaryBefore = await amountOf(page, 'Salary — Alex').inputValue();
    const dial = page.locator('#dial-income');
    await dial.fill('80');
    await dial.dispatchEvent('input');

    /* The dials are a layer: the forecast moves, the ledger does not. */
    await expect(page.getByRole('button', { name: 'Keep these figures' })).toBeVisible();
    await expect(amountOf(page, 'Salary — Alex')).toHaveValue(salaryBefore);

    await page.getByRole('button', { name: 'Keep these figures' }).click();
    await expect(amountOf(page, 'Salary — Alex')).toHaveValue('2352.00');
    await expect(page.getByRole('button', { name: 'Keep these figures' })).toHaveCount(0);
  });

  test('can be put back, leaving the ledger alone', async ({ page }) => {
    await openFresh(page);
    await openSection(page, /What if/);
    const before = await answer(page).innerText();

    const dial = page.locator('#dial-daily');
    await dial.fill('140');
    await dial.dispatchEvent('input');
    await expect(answer(page)).not.toHaveText(before);

    await page.getByRole('button', { name: 'Put the dials back' }).click();
    await expect(answer(page)).toHaveText(before);
  });
});
