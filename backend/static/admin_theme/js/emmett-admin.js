/* ==========================================================================
   Emmett Admin — تنظیمات کوچک سمت مرورگر (فاز ۶، ADR-0027)
   --------------------------------------------------------------------------
   عمداً «حداقلی» نگه داشته شده است: هیچ کتابخانه‌ای اضافه نمی‌کند، هیچ CDN‌ای
   صدا نمی‌زند و همهٔ کارها «افزایش تدریجی» (progressive enhancement) هستند؛
   یعنی اگر این فایل اجرا نشود، ادمین کامل و درست کار می‌کند.

   تنها کارهای آن:
   1) علامت‌گذاری ریشهٔ سند برای CSS/دیباگ (data-emmett-admin).
   2) در RTL، بازمحاسبهٔ چیدمان تب‌های فرم پس از ساخته‌شدن تب‌های ترجمه
      (modeltranslation تب‌ها را با jQuery بعد از DOMReady می‌سازد و Jazzmin
      آفست افقی چیدمان را با اندازهٔ فعلی محاسبه می‌کند؛ یک رخداد resize
      باعث بازمحاسبه می‌شود — راه‌حل استاندارد و بدون دست‌کاری JS شخص ثالث).
   3) جلوگیری از ارسال دوبارهٔ فرم‌های طولانی (Import/Export و ذخیرهٔ رکورد)
      با غیرفعال‌کردن دکمهٔ ارسال پس از اولین کلیک معتبر.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  root.setAttribute("data-emmett-admin", "1");

  function isRtl() {
    return root.getAttribute("dir") === "rtl";
  }

  /** بازمحاسبهٔ چیدمان تب‌ها/سایدبار بدون تغییر منطق کتابخانه‌های بالادستی. */
  function refreshLayout() {
    try {
      window.dispatchEvent(new Event("resize"));
    } catch (error) {
      /* مرورگرهای قدیمی: Event سازنده ندارند — بی‌اهمیت و بی‌خطر. */
      var event = document.createEvent("Event");
      event.initEvent("resize", true, true);
      window.dispatchEvent(event);
    }
  }

  function scheduleLayoutRefresh() {
    if (!isRtl()) {
      return;
    }
    window.setTimeout(refreshLayout, 120);
  }

  /** محافظت از ارسال دوبارهٔ فرم (بدون هیچ اثری روی اعتبارسنجی خودِ Django). */
  function guardAgainstDoubleSubmit() {
    var forms = document.querySelectorAll("form[data-emmett-guard], form#changelist-form, form#content-form");
    Array.prototype.forEach.call(forms, function (form) {
      form.addEventListener("submit", function () {
        var buttons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
        Array.prototype.forEach.call(buttons, function (button) {
          window.setTimeout(function () {
            button.disabled = true;
            button.classList.add("disabled");
          }, 0);
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    scheduleLayoutRefresh();
    guardAgainstDoubleSubmit();
  });

  /* اگر تب‌های ترجمه با تأخیر ساخته شوند (تصویر/شبکه کند)، یک‌بار دیگر هم
     بعد از کامل‌شدن بارگذاری صفحه چیدمان را بازمحاسبه می‌کنیم. */
  window.addEventListener("load", function () {
    window.setTimeout(refreshLayout, 200);
  });
})();
