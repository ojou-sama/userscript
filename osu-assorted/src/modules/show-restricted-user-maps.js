import { api } from "../core/api.js";
import { router } from "../core/router.js";
import { waitForElement } from "../core/utils.js";

// Helper to roughly approximate osu! star difficulty colors for the dots
function getStarColor(stars) {
  if (stars < 2.0) return 'rgb(79, 250, 217)';    // Easy
  if (stars < 2.7) return 'rgb(79, 232, 231)';    // Normal
  if (stars < 4.0) return 'rgb(183, 249, 84)';    // Hard
  if (stars < 5.3) return 'rgb(250, 195, 98)';    // Insane
  if (stars < 6.5) return 'rgb(255, 102, 108)';   // Expert
  if (stars < 8.0) return 'rgb(251, 77, 119)';    // Expert+
  if (stars < 9.0) return 'rgb(156, 87, 205)';    // 8*
  return 'rgb(94, 92, 212)';                      // 9*+
}

export const showMapsOnRestrictedUserPages = {
  id: 'showMapsOnRestrictedUserPages',
  name: 'Show Maps on Restricted User Pages',
  description: 'Attempts to display maps on restricted user pages.',

  init() {
    router.onNavigate('/users/*', () => this.run());
  },

  async run() {
    const genericPage = await waitForElement('.osu-page--generic');
    if (!genericPage) return;

    const match = location.pathname.match(/\/users\/(\d+)/);
    if (!match) return;
    const userId = parseInt(match[1], 10);

    // Save the original localized restricted text
    const originalBlurb = genericPage.innerHTML;

    genericPage.innerHTML = `<div style="text-align: center; padding: 40px;"><div class="la-ball-clip-rotate"></div><div style="margin-top: 15px;">Fetching map data for restricted user...</div></div>`;

    try {
      const searchRes = await api.request(`/beatmapsets/search?q=${userId}&s=any`);
      
      // Filter to ensure they are the actual creator, then sort newest to oldest
      let userMaps = (searchRes.beatmapsets || []).filter(set => set.user_id === userId);
      userMaps.sort((a, b) => b.id - a.id);

      const rankedMaps = userMaps.filter(set => ['ranked', 'approved'].includes(set.status));
      const lovedMaps = userMaps.filter(set => set.status === 'loved');
      const gravedMaps = userMaps.filter(set => ['graveyard', 'pending', 'wip'].includes(set.status));

      // Dynamically extract the username from their most recent map, fallback to ID
      const username = userMaps.length > 0 ? userMaps[0].creator : `User ${userId}`;
      const avatarUrl = `https://a.ppy.sh/${userId}`;

      this.injectUI(genericPage, originalBlurb, username, avatarUrl, rankedMaps, lovedMaps, gravedMaps);

    } catch (e) {
      console.error('[Restricted Maps] Failed to fetch:', e);
      genericPage.innerHTML = originalBlurb; // Revert to normal error if API fails
    }
  },

  injectUI(container, originalBlurb, username, avatarUrl, rankedMaps, lovedMaps, gravedMaps) {
    
    // Exact 1:1 replication of the osu-web beatmapset panel
    const buildBeatmapsetPanel = (set) => {
      // Group difficulties by mode for the colored dots
      const mapsByMode = {};
      if (set.beatmaps) {
        set.beatmaps.forEach(b => {
          if (!mapsByMode[b.mode]) mapsByMode[b.mode] = [];
          mapsByMode[b.mode].push(b);
        });
      }
      
      let dotsHtml = '';
      const modeMap = { osu: 'osu', taiko: 'taiko', fruits: 'catch', mania: 'mania' };
      for (const mode in mapsByMode) {
        const maps = mapsByMode[mode].sort((a, b) => a.difficulty_rating - b.difficulty_rating);
        dotsHtml += `
          <div class="beatmapset-panel__extra-item beatmapset-panel__extra-item--dots">
            <div class="beatmapset-panel__beatmap-icon" title="osu!${mode !== 'osu' ? mode : ''}">
              <i class="fal fa-extra-mode-${modeMap[mode] || mode}"></i>
            </div>
            ${maps.map(m => `<div class="beatmapset-panel__beatmap-dot" style="--bg: ${getStarColor(m.difficulty_rating)};"></div>`).join('')}
          </div>`;
      }

      const statusMap = {
        'ranked': { hsl: 'var(--beatmapset-ranked-bg-hsl)', color: 'var(--beatmapset-ranked-colour)' },
        'loved': { hsl: 'var(--beatmapset-loved-bg-hsl)', color: 'var(--beatmapset-loved-colour)' },
        'approved': { hsl: 'var(--beatmapset-approved-bg-hsl)', color: 'var(--beatmapset-approved-colour)' },
        'graveyard': { hsl: 'var(--beatmapset-graveyard-bg-hsl)', color: 'var(--beatmapset-graveyard-colour)' },
        'wip': { hsl: 'var(--beatmapset-pending-bg-hsl)', color: 'var(--beatmapset-pending-colour)' },
        'pending': { hsl: 'var(--beatmapset-pending-bg-hsl)', color: 'var(--beatmapset-pending-colour)' }
      };
      const statusStyle = statusMap[set.status] || statusMap['pending'];
      
      const hasVideo = set.video ? `<div class="beatmapset-panel__play-icon" title="Has video"><i class="fas fa-film"></i></div>` : '';
      const hasStoryboard = set.storyboard ? `<div class="beatmapset-panel__play-icon" title="Has storyboard"><i class="fas fa-image"></i></div>` : '';
      const displayStatus = set.status.charAt(0).toUpperCase() + set.status.slice(1);

      return `
        <div class="beatmapset-panel beatmapset-panel--size-normal js-audio--player" data-audio-url="https://b.ppy.sh/preview/${set.id}.mp3" style="--beatmaps-popup-transition-duration: 150ms;">
          <a class="beatmapset-panel__cover-container" href="https://osu.ppy.sh/beatmapsets/${set.id}">
            <div class="beatmapset-panel__cover-col beatmapset-panel__cover-col--play">
              <div class="beatmapset-cover beatmapset-cover--full" style="--bg-default: var(--bg-default-3); --bg: url('${set.covers.list}'); --bg-2x: url('${set.covers.list}');"></div>
            </div>
            <div class="beatmapset-panel__cover-col beatmapset-panel__cover-col--info">
              <div class="beatmapset-cover beatmapset-cover--full" style="--bg-default: var(--bg-default-3); --bg: url('${set.covers.card}'); --bg-2x: url('${set.covers.card}');"></div>
            </div>
          </a>
          <div class="beatmapset-panel__content">
            <div class="beatmapset-panel__play-container">
              <button class="beatmapset-panel__play js-audio--play" type="button"><span class="play-button"></span></button>
              <div class="beatmapset-panel__play-progress">
                <div class="circular-progress circular-progress--beatmapset-panel" title="0 / 1">
                  <div class="circular-progress__label">1</div>
                  <div class="circular-progress__slice"><div class="circular-progress__circle"></div><div class="circular-progress__circle circular-progress__circle--fill"></div></div>
                </div>
              </div>
              <div class="beatmapset-panel__play-icons">
                ${hasVideo}
                ${hasStoryboard}
              </div>
            </div>
            <div class="beatmapset-panel__info">
              <div class="beatmapset-panel__info-row beatmapset-panel__info-row--title">
                <a class="beatmapset-panel__main-link u-ellipsis-overflow" href="https://osu.ppy.sh/beatmapsets/${set.id}">${set.title}</a>
              </div>
              <div class="beatmapset-panel__info-row beatmapset-panel__info-row--artist">
                <a class="beatmapset-panel__main-link u-ellipsis-overflow" href="https://osu.ppy.sh/beatmapsets/${set.id}">by ${set.artist}</a>
              </div>
              <div class="beatmapset-panel__info-row beatmapset-panel__info-row--source">
                <div class="u-ellipsis-overflow">${set.source || ''}</div>
              </div>
              <div class="beatmapset-panel__info-row beatmapset-panel__info-row--mapper">
                <div class="u-ellipsis-overflow">作者 <a class="js-usercard beatmapset-panel__mapper-link u-hover" data-user-id="${set.user_id}" href="https://osu.ppy.sh/users/${set.user_id}">${set.creator}</a></div>
              </div>
              <div class="beatmapset-panel__info-row beatmapset-panel__info-row--stats">
                <div class="beatmapset-panel__stats-item beatmapset-panel__stats-item--play-count" title="プレイ回数：${set.play_count}">
                  <span class="beatmapset-panel__stats-item-icon"><i class="fa-fw fas fa-play-circle"></i></span><span>${set.play_count.toLocaleString()}</span>
                </div>
                <div class="beatmapset-panel__stats-item beatmapset-panel__stats-item--favourite-count" title="お気に入り：${set.favourite_count}">
                  <span class="beatmapset-panel__stats-item-icon"><i class="fa-fw far fa-heart"></i></span><span>${set.favourite_count.toLocaleString()}</span>
                </div>
                <div class="beatmapset-panel__stats-item beatmapset-panel__stats-item--date">
                  <span class="beatmapset-panel__stats-item-icon"><i class="fa-fw fas fa-check-circle"></i></span>
                  <time class="js-tooltip-time" datetime="${set.submitted_date}">${new Date(set.submitted_date).toLocaleDateString()}</time>
                </div>
              </div>
              <a class="beatmapset-panel__info-row beatmapset-panel__info-row--extra" href="https://osu.ppy.sh/beatmapsets/${set.id}">
                <div class="beatmapset-panel__extra-item">
                  <div class="beatmapset-status beatmapset-status--panel" style="--bg-hsl: ${statusStyle.hsl}; --colour: ${statusStyle.color};">${displayStatus}</div>
                </div>
                ${dotsHtml}
              </a>
            </div>
            <div class="beatmapset-panel__menu-container">
              <div class="beatmapset-panel__menu">
                <button class="beatmapset-panel__menu-item" type="button"><span class="far fa-heart"></span></button>
                <a class="beatmapset-panel__menu-item" href="https://osu.ppy.sh/beatmapsets/${set.id}/download${set.video ? '?noVideo=1' : ''}"><span class="fas fa-file-download"></span></a>
              </div>
            </div>
          </div>
          <button class="beatmapset-panel__mobile-expand" type="button"><span class="fas fa-angle-down"></span></button>
        </div>
      `;
    };

    container.className = 'osu-page osu-page--generic-compact';
    container.innerHTML = `
      <div data-page-id="main">
        <div class="profile-info profile-info--cover">
          <div class="profile-info__bg" style="background-image: url('https://assets.ppy.sh/user-cover-presets/2/f5142b64b60002f6314b22c775195950105908e149037f4de78efc0e0f28d442.jpeg');"></div>
          <div class="profile-info__details">
            <div class="profile-info__avatar">
              <span class="avatar avatar--guest avatar--full" style="background-image: url('${avatarUrl}');"></span>
            </div>
            <div class="profile-info__info">
              <h1 class="profile-info__name">
                <span class="u-ellipsis-pre-overflow">${username}</span>
              </h1>
              <div class="profile-info__flags">
                <span class="profile-info__flag-text" style="color: #ff6666; font-weight: 600; margin-top: 5px;">RESTRICTED USER</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="osu-page osu-page--generic" style="margin: 20px auto;">
            ${originalBlurb}
        </div>
      </div>

      <div class="sticky-toolbar">
        <div class="page-mode page-mode--profile-page-extra u-hidden-desktop">
          <a class="page-mode__item" data-page-id="beatmaps" href="#beatmaps">
            <span class="page-mode-link page-mode-link--profile-page page-mode-link--is-active">
              <span class="fake-bold" data-content="ビートマップ">ビートマップ</span>
            </span>
          </a>
        </div>
        <div class="page-mode page-mode--profile-page-extra hidden-xs ui-sortable ui-sortable-disabled">
          <a class="page-mode__item js-sortable--tab ui-sortable-handle" data-page-id="beatmaps" href="#beatmaps">
            <span class="page-mode-link page-mode-link--profile-page page-mode-link--is-active">
              <span class="fake-bold" data-content="ビートマップ">ビートマップ</span>
            </span>
          </a>
        </div>
      </div>

      <div class="user-profile-pages">
        <div class="js-sortable--page" data-page-id="beatmaps">
          <div class="page-extra">
            <div class="u-relative"><h2 class="title title--page-extra">ビートマップ</h2></div>
            
            ${rankedMaps.length > 0 ? `
              <h3 class="title title--page-extra-small">Ranked & Approved<span class="title__count">${rankedMaps.length}</span></h3>
              <div class="page-extra__beatmapsets js-audio--group">
                ${rankedMaps.map(buildBeatmapsetPanel).join('')}
              </div>
            ` : ''}

            ${lovedMaps.length > 0 ? `
              <h3 class="title title--page-extra-small">Loved<span class="title__count">${lovedMaps.length}</span></h3>
              <div class="page-extra__beatmapsets js-audio--group">
                ${lovedMaps.map(buildBeatmapsetPanel).join('')}
              </div>
            ` : ''}

            ${gravedMaps.length > 0 ? `
              <h3 class="title title--page-extra-small">Pending & Graveyard<span class="title__count">${gravedMaps.length}</span></h3>
              <div class="page-extra__beatmapsets js-audio--group">
                ${gravedMaps.map(buildBeatmapsetPanel).join('')}
              </div>
            ` : ''}

            ${rankedMaps.length === 0 && lovedMaps.length === 0 && gravedMaps.length === 0 ? `
              <div class="profile-detail__empty-chart">This restricted user has no uploaded beatmaps.</div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
}