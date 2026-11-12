(function () {
  "use strict";

  var root = document.documentElement;
  root.setAttribute("data-emmett-admin", "1");

  function refreshLayout() {
    try {
      window.dispatchEvent(new Event("resize"));
    } catch (error) {
      var resizeEvent = document.createEvent("Event");
      resizeEvent.initEvent("resize", true, true);
      window.dispatchEvent(resizeEvent);
    }
  }

  function scheduleLayoutRefresh() {
    if (root.getAttribute("dir") === "rtl") {
      window.setTimeout(refreshLayout, 120);
    }
  }

  function setupNavigation() {
    var main = document.getElementById("main");
    var sidebar = document.getElementById("nav-sidebar");
    var toggle = document.getElementById("toggle-nav-sidebar");

    if (!main || !sidebar || !toggle) {
      return;
    }

    function syncExpandedState() {
      var expanded = main.classList.contains("shifted");
      toggle.setAttribute("aria-expanded", String(expanded));
      sidebar.setAttribute("aria-expanded", String(expanded));
    }

    toggle.addEventListener("click", syncExpandedState);
    main.addEventListener("click", function (event) {
      if (event.target === main && window.matchMedia("(max-width: 767px)").matches && main.classList.contains("shifted")) {
        toggle.click();
      }
    });
    syncExpandedState();

    if (window.matchMedia("(max-width: 767px)").matches && main.classList.contains("shifted")) {
      toggle.click();
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && window.matchMedia("(max-width: 767px)").matches && main.classList.contains("shifted")) {
        toggle.click();
        toggle.focus();
      }
    });
  }

  function setupConfirmation() {
    document.querySelectorAll("form[data-emmett-confirm]").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        if (!window.confirm(form.getAttribute("data-emmett-confirm"))) {
          event.preventDefault();
        }
      });
    });
  }

  function setupExportSelection() {
    document.querySelectorAll("[data-emmett-select-toggle]").forEach(function (toggle) {
      toggle.addEventListener("change", function () {
        document
          .querySelectorAll('.selectable-field-export-row input[type="checkbox"]')
          .forEach(function (checkbox) {
            checkbox.checked = toggle.checked;
          });
      });
    });
  }

  function setupDoubleSubmitGuard() {
    document.querySelectorAll("form[data-emmett-guard], form#changelist-form, form#content-form").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        if (event.defaultPrevented) {
          return;
        }
        form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(function (button) {
          window.setTimeout(function () {
            if (!event.defaultPrevented) {
              button.disabled = true;
            }
          }, 0);
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupNavigation();
    setupConfirmation();
    setupExportSelection();
    setupDoubleSubmitGuard();
    scheduleLayoutRefresh();
  });

  window.addEventListener("load", function () {
    window.setTimeout(refreshLayout, 200);
  });
})();
