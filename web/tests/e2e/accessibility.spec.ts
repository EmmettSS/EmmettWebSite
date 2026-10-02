import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const routes = ['', '/services', '/products', '/about', '/contact']
for (const lang of ['fa', 'en']) for (const route of routes) {
  test(`${lang} ${route || '/'} has no serious axe violations`, async ({ page }) => {
    await page.goto(`/${lang}${route}`)
    await expect(page.locator('nav')).toBeVisible({ timeout: 15_000 })
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))
    expect(serious, JSON.stringify(serious.map(({ id, help, nodes }) => ({ id, help, count: nodes.length })), null, 2)).toEqual([])
  })
}
