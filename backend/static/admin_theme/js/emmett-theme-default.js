(function () {
  "use strict";

  try {
    if (window.localStorage.getItem("theme") === null) {
      window.localStorage.setItem("theme", "light");
    }
  } catch (error) {
    return;
  }
})();
