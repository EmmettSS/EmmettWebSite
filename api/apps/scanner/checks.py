"""The six passive checks (F-06). Every network call goes through ``transport`` (guard 1).

Each check returns a section dict: {id, label_fa, label_en, checked, score, findings[]}.
A check that fails sets ``checked=False`` with a Persian/English reason — the scan continues.
"""

from __future__ import annotations

import datetime as dt
import re
import ssl
from html.parser import HTMLParser

from . import transport

SECURITY_HEADERS = (
    ("content-security-policy", "CSP", "امنیت محتوا", "content security policy"),
    ("strict-transport-security", "HSTS", "اجبار HTTPS", "HTTP strict transport security"),
    ("x-frame-options", "X-Frame-Options", "جلوگیری از clickjacking", "clickjacking protection"),
    ("x-content-type-options", "X-Content-Type-Options", "جلوگیری از MIME sniffing", "MIME sniffing protection"),
    ("referrer-policy", "Referrer-Policy", "سیاست referrer", "referrer policy"),
    ("permissions-policy", "Permissions-Policy", "کنترل APIهای مرورگر", "browser feature policy"),
)

SNIPPETS = {
    "content-security-policy": 'add_header Content-Security-Policy "default-src \'self\'; object-src \'none\'; base-uri \'self\'" always;',
    "strict-transport-security": 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
    "x-frame-options": 'add_header X-Frame-Options "DENY" always;',
    "x-content-type-options": 'add_header X-Content-Type-Options "nosniff" always;',
    "referrer-policy": 'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
    "permissions-policy": 'add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;',
}

STATUS_SCORE = {"pass": 1.0, "warn": 0.5, "fail": 0.0, "info": 1.0}


def _finding(
    key: str,
    label_fa: str,
    label_en: str,
    status: str,
    detail_fa: str,
    detail_en: str,
    advice_fa: str = "",
    snippet: str = "",
    advice_en: str = "",
) -> dict:
    return {
        "key": key,
        "label_fa": label_fa,
        "label_en": label_en,
        "status": status,
        "detail_fa": detail_fa,
        "detail_en": detail_en,
        "advice_fa": advice_fa,
        "advice_en": advice_en or advice_fa,
        "snippet": snippet,
    }


def make_section(section_id: str, label_fa: str, label_en: str, findings: list[dict], reason_fa: str = "", reason_en: str = "") -> dict:
    checked = not reason_fa
    score = 0
    if checked and findings:
        score = round(100 * sum(STATUS_SCORE.get(item["status"], 0.0) for item in findings) / len(findings))
    return {
        "id": section_id,
        "label_fa": label_fa,
        "label_en": label_en,
        "checked": checked,
        "reason_fa": reason_fa,
        "reason_en": reason_en,
        "score": score,
        "findings": findings,
    }


# --------------------------------------------------------------------------- #
# 1. HTTP security headers
# --------------------------------------------------------------------------- #

def check_headers(homepage: transport.HttpResult | None) -> dict:
    label_fa, label_en = "هدرهای امنیتی HTTP", "HTTP security headers"
    if homepage is None:
        return make_section("headers", label_fa, label_en, [], "درخواست اصلی انجام نشد.", "The main request failed.")
    findings = []
    for header, short, fa, en in SECURITY_HEADERS:
        value = homepage.headers.get(header, "")
        if value:
            findings.append(_finding(header, f"{short} — {fa}", f"{short} — {en}", "pass", f"مقدار: {value[:160]}", f"Value: {value[:160]}", "", SNIPPETS[header]))
        else:
            findings.append(
                _finding(
                    header,
                    f"{short} — {fa}",
                    f"{short} — {en}",
                    "fail",
                    "این هدر در پاسخ دیده نشد.",
                    "This header was not present in the response.",
                    f"افزودن {short} در وب‌سرور یا CDN.",
                    SNIPPETS[header],
                    advice_en=f"Add {short} at the web server or CDN level.",
                )
            )
    server = homepage.headers.get("server", "")
    if server:
        findings.append(_finding("server", "هدر Server", "Server header", "info", f"مقدار: {server[:80]}", f"Value: {server[:80]}"))
    return make_section("headers", label_fa, label_en, findings)


