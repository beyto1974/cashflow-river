import { expect, type Page } from '@playwright/test';

/**
 * Opens the app on the example household, with nothing carried over, and reads
 * the first-open note out of the way — it is covered by its own specs, and every
 * other test wants the working page rather than the greeting.
 */
export async function openFresh(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const understood = page.getByRole('button', { name: /Understood/ });
  if (await understood.count()) await understood.click();

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

/** A date inside the forecast, counted from the day it starts. */
export async function dateInForecast(page: Page, daysAhead: number): Promise<string> {
  const start = await page.getByLabel('Date to read the balance on').getAttribute('min');
  const at = new Date(`${start}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + daysAhead);
  return at.toISOString().slice(0, 10);
}

/** Sets the read-out date and waits for the page to agree. */
export async function readOn(page: Page, date: string): Promise<void> {
  const field = page.getByLabel('Date to read the balance on');
  await field.fill(date);
  await field.dispatchEvent('change');
  await expect(field).toHaveValue(date);
}
