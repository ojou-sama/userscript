import { router } from '../core/router.js';
import { log, waitForElement } from '../core/utils.js';

export const mutualFilter = {
  // Unique ID used for settings persistence
  id: 'mutualFilter',
  name: 'Mutual Filter',

  init() {
    router.onNavigate('/home/friends', () => this.run());
  },

  async run() {
    try {
      const allBtn = await waitForElement('.update-streams-v2__container [data-key="all"]');
      const container = allBtn.closest('.update-streams-v2__container');

      // prevent duplicate injections
      if (!allBtn || container.querySelector('[data-key="mutual"]')) return;

      // insert "Mutual" button
      allBtn.insertAdjacentHTML('afterend', `
        <a class="update-streams-v2__item t-changelog-stream--all" data-key="mutual" href="#">
          <div class="update-streams-v2__bar u-changelog-stream--bg" style="background-color: hsl(var(--hsl-pink-2));"></div>
          <p class="update-streams-v2__row update-streams-v2__row--name">Mutual</p>
          <p class="update-streams-v2__row update-streams-v2__row--version">-</p>
        </a>
      `);

      const mutualBtn = container.querySelector('[data-key="mutual"]');
      const countNode = mutualBtn.querySelector('.update-streams-v2__row--version');
      
      // get mutual count
      let attempts = 0;
      const countInterval = setInterval(() => {
        attempts++;
        const cardsExist = document.querySelector('.user-card, .user-card-brick');
        if (cardsExist) {
          clearInterval(countInterval);
          const mutuals = document.querySelectorAll('.user-card-brick--mutual, .user-card:has(.fa-user-friends)');
          if (countNode) countNode.textContent = mutuals.length.toString();
        } else if (attempts > 50) {
          clearInterval(countInterval);
        }
      }, 100);

      // add css for filtering
      if (!document.getElementById('mutual-filter-styles')) {
        const style = GM_addStyle(`
          .show-only-mutual .user-card-brick:not(.user-card-brick--mutual) {
            display: none !important;
          }
          .show-only-mutual .user-card-brick--mutual {
            display: flex !important;
          }
          .show-only-mutual .user-card:not(:has(.user-action-button--mutual)) {
            display: none !important;
          }
          .show-only-mutual .user-card:has(.user-action-button--mutual) {
            display: flex !important;
          }
        `);
        style.id = 'mutual-filter-styles';
      }

      // handle "Mutual" button click
      mutualBtn.addEventListener('click', (e) => {
        e.preventDefault();
        allBtn.click();

        // update active state for buttons
        container.querySelectorAll('.update-streams-v2__item').forEach(btn => {
          btn.classList.remove('update-streams-v2__item--active');
        });
        mutualBtn.classList.add('update-streams-v2__item--active');

        // apply css filter
        document.body.classList.add('show-only-mutual');
      });

      // remove filter when clicking other buttons
      const otherBtns = container.querySelectorAll('.update-streams-v2__item:not([data-key="mutual"])');
      otherBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          document.body.classList.remove('show-only-mutual');
          mutualBtn.classList.remove('update-streams-v2__item--active');
          btn.classList.add('update-streams-v2__item--active');
        });
      });

    } catch (e) {
      log(this.id, 'error:', e);
    }
  },
};
