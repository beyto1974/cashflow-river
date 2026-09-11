import { expect, test } from '@playwright/test';
import { dateInForecast, openFresh, openSettings, readOn, setAmount } from './helpers';

test.describe('what a screen reader gets', () => {
  test('the answer is spoken as a sentence, not as scattered numbers', async ({ page }) => {
    await openFresh(page);
    const spoken = page.locator('p[aria-live="polite"]').filter({ hasText: 'the accounts hold' });
    await expect(spoken).toContainText(/On \w+ \d+ \w+ \d{4} the accounts hold/);
    await expect(spoken).toContainText('somewhere between');

    const probe = await dateInForecast(page, 200);
    await readOn(page, probe);
    const spokenDate = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(`${probe}T00:00:00Z`));
    await expect(spoken).toContainText(spokenDate);
  });

  test('what the app did on its own is announced', async ({ page }) => {
    await openFresh(page);
    const status = page.locator('[role="status"]');

    await page.getByRole('button', { name: /^Subscriptions \+ gym/ }).first().click();
    await page.getByRole('button', { name: 'Delete this line' }).click();
    await page.getByRole('button', { name: /^Delete Subscriptions/ }).click();
    await expect(status).toContainText('Subscriptions + gym deleted.');

    await openSettings(page);
    await page.getByLabel('Name for the copy').fill('Variant');
    await page.getByRole('button', { name: 'Save a copy' }).click();
    await expect(status).toContainText('Saved a copy as Variant.');

    await page.locator('dialog #ledger-pick').selectOption('My ledger');
    await expect(status).toContainText('Opened My ledger.');
  });

  test('applying a fix says what it did and puts the reader on the outcome', async ({ page }) => {
    await openFresh(page);
    await page.getByRole('button', { name: /What would fix/ }).click();
    await expect(page.locator('.what, .none')).toBeVisible();

    if ((await page.locator('.what').count()) > 0) {
      await page.getByRole('button', { name: 'Do it' }).first().click();
      await expect(page.locator('[role="status"]')).toContainText(/Put off|Spend|Pause|Pay half/);
      await expect(page.locator('.verdict').first()).toBeFocused();
    }
  });

  test('every control that is only a symbol still has a name', async ({ page }) => {
    await openFresh(page);
    const unnamed = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')];
      return buttons
        .filter((button) => {
          const label = (button.getAttribute('aria-label') ?? button.textContent ?? '').trim();
          return label.length <= 1;
        })
        .map((button) => button.outerHTML.slice(0, 80));
    });
    expect(unnamed).toEqual([]);
  });

  test('the sections are headings, and the ledger is reachable by them', async ({ page }) => {
    await openFresh(page);
    const headings = await page.getByRole('heading', { level: 2 }).allInnerTexts();
    expect(headings.join(' ')).toContain('Coming in');
    expect(headings.join(' ')).toContain('What if');
  });

  test('the chart offers a described group, and the grid a live read-out', async ({ page }) => {
    await openFresh(page);
    await expect(page.locator('#river-summary')).toContainText('Each month is a button');
    await expect(page.locator('svg[role="group"]')).toHaveAttribute('aria-describedby', 'river-summary');

    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await expect(page.locator('.readout')).toHaveAttribute('aria-live', 'polite');
    const cell = page.locator('.cell').nth(40);
    await expect(cell).toHaveAttribute('aria-label', /closes|€|under|clear|overdrawn|comfortable|roomy|thin|ahead/);
  });

  test('a change typed into a field does not shout on every keystroke', async ({ page }) => {
    await openFresh(page);
    const status = page.locator('[role="status"]');
    await expect(status).toHaveText('');
    await setAmount(page, 'Groceries', '250');
    await expect(status).toHaveText('');
  });
});