# --------------------------------------------------------------------------- #
# 2. TLS
# --------------------------------------------------------------------------- #

def check_tls(domain: str, handshake: dict | None, error: str = "") -> dict:
    label_fa, label_en = "TLS/SSL", "TLS/SSL"
    if handshake is None:
        return make_section("tls", label_fa, label_en, [], f"اتصال TLS برقرار نشد: {error}", f"TLS handshake failed: {error}")
    findings = []
    protocol = handshake.get("protocol") or ""
    if protocol in {"TLSv1.3", "TLSv1.2"}:
        findings.append(_finding("protocol", "نسخهٔ پروتکل", "Protocol version", "pass", f"{protocol} پشتیبانی می‌شود.", f"{protocol} is in use."))
    else:
        findings.append(_finding("protocol", "نسخهٔ پروتکل", "Protocol version", "fail", f"نسخهٔ {protocol or 'نامشخص'} قدیمی است.", f"{protocol or 'unknown'} is outdated.", "TLS 1.2 حداقل و TLS 1.3 توصیه‌شده است."))
    bits = handshake.get("cipher_bits") or 0
    findings.append(
        _finding(
            "cipher",
            "قدرت رمزنگاری",
            "Cipher strength",
            "pass" if bits >= 128 else "fail",
            f"{handshake.get('cipher')} ({bits} بیت)",
            f"{handshake.get('cipher')} ({bits} bits)",
            "سوییت‌های AEAD مثل AES-GCM یا ChaCha20 را فعال کنید." if bits < 128 else "",
            advice_en="Enable AEAD suites such as AES-GCM or ChaCha20." if bits < 128 else "",
        )
    )
    certificate = handshake.get("certificate") or {}
    not_after = certificate.get("notAfter")
    if not_after:
        try:
            expiry = dt.datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=dt.timezone.utc)
            days_left = (expiry - dt.datetime.now(dt.timezone.utc)).days
            status = "pass" if days_left > 21 else "warn" if days_left > 7 else "fail"
            findings.append(
                _finding(
                    "expiry",
                    "انقضای گواهی",
                    "Certificate expiry",
                    status,
                    f"{days_left} روز تا انقضا",
                    f"{days_left} days until expiry",
                    "تمدید خودکار گواهی را فعال کنید." if days_left <= 21 else "",
                    advice_en="Turn on automatic certificate renewal." if days_left <= 21 else "",
                )
            )
        except ValueError:
            pass
    findings.append(
        _finding(
            "verified",
            "اعتبار گواهی",
            "Certificate validity",
            "pass" if handshake.get("verified") else "fail",
            "زنجیرهٔ گواهی توسط مرورگر قابل اعتبارسنجی است." if handshake.get("verified") else "گواهی معتبر نبود.",
            "The certificate chain verifies." if handshake.get("verified") else "The certificate did not verify.",
        )
    )
    return make_section("tls", label_fa, label_en, findings)


# --------------------------------------------------------------------------- #
# 3. DNS (public records via DNS-over-HTTPS on 443)
# --------------------------------------------------------------------------- #

def _txt_values(answers: list[dict]) -> list[str]:
    return [str(answer.get("data", "")).strip('"') for answer in answers if answer.get("type") in (16, 5)]


def _dns_lookup(name: str, record_type: str) -> dict:
    try:
        return transport.dns_over_https(name, record_type)
    except Exception:  # noqa: BLE001 - a failed lookup is data, not a crash
        return {"Status": -1, "Answer": []}


