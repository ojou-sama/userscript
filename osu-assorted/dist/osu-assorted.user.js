// ==UserScript==
// @name        osu! assorted
// @version     1.0.0
// @author      ojou-sama
// @description A collection of small scripts for osu! web.
// @match       https://osu.ppy.sh/*
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @connect     assets.ppy.sh
// @connect     b.ppy.sh
// ==/UserScript==

(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/core/router.js
  var _handlers = [];
  var _lastPath = location.pathname;
  var _dispatchedPath = location.pathname;
  function matchPattern(pattern, path) {
    const re = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return re.test(path);
  }
  function dispatch(path) {
    if (path === _dispatchedPath) return;
    _dispatchedPath = path;
    for (const { pattern, cb } of _handlers) {
      if (matchPattern(pattern, path)) cb(path);
    }
  }
  var _origPush = history.pushState.bind(history);
  history.pushState = function(...args) {
    _origPush(...args);
    dispatch(location.pathname);
  };
  var _origReplace = history.replaceState.bind(history);
  history.replaceState = function(...args) {
    _origReplace(...args);
    dispatch(location.pathname);
  };
  window.addEventListener("popstate", () => dispatch(location.pathname));
  var router = {
    /**
     * Register a callback for a URL pattern.
     * Pattern supports glob-style wildcards: '/users/*', '*'
     * @param {string}   pattern
     * @param {function} cb  - called with the matched path string
     */
    onNavigate(pattern, cb) {
      _handlers.push({ pattern, cb });
      if (matchPattern(pattern, location.pathname)) {
        cb(location.pathname);
      }
    }
  };

  // src/core/utils.js
  function waitForElement(selector, timeout = 3e3) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`[waitForElement] "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }
  function log(moduleId, ...args) {
    unsafeWindow.console.log(`[${moduleId}]`, ...args);
  }

  // src/core/beatmapset-data.js
  var cachedBeatmapsetData = null;
  var beatmapsetData = {
    init() {
      router.onNavigate("/beatmapsets/*", () => this.clear());
    },
    async get() {
      if (cachedBeatmapsetData) return cachedBeatmapsetData;
      try {
        const scriptTag = await waitForElement('script[id="json-beatmapset"]');
        cachedBeatmapsetData = JSON.parse(scriptTag.textContent);
        console.log("[beatmapsetData] Loaded beatmapset data:", cachedBeatmapsetData.id);
        return cachedBeatmapsetData;
      } catch (e) {
        console.error("[beatmapsetData] Failed to parse page JSON:", e);
        return null;
      }
    },
    clear() {
      cachedBeatmapsetData = null;
    }
  };

  // src/core/settings.js
  function _read(key) {
    try {
      const val = GM_getValue(key, void 0);
      return val === void 0 ? null : val;
    } catch {
      console.error("[settings] GM_getValue unavailable, unable to read settings");
    }
  }
  function _write(key, value) {
    try {
      GM_setValue(key, value);
    } catch {
      console.error("[settings] GM_setValue unavailable, unable to write settings");
    }
  }
  var settings = {
    isEnabled(moduleId) {
      const val = _read(`module__${moduleId}`);
      return val === null ? true : Boolean(val);
    },
    setEnabled(moduleId, enabled) {
      _write(`module__${moduleId}`, enabled);
    },
    get(key, defaultValue) {
      const val = _read(key);
      return val === null ? defaultValue : val;
    },
    set(key, value) {
      _write(key, value);
    },
    createSettingsUI() {
    }
  };

  // src/modules/index.js
  var modules_exports = {};
  __export(modules_exports, {
    hideRankColors: () => hideRankColors,
    mutualFilter: () => mutualFilter,
    useOldFallbackBackground: () => useOldFallbackBackground,
    useThumbnailFallback: () => useThumbnailFallback
  });

  // src/modules/hide-rank-colors.js
  var hideRankColors = {
    id: "hideRankColors",
    name: "Hide Rank Colors",
    description: "Hide rank colors and styles on profile pages.",
    init() {
      GM_addStyle(`
      .rank-value {
        --colour: inherit !important;
        color: var(--value-color);
        font-weight: 300;
      }
    `);
    }
  };

  // src/modules/mutual-filter.js
  var mutualFilter = {
    // Unique ID used for settings persistence
    id: "mutualFilter",
    name: "Mutual Filter",
    description: 'Adds a "Mutual" filter to the friends page.',
    init() {
      router.onNavigate("/home/friends", () => this.run());
    },
    async run() {
      try {
        const allBtn = await waitForElement('.update-streams-v2__container [data-key="all"]');
        const container = allBtn.closest(".update-streams-v2__container");
        if (!allBtn || container.querySelector('[data-key="mutual"]')) return;
        allBtn.insertAdjacentHTML("afterend", `
        <a class="update-streams-v2__item t-changelog-stream--all" data-key="mutual" href="#">
          <div class="update-streams-v2__bar u-changelog-stream--bg" style="background-color: hsl(var(--hsl-pink-2));"></div>
          <p class="update-streams-v2__row update-streams-v2__row--name">Mutual</p>
          <p class="update-streams-v2__row update-streams-v2__row--version">-</p>
        </a>
      `);
        const mutualBtn = container.querySelector('[data-key="mutual"]');
        const countNode = mutualBtn.querySelector(".update-streams-v2__row--version");
        let attempts = 0;
        const countInterval = setInterval(() => {
          attempts++;
          const cardsExist = document.querySelector(".user-card, .user-card-brick");
          if (cardsExist) {
            clearInterval(countInterval);
            const mutuals = document.querySelectorAll(".user-card-brick--mutual, .user-card:has(.fa-user-friends)");
            if (countNode) countNode.textContent = mutuals.length.toString();
          } else if (attempts > 50) {
            clearInterval(countInterval);
          }
        }, 100);
        if (!document.getElementById("mutual-filter-styles")) {
          const style = GM_addStyle(`
          .show-only-mutual .user-card-brick:not(.user-card-brick--mutual) {
            display: none !important;
          }
          .show-only-mutual .user-card-brick--mutual {
            display: flex !important;
          }
          .show-only-mutual .user-card:not(:has(.user-action-button--mutual)) {
            display: none !important;
          }
          .show-only-mutual .user-card:has(.user-action-button--mutual) {
            display: flex !important;
          }
        `);
          style.id = "mutual-filter-styles";
        }
        mutualBtn.addEventListener("click", (e) => {
          e.preventDefault();
          allBtn.click();
          container.querySelectorAll(".update-streams-v2__item").forEach((btn) => {
            btn.classList.remove("update-streams-v2__item--active");
          });
          mutualBtn.classList.add("update-streams-v2__item--active");
          document.body.classList.add("show-only-mutual");
        });
        const otherBtns = container.querySelectorAll('.update-streams-v2__item:not([data-key="mutual"])');
        otherBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            document.body.classList.remove("show-only-mutual");
            mutualBtn.classList.remove("update-streams-v2__item--active");
            btn.classList.add("update-streams-v2__item--active");
          });
        });
      } catch (e) {
        log(this.id, "error:", e);
      }
    }
  };

  // src/modules/use-old-fallback-background.js
  var useOldFallbackBackground = {
    id: "useOldFallbackBackground",
    name: "Use Old Fallback Background",
    description: "Uses the old fallback background (rather than the new color gradients).",
    init() {
      GM_addStyle(`
      :root {
        --bg-default: url(/assets/images/default-bg.7594e945.png);
        --bg-default-0: var(--bg-default);
        --bg-default-1: var(--bg-default);
        --bg-default-2: var(--bg-default);
        --bg-default-3: var(--bg-default);
        --bg-default-4: var(--bg-default);
        --bg-default-5: var(--bg-default);
      }
    `);
    }
  };

  // src/modules/use-thumbnail-fallback.js
  var useThumbnailFallback = {
    id: "useThumbnailFallback",
    name: "Use Thumbnail Fallback",
    description: "Attempts to use the mapset thumbnail as a fallback image if the default background does not exist.",
    init() {
      router.onNavigate("/beatmapsets/*", () => this.run());
    },
    async run() {
      const cover = await waitForElement(".beatmapset-header__cover .beatmapset-cover");
      if (!cover) return;
      const style = getComputedStyle(cover);
      if (!style.getPropertyValue("--bg")) {
        const match = location.pathname.match(/\/beatmapsets\/(\d+)/);
        if (!match) return;
        const setId = match[1];
        console.log(setId);
        setId && cover.style.setProperty("--bg", `url(https://b.ppy.sh/thumb/${setId}l.jpg)`);
      }
    }
    // async run() {
    //   try {
    //     const set = await beatmapsetData.get();
    //     if (!set || !set.id) return;
    //     console.log('Found beatmapset ID:', set.id);
    //     if (!document.getElementById('thumbnail-fallback-styles')) {
    //       const style = GM_addStyle(`
    //         .beatmapset-cover:not([style*="--bg"]) {
    //           --bg: url("https://b.ppy.sh/thumb/${set.id}l.jpg") !important;
    //         }
    //       `);
    //       style.id = 'thumbnail-fallback-styles';
    //     }
    //   } catch (e) {
    //     console.error('[Thumbnail Fallback] Error:', e);
    //   }
    // }
  };

  // src/main.js
  var _modules = Object.values(modules_exports);
  _modules.forEach((m) => m.init());
  beatmapsetData.init();
  settings.createSettingsUI();
})();


;(function devReload() {
  var ws = new WebSocket('ws://localhost:4532');
  ws.onmessage = function(e) { if (e.data === 'reload') location.reload(); };
  ws.onclose   = function()  { setTimeout(devReload, 2000); };
})();