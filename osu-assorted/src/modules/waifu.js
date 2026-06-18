import { router } from '../core/router.js';
import { settings } from '../core/settings.js';

export const addWaifu = {
  id: 'addWaifu',
  name: 'Add Waifu',
  description: 'Add a waifu to the page.',

  settings: [
    {
        id: 'waifu_url',
        name: 'Image URL',
        description: 'Enter the URL of the waifu image.',
        type: 'text',
        default: 'https://catbox.moe/pictures/qts/1458438424722.png',
    },
    {
        id: 'waifu_size',
        name: 'Image Size',
        description: 'Set the width of the waifu image (e.g. "150px" or "auto").',
        type: 'text',
        default: 'auto',
    },
    {
        id: 'waifu_bottom_offset',
        name: 'Bottom Offset',
        description: 'Set the bottom offset of the waifu image (e.g. "10px").',
        type: 'text',
        default: '0px',
    },
    {
        id: 'waifu_right_offset',
        name: 'Right Offset',
        description: 'Set the right offset of the waifu image (e.g. "10px").',
        type: 'text',
        default: '48px',
    }
  ],

  init() {
    router.onNavigate('*', () => this.run());

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
        const targetUrl = settings.getModuleSetting(this.id, 'waifu_url', 'https://catbox.moe/pictures/qts/1458438424722.png');
        if (!targetUrl) return;

        const waifuContainer = document.createElement('div');
        waifuContainer.id = 'waifu-container';
        waifuContainer.style.right = settings.getModuleSetting(this.id, 'waifu_right_offset', '48px');;
        waifuContainer.style.bottom = settings.getModuleSetting(this.id, 'waifu_bottom_offset', '0px');
        
        const waifuImg = document.createElement('img');
        waifuImg.src = targetUrl;
        waifuImg.style.height = 'auto';
        waifuImg.style.width = settings.getModuleSetting(this.id, 'waifu_size', 'auto');;
        
        waifuContainer.appendChild(waifuImg);
        document.body.appendChild(waifuContainer);
      });
    }, 25);
  }
}