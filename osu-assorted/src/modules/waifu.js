import { settings } from '../core/settings.js';

export const addWaifu = {
  id: 'addWaifu',
  name: 'Add Waifu',
  description: 'Add a waifu to the page.',

  settings: [
    { id: 'waifu_url', name: 'Image URL', description: 'Enter a valid image URL.', type: 'text', default: 'https://catbox.moe/pictures/qts/1458438424722.png' },
    { id: 'waifu_size', name: 'Image Size (px)', type: 'number', min: 50, max: 800, default: 250 },
    { id: 'waifu_bottom_offset', name: 'Bottom Offset (px)', type: 'number', default: 0 },
    { id: 'waifu_right_offset', name: 'Right Offset (px)', type: 'number', default: 0 }
  ],

  init() {
    GM_addStyle(`
      .waifu-container-ui { position: fixed; z-index: 9999; pointer-events: none; }
    `);

    settings.onChange(this.id, () => this.updateRender());

    // Foolproof SPA survival loop: 
    // Appending to documentElement (<html>) avoids SPA body replacement wipes.
    setInterval(() => {
      let container = document.getElementById('oa-waifu-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'oa-waifu-container';
        container.className = 'waifu-container-ui';
        
        const waifuImg = document.createElement('img');
        waifuImg.id = 'oa-waifu-img';
        waifuImg.style.height = 'auto';
        
        container.appendChild(waifuImg);
        document.documentElement.appendChild(container); // Mount globally
        
        this.updateRender();
      }
    }, 250);
  },

  updateRender() {
    const container = document.getElementById('oa-waifu-container');
    const img = document.getElementById('oa-waifu-img');
    if (!container || !img) return;

    const targetUrl = settings.getModuleSetting(this.id, 'waifu_url', 'https://catbox.moe/pictures/qts/1458438424722.png');
    if (!targetUrl) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    const size = settings.getModuleSetting(this.id, 'waifu_size', 250);
    const right = settings.getModuleSetting(this.id, 'waifu_right_offset', 0);
    const bottom = settings.getModuleSetting(this.id, 'waifu_bottom_offset', 0);

    container.style.right = `${right}px`;
    container.style.bottom = `${bottom}px`;
    img.style.width = `${size}px`;
    img.src = targetUrl;
  }
}