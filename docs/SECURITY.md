# حداقل امنیت پلتفرم

- ورودی‌ها با DRF serializers و سقف طول validate می‌شوند؛ فرم‌های public دارای honeypot و 5/hour/IP throttle هستند.
- Django CSRF middleware برای session/admin و middlewareهای security header فعال‌اند؛ production با `DEBUG=false` HTTPS/HSTS فعال می‌کند.
- هیچ user code در server اجرا نمی‌شود؛ secrets از env می‌آیند.
- فایل کاربر در API فعلی پذیرفته نمی‌شود؛ قابلیت upload باید با allowlist mime/size و نام تولیدی اضافه شود.
- Privacy/legal content هنوز ورودی B9 است.

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