def check_dns(domain: str) -> dict:
    label_fa, label_en = "رکوردهای DNS", "DNS records"
    findings = []
    root_txt = _txt_values(_dns_lookup(domain, "TXT").get("Answer", []))
    spf = next((value for value in root_txt if value.lower().startswith("v=spf1")), "")
    findings.append(
        _finding("spf", "SPF", "SPF", "pass" if spf else "fail", spf or "رکورد SPF پیدا نشد.", spf or "No SPF record found.", "یک رکورد TXT با v=spf1 اضافه کنید.", advice_en="Add a TXT record starting with v=spf1.", snippet=f'{domain}. IN TXT "v=spf1 include:_spf.example.com -all"')
    )
    dmarc_answers = _txt_values(_dns_lookup(f"_dmarc.{domain}", "TXT").get("Answer", []))
    dmarc = next((value for value in dmarc_answers if value.lower().startswith("v=dmarc1")), "")
    findings.append(
        _finding("dmarc", "DMARC", "DMARC", "pass" if dmarc else "fail", dmarc or "رکورد DMARC پیدا نشد.", dmarc or "No DMARC record found.", "سیاست DMARC را با p=quarantine یا p=reject تنظیم کنید.", advice_en="Set a DMARC policy with p=quarantine or p=reject.", snippet=f'_dmarc.{domain}. IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"')
    )
    dkim_found = ""
    for selector in ("default", "google", "selector1", "selector2", "k1"):
        answers = _txt_values(_dns_lookup(f"{selector}._domainkey.{domain}", "TXT").get("Answer", []))
        if answers:
            dkim_found = selector
            break
    findings.append(
        _finding("dkim", "DKIM", "DKIM", "pass" if dkim_found else "warn", f"سلکتور فعال: {dkim_found}" if dkim_found else "سلکتور رایجی برای DKIM پیدا نشد.", f"Active selector: {dkim_found}" if dkim_found else "No common DKIM selector found.")
    )
    caa = [answer.get("data", "") for answer in _dns_lookup(domain, "CAA").get("Answer", [])]
    findings.append(
        _finding("caa", "CAA", "CAA", "pass" if caa else "warn", "محدودیت صادرکنندهٔ گواهی تنظیم شده است." if caa else "رکورد CAA تنظیم نشده است.", "Certificate issuers are restricted." if caa else "No CAA record is set.", "محدود کردن صادرکنندگان گواهی به یک CA مشخص." if not caa else "", snippet=f'{domain}. IN CAA 0 issue "letsencrypt.org"')
    )
    soa = _dns_lookup(domain, "SOA")
    dnssec = bool(soa.get("AD"))
    findings.append(_finding("dnssec", "DNSSEC", "DNSSEC", "pass" if dnssec else "warn", "پاسخ با اعتبارسنجی DNSSEC امضا شده است." if dnssec else "DNSSEC تأیید نشد.", "The answer is DNSSEC-validated." if dnssec else "DNSSEC was not validated."))
    findings.append(_finding("soa", "SOA", "SOA", "pass" if soa.get("Answer") else "warn", "رکورد SOA موجود است." if soa.get("Answer") else "SOA خوانده نشد.", "SOA record is present." if soa.get("Answer") else "SOA could not be read."))
    return make_section("dns", label_fa, label_en, findings)


# --------------------------------------------------------------------------- #
# 4. Cookies
# --------------------------------------------------------------------------- #

