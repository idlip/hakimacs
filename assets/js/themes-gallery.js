/**
 * /themes gallery — hover preview + click-to-pin.
 * Reuses palette.js's applyCustomPalette (window.emacsBlog.palette) instead of
 * duplicating the --baseXX assignment logic. No-ops on any page without cards.
 */
(function () {
  "use strict";

  var cards = document.querySelectorAll(".scheme-card");
  if (!cards.length) return;

  var BASE_KEYS = [
    "base00",
    "base01",
    "base02",
    "base03",
    "base04",
    "base05",
    "base06",
    "base07",
    "base08",
    "base09",
    "base0A",
    "base0B",
    "base0C",
    "base0D",
    "base0E",
    "base0F",
  ];
  var snap = null;

  function apply(colors) {
    window.emacsBlog &&
      window.emacsBlog.palette &&
      window.emacsBlog.palette.applyCustomPalette &&
      window.emacsBlog.palette.applyCustomPalette(colors);
  }

  function snapshot() {
    var root = document.documentElement;
    snap = BASE_KEYS.map(function (k) {
      return root.style.getPropertyValue("--" + k);
    });
  }

  function restore() {
    if (!snap) return;
    var root = document.documentElement;
    BASE_KEYS.forEach(function (k, i) {
      snap[i]
        ? root.style.setProperty("--" + k, snap[i])
        : root.style.removeProperty("--" + k);
    });
    snap = null;
  }

  cards.forEach(function (card) {
    var btn = card.querySelector(".scheme-card-btn");
    if (!btn) return;
    var colors = JSON.parse(btn.dataset.colors);
    var key = btn.dataset.key;
    var name = btn.dataset.name;

    // Hover preview covers the whole card (author link included) — mouse-only,
    // no a11y concern. Keyboard preview + the actual pin action stay scoped to
    // the button, the card's one real interactive/focusable control.
    card.addEventListener("mouseenter", function () {
      if (!snap) snapshot();
      apply(colors);
    });
    card.addEventListener("mouseleave", restore);
    btn.addEventListener("focus", function () {
      if (!snap) snapshot();
      apply(colors);
    });
    btn.addEventListener("blur", restore);

    btn.addEventListener("click", function () {
      apply(colors);
      localStorage.setItem(
        "emacs-custom-palette",
        JSON.stringify({ key: key, name: name, colors: colors }),
      );
      document.documentElement.removeAttribute("data-scheme");
      snap = null;
      window.emacsBlog &&
        window.emacsBlog.keyboard &&
        window.emacsBlog.keyboard.showMessage &&
        window.emacsBlog.keyboard.showMessage("Pinned: " + name);
      window.emacsBlog &&
        window.emacsBlog.menu &&
        window.emacsBlog.menu.refreshPinState &&
        window.emacsBlog.menu.refreshPinState();
    });
  });
})();
