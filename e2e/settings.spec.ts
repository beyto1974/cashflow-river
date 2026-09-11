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

  test('restores an earlier version, bringing the older figure back', async ({ page }) => {
    await openFresh(page);
    await setAmount(page, 'Groceries', '250');

    /* Saves inside a minute coalesce into one version, which is the point of
       that rule — so the second version is aged by hand rather than by waiting. */
    await page.evaluate(() => {
      const key = [...Array(localStorage.length).keys()]
        .map((index) => localStorage.key(index) as string)
        .find((name) => name.startsWith('moraview.history.'));
      const history = JSON.parse(localStorage.getItem(key as string) as string);
      history[0].savedAt = new Date(Date.parse(history[0].savedAt) - 10 * 60_000).toISOString();
      localStorage.setItem(key as string, JSON.stringify(history));
    });
    await setAmount(page, 'Groceries', '410');

    await openSettings(page);
    await page.locator('dialog summary', { hasText: 'Earlier versions' }).click();
    await expect(page.locator('dialog details li')).toHaveCount(2);

    const older = page.locator('dialog details li', { hasText: 'Version 1' });
    await older.getByRole('button', { name: 'Restore' }).click();
    await page.keyboard.press('Escape');

    await expect(amountOf(page, 'Groceries')).toHaveValue('250.00');

    /* Restoring saved a version of its own, so nothing was lost by trying it. */
    await openSettings(page);
    await expect(page.locator('dialog details li')).toHaveCount(2);
    await expect(page.locator('dialog details li', { hasText: 'Version 2' })).toBeVisible();
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
  test('keeps the paper layout even though paper is narrower than a desktop', async ({ page }) => {
    await openFresh(page);
    /* A4 is about 794px wide, which is inside the narrow-screen breakpoint: the
       phone layout must not follow the page onto paper. */
    await page.setViewportSize({ width: 816, height: 1056 });
    await page.emulateMedia({ media: 'print' });

    const order = await page.locator('main').evaluate((main) => getComputedStyle(main).order);
    expect(order).toBe('0');
    const position = await page.locator('.chart-hold').evaluate((hold) => getComputedStyle(hold).position);
    expect(position).toBe('static');
  });

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

test.describe('the first open', () => {
  test('says where the ledger is kept and how to take a copy', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const note = page.getByRole('complementary', { name: /Before you type/ });
    await expect(note).toBeVisible();
    await expect(note).toContainText('in this browser only');
    await expect(note).toContainText('gear, top right');
    await expect(note).toContainText('Export a file');

    await note.getByRole('button', { name: /Understood/ }).click();
    await expect(note).toHaveCount(0);

    /* Said once, not on every visit. */
    await page.reload();
    await expect(page.getByRole('complementary', { name: /Before you type/ })).toHaveCount(0);
    await expect(page.locator('.answer')).toBeVisible();
  });

  test('does not stand between the household and the answer', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.locator('.answer')).toBeVisible();
    await expect(page.locator('.verdict').first()).toBeVisible();
  });
});

test.describe('clearing the example', () => {
  test('replaces the whole ledger with one empty account and no lines', async ({ page }) => {
    await openFresh(page);
    /* Scoped to the ledger panel: the settings sheet has rows of its own. */
    const lines = page.locator('aside .row');
    await expect(lines).not.toHaveCount(0);

    await openSettings(page);
    await page.getByRole('button', { name: 'Clear it and start from nothing' }).click();
    await page.getByRole('button', { name: 'Clear this ledger' }).click();
    await page.keyboard.press('Escape');

    await expect(lines).toHaveCount(0);
    await expect(page.locator('.askline')).toContainText('€0');
    await expect(page.locator('footer')).not.toContainText('example figures');
  });

  test('keeps what was there restorable afterwards', async ({ page }) => {
    await openFresh(page);
    await setAmount(page, 'Groceries', '222');

    /* Saves inside a minute coalesce, so the version being restored is aged by
       hand rather than by waiting. */
    await page.evaluate(() => {
      const key = [...Array(localStorage.length).keys()]
        .map((index) => localStorage.key(index) as string)
        .find((name) => name.startsWith('moraview.history.'));
      const history = JSON.parse(localStorage.getItem(key as string) as string);
      history[0].savedAt = new Date(Date.parse(history[0].savedAt) - 10 * 60_000).toISOString();
      localStorage.setItem(key as string, JSON.stringify(history));
    });

    await openSettings(page);
    await page.getByRole('button', { name: 'Clear it and start from nothing' }).click();
    await page.getByRole('button', { name: 'Clear this ledger' }).click();
    await expect(page.locator('aside .row')).toHaveCount(0);

    await page.locator('dialog summary', { hasText: 'Earlier versions' }).click();
    await page.locator('dialog details li', { hasText: 'Version 1' }).getByRole('button', { name: 'Restore' }).click();
    await page.keyboard.press('Escape');

    await expect(amountOf(page, 'Groceries')).toHaveValue('222.00');
  });

  test('asks first, and takes no for an answer', async ({ page }) => {
    await openFresh(page);
    const rows = await page.locator('aside .row').count();

    await openSettings(page);
    await page.getByRole('button', { name: 'Clear it and start from nothing' }).click();
    await page.getByRole('button', { name: 'Keep it' }).click();
    await page.keyboard.press('Escape');

    await expect(page.locator('aside .row')).toHaveCount(rows);
  });
});

test.describe('the example bar', () => {
  test('says the figures are made up, and stays put while you read', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const bar = page.locator('.bar');
    await expect(bar).toContainText('Example figures');
    await expect(bar).toContainText('made-up household');

    await page.evaluate(() => window.scrollBy(0, 900));
    const pinned = await bar.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return box.top >= -1 && box.top < 40 && box.bottom > 0;
    });
    expect(pinned).toBe(true);
  });

  test('goes as soon as the ledger stops being the example', async ({ page }) => {
    await openFresh(page);
    await expect(page.locator('.bar')).toBeVisible();

    await setAmount(page, 'Groceries', '210');
    await expect(page.locator('.bar')).toHaveCount(0);

    /* And stays gone, because the ledger is theirs now. */
    await page.reload();
    await expect(page.locator('.bar')).toHaveCount(0);
  });

  test('clears the example from the bar itself, without asking', async ({ page }) => {
    await openFresh(page);
    await page.getByRole('button', { name: 'clear the example', exact: true }).click();

    await expect(page.locator('.bar')).toHaveCount(0);
    await expect(page.locator('aside .row')).toHaveCount(0);
    await expect(page.locator('.answer')).toHaveText('€0.00');
  });

  test('comes back with the example, and not otherwise', async ({ page }) => {
    await openFresh(page);
    await setAmount(page, 'Groceries', '210');
    await expect(page.locator('.bar')).toHaveCount(0);

    await page.getByRole('button', { name: 'Back to the example' }).click();
    await page.getByRole('button', { name: /^Discard this ledger/ }).click();
    await expect(page.locator('.bar')).toBeVisible();
  });
});
