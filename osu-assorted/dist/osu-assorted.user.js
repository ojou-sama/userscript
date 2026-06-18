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
        position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000;
        display: none; align-items: center; justify-content: center;
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
      
      #oa-modal .oa-module-settings .account-edit-entry__label {
        width: 72px !important;
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
                        <span class="fake-bold">osu! assorted</span>
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
    addWaifu: () => addWaifu,
    hideRankColors: () => hideRankColors,
    mutualFilter: () => mutualFilter,
    showMapsOnRestrictedUserPages: () => showMapsOnRestrictedUserPages,
    useCustomBackground: () => useCustomBackground,
    useOldFallbackBackground: () => useOldFallbackBackground,
    useThumbnailFallback: () => useThumbnailFallback
  });

  // src/modules/waifu.js
  var addWaifu = {
    id: "addWaifu",
    name: "Add Waifu",
    description: "Add a waifu to the page.",
    settings: [
      {
        id: "waifu_url",
        name: "Image URL",
        description: "Enter the URL of the waifu image.",
        type: "text",
        default: "https://catbox.moe/pictures/qts/1458438424722.png"
      },
      {
        id: "waifu_size",
        name: "Image Size",
        description: 'Set the width of the waifu image (e.g. "150px" or "auto").',
        type: "text",
        default: "auto"
      },
      {
        id: "waifu_bottom_offset",
        name: "Bottom Offset",
        description: 'Set the bottom offset of the waifu image (e.g. "10px").',
        type: "text",
        default: "0px"
      },
      {
        id: "waifu_right_offset",
        name: "Right Offset",
        description: 'Set the right offset of the waifu image (e.g. "10px").',
        type: "text",
        default: "48px"
      }
    ],
    init() {
      router.onNavigate("*", () => this.run());
      GM_addStyle(`
      #waifu-container {
        position: fixed;
        z-index: 9999;
        pointer-events: none;
      }
    `);
    },
    async run() {
      setTimeout(() => {
        requestAnimationFrame(() => {
          const targetUrl = settings.getModuleSetting(this.id, "waifu_url", "https://catbox.moe/pictures/qts/1458438424722.png");
          if (!targetUrl) return;
          const waifuContainer = document.createElement("div");
          waifuContainer.id = "waifu-container";
          waifuContainer.style.right = settings.getModuleSetting(this.id, "waifu_right_offset", "48px");
          ;
          waifuContainer.style.bottom = settings.getModuleSetting(this.id, "waifu_bottom_offset", "0px");
          const waifuImg = document.createElement("img");
          waifuImg.src = targetUrl;
          waifuImg.style.height = "auto";
          waifuImg.style.width = settings.getModuleSetting(this.id, "waifu_size", "auto");
          ;
          waifuContainer.appendChild(waifuImg);
          document.body.appendChild(waifuContainer);
        });
      }, 25);
    }
  };

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

  // src/core/api.js
  var API_BASE = "https://osu.ppy.sh/api/v2";
  var accessToken = settings.get("oauth_token", null);
  var tokenExpiresAt = settings.get("oauth_expires_at", 0);
  var api = {
    async getToken() {
      const now = Date.now();
      if (accessToken && tokenExpiresAt > now + 6e4) {
        return accessToken;
      }
      const clientId = settings.get("osu_client_id");
      const clientSecret = settings.get("osu_client_secret");
      if (!clientId || !clientSecret) {
        throw new Error("[osu! api] Client ID or Secret is missing. Please configure them in the settings.");
      }
      const response = await fetch("https://osu.ppy.sh/oauth/token", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: parseInt(clientId, 10),
          client_secret: clientSecret,
          grant_type: "client_credentials",
          scope: "public"
        })
      });
      if (!response.ok) {
        throw new Error(`[osu!api] Failed to fetch token: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      accessToken = data.access_token;
      tokenExpiresAt = Date.now() + data.expires_in * 1e3;
      settings.set("oauth_token", accessToken);
      settings.set("oauth_expires_at", tokenExpiresAt);
      return accessToken;
    },
    // generic API request method
    async request(endpoint, options = {}) {
      const token = await this.getToken();
      const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
          ...options.headers || {}
        }
      });
      if (!res.ok) {
        throw new Error(`[osu!api] Request failed (${res.status}): ${endpoint}`);
      }
      return res.json();
    },
    /**
     * Fetch user profile data
     * @param {number|string} userId 
     * @param {string} mode - 'osu', 'taiko', 'fruits', 'mania' (Optional)
     */
    async getUser(userId, mode = "") {
      const modePath = mode ? `/${mode}` : "";
      return this.request(`/users/${userId}${modePath}`);
    },
    /**
     * Fetch a specific beatmap's data
     * @param {number|string} beatmapId 
     */
    async getBeatmap(beatmapId) {
      return this.request(`/beatmaps/${beatmapId}`);
    },
    /**
     * Fetch an entire beatmapset
     * @param {number|string} setId 
     */
    async getBeatmapset(setId) {
      return this.request(`/beatmapsets/${setId}`);
    },
    /**
     * Fetch a user's scores
     * @param {number|string} userId 
     * @param {string} type - 'best', 'firsts', or 'recent'
     * @param {number} limit - Default 10, Max 100
     * @param {number} offset - Default 0
     */
    async getUserScores(userId, type = "best", limit = 10, offset = 0) {
      return this.request(`/users/${userId}/scores/${type}?limit=${limit}&offset=${offset}`);
    },
    /**
     * Fetch scores for a specific beatmap
     * @param {number|string} beatmapId 
     * @param {string} mode - 'osu', 'taiko', 'fruits', 'mania' (Optional)
     */
    async getBeatmapScores(beatmapId, mode = "") {
      const modeQuery = mode ? `?mode=${mode}` : "";
      return this.request(`/beatmaps/${beatmapId}/scores${modeQuery}`);
    }
  };

  // src/modules/show-restricted-user-maps.js
  function getStarColor(stars) {
    if (stars < 2) return "rgb(79, 250, 217)";
    if (stars < 2.7) return "rgb(79, 232, 231)";
    if (stars < 4) return "rgb(183, 249, 84)";
    if (stars < 5.3) return "rgb(250, 195, 98)";
    if (stars < 6.5) return "rgb(255, 102, 108)";
    if (stars < 8) return "rgb(251, 77, 119)";
    if (stars < 9) return "rgb(156, 87, 205)";
    return "rgb(94, 92, 212)";
  }
  var showMapsOnRestrictedUserPages = {
    id: "showMapsOnRestrictedUserPages",
    name: "Show Maps on Restricted User Pages",
    description: "Attempts to display maps on restricted user pages.",
    init() {
      router.onNavigate("/users/*", () => this.run());
    },
    async run() {
      const genericPage = await waitForElement(".osu-page--generic");
      if (!genericPage) return;
      const match = location.pathname.match(/\/users\/(\d+)/);
      if (!match) return;
      const userId = parseInt(match[1], 10);
      const originalBlurb = genericPage.innerHTML;
      genericPage.innerHTML = `<div style="text-align: center; padding: 40px;"><div class="la-ball-clip-rotate"></div><div style="margin-top: 15px;">Fetching map data for restricted user...</div></div>`;
      try {
        const searchRes = await api.request(`/beatmapsets/search?q=${userId}&s=any`);
        let userMaps = (searchRes.beatmapsets || []).filter((set) => set.user_id === userId);
        userMaps.sort((a, b) => b.id - a.id);
        const rankedMaps = userMaps.filter((set) => ["ranked", "approved"].includes(set.status));
        const lovedMaps = userMaps.filter((set) => set.status === "loved");
        const gravedMaps = userMaps.filter((set) => ["graveyard", "pending", "wip"].includes(set.status));
        const username = userMaps.length > 0 ? userMaps[0].creator : `User ${userId}`;
        const avatarUrl = `https://a.ppy.sh/${userId}`;
        this.injectUI(genericPage, originalBlurb, username, avatarUrl, rankedMaps, lovedMaps, gravedMaps);
      } catch (e) {
        console.error("[Restricted Maps] Failed to fetch:", e);
        genericPage.innerHTML = originalBlurb;
      }
    },
    injectUI(container, originalBlurb, username, avatarUrl, rankedMaps, lovedMaps, gravedMaps) {
      const buildBeatmapsetPanel = (set) => {
        const mapsByMode = {};
        if (set.beatmaps) {
          set.beatmaps.forEach((b) => {
            if (!mapsByMode[b.mode]) mapsByMode[b.mode] = [];
            mapsByMode[b.mode].push(b);
          });
        }
        let dotsHtml = "";
        const modeMap = { osu: "osu", taiko: "taiko", fruits: "catch", mania: "mania" };
        for (const mode in mapsByMode) {
          const maps = mapsByMode[mode].sort((a, b) => a.difficulty_rating - b.difficulty_rating);
          dotsHtml += `
          <div class="beatmapset-panel__extra-item beatmapset-panel__extra-item--dots">
            <div class="beatmapset-panel__beatmap-icon" title="osu!${mode !== "osu" ? mode : ""}">
              <i class="fal fa-extra-mode-${modeMap[mode] || mode}"></i>
            </div>
            ${maps.map((m) => `<div class="beatmapset-panel__beatmap-dot" style="--bg: ${getStarColor(m.difficulty_rating)};"></div>`).join("")}
          </div>`;
        }
        const statusMap = {
          "ranked": { hsl: "var(--beatmapset-ranked-bg-hsl)", color: "var(--beatmapset-ranked-colour)" },
          "loved": { hsl: "var(--beatmapset-loved-bg-hsl)", color: "var(--beatmapset-loved-colour)" },
          "approved": { hsl: "var(--beatmapset-approved-bg-hsl)", color: "var(--beatmapset-approved-colour)" },
          "graveyard": { hsl: "var(--beatmapset-graveyard-bg-hsl)", color: "var(--beatmapset-graveyard-colour)" },
          "wip": { hsl: "var(--beatmapset-pending-bg-hsl)", color: "var(--beatmapset-pending-colour)" },
          "pending": { hsl: "var(--beatmapset-pending-bg-hsl)", color: "var(--beatmapset-pending-colour)" }
        };
        const statusStyle = statusMap[set.status] || statusMap["pending"];
        const hasVideo = set.video ? `<div class="beatmapset-panel__play-icon" title="Has video"><i class="fas fa-film"></i></div>` : "";
        const hasStoryboard = set.storyboard ? `<div class="beatmapset-panel__play-icon" title="Has storyboard"><i class="fas fa-image"></i></div>` : "";
        const displayStatus = set.status.charAt(0).toUpperCase() + set.status.slice(1);
        return `
        <div class="beatmapset-panel beatmapset-panel--size-normal js-audio--player" data-audio-url="https://b.ppy.sh/preview/${set.id}.mp3" style="--beatmaps-popup-transition-duration: 150ms;">
          <a class="beatmapset-panel__cover-container" href="https://osu.ppy.sh/beatmapsets/${set.id}">
            <div class="beatmapset-panel__cover-col beatmapset-panel__cover-col--play">
              <div class="beatmapset-cover beatmapset-cover--full" style="--bg-default: var(--bg-default-3); --bg: url('${set.covers.list}'); --bg-2x: url('${set.covers.list}');"></div>
            </div>
            <div class="beatmapset-panel__cover-col beatmapset-panel__cover-col--info">
              <div class="beatmapset-cover beatmapset-cover--full" style="--bg-default: var(--bg-default-3); --bg: url('${set.covers.card}'); --bg-2x: url('${set.covers.card}');"></div>
            </div>
          </a>
          <div class="beatmapset-panel__content">
            <div class="beatmapset-panel__play-container">
              <button class="beatmapset-panel__play js-audio--play" type="button"><span class="play-button"></span></button>
              <div class="beatmapset-panel__play-progress">
                <div class="circular-progress circular-progress--beatmapset-panel" title="0 / 1">
                  <div class="circular-progress__label">1</div>
                  <div class="circular-progress__slice"><div class="circular-progress__circle"></div><div class="circular-progress__circle circular-progress__circle--fill"></div></div>
                </div>
              </div>
              <div class="beatmapset-panel__play-icons">
                ${hasVideo}
                ${hasStoryboard}
              </div>
            </div>
            <div class="beatmapset-panel__info">
              <div class="beatmapset-panel__info-row beatmapset-panel__info-row--title">
                <a class="beatmapset-panel__main-link u-ellipsis-overflow" href="https://osu.ppy.sh/beatmapsets/${set.id}">${set.title}</a>
              </div>
              <div class="beatmapset-panel__info-row beatmapset-panel__info-row--artist">
                <a class="beatmapset-panel__main-link u-ellipsis-overflow" href="https://osu.ppy.sh/beatmapsets/${set.id}">by ${set.artist}</a>
              </div>
              <div class="beatmapset-panel__info-row beatmapset-panel__info-row--source">
                <div class="u-ellipsis-overflow">${set.source || ""}</div>
              </div>
              <div class="beatmapset-panel__info-row beatmapset-panel__info-row--mapper">
                <div class="u-ellipsis-overflow">\u4F5C\u8005 <a class="js-usercard beatmapset-panel__mapper-link u-hover" data-user-id="${set.user_id}" href="https://osu.ppy.sh/users/${set.user_id}">${set.creator}</a></div>
              </div>
              <div class="beatmapset-panel__info-row beatmapset-panel__info-row--stats">
                <div class="beatmapset-panel__stats-item beatmapset-panel__stats-item--play-count" title="\u30D7\u30EC\u30A4\u56DE\u6570\uFF1A${set.play_count}">
                  <span class="beatmapset-panel__stats-item-icon"><i class="fa-fw fas fa-play-circle"></i></span><span>${set.play_count.toLocaleString()}</span>
                </div>
                <div class="beatmapset-panel__stats-item beatmapset-panel__stats-item--favourite-count" title="\u304A\u6C17\u306B\u5165\u308A\uFF1A${set.favourite_count}">
                  <span class="beatmapset-panel__stats-item-icon"><i class="fa-fw far fa-heart"></i></span><span>${set.favourite_count.toLocaleString()}</span>
                </div>
                <div class="beatmapset-panel__stats-item beatmapset-panel__stats-item--date">
                  <span class="beatmapset-panel__stats-item-icon"><i class="fa-fw fas fa-check-circle"></i></span>
                  <time class="js-tooltip-time" datetime="${set.submitted_date}">${new Date(set.submitted_date).toLocaleDateString()}</time>
                </div>
              </div>
              <a class="beatmapset-panel__info-row beatmapset-panel__info-row--extra" href="https://osu.ppy.sh/beatmapsets/${set.id}">
                <div class="beatmapset-panel__extra-item">
                  <div class="beatmapset-status beatmapset-status--panel" style="--bg-hsl: ${statusStyle.hsl}; --colour: ${statusStyle.color};">${displayStatus}</div>
                </div>
                ${dotsHtml}
              </a>
            </div>
            <div class="beatmapset-panel__menu-container">
              <div class="beatmapset-panel__menu">
                <button class="beatmapset-panel__menu-item" type="button"><span class="far fa-heart"></span></button>
                <a class="beatmapset-panel__menu-item" href="https://osu.ppy.sh/beatmapsets/${set.id}/download${set.video ? "?noVideo=1" : ""}"><span class="fas fa-file-download"></span></a>
              </div>
            </div>
          </div>
          <button class="beatmapset-panel__mobile-expand" type="button"><span class="fas fa-angle-down"></span></button>
        </div>
      `;
      };
      container.className = "osu-page osu-page--generic-compact";
      container.innerHTML = `
      <div data-page-id="main">
        <div class="profile-info profile-info--cover">
          <div class="profile-info__bg" style="background-image: url('https://assets.ppy.sh/user-cover-presets/2/f5142b64b60002f6314b22c775195950105908e149037f4de78efc0e0f28d442.jpeg');"></div>
          <div class="profile-info__details">
            <div class="profile-info__avatar">
              <span class="avatar avatar--guest avatar--full" style="background-image: url('${avatarUrl}');"></span>
            </div>
            <div class="profile-info__info">
              <h1 class="profile-info__name">
                <span class="u-ellipsis-pre-overflow">${username}</span>
              </h1>
              <div class="profile-info__flags">
                <span class="profile-info__flag-text" style="color: #ff6666; font-weight: 600; margin-top: 5px;">RESTRICTED USER</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="osu-page osu-page--generic" style="margin: 20px auto;">
            ${originalBlurb}
        </div>
      </div>

      <div class="sticky-toolbar">
        <div class="page-mode page-mode--profile-page-extra u-hidden-desktop">
          <a class="page-mode__item" data-page-id="beatmaps" href="#beatmaps">
            <span class="page-mode-link page-mode-link--profile-page page-mode-link--is-active">
              <span class="fake-bold" data-content="\u30D3\u30FC\u30C8\u30DE\u30C3\u30D7">\u30D3\u30FC\u30C8\u30DE\u30C3\u30D7</span>
            </span>
          </a>
        </div>
        <div class="page-mode page-mode--profile-page-extra hidden-xs ui-sortable ui-sortable-disabled">
          <a class="page-mode__item js-sortable--tab ui-sortable-handle" data-page-id="beatmaps" href="#beatmaps">
            <span class="page-mode-link page-mode-link--profile-page page-mode-link--is-active">
              <span class="fake-bold" data-content="\u30D3\u30FC\u30C8\u30DE\u30C3\u30D7">\u30D3\u30FC\u30C8\u30DE\u30C3\u30D7</span>
            </span>
          </a>
        </div>
      </div>

      <div class="user-profile-pages">
        <div class="js-sortable--page" data-page-id="beatmaps">
          <div class="page-extra">
            <div class="u-relative"><h2 class="title title--page-extra">\u30D3\u30FC\u30C8\u30DE\u30C3\u30D7</h2></div>
            
            ${rankedMaps.length > 0 ? `
              <h3 class="title title--page-extra-small">Ranked & Approved<span class="title__count">${rankedMaps.length}</span></h3>
              <div class="page-extra__beatmapsets js-audio--group">
                ${rankedMaps.map(buildBeatmapsetPanel).join("")}
              </div>
            ` : ""}

            ${lovedMaps.length > 0 ? `
              <h3 class="title title--page-extra-small">Loved<span class="title__count">${lovedMaps.length}</span></h3>
              <div class="page-extra__beatmapsets js-audio--group">
                ${lovedMaps.map(buildBeatmapsetPanel).join("")}
              </div>
            ` : ""}

            ${gravedMaps.length > 0 ? `
              <h3 class="title title--page-extra-small">Pending & Graveyard<span class="title__count">${gravedMaps.length}</span></h3>
              <div class="page-extra__beatmapsets js-audio--group">
                ${gravedMaps.map(buildBeatmapsetPanel).join("")}
              </div>
            ` : ""}

            ${rankedMaps.length === 0 && lovedMaps.length === 0 && gravedMaps.length === 0 ? `
              <div class="profile-detail__empty-chart">This restricted user has no uploaded beatmaps.</div>
            ` : ""}
          </div>
        </div>
      </div>
    `;
    }
  };

  // src/modules/custom-background.js
  var useCustomBackground = {
    id: "useCustomBackground",
    name: "Use Custom Background",
    description: "Set a custom background.",
    settings: [
      { id: "custom_bg", name: "Image URL", type: "text", default: "" },
      { id: "custom_bg_opacity", name: "Opacity", type: "text", default: "0.2" }
    ],
    init() {
      const bg = settings.getModuleSetting(this.id, "custom_bg", "");
      const op = settings.getModuleSetting(this.id, "custom_bg_opacity", "0.2");
      if (bg) {
        GM_addStyle(`
        body::before { 
          content: ""; 
          position: fixed; 
          inset: 0; 
          z-index: -1; 
          background: url("${bg}") center/cover fixed; 
          opacity: ${op}; 
        }
      `);
      }
    }
  };

  // src/modules/use-old-fallback-background.js
  var useOldFallbackBackground = {
    id: "useOldFallbackBackground",
    name: "Use Old Fallback Background",
    description: "Uses the old gray fallback background (rather than the new color gradients).",
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