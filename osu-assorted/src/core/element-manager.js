const registries = new Map();
const processed = new WeakSet();
let moDebounceId = 0;
let scheduleToken = 0;
const CHUNK_SIZE = 28;

const scheduleAllElements = () => {
  const token = ++scheduleToken;
  
  for (const [selector, handlers] of registries.entries()) {
    const elements = Array.from(document.querySelectorAll(selector)).filter(el => !processed.has(el));
    if (elements.length === 0) continue;

    let index = 0;
    const step = () => {
      if (token !== scheduleToken) return;

      const end = Math.min(index + CHUNK_SIZE, elements.length);
      while (index < end) {
        const el = elements[index++];
        processed.add(el);
        handlers.forEach(handler => handler(el));
      }

      if (index < elements.length) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }
};

const scheduleFromMutation = () => {
  clearTimeout(moDebounceId);
  moDebounceId = setTimeout(scheduleAllElements, 100);
};

export const elementManager = {
  init() {
    scheduleAllElements();
    const observer = new MutationObserver(scheduleFromMutation);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  },

  // usage: elementManager.register('.beatmapset-panel', (panel) => { ... });
  register(selector, handler) {
    if (!registries.has(selector)) {
      registries.set(selector, []);
    }
    registries.get(selector).push(handler);
    scheduleAllElements(); 
  }
};