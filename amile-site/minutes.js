/* Hub-only minutes extras. Not loaded on wine or jewellery. */
(function () {
  var LANG = "amileLang";
  var FX = "amileFx";
  var WISH = "amileWish";
  var BAG = "amileBag";
  var CATALOG = {
    cabernet: { name: "Cabernet Sauvignon", href: "/wine.html" },
    "statement-front": { name: "Statement ring", href: "/jewellery.html" },
    chenin: { name: "Chenin Blanc", href: "/wine.html" },
    "statement-side": { name: "Statement — side", href: "/jewellery.html" },
    pinotage: { name: "Pinotage", href: "/wine.html" },
    "statement-angle": { name: "Statement — angle", href: "/jewellery.html" },
    rose: { name: "Sweet Rosé", href: "/wine.html" },
    "gift-reds": { name: "Gift guide — reds", href: "/gifts.html" },
    "gift-celebrate": { name: "Gift guide — celebration", href: "/gifts.html" },
    "gift-jewel": { name: "Gift guide — jewellery", href: "/gifts.html" },
    "gift-house": { name: "Gift guide — the house", href: "/gifts.html" }
  };
  var dict = {
    en: {
      quoteZar: "Quote in rand — no price is listed.",
      quoteUsd: "Quote in dollars — no price is listed.",
      quoteGbp: "Quote in pounds — no price is listed.",
      line: "Cape wine. British jewellery.",
      hear: "Cape wine. British jewellery. Amile is a lifestyle house.",
      wish: "Wishlist",
      bag: "Bag",
      emptyWish: "Nothing saved yet.",
      emptyBag: "The bag is empty — nothing is charged on this page.",
      move: "Move to bag",
      remove: "Remove",
      trayTitle: "Saved for later",
      bagHint: "Move a saved piece into the bag. There is no checkout here."
    },
    af: {
      quoteZar: "Kwotasie in rand — geen prys hier nie.",
      quoteUsd: "Kwotasie in dollar — geen prys hier nie.",
      quoteGbp: "Kwotasie in pond — geen prys hier nie.",
      line: "Kaapse wyn. Britse juweliersware.",
      hear: "Kaapse wyn. Britse juweliersware. Amile is ’n leefstylhuis.",
      wish: "Wenslys",
      bag: "Sak",
      emptyWish: "Nog niks gestoor nie.",
      emptyBag: "Die sak is leeg — niks word hier gehef nie.",
      move: "Skuif na die sak",
      remove: "Verwyder",
      trayTitle: "Gestoor vir later",
      bagHint: "Skuif ’n gestoorde stuk na die sak. Daar is geen afrekening hier nie."
    },
    zu: {
      quoteZar: "Ikhothi nge-rand — ayikho intengo lapha.",
      quoteUsd: "Ikhothi ngamadola — ayikho intengo lapha.",
      quoteGbp: "Ikhothi ngepondo — ayikho intengo lapha.",
      line: "Iwayini yaseKapa. Ubucwebe baseBrithani.",
      hear: "Iwayini yaseKapa. Ubucwebe baseBrithani. I-Amile iyindlu yempilo.",
      wish: "Okuthandwayo",
      bag: "Isikhwama",
      emptyWish: "Akukho okugciniwe.",
      emptyBag: "Isikhwama singenalutho — akukhokhwa lapha.",
      move: "Yisa esikhwameni",
      remove: "Susa",
      trayTitle: "Kugcinelwe kamuva",
      bagHint: "Hambisa into egeciniwe esikhwameni. Akukho ukukhokha lapha."
    }
  };
  var langMap = { en: "en-ZA", af: "af-ZA", zu: "zu-ZA" };

  function readList(key) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function writeList(key, ids) {
    localStorage.setItem(key, JSON.stringify(ids));
  }

  function wishList() {
    return readList(WISH);
  }

  function bagList() {
    return readList(BAG);
  }

  function currentLang() {
    return dict[localStorage.getItem(LANG)] ? localStorage.getItem(LANG) : "en";
  }

  function currentFx() {
    var v = (localStorage.getItem(FX) || "zar").toLowerCase();
    return v === "usd" || v === "gbp" ? v : "zar";
  }

  function labelFor(id) {
    return (CATALOG[id] && CATALOG[id].name) || id;
  }

  function hrefFor(id) {
    return (CATALOG[id] && CATALOG[id].href) || "/";
  }

  function ensureTray() {
    if (document.getElementById("am-tray")) return;
    var aside = document.createElement("aside");
    aside.id = "am-tray";
    aside.className = "am-tray";
    aside.hidden = true;
    aside.setAttribute("role", "dialog");
    aside.setAttribute("aria-labelledby", "am-tray-title");
    aside.innerHTML =
      '<div class="am-tray__card">' +
      '<div class="am-tray__head"><h2 id="am-tray-title">Saved for later</h2>' +
      '<button type="button" class="am-tray__close" aria-label="Close saved tray">&times;</button></div>' +
      '<p class="am-tray__hint" data-i18n="bagHint"></p>' +
      '<h3 data-i18n="wish">Wishlist</h3><ul id="am-tray-wish"></ul>' +
      '<h3 data-i18n="bag">Bag</h3><ul id="am-tray-bag"></ul>' +
      '<p><a href="/saved.html">Open saved page</a></p>' +
      "</div>";
    document.body.appendChild(aside);
    aside.querySelector(".am-tray__close").addEventListener("click", function () {
      aside.hidden = true;
    });
    aside.addEventListener("click", function (e) {
      if (e.target === aside) aside.hidden = true;
    });
  }

  function rowHtml(id, mode, pack) {
    var action =
      mode === "wish"
        ? '<button type="button" data-move="' +
          id +
          '">' +
          pack.move +
          "</button>"
        : '<button type="button" data-drop="' +
          id +
          '">' +
          pack.remove +
          "</button>";
    return (
      "<li><a href=\"" +
      hrefFor(id) +
      "\">" +
      labelFor(id) +
      "</a> " +
      action +
      "</li>"
    );
  }

  function fillList(el, ids, mode, pack) {
    if (!el) return;
    if (!ids.length) {
      el.innerHTML =
        "<li>" + (mode === "wish" ? pack.emptyWish : pack.emptyBag) + "</li>";
      return;
    }
    el.innerHTML = ids.map(function (id) {
      return rowHtml(id, mode, pack);
    }).join("");
  }

  function apply() {
    var lang = currentLang();
    var fx = currentFx();
    var pack = dict[lang];
    var quoteKey = fx === "usd" ? "quoteUsd" : fx === "gbp" ? "quoteGbp" : "quoteZar";
    document.documentElement.lang = lang === "zu" ? "zu" : lang;
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });
    document.querySelectorAll("[data-fx]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-fx") === fx ? "true" : "false");
    });
    document.querySelectorAll("[data-i18n='quote']").forEach(function (el) {
      el.textContent = pack[quoteKey];
    });
    document.querySelectorAll("[data-i18n='line']").forEach(function (el) {
      el.textContent = pack.line;
    });
    document.querySelectorAll("[data-i18n='bagHint']").forEach(function (el) {
      el.textContent = pack.bagHint;
    });
    document.querySelectorAll("[data-i18n='wish']").forEach(function (el) {
      if (!el.hasAttribute("data-wish-count")) el.textContent = pack.wish;
    });
    document.querySelectorAll("[data-i18n='bag']").forEach(function (el) {
      if (!el.hasAttribute("data-bag-count")) el.textContent = pack.bag;
    });
    var ids = wishList();
    var bag = bagList();
    document.querySelectorAll("[data-wish-count]").forEach(function (el) {
      el.textContent = pack.wish + " " + ids.length;
    });
    document.querySelectorAll("[data-bag-count]").forEach(function (el) {
      el.textContent = pack.bag + " " + bag.length;
    });
    document.querySelectorAll("[data-wish]").forEach(function (btn) {
      var on = ids.indexOf(btn.getAttribute("data-wish")) !== -1;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "♥" : "♡";
    });
    var title = document.getElementById("am-tray-title");
    if (title) title.textContent = pack.trayTitle;
    fillList(document.getElementById("am-tray-wish"), ids, "wish", pack);
    fillList(document.getElementById("am-tray-bag"), bag, "bag", pack);
    fillList(document.getElementById("am-saved-wish"), ids, "wish", pack);
    fillList(document.getElementById("am-saved-bag"), bag, "bag", pack);
  }

  function openTray() {
    ensureTray();
    apply();
    document.getElementById("am-tray").hidden = false;
  }

  document.querySelectorAll("[data-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      localStorage.setItem(LANG, btn.getAttribute("data-lang"));
      apply();
    });
  });
  document.querySelectorAll("[data-fx]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      localStorage.setItem(FX, btn.getAttribute("data-fx"));
      apply();
    });
  });
  document.querySelectorAll("[data-wish]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var id = btn.getAttribute("data-wish");
      var ids = wishList();
      var i = ids.indexOf(id);
      if (i === -1) ids.push(id);
      else ids.splice(i, 1);
      writeList(WISH, ids);
      apply();
    });
  });
  document.body.addEventListener("click", function (e) {
    var move = e.target.getAttribute && e.target.getAttribute("data-move");
    var drop = e.target.getAttribute && e.target.getAttribute("data-drop");
    if (move) {
      var ids = wishList().filter(function (id) {
        return id !== move;
      });
      var bag = bagList();
      if (bag.indexOf(move) === -1) bag.push(move);
      writeList(WISH, ids);
      writeList(BAG, bag);
      apply();
    }
    if (drop) {
      writeList(
        BAG,
        bagList().filter(function (id) {
          return id !== drop;
        })
      );
      apply();
    }
  });
  document.querySelectorAll("[data-wish-count]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      openTray();
    });
  });
  document.querySelectorAll("[data-bag-count]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      openTray();
    });
  });
  var voice = document.getElementById("am-voice");
  if (voice && window.speechSynthesis) {
    voice.addEventListener("click", function () {
      var lang = currentLang();
      var utter = new SpeechSynthesisUtterance(dict[lang].hear);
      utter.lang = langMap[lang];
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    });
  }
  var news = document.getElementById("am-news");
  if (news) {
    news.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = document.getElementById("am-news-ok");
      if (ok) ok.hidden = false;
    });
  }
  ensureTray();
  apply();
})();
