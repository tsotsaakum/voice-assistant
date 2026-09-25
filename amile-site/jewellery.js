/* Dark 3-up collection strip. Front / Angle / Side / Profile tap to feature. */
(function () {
  var pieces = [
    { src: "/images/statement-ring-front.jpg", alt: "Floral pear statement ring, front" },
    { src: "/images/statement-ring-angle.jpg", alt: "Statement ring, three-quarter view" },
    { src: "/images/statement-ring-side.jpg", alt: "Statement ring, side profile" },
    { src: "/images/statement-ring-profile.jpg", alt: "Statement ring, gallery profile" }
  ];

  var slots = document.querySelectorAll("[data-ab-slot] img");
  var chapters = document.querySelectorAll("[data-ab-piece]");
  if (!slots.length) return;

  var current = 0;

  function show() {
    slots.forEach(function (img, n) {
      var item = pieces[(current + n) % pieces.length];
      img.src = item.src;
      img.alt = item.alt;
    });
    chapters.forEach(function (ch) {
      var on = Number(ch.getAttribute("data-ab-piece")) === current;
      ch.classList.toggle("is-on", on);
      ch.setAttribute("aria-current", on ? "true" : "false");
    });
  }

  function go(index) {
    current = (index + pieces.length) % pieces.length;
    show();
  }

  document.querySelectorAll("[data-ab-dir]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      go(current + Number(btn.getAttribute("data-ab-dir")));
    });
  });

  chapters.forEach(function (ch) {
    ch.addEventListener("click", function () {
      go(Number(ch.getAttribute("data-ab-piece")));
    });
  });

  show();
})();
