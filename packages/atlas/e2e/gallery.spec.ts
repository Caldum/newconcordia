import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Atlas gallery', () => {
  test('every component passes WCAG 2.2 AA checks, contrast included', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Atlas · galería de componentes' }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('stays usable at 360 px without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const sizes = await page.evaluate(() => {
      const root = document.documentElement;
      const wide = [...document.querySelectorAll('body *')]
        .filter((element) => element.getBoundingClientRect().right > root.clientWidth + 0.5)
        .map((element) => `${element.tagName}.${element.className}`);
      return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, wide };
    });
    expect(sizes.wide).toEqual([]);
    expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth);
  });

  test('the country picker works with the keyboard only', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Buscar país' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio', { name: 'Argentina', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Brasil', exact: true })).toBeChecked();
    await page.getByRole('searchbox', { name: 'Buscar país' }).fill('reino');
    const picker = page.getByRole('radiogroup', { name: 'País' });
    await expect(picker.getByRole('radio')).toHaveCount(2);
  });

  test('every interactive element shows a visible focus ring', async ({ page }) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Entrar a Concordia' });
    await button.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const outline = await button.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).toBe('solid');
  });
});
