// import { beatmapsetData } from '../core/beatmapset-data';
import { elementManager } from '../core/element-manager';
import { router } from '../core/router';
import { waitForElement } from '../core/utils';

export const useThumbnailFallback = {
  id: 'useThumbnailFallback',
  name: 'Use Thumbnail Fallback',
  description: 'Attempts to use mapset thumbnail as a fallback image if the background does not exist.',

  init() {
    router.onNavigate('/beatmapsets/*', () => this.runOnSetPage());
    elementManager.register('.beatmapset-panel', (panel) => this.processPanel(panel));
  },

  async runOnSetPage() {
    const cover = await waitForElement('.beatmapset-header__cover .beatmapset-cover');
    if (!cover) return;
    const style = getComputedStyle(cover);
    if (!style.getPropertyValue('--bg')) {
      const match = location.pathname.match(/\/beatmapsets\/(\d+)/);
      if (!match) return;
      const setId = match[1];
      setId && cover.style.setProperty('--bg', `url(https://b.ppy.sh/thumb/${setId}l.jpg)`);
    }
  },

  processPanel(panel) {
    // grab set id
    const linkEl = panel.querySelector('a[href*="/beatmapsets/"]');
    const match = linkEl.getAttribute('href').match(/\/beatmapsets\/(\d+)/);
    const setId = match[1];

    // grab cover
    const covers = panel.querySelectorAll('.beatmapset-cover');

    // skip if the cover is already set goodly
    const currentBg = covers[0]?.style.getPropertyValue('--bg') || '';
    if (currentBg.includes(`/thumb/`) 
      || (currentBg.includes('url(') && !currentBg.includes('var('))) return;

    // use thumbnail fallback
    covers[0]?.style.setProperty('--bg', `url("https://b.ppy.sh/thumb/${setId}l.jpg")`, 'important');
    covers[1]?.style.setProperty('--bg', `url("https://b.ppy.sh/thumb/${setId}l.jpg")`, 'important');
  }
}