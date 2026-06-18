export const useOldFallbackBackground = {
  id: 'useOldFallbackBackground',
  name: 'Use Old Fallback Background',
  description: 'Uses the old gray fallback background (rather than the new color gradients).',

  init() {
    GM_addStyle(`
      :root {
        --bg-default: url(/assets/images/default-bg.7594e945.png);
        --bg-default-0: var(--bg-default);
        --bg-default-1: var(--bg-default);
        --bg-default-2: var(--bg-default);
        --bg-default-3: var(--bg-default);
        --bg-default-4: var(--bg-default);
        --bg-default-5: var(--bg-default);
      }
    `);
  }
}