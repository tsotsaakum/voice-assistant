/* Amile Wines — on-page FAQ concierge. Keyword match only; no prices invented. */
(function () {
  var log = document.getElementById("amc-log");
  var form = document.getElementById("amc-form");
  var input = document.getElementById("amc-q");
  var launcher = document.getElementById("amc-launcher");
  var panel = document.getElementById("amc-panel");
  var closer = document.getElementById("amc-close");
  if (!log || !form || !input || !launcher || !panel) return;

  var HELLO =
    "Ask Amile — wine, jewellery, shipping, or 18+. Tap a chip or type. We do not list prices here.";

  var FAQ = [
    {
      id: "shipping",
      keys: ["ship", "deliver", "courier", "postage", "send", "address", "dispatch"],
      text:
        "Shipping is quoted once we have a delivery address. We do not publish a Rand rate on this page. Share your town or suburb and we will come back with a courier quote."
    },
    {
      id: "age",
      keys: ["age", "18", "underage", "legal", "minor", "old enough", "adult"],
      text:
        "Amile wine is 18+ in South Africa. We only sell to people who are eighteen or older. Have your ID ready if a courier asks to confirm age on delivery."
    },
    {
      id: "price",
      keys: ["price", "cost", "rand", "euro", "how much", "buy", "cheap"],
      text:
        "There are no prices in the Amile wines catalogue PDF, so this page does not invent Rands or euros. Ask the house via the contact sites when you are ready to order."
    },
    {
      id: "tasting",
      keys: ["tast", "note", "flavour", "flavor", "nose", "palate", "pair", "food"],
      text:
        "Tasting notes from the bottle labels: Cabernet Sauvignon 2020 — black currant, blueberries and mocha, smooth tannins, velvety finish; good with venison, duck or lamb. Pinotage 2015 — dark fruits, smoky vanilla, cigars and cedar, 14.5%, Stellenbosch. Sweet Rosé 2018 — refreshing, easy drinking, everyday enjoyment, 14.0% vol, Devon Valley. Chenin Blanc 2021 — white pear, peach and guava, fresh yet smooth; enjoy alone or with seafood, pizza or salad."
    },
    {
      id: "wines",
      keys: ["wine", "four", "range", "bottle", "sku", "list", "catalogue", "catalog"],
      text:
        "Four wines, all Amile, from the catalogue PDF: Cabernet Sauvignon 2020 (Western Cape, 750 ml), Pinotage 2015 (Stellenbosch, 14.5%), Sweet Rosé 2018 (Devon Valley Stellenbosch, 14.0% vol), Chenin Blanc 2021 (Western Cape; a blend of noble white varietals). No other SKUs and no prices in the PDF."
    },
    {
      id: "cabernet",
      keys: ["cabernet", "cab ", "2020", "mocha", "currant"],
      text:
        "Cabernet Sauvignon 2020 — W.O. Western Cape, Wine of South Africa, 750 ml. Nose of black currant, blueberries and mocha; palate of smooth tannins and a long velvety finish. Pairs with venison, duck breasts or lamb chops. Silver capsule, black label. No price in the catalogue."
    },
    {
      id: "pinotage",
      keys: ["pinotage", "2015", "stellenbosch", "cedar", "cigar"],
      text:
        "Pinotage 2015 — Stellenbosch (also marked W.O. Western Cape). Alcohol 14.5%. Full bodied red with dark fruits, smoky vanilla, cigars and cedar wood; well balanced with elegant integrated tannins. Gold capsule on the front photo. No price in the catalogue."
    },
    {
      id: "rose",
      keys: ["ros", "rose", "2018", "devon", "sweet", "everyday"],
      text:
        "Sweet Rosé 2018 — labelled Rosé on the front, Sweet Rose 2018 on the back. W.O. Devon Valley Stellenbosch, 14.0% vol, 750 ml. Grapes are handpicked and hand sorted, then matured in French oak for 12 months. Back label: refreshing, easy drinking wine; a wine for everyday enjoyment. No grape variety named. No price in the catalogue."
    },
    {
      id: "chenin",
      keys: ["chenin", "blanc", "2021", "guava", "peach", "pear", "white"],
      text:
        "Chenin Blanc 2021 — W.O. Western Cape, 750 ml. Back label also calls it a blend of noble white varietals. Ripe tropical fruit: white pear, peach and guava; palate fresh yet smooth. Enjoy on its own or with seafood, pizza or salad. Silver capsule, white label. No price in the catalogue."
    },
    {
      id: "jewellery",
      keys: ["jewel", "ring", "halo", "pendant", "diamond", "pear", "floral", "statement", "bracelet", "earring", "engagement"],
      text:
        "Amile jewellery is British-made. The Jewellery tab shows the floral pear statement ring from @amilediamonds in four studio views (front, angle, side, profile). Open /jewellery.html to browse. We do not invent prices."
    },
    {
      id: "house",
      keys: ["home", "house", "lifestyle", "service", "shop wine", "shop jewellery"],
      text:
        "Amile is one house: Cape wine and British jewellery. The homepage has Shop wine and Shop jewellery. Tabs: Home, Wine, Jewellery, Contact, Instagram, Delivery."
    },
    {
      id: "delivery",
      keys: ["quote", "suburb", "town", "id ping", "uber", "handover"],
      text:
        "Use Delivery for a shipping quotation (suburb or town). Wine is 18+: the courier may ping for ID — no ID, no handover. Jewellery does not need the ID ping. No Rand rate is published on this site."
    },
    {
      id: "instagram",
      keys: ["instagram", "reel", "amilediamonds", "amilewines"],
      text:
        "Jewellery stills: instagram.com/amilediamonds — pear halo reel C7D634FOr51. Wines: instagram.com/amilewines2023."
    },
    {
      id: "contact",
      keys: ["contact", "email", "phone", "whatsapp", "website", "amile", "www"],
      text:
        "The bottles point to www.amilelifestyle.com (Cabernet, Pinotage, Chenin) and www.amilewines.co.za (Rosé). This page is a shop preview only — use those sites to reach the house. We have not added a phone or WhatsApp number here."
    },
    {
      id: "sulphite",
      keys: ["sulph", "sulfite", "allergen", "a147", "a1293"],
      text:
        "Labels mark Contains Sulphites A147 on Cabernet, Pinotage and Chenin, and CONTAINS SULPHATES A1293 on the Rosé."
    }
  ];

  function bubble(role, html) {
    var el = document.createElement("div");
    el.className = "amc-msg amc-msg--" + role;
    el.innerHTML = html;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function openPanel() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    input.focus();
  }

  function closePanel() {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  function answer(q) {
    var s = " " + String(q || "").toLowerCase().replace(/é/g, "e") + " ";
    if (!s.trim()) {
      return HELLO;
    }
    var i;
    for (i = 0; i < FAQ.length; i++) {
      var keys = FAQ[i].keys;
      var k;
      for (k = 0; k < keys.length; k++) {
        if (s.indexOf(keys[k]) !== -1) return FAQ[i].text;
      }
    }
    return "I can help with shipping, jewellery, the four wines, the 18+ age rule, tasting notes, or contact. Try one of those — I will not guess a price.";
  }

  function ask(q) {
    var text = String(q || "").trim();
    if (!text) return;
    bubble("you", "<p></p>").querySelector("p").textContent = text;
    var reply = answer(text);
    var bot = bubble("bot", "<p></p>");
    bot.querySelector("p").textContent = reply;
  }

  launcher.addEventListener("click", function () {
    if (panel.hidden) openPanel();
    else closePanel();
  });

  if (closer) closer.addEventListener("click", closePanel);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) closePanel();
  });

  document.querySelectorAll("[data-amc]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      openPanel();
      ask(chip.getAttribute("data-amc") || chip.textContent);
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value;
    input.value = "";
    ask(q);
  });

  bubble("bot", "<p></p>").querySelector("p").textContent = HELLO;
})();
