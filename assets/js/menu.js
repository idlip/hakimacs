/**
 * Menu Bar Interactions for Emacs Blog Theme
 */

(function () {
  "use strict";

  // ── State ─────────────────────────────────────────────────────────────────
  let openMenu = null;
  let fontSize = 100;
  let schemePopupOpen = false;
  let previewScheme = null; // scheme being hovered (for live preview)

  // ── DOM ───────────────────────────────────────────────────────────────────
  const menuBar = document.querySelector(".menu-bar");
  const menuItems = document.querySelectorAll(".menu-item");
  const hamburger = document.querySelector(".menu-hamburger");
  const backdrop = document.getElementById("menu-backdrop");
  const schemePopupBtn = document.getElementById("scheme-popup-btn");
  const schemePopup = document.getElementById("scheme-popup");

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

  function openSchemePopup() {
    schemePopup?.classList.add("open");
    schemePopupBtn?.setAttribute("aria-expanded", "true");
    schemePopupOpen = true;
  }

  function closeSchemePopup() {
    schemePopup?.classList.remove("open");
    schemePopupBtn?.setAttribute("aria-expanded", "false");
    // Restore scheme if we're mid-hover-preview
    if (previewScheme !== null) {
      previewScheme
        ? document.documentElement.setAttribute("data-scheme", previewScheme)
        : document.documentElement.removeAttribute("data-scheme");
      previewScheme = null;
    }
    schemePopupOpen = false;
  }

  function toggleSchemePopup() {
    schemePopupOpen ? closeSchemePopup() : openSchemePopup();
  }

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

  // ── Text Alignment Cycling ────────────────────────────────────────────────
  // Normal (left) -> Justified -> Columns. First-line indent is always on (CSS).
  // Normal is the default and matches the CSS base, so index 0 is the resting
  // state and the attribute only appears once the user actually cycles.
  const ALIGN_STEPS = ["normal", "justify", "columns"];
  const ALIGN_LABELS = {
    justify: "Justified",
    normal: "Normal",
    columns: "Columns",
  };
  let alignIdx = 0;

  function cycleAlign() {
    alignIdx = (alignIdx + 1) % ALIGN_STEPS.length;
    const a = ALIGN_STEPS[alignIdx];
    document.documentElement.setAttribute("data-align", a);
    localStorage.setItem("emacs-align", a);
    showMsg("Align: " + ALIGN_LABELS[a]);
  }

  function restoreAlign() {
    const saved = localStorage.getItem("emacs-align");
    if (saved && ALIGN_STEPS.includes(saved)) {
      alignIdx = ALIGN_STEPS.indexOf(saved);
      document.documentElement.setAttribute("data-align", saved);
    }
  }

  // ── Font Size ─────────────────────────────────────────────────────────────

  function adjustFontSize(delta) {
    fontSize = Math.max(80, Math.min(150, fontSize + delta * 10));
    document.documentElement.style.fontSize = fontSize + "%";
    localStorage.setItem("emacs-font-size", fontSize);
    showMsg("Font size: " + fontSize + "%");
  }

  function resetFontSize() {
    fontSize = 100;
    document.documentElement.style.fontSize = "100%";
    localStorage.removeItem("emacs-font-size");
    showMsg("Font size reset");
  }

  function restoreFontSize() {
    const saved = localStorage.getItem("emacs-font-size");
    if (saved) {
      const n = parseInt(saved, 10);
      if (!isNaN(n) && n >= 80 && n <= 150) {
        fontSize = n;
        document.documentElement.style.fontSize = n + "%";
      }
    }
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

  // ── Backdrop ──────────────────────────────────────────────────────────────

  function showBackdrop() {
    backdrop?.classList.add("visible");
  }
  function hideBackdrop() {
    backdrop?.classList.remove("visible");
  }

  // ── Menu Dropdowns ────────────────────────────────────────────────────────

  function openMenuDropdown(item) {
    closeAllMenus();
    item.classList.add("open");
    item
      .querySelector(":scope > button")
      ?.setAttribute("aria-expanded", "true");
    openMenu = item;
  }

  function closeAllMenus() {
    menuItems.forEach((item) => {
      item.classList.remove("open");
      item
        .querySelector(":scope > button")
        ?.setAttribute("aria-expanded", "false");
    });
    openMenu = null;
  }

  function toggleMobileMenu() {
    const isOpen = menuBar?.classList.toggle("menu-open");
    hamburger?.setAttribute("aria-expanded", String(!!isOpen));
  }

  function closeMobileMenu() {
    menuBar?.classList.remove("menu-open");
    hamburger?.setAttribute("aria-expanded", "false");
  }

  function handleMenuClick(e) {
    const item = e.target.closest(".menu-item");
    if (!item) return;
    const btn = e.target.closest("button");
    if (btn && btn.parentElement === item) {
      item.classList.contains("open")
        ? closeAllMenus()
        : openMenuDropdown(item);
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function handleActionClick(e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    switch (action) {
      case "toggle-theme":
        toggleTheme();
        break;
      case "increase-font":
        adjustFontSize(1);
        break;
      case "decrease-font":
        adjustFontSize(-1);
        break;
      case "reset-font":
        resetFontSize();
        break;
      case "cycle-width":
        cycleWidth();
        break;
      case "cycle-font":
        cycleFontMode();
        break;
      case "cycle-align":
        cycleAlign();
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
    closeAllMenus();
    if (
      action !== "cycle-width" &&
      action !== "cycle-font" &&
      action !== "cycle-align" &&
      action !== "fix-scheme" &&
      action !== "open-palette" &&
      action !== "browse-schemes"
    )
      closeSchemePopup();
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
    previewScheme = null; // commit — prevent closeSchemePopup from restoring old scheme
    closeAllMenus();
    closeSchemePopup();
  }

  function handleOutsideClick(e) {
    if (openMenu && !e.target.closest(".menu-item")) closeAllMenus();
    if (schemePopupOpen && !e.target.closest("#scheme-popup-container"))
      closeSchemePopup();
  }

  function handleBackdropClick() {
    closeMobileMenu();
    closeAllMenus();
    hideBackdrop();
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      closeAllMenus();
      closeSchemePopup();
      closeMobileMenu();
    }
    if (!openMenu) return;
    const dropdown = openMenu.querySelector(".menu-dropdown");
    const items = dropdown?.querySelectorAll(
      ".menu-dropdown-item:not(.disabled)",
    );
    if (!items?.length) return;
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
    // Menu dropdowns
    menuItems.forEach((item) =>
      item.addEventListener("click", handleMenuClick),
    );

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

    // Scheme popup toggle
    schemePopupBtn?.addEventListener("click", (e) => {
      toggleSchemePopup();
      e.stopPropagation();
    });

    // Backdrop
    backdrop?.addEventListener("click", handleBackdropClick);

    // Hamburger
    hamburger?.addEventListener("click", toggleMobileMenu);

    // Outside click
    document.addEventListener("click", handleOutsideClick);

    // Keyboard
    document.addEventListener("keydown", handleKeydown);

    // Hover to open adjacent menu (desktop UX)
    menuItems.forEach((item) => {
      item.addEventListener("mouseenter", () => {
        if (openMenu && openMenu !== item) openMenuDropdown(item);
      });
    });

    // Restore saved state
    restoreFontSize();
    restoreWidth();
    restoreFontMode();
    restoreAlign();

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

  // Expose globals for keyboard.js shortcuts
  window.toggleTheme = toggleTheme;
  window.adjustFontSize = adjustFontSize;
  window.resetFontSize = resetFontSize;
  window.cycleWidth = cycleWidth;
  window.cycleFontMode = cycleFontMode;
  window.cycleAlign = cycleAlign;
  window.toggleSchemePopup = toggleSchemePopup;
  window.applyScheme = applyScheme;
  window.pinScheme = fixScheme;

  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.menu = {
    toggleTheme,
    adjustFontSize,
    resetFontSize,
    closeAllMenus,
    applyScheme,
    cycleWidth,
    cycleFontMode,
    cycleAlign,
    refreshPinState: function () {
      updatePinLabel(isPinned());
    },
  };
})();
