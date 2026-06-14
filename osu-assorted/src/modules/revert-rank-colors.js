export const revertRankColors = {
  id: 'revertRankColors',
  name: 'Revert Rank Colors',

  init() {
    GM_addStyle(`
      .rank-value {
        --colour: inherit !important;
        color: var(--value-color);
        font-weight: 300;
      }   
    `);
  }
}