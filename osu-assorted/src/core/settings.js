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

const callbacks = new Map();

export const settings = {
  isEnabled(moduleId) {
    const val = _read(`module__${moduleId}`);
    return val === null ? true : Boolean(val);
  },

  setEnabled(moduleId, enabled) {
    _write(`module__${moduleId}`, enabled);
    this._emit(moduleId);
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
    this._emit(moduleId); // Trigger live update
  },

  onChange(moduleId, callback) {
    if (!callbacks.has(moduleId)) callbacks.set(moduleId, []);
    callbacks.get(moduleId).push(callback);
  },

  _emit(moduleId) {
    if (callbacks.has(moduleId)) {
      callbacks.get(moduleId).forEach(cb => cb());
    }
  }
};