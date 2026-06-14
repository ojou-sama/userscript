export const hideRankColors = {
  id: 'hideRankColors',
  name: 'Hide Rank Colors',
  description: 'Hide rank colors and styles on profile pages.',

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