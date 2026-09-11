import { expect, test } from '@playwright/test';
import { answer, openFresh, openSection } from './helpers';

/* The phone project runs only these; everything else is checked on the desktop
   layout, where the same code paths are exercised with less scrolling. */
test.describe('on a phone', { tag: '@phone' }, () => {
  test('never scrolls sideways, and shows the answer first', async ({ page }) => {
    await openFresh(page);

    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
    await expect(answer(page)).toBeInViewport();
    await expect(page.locator('.verdict').first()).toBeInViewport();
  });

  test('keeps the chart usable', async ({ page }) => {
    await openFresh(page);
    const frame = page.locator('.frame').first();
    await frame.scrollIntoViewIfNeeded();
    const box = (await frame.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
    await expect(page.locator('.bed-line')).toBeVisible();
  });

  test('the grid scrolls inside its own box, not the page', async ({ page }) => {
    await openFresh(page);
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await expect(page.locator('.cell').first()).toBeVisible();

    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
    expect(await page.evaluate(() => {
      const scroll = document.querySelector('.frame .scroll') as HTMLElement;
      return scroll.scrollWidth > scroll.clientWidth;
    })).toBe(true);
  });

  test('can still edit a line', async ({ page }) => {
    await openFresh(page);
    await openSection(page, /Coming in/);
    const field = page.getByLabel('Child benefit amount');
    await field.scrollIntoViewIfNeeded();
    await field.fill('400');
    await field.press('Enter');
    await expect(field).toHaveValue('400.00');
  });
});
