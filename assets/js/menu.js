/**
 * Menu Bar Interactions for Emacs Blog Theme
 */

(function () {
  "use strict";

  // ── State ─────────────────────────────────────────────────────────────────
  let previewScheme = null; // scheme being hovered (for live preview)

  // ── DOM ───────────────────────────────────────────────────────────────────
  const menuBar = document.querySelector(".menu-bar");
  const menuItems = document.querySelectorAll(".menu-item");
  const hamburger = document.querySelector(".menu-hamburger");
  const backdrop = document.getElementById("menu-backdrop");
  const schemePopupBtn = document.getElementById("scheme-popup-btn");
  const schemePopup = document.getElementById("scheme-popup");
  const schemePopupContainer = document.getElementById(
    "scheme-popup-container",
  );

  // ── Theme ─────────────────────────────────────────────────────────────────

  function toggleTheme() {
    const root = document.documentElement;
    const cur = root.getAttribute("data-theme") === "light" ? "light" : "dark";
    const want = cur === "dark" ? "light" : "dark";
    // Flip only if the current scheme actually defines the wanted variant.
    // Tentatively switch and check whether the palette changed; if not — a
    // dark-only preset (e.g. Everforest, Monokai) or a single-variant custom
    // palette — revert and route to a search for schemes of the wanted mode,
    // rather than showing an unmapped/broken theme. Self-maintaining: any scheme
    // that later gains a real variant will just flip.
    const before = getComputedStyle(root).getPropertyValue("--base00").trim();
    root.setAttribute("data-theme", want);
    const after = getComputedStyle(root).getPropertyValue("--base00").trim();
    if (before === after) {
      root.setAttribute("data-theme", cur);
      showMsg("No " + want + " variant for this scheme — pick one");
      window.emacsBlog?.palette?.open("t " + want);
      return;
    }
    localStorage.setItem("emacs-theme", want);
    // Name the scheme it switched to, e.g. "Dracula · Light", not just the mode.
    var opt = document.querySelector(
      '.scheme-option[data-scheme="' +
        (root.getAttribute("data-scheme") || "") +
        '"] span:last-child',
    );
    var name = opt ? opt.textContent.trim() : "Modus";
    showMsg(name + " · " + (want === "dark" ? "Dark" : "Light"));
  }

  // ── Color Scheme ──────────────────────────────────────────────────────────

  function applyScheme(name) {
    // Clear any custom palette from palette.js "t " mode
    window.emacsBlog?.palette?.clearCustomPalette?.();
    const html = document.documentElement;
    if (name) html.setAttribute("data-scheme", name);
    else html.removeAttribute("data-scheme");
    updateSchemeMarkers(name || "");
  }

  function updateSchemeMarkers(current) {
    document.querySelectorAll(".scheme-option").forEach((opt) => {
      opt.classList.toggle("active", (opt.dataset.scheme || "") === current);
    });
  }

  // Scheme state sync. The scheme itself (pinned / custom / fresh random) is
  // applied BEFORE paint by head.html's inline script, so we must NOT re-apply
  // here — doing so caused a visible repaint on every page load. We only sync
  // the menu's active-marker + pin label to whatever is already showing.
  function initRandomScheme() {
    const custom = localStorage.getItem("emacs-custom-palette") !== null;
    const pinned = isPinned();
    updateSchemeMarkers(
      document.documentElement.getAttribute("data-scheme") || "",
    );
    updatePinLabel(pinned);

    // First-visit only: announce that the scheme is random and pinnable. The
    // pin control is otherwise invisible until the user opens the menu.
    if (!pinned && !custom && !localStorage.getItem("emacs-scheme-hint-seen")) {
      const active = document.querySelector(
        ".scheme-option.active span:last-child",
      );
      const label = (active?.textContent || "random").trim();
      showMsg("Scheme: " + label + " (random each reload, pin in menu)");
      localStorage.setItem("emacs-scheme-hint-seen", "1");
    }
  }

  // Pinned = either mechanism: emacs-scheme-fixed (menu presets, e.g. haki,
  // dracula) or emacs-custom-palette (the "t " picker / /themes gallery, any
  // of the 305+ base16 schemes). Both mean "persists across reloads".
  function isPinned() {
    return (
      localStorage.getItem("emacs-scheme-fixed") !== null ||
      localStorage.getItem("emacs-custom-palette") !== null
    );
  }

  function fixScheme() {
    if (isPinned()) {
      // Unpin — go back to random each session. Clear whichever mechanism
      // is actually active so the two never end up in a conflicting state.
      if (localStorage.getItem("emacs-custom-palette") !== null) {
        window.emacsBlog?.palette?.clearCustomPalette?.();
      } else {
        localStorage.removeItem("emacs-scheme-fixed");
      }
      updatePinLabel(false);
      showMsg("Scheme unpinned (random each session)");
    } else {
      // Pin current scheme
      const cur = document.documentElement.getAttribute("data-scheme") || "";
      localStorage.setItem("emacs-scheme-fixed", cur);
      updatePinLabel(true);
      showMsg("Scheme pinned: " + (cur || "Modus"));
    }
  }

  function updatePinLabel(pinned) {
    const text = pinned ? "Unpin" : "Pin";
    const label = document.getElementById("pin-scheme-label");
    if (label) label.textContent = text;
    const mlLabel = document.getElementById("ml-pin-label");
    if (mlLabel) mlLabel.textContent = text;
    const mlBtn = document.getElementById("ml-pin-btn");
    if (mlBtn) mlBtn.classList.toggle("pinned", pinned);
    // Announce toggle state, not just a changed label. Three controls carry
    // data-action="fix-scheme" (M-x dropdown, scheme popup, modeline) :: all must
    // stay in sync or two of them read stale. The dropdown one is a
    // menuitemcheckbox, which takes aria-checked instead of aria-pressed.
    document.querySelectorAll('[data-action="fix-scheme"]').forEach((btn) => {
      const attr =
        btn.getAttribute("role") === "menuitemcheckbox"
          ? "aria-checked"
          : "aria-pressed";
      btn.setAttribute(attr, pinned ? "true" : "false");
    });
  }

  // Live hover preview — temporarily apply hovered scheme (~15 LOC)
  function initSchemeHoverPreview() {
    document.querySelectorAll(".scheme-option").forEach((opt) => {
      opt.addEventListener("mouseenter", () => {
        previewScheme = document.documentElement.getAttribute("data-scheme");
        const hov = opt.dataset.scheme || "";
        hov
          ? document.documentElement.setAttribute("data-scheme", hov)
          : document.documentElement.removeAttribute("data-scheme");
      });
      opt.addEventListener("mouseleave", () => {
        if (previewScheme !== null) {
          previewScheme
            ? document.documentElement.setAttribute(
                "data-scheme",
                previewScheme,
              )
            : document.documentElement.removeAttribute("data-scheme");
          previewScheme = null;
        }
      });
    });
  }

  // ── Scheme Popup ──────────────────────────────────────────────────────────
  // A <details>; open/closed is native. toggleSchemePopup stays around only
  // because palette.js's "Color scheme picker" command calls it by name.

  function toggleSchemePopup() {
    if (schemePopupContainer) schemePopupContainer.open = !schemePopupContainer.open;
  }

  // Fires on every open/close of the popup, however it happened (click,
  // Escape via handleKeydown below, or the toggle above) — so a live preview
  // never survives closing it, the same class of fix as palette.js's own
  // dialog "close" listener.
  schemePopupContainer?.addEventListener("toggle", () => {
    schemePopupBtn?.setAttribute(
      "aria-expanded",
      String(schemePopupContainer.open),
    );
    if (!schemePopupContainer.open && previewScheme !== null) {
      previewScheme
        ? document.documentElement.setAttribute("data-scheme", previewScheme)
        : document.documentElement.removeAttribute("data-scheme");
      previewScheme = null;
    }
  });

  // ── Font Mode Cycling ─────────────────────────────────────────────────────
  // Mono → Sans → Serif → Mixed (prose serif, structure/meta sans, code mono)
  // Mixed is the default for first-time visitors (no saved preference).

  const FONT_STEPS = ["mono", "sans", "serif", "mixed"];
  const FONT_LABELS = {
    mono: "Mono",
    sans: "Sans",
    serif: "Serif",
    mixed: "Mixed",
  };
  const FONT_DEFAULT = "mixed";
  let fontIdx = FONT_STEPS.indexOf(FONT_DEFAULT);

  function cycleFontMode() {
    fontIdx = (fontIdx + 1) % FONT_STEPS.length;
    const f = FONT_STEPS[fontIdx];
    document.documentElement.setAttribute("data-font", f);
    localStorage.setItem("emacs-font-mode", f);
    showMsg("Font: " + FONT_LABELS[f]);
  }

  function restoreFontMode() {
    const saved = localStorage.getItem("emacs-font-mode");
    const mode = saved && FONT_STEPS.includes(saved) ? saved : FONT_DEFAULT;
    fontIdx = FONT_STEPS.indexOf(mode);
    document.documentElement.setAttribute("data-font", mode);
  }

  // ── Content Width Cycle ───────────────────────────────────────────────────
  // First click → 100%, then cycles 80ch → 60ch → 840px → back

  const WIDTH_STEPS = ["840px", "100%", "80%", "60%"];
  let widthIdx = 0; // default 840px; first click → idx 1 = 100%

  function cycleWidth() {
    widthIdx = (widthIdx + 1) % WIDTH_STEPS.length;
    const w = WIDTH_STEPS[widthIdx];
    document.documentElement.style.setProperty("--content-max-width", w);
    localStorage.setItem("emacs-width-idx", widthIdx);
    showMsg("Width: " + w);
  }

  function restoreWidth() {
    const saved = localStorage.getItem("emacs-width-idx");
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (idx >= 0 && idx < WIDTH_STEPS.length) {
        widthIdx = idx;
        document.documentElement.style.setProperty(
          "--content-max-width",
          WIDTH_STEPS[idx],
        );
      }
    }
  }

  // ── Echo message helper ───────────────────────────────────────────────────

  function showMsg(msg) {
    window.emacsBlog?.keyboard?.showMessage?.(msg);
  }

  // ── Mobile hamburger menu ─────────────────────────────────────────────────
  // Unlike the dropdowns/scheme popup above, this toggles the same .menu-items
  // nav in and out of a mobile-only overlay layout rather than showing a
  // hidden-by-default element, so it stays a plain class toggle.

  function toggleMobileMenu() {
    const isOpen = menuBar?.classList.toggle("menu-open");
    hamburger?.setAttribute("aria-expanded", String(!!isOpen));
  }

  function closeMobileMenu() {
    menuBar?.classList.remove("menu-open");
    hamburger?.setAttribute("aria-expanded", "false");
  }

  function handleBackdropClick() {
    closeMobileMenu();
    backdrop?.classList.remove("visible");
  }

  function handleActionClick(e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    switch (action) {
      case "toggle-theme":
        toggleTheme();
        break;
      case "cycle-width":
        cycleWidth();
        break;
      case "cycle-font":
        cycleFontMode();
        break;
      case "toggle-keys":
        window.toggleKeys && window.toggleKeys();
        break;
      case "fix-scheme":
        fixScheme();
        break;
      case "open-palette":
        window.emacsBlog?.palette?.open();
        break;
      case "browse-schemes":
        window.emacsBlog?.palette?.open("t ");
        break;
      case "show-help":
        window.emacsBlog?.palette?.open("? ");
        break;
    }
    document.querySelectorAll(".menu-item[open]").forEach((d) => (d.open = false));
    if (
      action !== "cycle-width" &&
      action !== "cycle-font" &&
      action !== "fix-scheme" &&
      action !== "open-palette" &&
      action !== "browse-schemes" &&
      schemePopupContainer
    )
      schemePopupContainer.open = false;
  }

  function handleSchemeOptionClick(e) {
    const el = e.target.closest(".scheme-option");
    if (!el) return;
    applyScheme(el.dataset.scheme || "");
    // Random every load unless the user explicitly Pins. Picking here only
    // previews for this view; if already pinned, retarget the pin to this pick.
    if (localStorage.getItem("emacs-scheme-fixed") !== null) {
      localStorage.setItem("emacs-scheme-fixed", el.dataset.scheme || "");
    }
    previewScheme = null; // commit — nothing left to restore when it closes
    document.querySelectorAll(".menu-item[open]").forEach((d) => (d.open = false));
    if (schemePopupContainer) schemePopupContainer.open = false;
  }

  function handleOutsideClick(e) {
    if (!e.target.closest(".menu-item")) {
      document.querySelectorAll(".menu-item[open]").forEach((d) => (d.open = false));
    }
    if (
      schemePopupContainer?.open &&
      !e.target.closest("#scheme-popup-container")
    )
      schemePopupContainer.open = false;
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".menu-item[open]").forEach((d) => (d.open = false));
      if (schemePopupContainer) schemePopupContainer.open = false;
      closeMobileMenu();
    }
    const dropdown = document.querySelector(".menu-item[open] > .menu-dropdown");
    if (!dropdown) return;
    const items = dropdown.querySelectorAll(".menu-dropdown-item:not(.disabled)");
    if (!items.length) return;
    const focused = dropdown.querySelector(".menu-dropdown-item:focus");
    let idx = focused ? Array.from(items).indexOf(focused) : -1;
    if (e.key === "ArrowDown") {
      items[(idx + 1) % items.length].focus();
      e.preventDefault();
    }
    if (e.key === "ArrowUp") {
      items[idx <= 0 ? items.length - 1 : idx - 1].focus();
      e.preventDefault();
    }
    if (e.key === "Enter" && focused) {
      focused.click();
      e.preventDefault();
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    // Scheme options (both in View menu and popup)
    document.querySelectorAll(".scheme-option").forEach((opt) => {
      opt.addEventListener("click", handleSchemeOptionClick);
    });

    // Action buttons (toggle-theme, cycle-*, fix-scheme, etc.)
    document.addEventListener("click", (e) => {
      if (
        e.target.closest("[data-action]") &&
        !e.target.closest(".scheme-option")
      ) {
        handleActionClick(e);
      }
    });

    // Backdrop
    backdrop?.addEventListener("click", handleBackdropClick);

    // Hamburger
    hamburger?.addEventListener("click", toggleMobileMenu);

    // Outside click (dropdowns/scheme popup have native open-toggle, but not
    // native light-dismiss the way a popover would — this is that piece)
    document.addEventListener("click", handleOutsideClick);

    // Keyboard: Escape closes everything; arrow keys/Enter roam an open menu
    document.addEventListener("keydown", handleKeydown);

    // Hover to switch to an adjacent menu while one is already open (desktop
    // UX). name="menu" grouping means opening one natively closes the rest.
    menuItems.forEach((item) => {
      item.addEventListener("mouseenter", () => {
        if (document.querySelector(".menu-item[open]") && !item.open)
          item.open = true;
      });
    });

    // Restore saved state
    restoreWidth();
    restoreFontMode();

    // Random/pinned scheme
    initRandomScheme();

    // Hover preview for schemes
    initSchemeHoverPreview();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose globals for palette.js commands
  window.toggleTheme = toggleTheme;
  window.cycleWidth = cycleWidth;
  window.cycleFontMode = cycleFontMode;
  window.toggleSchemePopup = toggleSchemePopup;
  window.pinScheme = fixScheme;

  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.menu = {
    refreshPinState: function () {
      updatePinLabel(isPinned());
    },
  };
})();
