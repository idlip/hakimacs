/**
 * Full-text search over /search-index.json, one entry per sentence.
 * Orderless: every query word must appear in some token.
 */
(function () {
  "use strict";

  var index = null,
    loading = false;

  function load(onReady) {
    if (index || loading) return;
    loading = true;
    fetch("/search-index.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        index = data;
        loading = false;
        onReady();
      })
      .catch(function () {
        index = [];
        loading = false;
      });
  }

  function find(q) {
    if (!index) return [];
    var words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return index
      .filter(function (item) {
        var tokens = item.tokens || [];
        return words.every(function (w) {
          return tokens.some(function (t) {
            return t.indexOf(w) !== -1;
          });
        });
      })
      .map(function (item) {
        var tokens = item.tokens || [];
        var hit = tokens.find(function (t) {
          return t.indexOf(words[0]) !== -1;
        });
        return {
          title: item.title,
          url: item.url,
          snippet: item.text,
          hit: hit || words[0],
        };
      });
  }

  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.search = { load: load, find: find };
})();
