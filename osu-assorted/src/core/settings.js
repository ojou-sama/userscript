// Usage:
//   settings.isEnabled('myModule')         → true (default)
//   settings.setEnabled('myModule', false)
//   settings.get('someKey', 'default')
//   settings.set('someKey', 'value')

function _read(key) {
  try {
    const val = GM_getValue(key, undefined);
    return val === undefined ? null : val;
  } catch {
    console.error('[settings] GM_getValue unavailable, unable to read settings');
    // console.warn('[settings] GM_getValue unavailable, using localStorage');
    // const raw = localStorage.getItem(key);
    // return raw === null ? null : JSON.parse(raw);
  }
}

function _write(key, value) {
  try {
    GM_setValue(key, value);
  } catch {
    console.error('[settings] GM_setValue unavailable, unable to write settings');
    // console.warn('[settings] GM_setValue unavailable, using localStorage');
    // localStorage.setItem(key, JSON.stringify(value));
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

  createSettingsUI() {
        
  }
};
