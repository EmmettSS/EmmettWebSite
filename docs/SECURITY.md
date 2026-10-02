# حداقل امنیت پلتفرم

- ورودی‌ها با DRF serializers و سقف طول validate می‌شوند؛ فرم‌های public دارای honeypot و 5/hour/IP throttle هستند.
- Django CSRF middleware برای session/admin و middlewareهای security header فعال‌اند؛ production با `DEBUG=false` HTTPS/HSTS فعال می‌کند.
- هیچ user code در server اجرا نمی‌شود؛ secrets از env می‌آیند.
- فایل کاربر در API فعلی پذیرفته نمی‌شود؛ قابلیت upload باید با allowlist mime/size و نام تولیدی اضافه شود.
- صفحات حقوقی (حریم خصوصی/شرایط/افشای آسیب‌پذیری) منتشر شده‌اند؛ بازبینی حقوقی همچنان ورودی `[INPUT B9]`/`[INPUT B15]` است و در همان صفحه علامت خورده.
- `.well-known/security.txt` (RFC 9116) با Contact/Policies منتشر می‌شود؛ کانال اختصاصی امنیتی در انتظار `B5` است.

## F-06 — نگهبان‌های چک‌آپ امنیتی دامنه (فاز ۳)

هر شش نگهبان در **کد** enforce شده‌اند، نه فقط در مستندات؛ هر کدام تست دارد (`api/apps/scanner/test_scanner.py` — ۲۸ تست):

| # | نگهبان | جای اجرا | تستِ گیت |
|---|---|---|---|
| ۱ | صرفاً passive — فقط پورت ۸۰/۴۴۳ | `apps/scanner/transport.py` (`_validate` + choke point `_open`؛ ریدایرکت هم دوباره validate می‌شود) | `test_guard1_non_standard_port_is_refused_before_any_io`، `test_guard1_redirect_to_another_port_is_refused`، `test_guard1_tls_handshake_only_ever_uses_443`، `test_guard1_engine_uses_one_page_request_and_doh_only` |
| ۲ | Disclaimer قانونی + رضایت اجباری | دکمهٔ اسکن تا تیک رضایت غیرفعال است؛ `consent:false` → 400 با پیام فارسی؛ متن ثابت در گزارش | `test_guard2_consent_is_mandatory` + e2e `security-ai.spec.ts` |
| ۳ | Rate limit ۵/ساعت + هانی‌پات + تأخیر تصادفی | `ScanThrottle` (پیام Fa/En) + `website` honeypot + `polite_delay()` | `test_guard3_sixth_request_in_the_hour_is_429`، `test_guard3_honeypot_is_silently_accepted` |
| ۴ | Blocklist نسخه‌دار پیش از ساخت job | `apps/scanner/blocklist.py` + مدل `BlocklistEntry` (نسخه `blocklist-1404.07.1`) و بررسی RFC1918/localhost/mass-scan | `test_guard4_*` (چهار تست، شامل «هیچ job ساخته نشد») |
| ۵ | عدم ذخیرهٔ قابل انتساب | `result_id` تصادفی، بدون هیچ فیلد IP، `expires_at` = ۷ روز، cron `purge_scan_results`، هدر `X-Robots-Tag: noindex` | `test_guard5_*` |
| ۶ | Mask کردن خروجی عمومی | دو مسیر: `public_sections()` نسخه‌ها را با `•` ماسک می‌کند؛ جزئیات کامل فقط با توکن امضاشدهٔ ۷ روزهٔ ثبت لید | `test_guard6_*`، `test_unlock_token_is_required_for_internal_detail` |

افزون بر این‌ها: هر گام اسکن timeout پنج ثانیه و کل اسکن ≤ ۹۰ ثانیه دارد؛ شکست یک گام فقط همان بخش را «بررسی‌نشده» می‌کند.

## F-08 — نگهبان‌های دستیار

- آستانهٔ مشابهت **قبل از** تماس با مدل اعمال می‌شود؛ پرسش بی‌ربط هیچ هزینه‌ای ندارد (تست با spy).
- پاسخ بدون ارجاع نمایش داده نمی‌شود؛ «نمی‌دانم» جایگزین می‌شود.
- متن پرسش ذخیره نمی‌شود (به‌جز hash برای کش) و به `Job.payload` هم نمی‌ماند.
- کلید provider فقط از env؛ `NullProvider` پیش‌فرض است و هیچ endpoint خارجی بدون تنظیم صریح صدا زده نمی‌شود.
- ۲۰ پرسش/ساعت بر IP، حداکثر ۵۰۰ کاراکتر، هانی‌پات، و اعلام صریح AI در هر پاسخ. جزئیات عملیاتی: `docs/AI-OPS.md`.

