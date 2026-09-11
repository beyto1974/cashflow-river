import { expect, test } from '@playwright/test';
import { answer, openFresh } from './helpers';

test.describe('the two readings', () => {
  test('opens on the river, with the bed panel and the band', async ({ page }) => {
    await openFresh(page);
    await expect(page.locator('.bed-line')).toBeVisible();
    await expect(page.locator('.cone')).toBeVisible();
    await expect(page.locator('.legend')).toContainText('net for the month');
  });

  test('a month tooltip says what the month gains or loses', async ({ page }) => {
    await openFresh(page);
    const column = page.locator('.hit').nth(2);
    await column.hover();
    const tip = page.locator('.tip');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText(/Gains|Loses/);
    await expect(tip).toContainText('Ends at');
  });

  test('the month columns are buttons that can be walked with the arrow keys', async ({ page }) => {
    await openFresh(page);
    const first = page.locator('.hit[tabindex="0"]');
    await first.focus();
    /* The month detail below the chart is what the selection drives; the label
       inside the chart is only drawn for every other column at this width. */
    const heading = page.locator('.month-detail h3');
    const before = await heading.innerText();
    await page.keyboard.press('ArrowRight');
    await expect(heading).not.toHaveText(before);
    await page.keyboard.press('ArrowLeft');
    await expect(heading).toHaveText(before);
  });

  test('dragging along the bed panel reads any day out', async ({ page }) => {
    await openFresh(page);
    const frame = page.locator('.frame').first();
    const box = (await frame.boundingBox())!;
    const before = await page.getByLabel('Date to read the balance on').inputValue();

    const y = box.y + box.height * 0.82;
    await page.mouse.move(box.x + box.width * 0.3, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, y, { steps: 6 });
    await page.mouse.up();

    await expect(page.getByLabel('Date to read the balance on')).not.toHaveValue(before);
    await expect(frame).toHaveAttribute('data-dragging', 'false');
  });

  test('the grid shows a cell a day, and picking one moves the read-out', async ({ page }) => {
    await openFresh(page);
    await page.getByRole('button', { name: 'Grid', exact: true }).click();

    await expect(page.locator('.cell').first()).toBeVisible();
    expect(await page.locator('.cell').count()).toBeGreaterThan(800);
    await expect(page.locator('.legend')).toContainText('overdrawn');

    const cell = page.locator('.cell').nth(150);
    await cell.hover();
    await expect(page.locator('.readout')).toContainText('closes at');
    await cell.click();
    await expect(page.locator('.readout')).toContainText('closes at');
    await expect(answer(page)).toContainText('€');
  });

  test('the grid cells walk a day at a time and a month sideways', async ({ page }) => {
    await openFresh(page);
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    const selected = page.locator('.cell.selected');
    await selected.focus();
    const before = await page.getByLabel('Date to read the balance on').inputValue();

    await page.keyboard.press('ArrowDown');
    const next = await page.getByLabel('Date to read the balance on').inputValue();
    expect(Date.parse(next)).toBe(Date.parse(before) + 86_400_000);

    await page.keyboard.press('ArrowLeft');
    expect(Date.parse(await page.getByLabel('Date to read the balance on').inputValue())).toBeLessThan(
      Date.parse(next)
    );
  });

  test('remembers which reading was on screen', async ({ page }) => {
    await openFresh(page);
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.reload();
    await expect(page.locator('.views button.on')).toHaveText('Grid');
    await expect(page.locator('.cell').first()).toBeVisible();
  });
});

test.describe('fixes and comparison', () => {
  test('offers a fix that clears the first tight stretch, and applies it', async ({ page }) => {
    await openFresh(page);
    const before = await page.locator('.verdict').first().innerText();

    await page.getByRole('button', { name: /What would fix/ }).click();
    await expect(page.locator('.what, .none')).toBeVisible();

    const suggestions = page.locator('.what');
    if ((await suggestions.count()) > 0) {
      await expect(suggestions.first()).toContainText(/Put off|Spend|Pause|Pay half/);
      await page.getByRole('button', { name: 'Do it' }).first().click();
      await expect(page.locator('.verdict').first()).not.toHaveText(before);
    }
  });

  test('compares a change against a pinned baseline', async ({ page }) => {
    await openFresh(page);
    await page.getByRole('button', { name: 'Pin this as the baseline' }).click();
    await expect(page.locator('.verdict').nth(1)).toContainText('no different');

    await page.getByLabel('Count Transfer to savings in the forecast').uncheck();
    await expect(page.locator('.verdict').nth(1)).toContainText('better off');
    expect(await page.locator('.strip .bar i').count()).toBeGreaterThan(10);

    await page.getByRole('button', { name: 'Drop the baseline' }).click();
    await expect(page.getByRole('button', { name: 'Pin this as the baseline' })).toBeVisible();
  });
});

