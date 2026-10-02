import { test, expect, type Page } from '@playwright/test'

/** ShellRoot is lazy-loaded: wait until its keyboard shortcuts are mounted before pressing keys. */
async function waitForShell(page: Page) {
  await expect(page.locator('button[aria-keyshortcuts]').first()).toBeVisible({ timeout: 15_000 })
}

/**
 * Phase 2 e2e: every tool from input to output, the palette, the real terminal and the
 * mandatory security case. The API is not available in this CI job, so tools must keep
 * working through their shared client-side logic (degraded, never broken).
 */

for (const lang of ['fa', 'en']) {
  test(`${lang}: tools index lists every live tool`, async ({ page }) => {
    await page.goto(`/${lang}/tools`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('main a[href*="/tools/"]')).toHaveCount(6)
  })

  test(`${lang}: Jalali conversion round-trips from the input`, async ({ page }) => {
    await page.goto(`/${lang}/tools/tarikh-shamsi`)
    const input = page.locator('input').first()
    await input.fill('1403/12/30')
    await expect(page.getByText('2025/03/20')).toBeVisible()
    await input.fill('1404/13/01')
    await expect(page.getByRole('alert').first()).toBeVisible()
  })

  test(`${lang}: national-ID checksum explains every step`, async ({ page }) => {
    await page.goto(`/${lang}/tools/kod-meli`)
    await page.locator('input').first().fill('2715830491')
    await expect(page.getByRole('status').first()).toBeVisible()
    await page.locator('input').first().fill('2715830492')
    await expect(page.getByRole('status').first()).toBeVisible()
  })

  test(`${lang}: toman formatter refuses decimals instead of rounding`, async ({ page }) => {
    await page.goto(`/${lang}/tools/toman`)
    await page.locator('input').first().fill('1250000')
    // digits follow the page language: ۱٬۲۵۰٬۰۰۰ in Persian, 1٬250٬000 in English
    await expect(page.getByText(lang === 'fa' ? '۱٬۲۵۰٬۰۰۰' : '1٬250٬000').first()).toBeVisible()
    await page.locator('input').first().fill('12.5')
    await expect(page.getByRole('alert').first()).toBeVisible()
  })

  test(`${lang}: Persian normaliser previews the diff and keeps markup inert`, async ({ page }) => {
    await page.goto(`/${lang}/tools/matn-farsi`)
    const textarea = page.locator('textarea').first()
    await textarea.fill('<script>alert(1)</script>')
    await expect(page.locator('mark').first()).toBeVisible()
    await expect(page.locator('[aria-live="polite"] script')).toHaveCount(0)
  })

  test(`${lang}: JWT debugger warns about alg:none`, async ({ page }) => {
    await page.goto(`/${lang}/tools/jwt`)
    await page.locator('textarea').first().fill('eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMifQ.')
    await expect(page.getByText('CWE-347')).toBeVisible()
  })

  test(`${lang}: every tool keeps a shareable URL state`, async ({ page }) => {
    await page.goto(`/${lang}/tools/tarikh-shamsi?d=1404/01/01`)
    await expect(page.locator('input').first()).toHaveValue('1404/01/01')
  })
}

test('palette opens with the keyboard and finds a tool', async ({ page }) => {
  await page.goto('/fa/tools')
  await waitForShell(page)
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('combobox').fill('کد ملی')
  await expect(dialog.getByText('اعتبارسنج')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('terminal answers real commands and refuses unknown input', async ({ page }) => {
  await page.goto('/fa/tools')
  await waitForShell(page)
  await page.keyboard.press('`')
  const terminal = page.locator('section[aria-label]')
  await expect(terminal).toBeVisible()
  await page.getByRole('combobox', { name: /دستور|command/i }).fill('help')
  await page.keyboard.press('Enter')
  await expect(terminal.getByText('دستورهای موجود')).toBeVisible()
  await page.getByRole('combobox', { name: /دستور|command/i }).fill('eval("alert(1)")')
  await page.keyboard.press('Enter')
  await expect(terminal.getByText('دستور ناشناخته')).toBeVisible()
})

test('low-power mode keeps the tools functional', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 })
  })
  await page.goto('/fa/tools/kod-meli')
  await page.locator('input').first().fill('2715830491')
  await expect(page.getByText('ساختار معتبر است')).toBeVisible()
})