def check_cookies(homepage: transport.HttpResult | None) -> dict:
    label_fa, label_en = "کوکی‌ها", "Cookies"
    if homepage is None:
        return make_section("cookies", label_fa, label_en, [], "درخواست اصلی انجام نشد.", "The main request failed.")
    cookies = [value for key, value in homepage.headers.items() if key == "set-cookie"]
    if not cookies:
        return make_section("cookies", label_fa, label_en, [_finding("none", "بدون کوکی", "No cookies", "info", "در پاسخ اولیه کوکی تنظیم نشد.", "No cookie was set in the first response.")])
    findings = []
    for index, cookie in enumerate(cookies[:10], start=1):
        name = cookie.split("=", 1)[0].strip()
        flags = []
        if re.search(r";\s*secure", cookie, re.I):
            flags.append("Secure")
        if re.search(r";\s*httponly", cookie, re.I):
            flags.append("HttpOnly")
        same_site = re.search(r";\s*samesite=(\w+)", cookie, re.I)
        if same_site:
            flags.append(f"SameSite={same_site.group(1)}")
        missing = [flag for flag in ("Secure", "HttpOnly", "SameSite") if not any(item.startswith(flag) for item in flags)]
        findings.append(
            _finding(
                f"cookie-{index}",
                f"کوکی {name}",
                f"Cookie {name}",
                "pass" if not missing else "warn",
                f"پرچم‌ها: {', '.join(flags) or 'هیچ'}" + (f" — فاقد {', '.join(missing)}" if missing else ""),
                f"Flags: {', '.join(flags) or 'none'}" + (f" — missing {', '.join(missing)}" if missing else ""),
                "کوکی‌های احراز هویت باید Secure و HttpOnly و SameSite داشته باشند." if missing else "",
                advice_en="Authentication cookies need Secure, HttpOnly and SameSite." if missing else "",
            )
        )
    return make_section("cookies", label_fa, label_en, findings)


# --------------------------------------------------------------------------- #
# 5. Content placement (mixed content / third parties / forms)
# --------------------------------------------------------------------------- #

class _PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.resources: list[str] = []
        self.forms: list[str] = []
        self.generator = ""

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "meta" and attributes.get("name", "").lower() == "generator":
            self.generator = attributes.get("content", "")
        if tag == "form":
            self.forms.append(attributes.get("action", ""))
        for key in ("src", "href"):
            value = attributes.get(key, "")
            if value.startswith(("http://", "https://", "//")):
                self.resources.append(value)


def check_content(domain: str, homepage: transport.HttpResult | None) -> dict:
    label_fa, label_en = "قرارگیری محتوا", "Content placement"
    if homepage is None:
        return make_section("content", label_fa, label_en, [], "درخواست اصلی انجام نشد.", "The main request failed.")
    parser = _PageParser()
    try:
        parser.feed(homepage.body[:300_000])
    except Exception:  # noqa: BLE001
        pass
    findings = []
    mixed = [url for url in parser.resources if url.startswith("http://")]
    findings.append(
        _finding("mixed", "محتوای ترکیبی (mixed content)", "Mixed content", "pass" if not mixed else "fail", f"{len(mixed)} منبع ناامن" if mixed else "منبع ناامنی دیده نشد.", f"{len(mixed)} insecure resource(s)" if mixed else "No insecure resource was found.", "همهٔ منابع را با https بارگذاری کنید." if mixed else "",
        advice_en="Load every resource over https." if mixed else "",)
    )
    third_party = sorted({re.sub(r"^(https?:)?//", "", url).split("/")[0] for url in parser.resources if re.sub(r"^(https?:)?//", "", url).split("/")[0] not in {domain, f"www.{domain}"}})
    findings.append(
        _finding("third-party", "منابع ثالث", "Third-party resources", "warn" if third_party else "pass", f"{len(third_party)} میزبان ثالث: {', '.join(third_party[:5])}" if third_party else "منبع ثالثی دیده نشد.", f"{len(third_party)} third-party host(s): {', '.join(third_party[:5])}" if third_party else "No third-party resource was seen.")
    )
    insecure_forms = [action for action in parser.forms if action.startswith("http://")]
    findings.append(_finding("forms", "فرم‌های ناامن", "Insecure forms", "pass" if not insecure_forms else "fail", f"{len(insecure_forms)} فرم با action ناامن" if insecure_forms else "فرم ناامنی دیده نشد.", f"{len(insecure_forms)} form(s) posting over http" if insecure_forms else "No insecure form action was seen."))
    return make_section("content", label_fa, label_en, findings)