test.describe('the balance-only reading', () => {
  test('drops the bars and keeps the line, the band and the buffer', async ({ page }) => {
    await openFresh(page);
    await page.getByRole('button', { name: 'Balance', exact: true }).click();

    await expect(page.locator('.bed-line')).toBeVisible();
    await expect(page.locator('.cone')).toBeVisible();
    await expect(page.locator('.buffer-label')).toBeVisible();
    expect(await page.locator('.frame rect[rx="1.5"]').count()).toBe(0);
    await expect(page.locator('.legend')).toContainText('the balance, day by day');
    await expect(page.locator('.legend')).not.toContainText('net for the month');
  });

  test('still reads a day out when the needle is dragged', async ({ page }) => {
    await openFresh(page);
    await page.getByRole('button', { name: 'Balance', exact: true }).click();
    const frame = page.locator('.frame').first();
    const box = (await frame.boundingBox())!;
    const before = await page.getByLabel('Date to read the balance on').inputValue();

    const y = box.y + box.height * 0.5;
    await page.mouse.move(box.x + box.width * 0.35, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, y, { steps: 6 });
    await page.mouse.up();

    await expect(page.getByLabel('Date to read the balance on')).not.toHaveValue(before);
  });

  test('is remembered like the others', async ({ page }) => {
    await openFresh(page);
    await page.getByRole('button', { name: 'Balance', exact: true }).click();
    await page.reload();
    await expect(page.locator('.views button.on')).toHaveText('Balance');
  });
});

test.describe('the month detail', () => {
  test('steps a month at a time, and stops at both ends', async ({ page }) => {
    await openFresh(page);
    const heading = page.locator('.month-detail h3');
    const first = await heading.innerText();

    await page.getByRole('button', { name: /^The month after/ }).click();
    await expect(heading).not.toHaveText(first);
    await page.getByRole('button', { name: /^The month before/ }).click();
    await expect(heading).toHaveText(first);

    /* The first month of the forecast has nothing before it. */
    for (let step = 0; step < 40; step += 1) {
      const back = page.getByRole('button', { name: /^The month before/ });
      if (await back.isDisabled()) break;
      await back.click();
    }
    await expect(page.getByRole('button', { name: /^The month before/ })).toBeDisabled();
    await expect(heading).toHaveText(/September 2026|October 2026/);
  });

  test('stepping moves the chart selection and the read-out with it', async ({ page }) => {
    await openFresh(page);
    const before = await page.getByLabel('Date to read the balance on').inputValue();
    await page.getByRole('button', { name: /^The month after/ }).click();
    await expect(page.getByLabel('Date to read the balance on')).not.toHaveValue(before);
    await expect(page.locator('.month-detail .sums')).toContainText('Ends at');
  });
});

test.describe('the month table', () => {
  test('marks the months that touched the buffer without reddening every figure', async ({ page }) => {
    await openFresh(page);
    await page.locator('summary', { hasText: 'The same river as a table' }).click();

    const touched = page.locator('tbody tr.touched').first();
    await expect(touched).toBeVisible();

    /* The red belongs to the two figures that are about the buffer. */
    await expect(touched.locator('td.tight, td.red')).not.toHaveCount(0);
    const ordinary = touched.locator('td').nth(1); // money in
    const colour = await ordinary.evaluate((cell) => getComputedStyle(cell).color);
    const inkColour = await page
      .locator('tbody tr:not(.touched) td')
      .first()
      .evaluate((cell) => getComputedStyle(cell).color);
    expect(colour).toBe(inkColour);
  });

  test('calls an overdrawn month out more strongly than a tight one', async ({ page }) => {
    await openFresh(page);
    await page.locator('summary', { hasText: 'The same river as a table' }).click();
    await expect(page.locator('tbody tr.overdrawn')).not.toHaveCount(0);
    await expect(page.locator('tbody tr.overdrawn td.red').first()).toBeVisible();
  });
});

test.describe('what the page remembers', () => {
  test('keeps the month table open across a reload', async ({ page }) => {
    await openFresh(page);
    /* A closed <details> keeps its children in the DOM, so this is about what is
       visible, not about what exists. */
    await expect(page.locator('tbody tr').first()).toBeHidden();

    await page.locator('summary', { hasText: 'The same river as a table' }).click();
    await expect(page.locator('tbody tr').first()).toBeVisible();

    await page.reload();
    await expect(page.locator('tbody tr').first()).toBeVisible();

    await page.locator('summary', { hasText: 'The same river as a table' }).click();
    await page.reload();
    await expect(page.locator('tbody tr').first()).toBeHidden();
  });
});
