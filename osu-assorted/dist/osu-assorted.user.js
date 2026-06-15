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

  // src/core/panel-manager.js
  var handlers = [];
  var moDebounceId = 0;
  var scheduleToken = 0;
  var CHUNK_SIZE = 28;
  var scheduleAllPanels = () => {
    const panels = Array.from(document.querySelectorAll(".beatmapset-panel"));
    if (panels.length === 0) return;
    const token = ++scheduleToken;
    let index = 0;
    const step = () => {
      if (token !== scheduleToken) return;
      const end = Math.min(index + CHUNK_SIZE, panels.length);
      while (index < end) {
        const panel = panels[index++];
        handlers.forEach((handler) => handler(panel));
      }
      if (index < panels.length) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };
  var scheduleFromMutation = () => {
    clearTimeout(moDebounceId);
    moDebounceId = setTimeout(scheduleAllPanels, 100);
  };
  var panelManager = {
    init() {
      scheduleAllPanels();
      const observer = new MutationObserver(scheduleFromMutation);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    },
    register(handler) {
      handlers.push(handler);
    }
  };

  // src/core/settings.js
  function _read(key) {
    try {
      const val = GM_getValue(key, void 0);
      return val === void 0 ? null : val;
    } catch {
      console.error("[settings] GM_getValue unavailable, unable to read settings");
      return null;
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
    getModuleSetting(moduleId, settingId, defaultValue) {
      return this.get(`module__${moduleId}__${settingId}`, defaultValue);
    },
    setModuleSetting(moduleId, settingId, value) {
      this.set(`module__${moduleId}__${settingId}`, value);
    },
    createSettingsUI(modules = []) {
      if (document.getElementById("oa-wrapper")) return;
      GM_addStyle(`
      #oa-fab {
        position: fixed; bottom: 24px; left: 24px; z-index: 9999;
        width: 48px; height: 48px; border-radius: 50%;
        background: hsl(var(--hsl-pink)); color: #fff; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center; font-size: 20px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4); transition: transform 0.15s, background 0.15s;
      }
      #oa-fab:hover { transform: scale(1.05); background: hsl(var(--hsl-pink-2)); }
      
      #oa-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 10000;
        display: none; align-items: center; justify-content: center; backdrop-filter: blur(4px);
      }
      #oa-backdrop.oa-open { display: flex; }
      
      #oa-modal {
        width: 828px; max-width: 95vw; max-height: 85vh; 
        background: hsl(var(--hsl-b6)); border-radius: 12px;
        // box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        display: flex; flex-direction: column; overflow: hidden;
        margin: 0;
      }

      #oa-modal .account-edit-entry--no-label {
        padding-left: 48px !important;
      }
      #oa-modal .account-edit-entry__label {
        width: 48px !important;
      }

      #oa-modal .osu-page {
        width: 100% !important;
      }

      #oa-modal .header-v4__content {
        width: 100% !important;
      }

      #oa-modal .account-edit__section {
        width: 160px;
        padding-left: 20px !important;
      }

      #oa-modal .header-v4__row {
        padding: 0 20px !important;
      }
      
      #oa-content { overflow-y: auto; flex-grow: 1; overflow-x: hidden; margin: 0; }
      
      .oa-input-wrapper { width: 100%; min-width: 0; }
      .oa-input-wrapper .account-edit-entry { width: 100%; box-sizing: border-box; }
      .oa-input-wrapper .account-edit-entry__input { width: 100%; box-sizing: border-box; text-overflow: ellipsis; }

      #oa-close {
        background: none; border: none; color: #fff; font-size: 20px; cursor: pointer;
        padding: 0; opacity: 0.7; transition: opacity 0.15s;
      }
      #oa-close:hover { opacity: 1; }

      .oa-module-settings {
        border-left: 2px solid hsl(var(--hsl-b5));
        margin-left: 56px;
        margin-bottom: 10px;
      }

      #oa-modal .oa-module-settings .account-edit-entry {
        padding: 4px 16px !important;
      }
    `);
      const wrapper = document.createElement("div");
      wrapper.id = "oa-wrapper";
      wrapper.innerHTML = `
      <button id="oa-fab" title="osu! assorted settings"><i class="fas fa-cog"></i></button>
      <div id="oa-backdrop">
        <div id="oa-modal">
          
          <div class="header-v4 header-v4--settings" style="margin: 0; border-radius: 12px 12px 0 0;">
            <div class="header-v4__container">
              <div class="header-v4__content">
                <div class="header-v4__row header-v4__row--bar" style="justify-content: space-between;">
                  <ul class="header-nav-v4 header-nav-v4--list">
                    <li class="header-nav-v4__item">
                      <span class="header-nav-v4__link header-nav-v4__link--active" style="cursor: default;">
                        <span class="fake-bold">osu! assorted settings</span>
                      </span>
                    </li>
                  </ul>
                  <button id="oa-close" title="Close"><i class="fas fa-times"></i></button>
                </div>
              </div>
            </div>
          </div>

          <div class="osu-page osu-page--account-edit" id="oa-content" style="background: transparent;"></div>
        </div>
      </div>
    `;
      const attachToDOM = () => {
        if (!document.body.contains(wrapper)) {
          document.body.appendChild(wrapper);
        }
      };
      setInterval(attachToDOM, 500);
      const backdrop = wrapper.querySelector("#oa-backdrop");
      const contentBox = wrapper.querySelector("#oa-content");
      wrapper.querySelector("#oa-fab").addEventListener("click", () => backdrop.classList.add("oa-open"));
      wrapper.querySelector("#oa-close").addEventListener("click", () => backdrop.classList.remove("oa-open"));
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) backdrop.classList.remove("oa-open");
      });
      const uiHelper = {
        buildSection(title, isFirst = false) {
          const section = document.createElement("div");
          section.className = `account-edit ${isFirst ? "account-edit--first" : ""}`;
          section.innerHTML = `
          <div class="account-edit__section"><h2 class="account-edit__section-title">${title}</h2></div>
          <div class="account-edit__input-groups"><div class="account-edit__input-group"></div></div>
        `;
          return { section, group: section.querySelector(".account-edit__input-group") };
        },
        buildToggle(label, desc, isChecked, onChange) {
          const div = document.createElement("div");
          div.className = "account-edit-entry account-edit-entry--no-label";
          div.innerHTML = `
          <label class="account-edit-entry__checkbox">
            <div class="osu-switch-v2">
              <input class="osu-switch-v2__input" type="checkbox" ${isChecked ? "checked" : ""}>
              <span class="osu-switch-v2__content"></span>
            </div>
            <span class="account-edit-entry__checkbox-label" style="display: flex; flex-direction: column;">
              <span style="font-weight: 600;">${label}</span>
              ${desc ? `<span style="font-size: 12px; color: hsl(var(--hsl-c1)); font-weight: normal; margin-top: 4px; line-height: 1.4;">${desc}</span>` : ""}
            </span>
          </label>
        `;
          div.querySelector("input").addEventListener("change", (e) => onChange(e.target.checked));
          return div;
        },
        buildInput(label, type, val, placeholder, onChange) {
          const div = document.createElement("div");
          div.className = "account-edit-entry oa-input-wrapper";
          div.innerHTML = `
          <input class="account-edit-entry__input" type="${type}" value="${val || ""}" placeholder=" ">
          <div class="account-edit-entry__label">${label}</div>
        `;
          const inputEl = div.querySelector("input");
          if (placeholder) inputEl.placeholder = placeholder;
          inputEl.addEventListener("input", (e) => onChange(e.target.value));
          return div;
        }
      };
      const apiSection = uiHelper.buildSection("osu! API Credentials", true);
      let clientIdVal = this.get("osu_client_id", "");
      let clientSecretVal = this.get("osu_client_secret", "");
      const hasSecret = Boolean(clientSecretVal);
      apiSection.group.appendChild(uiHelper.buildInput("Client ID", "text", clientIdVal, "", (val) => clientIdVal = val));
      apiSection.group.appendChild(uiHelper.buildInput("Client Secret", "password", "", hasSecret ? "(saved \u2014 enter to change)" : "", (val) => clientSecretVal = val));
      const apiActions = document.createElement("div");
      apiActions.className = "account-edit-entry account-edit-entry--no-label";
      apiActions.style.display = "flex";
      apiActions.style.gap = "10px";
      apiActions.innerHTML = `
      <button class="btn-osu-big btn-osu-big--account-edit" id="oa-btn-save">
        <div class="btn-osu-big__content">
          <div class="btn-osu-big__left">Save & Verify</div>
          <div class="btn-osu-big__icon"><i class="fas fa-check"></i></div>
        </div>
      </button>
      <button class="btn-osu-big btn-osu-big--account-edit btn-osu-big--danger" id="oa-btn-clear">
        <div class="btn-osu-big__content">
          <div class="btn-osu-big__left">Clear</div>
          <div class="btn-osu-big__icon"><i class="fas fa-trash"></i></div>
        </div>
      </button>
    `;
      apiActions.querySelector("#oa-btn-save").addEventListener("click", () => {
        if (clientIdVal) this.set("osu_client_id", clientIdVal);
        if (clientSecretVal) this.set("osu_client_secret", clientSecretVal);
        alert("OAuth Credentials Saved. Page will reload.");
        location.reload();
      });
      apiActions.querySelector("#oa-btn-clear").addEventListener("click", () => {
        this.set("osu_client_id", "");
        this.set("osu_client_secret", "");
        alert("Credentials Cleared.");
        location.reload();
      });
      apiSection.group.appendChild(apiActions);
      contentBox.appendChild(apiSection.section);
      const modulesSection = uiHelper.buildSection("Features");
      modules.forEach((mod) => {
        const isModEnabled = this.isEnabled(mod.id);
        const modToggle = uiHelper.buildToggle(mod.name, mod.description, isModEnabled, (checked) => {
          this.setEnabled(mod.id, checked);
          if (customSettingsWrapper) customSettingsWrapper.style.display = checked ? "block" : "none";
        });
        modulesSection.group.appendChild(modToggle);
        let customSettingsWrapper = null;
        if (mod.settings && mod.settings.length > 0) {
          customSettingsWrapper = document.createElement("div");
          customSettingsWrapper.className = "oa-module-settings";
          mod.settings.forEach((setting) => {
            const val = this.getModuleSetting(mod.id, setting.id, setting.default);
            if (setting.type === "checkbox") {
              customSettingsWrapper.appendChild(uiHelper.buildToggle(setting.name, setting.description, val, (checked) => {
                this.setModuleSetting(mod.id, setting.id, checked);
              }));
            } else {
              customSettingsWrapper.appendChild(uiHelper.buildInput(setting.name, setting.type, val, setting.description, (newVal) => {
                this.setModuleSetting(mod.id, setting.id, newVal);
              }));
            }
          });
          modulesSection.group.appendChild(customSettingsWrapper);
        }
      });
      contentBox.appendChild(modulesSection.section);
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
    description: "Attempts to use mapset thumbnail as a fallback image if the background does not exist.",
    init() {
      router.onNavigate("/beatmapsets/*", () => this.runOnSetPage());
      panelManager.register((panel) => this.processPanel(panel));
    },
    async runOnSetPage() {
      const cover = await waitForElement(".beatmapset-header__cover .beatmapset-cover");
      if (!cover) return;
      const style = getComputedStyle(cover);
      if (!style.getPropertyValue("--bg")) {
        const match = location.pathname.match(/\/beatmapsets\/(\d+)/);
        if (!match) return;
        const setId = match[1];
        setId && cover.style.setProperty("--bg", `url(https://b.ppy.sh/thumb/${setId}l.jpg)`);
      }
    },
    processPanel(panel) {
      const linkEl = panel.querySelector('a[href*="/beatmapsets/"]');
      const match = linkEl.getAttribute("href").match(/\/beatmapsets\/(\d+)/);
      const setId = match[1];
      const covers = panel.querySelectorAll(".beatmapset-cover");
      const currentBg = covers[0]?.style.getPropertyValue("--bg") || "";
      if (currentBg.includes(`/thumb/`) || currentBg.includes("url(") && !currentBg.includes("var(")) return;
      covers[0]?.style.setProperty("--bg", `url("https://b.ppy.sh/thumb/${setId}l.jpg")`, "important");
      covers[1]?.style.setProperty("--bg", `url("https://b.ppy.sh/thumb/${setId}l.jpg")`, "important");
    }
  };

  // src/main.js
  var _modules = Object.values(modules_exports);
  beatmapsetData.init();
  panelManager.init();
  settings.createSettingsUI(_modules);
  _modules.forEach((m) => {
    if (settings.isEnabled(m.id)) {
      m.init();
    }
  });
})();


;(function devReload() {
  var ws = new WebSocket('ws://localhost:4532');
  ws.onmessage = function(e) { if (e.data === 'reload') location.reload(); };
  ws.onclose   = function()  { setTimeout(devReload, 2000); };
})();