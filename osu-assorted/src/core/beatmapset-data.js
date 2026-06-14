import { router } from './router';
import { waitForElement } from './utils';

let cachedBeatmapsetData = null;

export const beatmapsetData = {
  init() {
    router.onNavigate('/beatmapsets/*', () => this.clear());
  },

  async get() {
    if (cachedBeatmapsetData) return cachedBeatmapsetData;

    try {
      const scriptTag = await waitForElement('script[id="json-beatmapset"]'); 
      cachedBeatmapsetData = JSON.parse(scriptTag.textContent);
      console.log('[beatmapsetData] Loaded beatmapset data:', cachedBeatmapsetData.id);
      return cachedBeatmapsetData;
    } catch (e) {
      console.error('[beatmapsetData] Failed to parse page JSON:', e);
      return null;
    }
  },

  clear() {
    cachedBeatmapsetData = null;
  }
}