# --------------------------------------------------------------------------- #
# 6. Information leaks (read from what the site itself served — no path probing)
# --------------------------------------------------------------------------- #

GENERATOR_HINTS = ("wordpress", "drupal", "joomla", "laravel", "django", "express", "next.js", "nuxt")

GENERATOR_META_RE = re.compile(r"""<meta[^>]+name=["\']generator["\'][^>]*content=["\']([^"\']+)["\']""", re.I)

SENSITIVE_HINTS = ("/.env", "/.git", "/admin", "/phpinfo", "/backup", "/.svn", "/wp-login", "/server-status")


def check_leak(homepage: transport.HttpResult | None) -> dict:
    label_fa, label_en = "نشت اطلاعات", "Information leaks"
    if homepage is None:
        return make_section("leak", label_fa, label_en, [], "درخواست اصلی انجام نشد.", "The main request failed.")
    findings = []
    server = homepage.headers.get("server", "")
    if server:
        has_version = bool(re.search(r"\d", server))
        findings.append(
            _finding("server-banner", "بنر وب‌سرور", "Server banner", "fail" if has_version else "warn", f"مقدار کامل: {server}" if has_version else f"مقدار: {server}", f"Full value: {server}" if has_version else f"Value: {server}", "نسخهٔ دقیق را در هدر Server حذف یا پنهان کنید." if has_version else "",
                advice_en="Hide or remove the exact version from the Server header." if has_version else "",)
        )
    for header in ("x-powered-by", "x-aspnet-version", "x-generator"):
        if header in homepage.headers:
            findings.append(_finding(header, f"هدر {header}", f"{header} header", "fail", f"مقدار: {homepage.headers[header]}", f"Value: {homepage.headers[header]}", "این هدرها فناوری و نسخهٔ سمت سرور را افشا می‌کنند.", advice_en="These headers disclose the server technology and version."))
    lowered = homepage.body.lower()
    detected = [hint for hint in GENERATOR_HINTS if hint in lowered]
    generator = GENERATOR_META_RE.search(homepage.body)
    if generator:
        findings.append(
            _finding(
                "generator-meta",
                "متای generator",
                "Generator meta tag",
                "fail",
                f"صفحه نسخهٔ دقیق را اعلام می‌کند: {generator.group(1).strip()}",
                f"The page discloses an exact version: {generator.group(1).strip()}",
                "تگ meta با نام generator را حذف کنید یا نسخه را ننویسید.", advice_en="Remove the generator meta tag or drop the version number.",
            )
        )
    elif detected:
        findings.append(_finding("generator", "فناوری قابل تشخیص", "Detectable technology", "warn", f"نشانه‌های پیدا‌شده: {', '.join(detected)}", f"Detected hints: {', '.join(detected)}"))
    disclosed = [hint for hint in SENSITIVE_HINTS if hint in lowered]
    if disclosed:
        findings.append(
            _finding("disclosed-paths", "مسیرهای حساس افشاشده", "Self-disclosed sensitive paths", "warn", f"صفحهٔ اصلی به این مسیرها اشاره می‌کند: {', '.join(disclosed)}", f"The homepage references: {', '.join(disclosed)}", "این مسیرها را حذف یا دسترسی آن‌ها را محدود کنید. (هیچ مسیری در این بررسی probe نشد.)", advice_en="Remove those paths or restrict access. (No path was probed in this check.)")
        )
    if not findings:
        findings.append(_finding("clean", "بدون نشانهٔ افشا", "No obvious leak", "pass", "نشانه‌ای از افشای نسخه یا مسیر حساس دیده نشد.", "No version or sensitive-path leak was seen."))
    return make_section("leak", label_fa, label_en, findings)


def default_context() -> ssl.SSLContext:  # pragma: no cover - convenience for tooling
    return ssl.create_default_context()
