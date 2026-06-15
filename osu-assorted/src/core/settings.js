// Usage:
//   settings.isEnabled('myModule')
//   settings.getModuleSetting('myModule', 'customKey', 'default')

function _read(key) {
  try {
    const val = GM_getValue(key, undefined);
    return val === undefined ? null : val;
  } catch {
    console.error('[settings] GM_getValue unavailable, unable to read settings');
    return null;
  }
}

function _write(key, value) {
  try {
    GM_setValue(key, value);
  } catch {
    console.error('[settings] GM_setValue unavailable, unable to write settings');
  }
}

export const settings = {
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
    if (document.getElementById('oa-wrapper')) return;

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

    const wrapper = document.createElement('div');
    wrapper.id = 'oa-wrapper';
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

    // persist settings ui
    const attachToDOM = () => {
      if (!document.body.contains(wrapper)) {
        document.body.appendChild(wrapper);
      }
    };
    setInterval(attachToDOM, 500);

    const backdrop = wrapper.querySelector('#oa-backdrop');
    const contentBox = wrapper.querySelector('#oa-content');

    wrapper.querySelector('#oa-fab').addEventListener('click', () => backdrop.classList.add('oa-open'));
    wrapper.querySelector('#oa-close').addEventListener('click', () => backdrop.classList.remove('oa-open'));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.classList.remove('oa-open'); });

    const uiHelper = {
      buildSection(title, isFirst = false) {
        const section = document.createElement('div');
        section.className = `account-edit ${isFirst ? 'account-edit--first' : ''}`;
        section.innerHTML = `
          <div class="account-edit__section"><h2 class="account-edit__section-title">${title}</h2></div>
          <div class="account-edit__input-groups"><div class="account-edit__input-group"></div></div>
        `;
        return { section, group: section.querySelector('.account-edit__input-group') };
      },
      buildToggle(label, desc, isChecked, onChange) {
        const div = document.createElement('div');
        div.className = 'account-edit-entry account-edit-entry--no-label';
        div.innerHTML = `
          <label class="account-edit-entry__checkbox">
            <div class="osu-switch-v2">
              <input class="osu-switch-v2__input" type="checkbox" ${isChecked ? 'checked' : ''}>
              <span class="osu-switch-v2__content"></span>
            </div>
            <span class="account-edit-entry__checkbox-label" style="display: flex; flex-direction: column;">
              <span style="font-weight: 600;">${label}</span>
              ${desc ? `<span style="font-size: 12px; color: hsl(var(--hsl-c1)); font-weight: normal; margin-top: 4px; line-height: 1.4;">${desc}</span>` : ''}
            </span>
          </label>
        `;
        div.querySelector('input').addEventListener('change', (e) => onChange(e.target.checked));
        return div;
      },
      buildInput(label, type, val, placeholder, onChange) {
        const div = document.createElement('div');
        div.className = 'account-edit-entry oa-input-wrapper';
        div.innerHTML = `
          <input class="account-edit-entry__input" type="${type}" value="${val || ''}" placeholder=" ">
          <div class="account-edit-entry__label">${label}</div>
        `;
        const inputEl = div.querySelector('input');
        if (placeholder) inputEl.placeholder = placeholder;
        inputEl.addEventListener('input', (e) => onChange(e.target.value));
        return div;
      }
    };

    // OAUTH STUFF
    const apiSection = uiHelper.buildSection('osu! API Credentials', true);
    let clientIdVal = this.get('osu_client_id', '');
    let clientSecretVal = this.get('osu_client_secret', '');
    const hasSecret = Boolean(clientSecretVal);

    apiSection.group.appendChild(uiHelper.buildInput('Client ID', 'text', clientIdVal, '', val => clientIdVal = val));
    apiSection.group.appendChild(uiHelper.buildInput('Client Secret', 'password', '', hasSecret ? '(saved — enter to change)' : '', val => clientSecretVal = val));

    const apiActions = document.createElement('div');
    apiActions.className = 'account-edit-entry account-edit-entry--no-label';
    apiActions.style.display = 'flex'; 
    apiActions.style.gap = '10px';
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
    
    apiActions.querySelector('#oa-btn-save').addEventListener('click', () => {
      if (clientIdVal) this.set('osu_client_id', clientIdVal);
      if (clientSecretVal) this.set('osu_client_secret', clientSecretVal);
      alert('OAuth Credentials Saved. Page will reload.');
      location.reload();
    });

    apiActions.querySelector('#oa-btn-clear').addEventListener('click', () => {
      this.set('osu_client_id', '');
      this.set('osu_client_secret', '');
      alert('Credentials Cleared.');
      location.reload();
    });

    apiSection.group.appendChild(apiActions);
    contentBox.appendChild(apiSection.section);

    // module settings
    const modulesSection = uiHelper.buildSection('Features');
    
    modules.forEach(mod => {
      const isModEnabled = this.isEnabled(mod.id);
      
      const modToggle = uiHelper.buildToggle(mod.name, mod.description, isModEnabled, (checked) => {
        this.setEnabled(mod.id, checked);
        if (customSettingsWrapper) customSettingsWrapper.style.display = checked ? 'block' : 'none';
      });
      modulesSection.group.appendChild(modToggle);

      let customSettingsWrapper = null;
      if (mod.settings && mod.settings.length > 0) {
        customSettingsWrapper = document.createElement('div');
        customSettingsWrapper.className = 'oa-module-settings';

        mod.settings.forEach(setting => {
          const val = this.getModuleSetting(mod.id, setting.id, setting.default);
          if (setting.type === 'checkbox') {
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