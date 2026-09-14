/**
 * Command Palette — native <dialog>.
 * Default: commands + posts. "t " prefix: all base16 schemes.
 * Trigger: x / Ctrl-K / Ctrl-S / Alt-X (keyboard.js) or window.emacsBlog.palette.open()
 */
(function () {
  "use strict";

  var dlg = document.getElementById("palette-dialog");
  var inp = document.getElementById("palette-input");
  var res = document.getElementById("palette-results");
  if (!dlg || !inp || !res) return;

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

  function applyCustomPalette(colors) {
    BASE_KEYS.forEach(function (k, i) {
      if (colors[i])
        document.documentElement.style.setProperty("--" + k, colors[i]);
    });
  }

  function clearCustomPalette() {
    BASE_KEYS.forEach(function (k) {
      document.documentElement.style.removeProperty("--" + k);
    });
    localStorage.removeItem("emacs-custom-palette");
  }

  // Per-type icons (config: params.paletteIcons), with built-in fallbacks.
  var ICONS = Object.assign(
    { nav: "", command: "", post: "", tag: "", scheme: "", help: "" },
    window.__paletteIcons || {},
  );

  // Section navigation from the site menu (window.__nav) so it stays in sync,
  // plus destinations the menu doesn't list.
  var NAV = (window.__nav || [])
    .map(function (n) {
      return {
        t: n.name,
        type: "nav",
        a: function () {
          location.href = n.url;
        },
      };
    })
    .concat([
      {
        t: "Wander Console",
        type: "nav",
        a: function () {
          location.href = "/wander/console/";
        },
      },
    ]);

  // Commands (nav is dynamic above; these are the explicit action list).
  var CMDS = NAV.concat([
    {
      t: "Toggle dark / light theme",
      type: "command",
      a: function () {
        dlg.close();
        window.toggleTheme && window.toggleTheme();
      },
    },
    {
      t: "Cycle font mode",
      type: "command",
      a: function () {
        dlg.close();
        window.cycleFontMode && window.cycleFontMode();
      },
    },
    {
      t: "Cycle content width",
      type: "command",
      a: function () {
        dlg.close();
        window.cycleWidth && window.cycleWidth();
      },
    },
    {
      t: "Pin / unpin scheme",
      type: "command",
      a: function () {
        dlg.close();
        window.pinScheme && window.pinScheme();
      },
    },
    {
      t: "Color scheme picker",
      type: "command",
      a: function () {
        dlg.close();
        window.toggleSchemePopup && window.toggleSchemePopup();
      },
    },
    {
      t: "Browse all color schemes",
      type: "scheme",
      a: function () {
        inp.value = "t ";
        render("t ");
        inp.focus();
        inp.setSelectionRange(2, 2);
      },
    },
    {
      t: "Browse tags",
      type: "tag",
      a: function () {
        inp.value = "#";
        render("#");
        inp.focus();
        inp.setSelectionRange(1, 1);
      },
    },
    {
      t: "Keyboard shortcuts",
      type: "help",
      a: function () {
        inp.value = "? ";
        render("? ");
        inp.focus();
        inp.setSelectionRange(2, 2);
      },
    },
    {
      t: "Enable / disable keyboard shortcuts",
      type: "command",
      a: function () {
        dlg.close();
        window.toggleKeys && window.toggleKeys();
      },
    },
  ]);

  var HELP = [
    {
      t: "Ctrl/Cmd-K, Ctrl/Cmd-S, Alt-X (M-x), or x  —  Open command palette",
      a: null,
    },
  ];

  var idx = 0,
    items = [];
  var allSchemes = null,
    snap = null;
  var searchTimer = null;

  function snapRestore() {
    if (snap)
      BASE_KEYS.forEach(function (k, i) {
        snap[i]
          ? document.documentElement.style.setProperty("--" + k, snap[i])
          : document.documentElement.style.removeProperty("--" + k);
      });
    snap = null;
  }

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  // Marks whichever of `words` occur in `str`, best-effort (no all-present check).
  function highlightWords(str, words) {
    var lo = str.toLowerCase(),
      m = new Uint8Array(str.length),
      r = "",
      in_ = false;
    words.forEach(function (w) {
      var i = lo.indexOf(w);
      while (i >= 0) {
        m.fill(1, i, i + w.length);
        i = lo.indexOf(w, i + 1);
      }
    });
    for (var i = 0; i < str.length; i++) {
      if (m[i] && !in_) {
        r += "<mark>";
        in_ = true;
      } else if (!m[i] && in_) {
        r += "</mark>";
        in_ = false;
      }
      r += esc(str[i]);
    }
    return in_ ? r + "</mark>" : r;
  }

  function match(str, q) {
    if (!q) return esc(str);
    var lo = str.toLowerCase(),
      tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (
      !tokens.every(function (t) {
        return lo.includes(t);
      })
    )
      return null;
    return highlightWords(str, tokens);
  }

  function buildList() {
    res.innerHTML = items.length
      ? items
          .map(function (it, i) {
            var ic = it.type && ICONS[it.type];
            return (
              '<div class="palette-item' +
              (i ? "" : " selected") +
              '" data-i="' +
              i +
              '">' +
              (ic
                ? '<span class="palette-item-icon nf" aria-hidden="true">' +
                  ic +
                  "</span>"
                : "") +
              '<span class="palette-item-text">' +
              '<span class="palette-item-title">' +
              it.html +
              "</span>" +
              (it.snippet
                ? '<span class="palette-item-snippet">' + it.snippet + "</span>"
                : "") +
              "</span></div>"
            );
          })
          .join("")
      : '<div class="palette-empty">No results</div>';
    idx = 0;
    res.querySelectorAll("[data-i]").forEach(function (el) {
      el.addEventListener("click", function () {
        items[+el.dataset.i].action();
      });
    });
  }

  function renderSchemes(q) {
    if (!allSchemes) {
      res.innerHTML = '<div class="palette-empty">Loading schemes\u2026</div>';
      if (!window.__schemesUrl) return;
      fetch(window.__schemesUrl)
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          allSchemes = data.sort(function (a, b) {
            return a.name.localeCompare(b.name);
          });
          renderSchemes(q);
        })
        .catch(function () {});
      return;
    }
    if (!snap)
      snap = BASE_KEYS.map(function (k) {
        return document.documentElement.style.getPropertyValue("--" + k);
      });
    items = [];
    allSchemes.forEach(function (s) {
      var h = match(s.name, q);
      if (h !== null) {
        var colors = s.colors,
          key = s.key,
          name = s.name;
        items.push({
          html: h,
          colors: colors,
          action: function () {
            applyCustomPalette(colors);
            localStorage.setItem(
              "emacs-custom-palette",
              JSON.stringify({ key: key, name: name, colors: colors }),
            );
            document.documentElement.removeAttribute("data-scheme");
            snap = null;
            dlg.close();
            window.emacsBlog?.menu?.refreshPinState?.();
          },
        });
      }
    });
    buildList();
  }

  function render(v) {
    if (v.startsWith("t ")) {
      inp.placeholder = "Color scheme\u2026";
      renderSchemes(v.slice(2).trim());
    } else if (v.startsWith("? ")) {
      inp.placeholder = "Search shortcuts\u2026";
      var q = v.slice(2).trim();
      items = [];
      HELP.forEach(function (h) {
        var ht = match(h.t, q);
        if (ht !== null)
          items.push({
            html: ht,
            action:
              h.a ||
              function () {
                dlg.close();
              },
            type: "help",
          });
      });
      buildList();
    } else if (v.charAt(0) === "#") {
      inp.placeholder = "Jump to a tag\u2026";
      var tq = v.slice(1);
      items = [];
      (window.__tags || []).forEach(function (t) {
        var label = "#" + t.name + (t.count ? "  (" + t.count + ")" : "");
        var h = match(label, tq);
        if (h !== null) {
          var url = t.url;
          items.push({
            html: h,
            action: function () {
              location.href = url;
            },
            type: "tag",
          });
        }
      });
      items = items.slice(0, 40);
      buildList();
    } else {
      inp.placeholder =
        "Search posts, run commands, browse themes  (M-x \u00b7 Ctrl-K \u00b7 Ctrl-S)\u2026";
      var q = v.trim();
      items = [];
      var seenUrls = {};
      CMDS.forEach(function (c) {
        var h = match(c.t, q);
        if (h !== null) items.push({ html: h, action: c.a, type: c.type });
      });
      (window.__posts || []).forEach(function (p) {
        var url = p.url,
          h = match(p.title, q);
        if (h !== null) {
          seenUrls[url] = true;
          items.push({
            html: h,
            action: function () {
              location.href = url;
            },
            type: "post",
          });
        }
      });
      // Matching tags after posts (only when searching), so "emacs" lists posts
      // first, then "#Emacs" as a jump to the tag page.
      if (q)
        (window.__tags || []).forEach(function (t) {
          var h = match("#" + t.name, q);
          if (h !== null) {
            var url = t.url;
            items.push({
              html: h,
              action: function () {
                location.href = url;
              },
              type: "tag",
            });
          }
        });
      items = items.slice(0, 30);
      buildList();

      // debounce index search. A short query still triggers it once a space
      // shows up (typed a whole word, or moved on to a second one) rather
      // than waiting for 5+ characters — "nix " should search as well as
      // "nixos" does.
      clearTimeout(searchTimer);
      if (q && (q.length > 5 || v.indexOf(" ") !== -1) && window.emacsBlog.search) {
        searchTimer = setTimeout(function () {
          if (inp.value.trim() !== q) return; // query changed since scheduling
          window.emacsBlog.search.load(function () {
            render(inp.value);
          });
          var words = q.toLowerCase().split(/\s+/).filter(Boolean);
          window.emacsBlog.search.find(q).forEach(function (r) {
            if (seenUrls[r.url]) return;
            items.push({
              html: esc(r.title),
              snippet: highlightWords(r.snippet, words),
              action: function () {
                location.href = r.url + "#:~:text=" + encodeURIComponent(r.hit);
              },
              type: "post",
            });
          });
          items = items.slice(0, 30);
          buildList();
        }, 120);
      }
    }
  }

  function sel(n) {
    var els = res.querySelectorAll("[data-i]");
    if (!els.length) return;
    idx = Math.max(0, Math.min(n, els.length - 1));
    els.forEach(function (el, i) {
      el.classList.toggle("selected", i === idx);
    });
    els[idx].scrollIntoView({ block: "nearest" });
    if (snap && items[idx] && items[idx].colors)
      applyCustomPalette(items[idx].colors);
  }

  inp.addEventListener("input", function () {
    render(inp.value);
  });
  inp.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      sel(idx + 1);
      e.preventDefault();
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      sel(idx - 1);
      e.preventDefault();
    } else if (e.key === "Enter" && items[idx]) {
      items[idx].action();
      e.preventDefault();
    } else if (
      e.key === "Backspace" &&
      (inp.value === "t " || inp.value === "? ")
    ) {
      snapRestore();
      inp.value = "";
      render("");
      e.preventDefault();
    }
  });
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) dlg.close();
  });

  // Fires on every close path — explicit .close(), backdrop click, and
  // native Escape alike — so a live scheme preview never survives closing
  // the dialog no matter how it was dismissed.
  dlg.addEventListener("close", snapRestore);

  function open(prefix) {
    dlg.showModal();
    inp.value = prefix || "";
    render(inp.value);
    inp.focus();
    if (prefix) inp.setSelectionRange(prefix.length, prefix.length);
  }

  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.palette = {
    open: open,
    close: function () {
      dlg.close();
    },
    clearCustomPalette: clearCustomPalette,
    applyCustomPalette: applyCustomPalette,
  };
})();
