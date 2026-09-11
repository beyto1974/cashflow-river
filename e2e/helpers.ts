import { expect, type Page } from '@playwright/test';

/** Opens the app on the example household, with nothing carried over. */
export async function openFresh(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('.answer')).toBeVisible();
  await expect(page.locator('.verdict').first()).toContainText('buffer');
}

/** The headline figure, as text. */
export function answer(page: Page) {
  return page.locator('.answer');
}

/** The sentence above the ledger. */
export function sentence(page: Page) {
  return page.locator('.verdict').first();
}

/** A line's amount field, by the line's label. */
export function amountOf(page: Page, label: string) {
  return page.getByLabel(`${label} amount`);
}

export async function setAmount(page: Page, label: string, value: string): Promise<void> {
  const field = amountOf(page, label);
  await field.fill(value);
  await field.press('Enter');
}

/** Sections of the ledger panel fold; open the one a test needs. */
export async function openSection(page: Page, title: string | RegExp): Promise<void> {
  const heading = page.getByRole('button', { name: title });
  if ((await heading.getAttribute('aria-expanded')) === 'false') await heading.click();
}

export async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Ledgers and settings' }).click();
  await expect(page.locator('dialog[open]')).toBeVisible();
}
