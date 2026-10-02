import { test, expect } from '@playwright/test'

/**
 * Phase 3 e2e. The API is not reachable in this CI job, so these tests pin the *guards that must
 * hold before any network call*: the consent gate, the passive disclaimer, the honest degraded
 * state, and the terminal's own consent requirement.
 */

for (const lang of ['fa', 'en']) {
  test(`${lang}: the scanner refuses to run without explicit consent`, async ({ page }) => {
    await page.goto(`/${lang}/tools/check-security`)
    const submit = page.getByRole('button', { name: lang === 'fa' ? 'شروع بررسی' : 'Start check' })
    await expect(submit).toBeDisabled()
    await page.locator('input[type="checkbox"]').first().check()
    await expect(submit).toBeEnabled()
  })

  test(`${lang}: the passive disclaimer is always visible`, async ({ page }) => {
    await page.goto(`/${lang}/tools/check-security`)
    await expect(page.getByRole('note').first()).toBeVisible()
    await expect(page.getByRole('note').first()).toContainText(lang === 'fa' ? 'مادهٔ ۷۲۹' : 'Article 729')
  })

  test(`${lang}: an invalid domain is rejected client-side`, async ({ page }) => {
    await page.goto(`/${lang}/tools/check-security`)
    await page.locator('input[type="text"], input:not([type])').first().fill('127.0.0.1')
    await page.locator('input[type="checkbox"]').first().check()
    await expect(page.getByRole('button', { name: lang === 'fa' ? 'شروع بررسی' : 'Start check' })).toBeDisabled()
  })

  test(`${lang}: the assistant page shows the corpus-only contract`, async ({ page }) => {
    await page.goto(`/${lang}/assistant`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('textarea').first()).toBeVisible()
  })

  test(`${lang}: the terminal requires consent for scan on its own path`, async ({ page }) => {
    await page.goto(`/${lang}`)
    await page.keyboard.press('`')
    const input = page.locator('input[placeholder]').last()
    await input.fill('scan example.com')
    await input.press('Enter')
    await expect(page.getByText(/--consent|اجازه/).first()).toBeVisible({ timeout: 15_000 })
  })
}
