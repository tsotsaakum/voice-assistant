/* Amile Wines — three-stage 18+ gate (entry, checkout, courier ID ping). */
(function () {
  var KEY = "amileWineAge";
  var YEAR = new Date().getFullYear();
  var entry = document.getElementById("am-entry");
  var checkout = document.getElementById("am-checkout");
  var ping = document.getElementById("am-ping");
  var shop = document.getElementById("am-shop");
  if (!entry || !checkout || !ping || !shop) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pendingWine = "Amile wine";

  function adultFromYear(raw) {
    var y = parseInt(raw, 10);
    if (!y || y < 1900 || y > YEAR) return null;
    return YEAR - y >= 18;
  }

  function lockPage(on) {
    document.documentElement.classList.toggle("am-locked", on);
    shop.setAttribute("aria-hidden", on ? "true" : "false");
    document.querySelectorAll(".amc-launcher, .amc-panel").forEach(function (el) {
      el.hidden = !!on && el.classList.contains("amc-launcher") ? false : el.hidden;
      if (el.classList.contains("amc-launcher")) {
        el.style.visibility = on ? "hidden" : "";
        el.style.pointerEvents = on ? "none" : "";
      }
    });
    var launcher = document.getElementById("amc-launcher");
    if (launcher) {
      launcher.style.visibility = on ? "hidden" : "";
      launcher.style.pointerEvents = on ? "none" : "";
    }
    var panel = document.getElementById("amc-panel");
    if (on && panel) panel.hidden = true;
  }

  function showEntry(mode) {
    entry.hidden = false;
    entry.dataset.mode = mode || "ask";
    entry.querySelectorAll("[data-entry]").forEach(function (node) {
      node.hidden = node.getAttribute("data-entry") !== (mode || "ask");
    });
    lockPage(true);
    var focusEl = entry.querySelector("[data-entry='" + (mode || "ask") + "'] input, [data-entry='" + (mode || "ask") + "'] button");
    if (focusEl && !reduce) focusEl.focus();
  }

  function hideEntry() {
    entry.hidden = true;
    lockPage(false);
  }

  function openCheckout(wine) {
    pendingWine = wine || "Amile wine";
    checkout.hidden = false;
    checkout.querySelector("[data-checkout='ask']").hidden = false;
    checkout.querySelector("[data-checkout='no']").hidden = true;
    var title = document.getElementById("am-checkout-wine");
    if (title) title.textContent = pendingWine;
    var year = document.getElementById("am-check-year");
    var place = document.getElementById("am-check-place");
    var err = document.getElementById("am-check-err");
    if (year) year.value = "";
    if (place) place.value = "";
    if (err) err.hidden = true;
    checkout.setAttribute("aria-hidden", "false");
    if (year) year.focus();
  }

  function closeCheckout() {
    checkout.hidden = true;
    checkout.setAttribute("aria-hidden", "true");
  }

  function showPing(place) {
    closeCheckout();
    ping.hidden = false;
    var line = document.getElementById("am-ping-place");
    if (line) {
      line.textContent = place
        ? "We will send a courier quotation for " + place + " — no Rand rate is listed on this page."
        : "We will send a courier quotation for your address — no Rand rate is listed on this page.";
    }
    ping.setAttribute("aria-hidden", "false");
  }

  function closePing() {
    ping.hidden = true;
    ping.setAttribute("aria-hidden", "true");
  }

  var stored = sessionStorage.getItem(KEY);
  if (stored === "no") {
    showEntry("no");
  } else if (stored === "ok") {
    hideEntry();
  } else {
    showEntry("ask");
  }

  var entryForm = document.getElementById("am-entry-form");
  if (entryForm) {
    entryForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var adult = adultFromYear(document.getElementById("am-entry-year").value);
      var err = document.getElementById("am-entry-err");
      if (adult === null) {
        if (err) {
          err.hidden = false;
          err.textContent = "Enter a four-digit birth year.";
        }
        return;
      }
      if (!adult) {
        sessionStorage.setItem(KEY, "no");
        showEntry("no");
        return;
      }
      sessionStorage.setItem(KEY, "ok");
      hideEntry();
    });
  }

  var confirmBtn = document.getElementById("am-entry-confirm");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", function () {
      sessionStorage.setItem(KEY, "ok");
      hideEntry();
    });
  }

  document.querySelectorAll("[data-quote]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (sessionStorage.getItem(KEY) !== "ok") {
        showEntry("ask");
        return;
      }
      openCheckout(btn.getAttribute("data-quote"));
    });
  });

  var checkForm = document.getElementById("am-check-form");
  if (checkForm) {
    checkForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = document.getElementById("am-check-err");
      var adult = adultFromYear(document.getElementById("am-check-year").value);
      var place = (document.getElementById("am-check-place").value || "").trim();
      if (adult === null) {
        if (err) {
          err.hidden = false;
          err.textContent = "Enter your birth year again — checkout re-checks age.";
        }
        return;
      }
      if (!adult) {
        checkout.querySelector("[data-checkout='ask']").hidden = true;
        checkout.querySelector("[data-checkout='no']").hidden = false;
        return;
      }
      if (!place) {
        if (err) {
          err.hidden = false;
          err.textContent = "Add a suburb or town so we can quote shipping. We do not invent a Rand rate.";
        }
        return;
      }
      showPing(place);
    });
  }

  var checkCancel = document.getElementById("am-check-cancel");
  if (checkCancel) checkCancel.addEventListener("click", closeCheckout);
  var checkCancelNo = document.getElementById("am-check-cancel-no");
  if (checkCancelNo) checkCancelNo.addEventListener("click", closeCheckout);

  var pingOk = document.getElementById("am-ping-ok");
  if (pingOk) pingOk.addEventListener("click", closePing);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!checkout.hidden) closeCheckout();
    if (!ping.hidden) closePing();
  });
})();
