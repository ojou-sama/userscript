import { settings } from '../core/settings.js';

export const useCustomBackground = {
  id: 'useCustomBackground',
  name: 'Use Custom Background',
  description: 'Set a custom background.',

  settings: [
    { id: 'custom_bg', name: 'Image URL', type: 'text', default: '' },
    { id: 'custom_bg_opacity', name: 'Opacity', type: 'text', default: '0.2' }
  ],

  init() {
    const bg = settings.getModuleSetting(this.id, 'custom_bg', '');
    const op = settings.getModuleSetting(this.id, 'custom_bg_opacity', '0.2');

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