/**
 * Command palette triggers + post-page mouse actions for Emacs Blog Theme.
 */

(function () {
  "use strict";

  let msgTimeout = null;

  // DOM
  const articleList = document.getElementById("article-list");
  const echoMessage = document.getElementById("echo-message");

  // Are we on a single post page (no article list)?
  const isPostPage = !articleList;

  // ── Echo area ──────────────────────────────────────────────────────────────

  function showMessage(msg) {
    if (!echoMessage) return;
    clearTimeout(msgTimeout);
    echoMessage.textContent = msg;
    echoMessage.classList.add("flash");
    msgTimeout = setTimeout(() => {
      echoMessage.classList.remove("flash");
      updateEchoHint();
    }, 2500);
  }

  function updateEchoHint() {
    if (!echoMessage) return;
    echoMessage.textContent = "? help";
  }

  // ── Command palette triggers ─────────────────────────────────────────────

  function handleKeydown(e) {
    // Ignore when typing
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    var ctrl = e.ctrlKey;
    var meta = e.metaKey;
    var code = e.code;

    if (
      ((ctrl || meta) && (code === "KeyK" || code === "KeyS")) ||
      (e.altKey && code === "KeyX")
    ) {
      window.emacsBlog?.palette?.open();
      e.preventDefault();
      return;
    }

    if (e.key === "x" && !localStorage.getItem("emacs-keys-off")) {
      window.emacsBlog?.palette?.open();
      e.preventDefault();
    }
  }

  // ── Code copy buttons ────────────────────────────────────────────────────
  // Chroma puts data-lang on <code>, not <pre> — the pre::before lang label
  // (theme.css) reads it from <pre>, so it silently never fired. Copy it up
  // while we're already walking every code block for the copy button.
  function addCodeCopyButtons() {
    document.querySelectorAll(".post-body pre").forEach(function (pre) {
      var code = pre.querySelector("code");
      if (!code) return;
      var lang = code.getAttribute("data-lang");
      if (lang) pre.setAttribute("data-lang", lang);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy-btn";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code to clipboard");
      btn.addEventListener("click", function () {
        navigator.clipboard
          .writeText(code.textContent)
          .then(function () {
            btn.textContent = "Copied!";
            btn.classList.add("copied");
            clearTimeout(btn._copyReset);
            btn._copyReset = setTimeout(function () {
              btn.textContent = "Copy";
              btn.classList.remove("copied");
            }, 1500);
          })
          .catch(function () {});
      });
      pre.appendChild(btn);
    });
  }

  // ── Heading anchor links ─────────────────────────────────────────────────
  // go-org already assigns sequential ids (headline-N) to post headings; add
  // a visible, focusable link to each so sections are directly linkable.
  function addHeadingAnchors() {
    document
      .querySelectorAll(".post-body :is(h2, h3, h4, h5, h6)[id]")
      .forEach(function (h) {
        var a = document.createElement("a");
        a.className = "heading-anchor";
        a.href = "#" + h.id;
        a.setAttribute("aria-label", "Link to this section");
        a.textContent = "#";
        h.appendChild(a);
      });
  }

  // ── Image lightbox ───────────────────────────────────────────────────────
  // Click a post image to view it full-size in the shared <dialog> (baseof.html).
  // Esc and backdrop-click close it natively/via the same idiom as the palette.
  function initImageLightbox() {
    var imgs = document.querySelectorAll(".post-body img");
    if (!imgs.length) return;
    var dlg = document.getElementById("image-lightbox");
    var lbImg = document.getElementById("lightbox-img");
    if (!dlg || !lbImg) return;
    imgs.forEach(function (img) {
      img.addEventListener("click", function () {
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt || "";
        dlg.showModal();
      });
    });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) dlg.close();
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    document.addEventListener("keydown", handleKeydown);
    // Clicking the echo message opens shortcut help in palette
    echoMessage?.addEventListener("click", function () {
      window.emacsBlog?.palette?.open("? ");
    });

    if (isPostPage) {
      addCodeCopyButtons();
      addHeadingAnchors();
      initImageLightbox();
    }

    updateEchoHint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // WCAG 2.1.4: let users turn the "x" shortcut off (persisted).
  window.toggleKeys = function () {
    var off = localStorage.getItem("emacs-keys-off");
    if (off) {
      localStorage.removeItem("emacs-keys-off");
      showMessage("Keyboard shortcuts: on");
    } else {
      localStorage.setItem("emacs-keys-off", "1");
      showMessage("Keyboard shortcuts: off");
    }
  };

  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.keyboard = { showMessage: showMessage };
})();
