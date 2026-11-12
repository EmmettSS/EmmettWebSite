import { expect, test, type Page, type TestInfo } from "@playwright/test";

/**
 * Browser-level responsive and CSP regression coverage for the native Django Admin.
 *
 * The test runs the real login flow against Django's local demo database, then
 * checks login, dashboard, changelist, change form, and 2FA status pages at the
 * six admin audit widths in both RTL and LTR. The demo password is supplied only
 * to the isolated CI/dev database through DEMO_ADMIN_PASSWORD.
 */

const DJANGO_ADMIN_ORIGIN = process.env.DJANGO_ADMIN_BASE_URL ?? "http://127.0.0.1:8000";
const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? "";
const ADMIN_URL = (path: string) => new URL(path, DJANGO_ADMIN_ORIGIN).toString();
const WIDTHS = [320, 390, 768, 1024, 1440, 1920] as const;
const LOCALES = [
  { code: "fa", direction: "rtl" },
  { code: "en", direction: "ltr" },
] as const;

async function expectNoHorizontalOverflow(page: Page, width: number, surface: string) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(
    metrics.documentWidth,
    `${surface} at ${width}px overflows horizontally: document=${metrics.documentWidth}, viewport=${metrics.viewportWidth}`,
  ).toBeLessThanOrEqual(metrics.viewportWidth + 1);
}

async function expectAdminDirection(page: Page, direction: string) {
  await expect(page.locator("html")).toHaveAttribute("dir", direction);
}

async function expectStrictAdminScripts(
  page: Page,
  responseStatus: number | undefined,
  cspHeader: string | undefined,
) {
  expect(responseStatus).toBe(200);
  expect(cspHeader).toContain("script-src 'self'");
  expect(cspHeader).not.toMatch(/script-src[^;]*unsafe-inline/);
  const response = await page.evaluate(() => ({
    inlineScripts: document.querySelectorAll("script:not([src])").length,
    scriptOrigins: Array.from(
      document.querySelectorAll<HTMLScriptElement>("script[src]"),
      (script) => new URL(script.src, window.location.href).origin,
    ),
    stylesheetOrigins: Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'),
      (stylesheet) => new URL(stylesheet.href, window.location.href).origin,
    ),
  }));
  expect(
    response.inlineScripts,
    "Admin pages must not depend on inline JavaScript under script-src 'self'.",
  ).toBe(0);
  const localOrigin = new URL(DJANGO_ADMIN_ORIGIN).origin;
  expect(response.scriptOrigins.every((origin) => origin === localOrigin)).toBe(true);
  expect(response.stylesheetOrigins.every((origin) => origin === localOrigin)).toBe(true);
}

async function captureSurface(page: Page, testInfo: TestInfo, label: string) {
  await testInfo.attach(label, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

test.describe("Native Django Admin — RTL/LTR responsive audit", () => {
  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      test(`${locale.code} Admin screens fit ${width}px without overflow`, async ({
        page,
      }, testInfo) => {
        test.skip(
          !DEMO_ADMIN_PASSWORD,
          "Set DEMO_ADMIN_PASSWORD and seed the local demo admin to run these checks.",
        );

        const height = width <= 390 ? 844 : 900;
        await page.setViewportSize({ width, height });
        await page
          .context()
          .addCookies([{ name: "django_language", value: locale.code, url: DJANGO_ADMIN_ORIGIN }]);

        const loginResponse = await page.goto(ADMIN_URL("/admin/login/"));
        await expectAdminDirection(page, locale.direction);
        await expectNoHorizontalOverflow(page, width, "Admin login");
        await expectStrictAdminScripts(
          page,
          loginResponse?.status(),
          loginResponse?.headers()["content-security-policy"],
        );
        await captureSurface(page, testInfo, `admin-${locale.code}-${width}-login`);

        await page.locator('input[name="username"]').fill("admin@emmett.dev");
        await page.locator('input[name="password"]').fill(DEMO_ADMIN_PASSWORD);
        const dashboardResponsePromise = page.waitForResponse(
          (response) =>
            response.url() === ADMIN_URL("/admin/") && response.request().method() === "GET",
        );
        await page.locator("#login-form input[type=submit]").click();
        const dashboardResponse = await dashboardResponsePromise;
        await expect(page).toHaveURL(/\/admin\/$/);
        await expectAdminDirection(page, locale.direction);
        await expectNoHorizontalOverflow(page, width, "Admin dashboard");
        await expectStrictAdminScripts(
          page,
          dashboardResponse.status(),
          dashboardResponse.headers()["content-security-policy"],
        );
        await captureSurface(page, testInfo, `admin-${locale.code}-${width}-dashboard`);

        for (const [path, label] of [
          ["/admin/services/service/", "service-list"],
          ["/admin/services/service/add/", "service-form"],
          ["/admin/2fa/", "two-factor-status"],
        ] as const) {
          const response = await page.goto(ADMIN_URL(path));
          await expectAdminDirection(page, locale.direction);
          await expectNoHorizontalOverflow(page, width, label);
          await expectStrictAdminScripts(
            page,
            response?.status(),
            response?.headers()["content-security-policy"],
          );
          await captureSurface(page, testInfo, `admin-${locale.code}-${width}-${label}`);
        }
      });
    }
  }
});
