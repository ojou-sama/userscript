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
// 1. Wait specifically for the "All" button to render
      const allBtn = await waitForElement('.update-streams-v2__container [data-key="all"]');
      log(this.id, "FUCK!");
      
      // 2. Derive the container from the button
      const container = allBtn.closest('.update-streams-v2__container');

      // Prevent duplicate injections if the script runs multiple times
      if (!allBtn || container.querySelector('[data-key="mutual"]')) return;

      // clone the "All" button
      const mutualBtn = allBtn.cloneNode(true);
      mutualBtn.setAttribute('data-key', 'mutual');
      mutualBtn.setAttribute('href', '#');
      mutualBtn.classList.remove('update-streams-v2__item--active');

      // change to "Mutual" button
      const nameNode = mutualBtn.querySelector('.update-streams-v2__row--name');
      if (nameNode) nameNode.textContent = 'Mutual';
      
      const countNode = mutualBtn.querySelector('.update-streams-v2__row--version');
      if (countNode) countNode.textContent = `(${container.querySelectorAll('.user-card-brick--mutual').length})`;

      // append button
      allBtn.after(mutualBtn);

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
        });
      });

    } catch (e) {
      log(this.id, 'error:', e);
    }
  },

//   cleanup() {
//   },
};
