import { settings } from '../core/settings.js';

export const useCustomBackground = {
  id: 'useCustomBackground',
  name: 'Use Custom Background',
  description: 'Set a custom background.',

  settings: [
    { id: 'custom_bg', name: 'Image URL', type: 'text', default: '' },
    { id: 'custom_bg_opacity', name: 'Opacity', type: 'text', default: '0.2' },
    // { id: 'custom_bg_translucent_page', name: 'Backdrop Opacity', type: 'text', default: '1' },
    { id: 'custom_bg_hide_header', name: 'Hide Header Background', type: 'checkbox', default: true },
  ],

  init() {
    const bgUrl = settings.getModuleSetting(this.id, 'custom_bg', '');
    const op = settings.getModuleSetting(this.id, 'custom_bg_opacity', '0.2');
    const hideHeader = settings.getModuleSetting(this.id, 'custom_bg_hide_header', true);
    // const translucentPage = settings.getModuleSetting(this.id, 'custom_bg_translucent_page', '1');

    if (!bgUrl) return;

    const injectBackground = (workingUrl) => {
      GM_addStyle(`
        body::before { 
          content: ""; 
          position: fixed; 
          inset: 0; 
          z-index: -1; 
          background: url("${workingUrl}") center/cover fixed; 
          opacity: ${op}; 
        }
      `);

      if (hideHeader) {
        GM_addStyle(`
          .header-v4__bg-container, .nav2-header__triangles {
            display: none;
          }
        `);
      }

      // if (translucentPage) {
      //   GM_addStyle(`
      //     :root {
      //       --page-bg-opacity: 0.8;
      //     }
      //     .beatmapsets, .osu-page--generic, .osu-page--generic-compact, .osu-page--forum, .osu-page--wiki, .user-home {
        //     background-color: hsla(var(--hsl-b5), var(--page-bg-opacity)) !important;
        //   }
        //   .beatmapsets__toolbar, .user-list {
        //     background-color: hsla(var(--hsl-b4), var(--page-bg-opacity)) !important;
        //   }
        //   .page-mode {
        //     background-color: hsla(var(--page-bg-opacity)) !important;
        //   }
        // `);
      // }
    };

    const bg = new Image();
    
    bg.onload = () => {
      console.log('[Custom Background] Image loaded normally.');
      injectBackground(bgUrl);
    };

    bg.onerror = () => {
      console.log('[Custom Background] Normal load blocked, loading image with blob fallback.');
      
      GM_xmlhttpRequest({
        method: 'GET',
        url: bgUrl,
        responseType: 'blob',
        onload: function(response) {
          if (response.status >= 200 && response.status < 300) {
            const reader = new FileReader();
            reader.onloadend = function() {
              injectBackground(reader.result);
            };
            reader.readAsDataURL(response.response);
          } else {
            console.error(`[Custom Background] Fallback failed with status: ${response.status}`);
          }
        },
        onerror: function(err) {
          console.error('[Custom Background] What:', err);
        }
      });
    };

    bg.src = bgUrl;
  }
};