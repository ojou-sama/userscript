// import { beatmapsetData } from '../core/beatmapset-data';
import { router } from '../core/router';
import { waitForElement } from '../core/utils';

export const useThumbnailFallback = {
  id: 'useThumbnailFallback',
  name: 'Use Thumbnail Fallback',
  description: 'Attempts to use the mapset thumbnail as a fallback image if the default background does not exist.',

  init() {
    router.onNavigate('/beatmapsets/*', () => this.run());
  },

  async run() {
    const cover = await waitForElement('.beatmapset-header__cover .beatmapset-cover');
    if (!cover) return;
    const style = getComputedStyle(cover);
    if (!style.getPropertyValue('--bg')) {
      const match = location.pathname.match(/\/beatmapsets\/(\d+)/);
      if (!match) return;
      const setId = match[1];
      setId && cover.style.setProperty('--bg', `url(https://b.ppy.sh/thumb/${setId}l.jpg)`);
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
}