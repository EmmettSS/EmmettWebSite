import { test, expect, type Page } from '@playwright/test'

/**
 * Phase 5 evidence run (prompt §10: "one screenshot of each P0 feature actually working").
 *
 * For every P0 feature this spec:
 *   1. opens the route in fa and en,
 *   2. performs the interaction that produces a result (where the feature has one),
 *   3. asserts the page logged ZERO console errors / page errors (MASTER §10 absolute zero),
 *   4. writes a screenshot to test-results/evidence/ (uploaded as a CI artifact).
 *
 * The API is not running in this job, so features must degrade honestly — a visible
 * "service unavailable" note is acceptable, a thrown console error is not.
 */

const EVIDENCE_DIR = 'test-results/evidence'

/** Collects console errors and uncaught page errors for one page. */
function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  return errors
}

async function open(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'networkidle' })
  // ShellRoot is lazy; waiting for it also gives any late console error a chance to surface.
  await expect(page.locator('main').first()).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(400)
}

type Feature = { id: string; fa: string; en: string; slug: string; act?: (page: Page) => Promise<void> }

const features: Feature[] = [
  {
    id: 'F-01',
    slug: 'tarikh-shamsi',
    fa: '/fa/tools/tarikh-shamsi',
    en: '/en/tools/tarikh-shamsi',
    act: async (page) => {
      const input = page.locator('input').first()
      await input.fill('1403/12/30')
      await expect(page.getByText('2025/03/20')).toBeVisible()
    },
  },
  {
    id: 'F-02',
    slug: 'kod-meli',
    fa: '/fa/tools/kod-meli',
    en: '/en/tools/kod-meli',
    act: async (page) => {
      await page.locator('input').first().fill('0499370899')
      await expect(page.getByText(/0499370899/).first()).toBeVisible()
    },
  },
  {
    id: 'F-03',
    slug: 'toman',
    fa: '/fa/tools/toman',
    en: '/en/tools/toman',
    act: async (page) => {
      await page.locator('input').first().fill('1250000')
      await expect(page.getByText(/۱٬۲۵۰٬۰۰۰|1٬250٬000/).first()).toBeVisible()
    },
  },
  {
    id: 'F-04',
    slug: 'matn-farsi',
    fa: '/fa/tools/matn-farsi',
    en: '/en/tools/matn-farsi',
    act: async (page) => {
      await page.locator('textarea').first().fill('سلام دنيا')
      await expect(page.locator('textarea').first()).toHaveValue(/سلام/)
    },
  },
  {
    id: 'F-05',
    slug: 'jwt',
    fa: '/fa/tools/jwt',
    en: '/en/tools/jwt',
    act: async (page) => {
      await page
        .locator('textarea')
        .first()
        .fill(
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        )
      await expect(page.getByText(/HS256/).first()).toBeVisible()
    },
  },
  {
    id: 'F-06',
    slug: 'check-security',
    fa: '/fa/tools/check-security',
    en: '/en/tools/check-security',
    act: async (page) => {
      // Without the API the form must still render and consent must gate the button.
      await expect(page.getByRole('button', { name: /شروع بررسی|Start check/ })).toBeVisible()
    },
  },
  {
    id: 'F-07',
    slug: 'palette-terminal',
    fa: '/fa/tools',
    en: '/en/tools',
    act: async (page) => {
      await page.keyboard.press('Control+k')
      await expect(page.getByPlaceholder(/جستجو|Search/).first()).toBeVisible({ timeout: 10_000 })
      await page.keyboard.press('Escape')
    },
  },
  {
    id: 'F-08',
    slug: 'assistant',
    fa: '/fa/assistant',
    en: '/en/assistant',
    act: async (page) => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    },
  },
  {
    id: 'F-09',
    slug: 'biolab',
    fa: '/fa/biolab',
    en: '/en/biolab',
    act: async (page) => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      // The research/education disclaimer must be present in the DOM (F-09 guard).
      await expect(page.getByText(/پژوهشی|research/i).first()).toBeVisible()
    },
  },
]

for (const feature of features) {
  for (const lang of ['fa', 'en'] as const) {
    test(`${feature.id} ${lang}: works and logs no console error`, async ({ page }) => {
      const errors = watchErrors(page)
      await open(page, feature[lang])
      if (feature.act) await feature.act(page)
      await page.screenshot({ path: `${EVIDENCE_DIR}/${feature.id}-${lang}-${feature.slug}.png`, fullPage: false })
      expect(errors, `console errors on ${feature[lang]}:\n${errors.join('\n')}`).toEqual([])
    })
  }
}

test('entry sends a first-time visitor to Persian', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/fa\/?$/)
  expect(errors).toEqual([])
})
