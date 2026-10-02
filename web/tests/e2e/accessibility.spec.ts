import { appendFileSync, writeFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Machine-readable violation dump. The GitHub Actions reporter annotates *this* file instead of
 * parsing the (truncated, colourised) expect() message, so a red run stays diagnosable.
 */
const REPORT = process.env.A11Y_REPORT ?? '/tmp/axe-violations.json'
test.beforeAll(() => {
  writeFileSync(REPORT, '')
})
const routes = ['', '/services', '/products', '/about', '/contact', '/tools', '/tools/tarikh-shamsi', '/tools/kod-meli', '/tools/toman', '/tools/matn-farsi', '/tools/jwt', '/tools/check-security', '/assistant']
for (const lang of ['fa', 'en']) for (const route of routes) {
  test(`${lang} ${route || '/'} has no serious axe violations`, async ({ page }) => {
    await page.goto(`/${lang}${route}`)
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 15_000 })
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))
    if (serious.length) {
      appendFileSync(
        REPORT,
        JSON.stringify({
          route: `/${lang}${route}`,
          violations: serious.map(({ id, impact, help, nodes }) => ({
            id,
            impact,
            help,
            nodes: nodes.map((node) => ({ html: node.html, target: node.target, data: node.any?.[0]?.data })),
          })),
        }) + '\n',
      )
    }
    expect(serious, JSON.stringify(serious.map(({ id, help, nodes }) => ({ id, help, count: nodes.length })), null, 2)).toEqual([])
  })
}
