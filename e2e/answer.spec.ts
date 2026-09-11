import { expect, test } from '@playwright/test';
import { amountOf, answer, openFresh, sentence, setAmount } from './helpers';

test.describe('the answer', () => {
  test('opens on the example, at its lowest point, with the sentence and the stretches', async ({ page }) => {
    await openFresh(page);

    await expect(page.locator('footer')).toContainText('example figures');
    await expect(sentence(page)).toContainText('You are fine until');
    await expect(page.locator('.stretch').first()).toBeVisible();
    await expect(answer(page)).toContainText('€');
    /* The needle opens on the worst day ahead, which is what the sentence is about. */
    const target = await page.getByLabel('Date to read the balance on').inputValue();
    expect(target).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('moves the answer when a line changes, and keeps it after a reload', async ({ page }) => {
    await openFresh(page);
    const field = page.getByLabel('Date to read the balance on');
    await field.fill('2027-03-02');
    await field.dispatchEvent('change');
    const before = await answer(page).innerText();

    await setAmount(page, 'Groceries', '320');
    await expect(answer(page)).not.toHaveText(before);
    const after = await answer(page).innerText();

    /* A reload opens on the worst day ahead, so ask for the same date again
       before comparing — the point is that the edit survived, not the needle. */
    await page.reload();
    await expect(page.locator('footer')).not.toContainText('example figures');
    await page.getByLabel('Date to read the balance on').fill('2027-03-02');
    await page.getByLabel('Date to read the balance on').dispatchEvent('change');
    await expect(answer(page)).toHaveText(after);
    await expect(amountOf(page, 'Groceries')).toHaveValue('320.00');
  });

  test('reads a date the household types, and clamps one past the horizon', async ({ page }) => {
    await openFresh(page);
    const field = page.getByLabel('Date to read the balance on');

    await field.fill('2027-03-02');
    await field.dispatchEvent('change');
    await expect(page.locator('.askline')).toContainText('in 5 months');

    await field.fill('2099-01-01');
    await field.dispatchEvent('change');
    await expect(field).not.toHaveValue('2099-01-01');
  });

  test('says what the guesses could do, separately from what is likely', async ({ page }) => {
    await openFresh(page);
    await expect(page.locator('.spread')).toContainText('somewhere between');
    await expect(page.locator('.risk')).toContainText('If the guessed lines go against you');
  });

  test('a stretch chip moves the read-out into that stretch', async ({ page }) => {
    await openFresh(page);
    const chip = page.locator('.stretch').first();
    const label = await chip.innerText(); // "24 Oct 2026 → 26 Oct 2026  -€434.01  3d"
    await chip.click();

    const target = await page.getByLabel('Date to read the balance on').inputValue();
    const month = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(
      new Date(`${target}T00:00:00Z`)
    );
    expect(label).toContain(month);
    /* The chip aims at the deepest day of the stretch, which is inside it. */
    const [from, to] = label.match(/\d{1,2} \w+ \d{4}/g) as string[];
    const day = Date.parse(`${target}T00:00:00Z`);
    expect(day).toBeGreaterThanOrEqual(Date.parse(from));
    expect(day).toBeLessThanOrEqual(Date.parse(to));
  });
});
