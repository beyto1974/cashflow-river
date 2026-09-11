import { expect, test } from '@playwright/test';
import { openFresh } from './helpers';

const themes = (page: import('@playwright/test').Page) =>
  page.getByRole('group', { name: 'Theme' });

/** What the stylesheet actually resolved to, rather than what was asked for. */
function paper(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test.describe('the theme toggle', () => {
  test.use({ colorScheme: 'dark' });

  test('follows the device until a choice is made', async ({ page }) => {
    await openFresh(page);

    await expect(themes(page).getByRole('button', { name: 'Auto' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBeUndefined();
    const dark = await paper(page);

    await themes(page).getByRole('button', { name: 'Light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const light = await paper(page);
    expect(light).not.toBe(dark);

    await themes(page).getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await paper(page)).toBe(dark);

    await themes(page).getByRole('button', { name: 'Auto' }).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
    expect(await paper(page)).toBe(dark);
  });

  test('a chosen theme outlives a reload', async ({ page }) => {
    await openFresh(page);
    await themes(page).getByRole('button', { name: 'Light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const light = await paper(page);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await paper(page)).toBe(light);
    await expect(themes(page).getByRole('button', { name: 'Light' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
