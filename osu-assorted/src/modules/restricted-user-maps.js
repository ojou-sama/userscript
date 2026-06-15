export const showMapsOnRestrictedUserPages = {
  id: 'showMapsOnRestrictedUserPages',
  name: 'Show Maps on Restricted User Pages',
  description: 'Attempts to display maps on restricted user pages.',

  init() {
    router.onNavigate('/users/*', () => this.run());
  },

  async run() {
    // .osu-page--generic on /users means we are on a restricted user page I THINK LOL
    const genericPage = await waitForElement('.osu-page--generic');
    if (!genericPage) return;

    
  }
}