## بازبینی OWASP Top-10 برای هر سطح (فاز ۵ §۷)

هر ردیف: سطح → کنترل واقعی در کد → شاهد خودکار. آندپوینت‌ها از فهرست واقعی `api/apps/*/urls.py` آمده‌اند.

| OWASP (2021) | سطح‌های در معرض | کنترل پیاده‌شده | شاهد |
|---|---|---|---|
| A01 Broken Access Control | `/admin/`, `/api/v1/ops/errors/`, `/api/v1/content/*`, `/api/v1/scanner/results/<id>/unlock/` | `IsAdminUser` روی ops؛ `DEFAULT_PERMISSION_CLASSES = IsAdminUser` در settings و `AllowAny` **صریح و موردی** برای سطوح عمومی؛ جزئیات اسکن فقط با توکن امضاشدهٔ ثبت لید | `test_core.py::TestOpsErrors`, `test_scanner.py::test_unlock_token_is_required_for_internal_detail` |
| A02 Cryptographic Failures | همهٔ سطوح | HTTPS+HSTS و `SECURE_*` در production؛ هیچ رازی در باندل کلاینت؛ توکن unlock با `django.core.signing` و انقضای ۷ روزه | `emmett/settings.py`, `test_scanner.py` |
| A03 Injection | ترمینال، ابزارها، دستیار، اسکنر | ORM صرف (بدون SQL خام)؛ ترمینال allow-list است و `eval`/`Function` هرگز اجرا نمی‌شود؛ نرمال‌ساز HTML را escape می‌کند؛ اسکنر ورودی را با regex می‌سنجد | `toolbox/security.test.ts`, `logic.test.ts` (نرمال‌ساز)، `test_scanner.py` |
| A04 Insecure Design | اسکنر، دستیار، لیدها | رضایت اجباری مسالمت‌آمیز + passive-only؛ سقف هزینهٔ روزانهٔ AI با fallback؛ TTL ۷ روزهٔ نتیجه؛ throttle ۵/ساعت (اسکن و لید)؛ تأخیر مودبانه | `test_scanner.py` (۴ تست نگهبان)، `test_assistant.py::test_cost_cap_reached_falls_back_to_bm25` |
| A05 Security Misconfiguration | کل سامانه | `DEBUG=false` در production، `SECURE_CONTENT_TYPE_NOSNIFF`, `X_FRAME_OPTIONS=DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP، بدون verbose error عمومی | تنظیمات + `docs/DEPLOYMENT.md` چک‌لیست |
| A06 Vulnerable Components | وابستگی‌ها | `pip-audit` و `npm audit --audit-level=high` + `gitleaks` در CI | jobهای `api`/`web` در `.github/workflows/ci.yml` |
| A07 Identification/Auth Failures | admin/session | احراز هویت Django؛ CSRF روی session؛ هیچ سطح ثبت‌نام/رمز عمومی وجود ندارد (کمترین سطح حمله) | settings + `test_core.py` (۴۰۱/۴۰۳ برای ops) |
| A08 Software & Data Integrity | بکاپ، لینک اشتراکی | `db_backup`/`db_restore` با تأیید صریح `CONFIRM`؛ لینک اشتراکی `noindex` و با شناسهٔ تصادفی؛ SHA-256 artifact باندل در `bundle-stats.json` | dry-run restore (بخش ۴ `LAUNCH-REPORT.md`)، `test_tools.py::test_share_round_trip_and_permanent_noindex_contract` |
| A09 Logging & Monitoring Failures | عملیات | شمارندهٔ خطای ادمین‌محور (`/api/v1/ops/errors/`)، uptime خارجی، دوناتِ PII در لاگ‌ها (بدون IP، بدون متن پرسش/توکن) | `test_core.py::TestOpsErrors`, `docs/RUNBOOK.md` §۶ |
| A10 SSRF | اسکنر، دستیار | اسکنر فقط پورت ۸۰/۴۴۳، blocklist پیش از ساخت job، رد RFC1918/localhost و ریدایرکت به پورت دیگر؛ دستیار فقط provider پیکربندی‌شده را صدا می‌زند (پیش‌فرض `NullProvider`) | `test_scanner.py` (نگهبان ۱ و ۴)، `test_assistant.py` (بدون provider → هیچ تماس بیرونی) |

**تست دستی سقف هزینه:** در محیط توسعه پشت provider جعلی (spy) اجرا و تست شد؛ روی میزبان واقعی، رسیدن به سقف نیازمند provider فعال است (`B7`) و همان تست با provider واقعی تکرار می‌شود.
