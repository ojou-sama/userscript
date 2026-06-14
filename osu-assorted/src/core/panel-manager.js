const handlers = [];
let moDebounceId = 0;
let scheduleToken = 0;
const CHUNK_SIZE = 28;

const scheduleAllPanels = () => {
  const panels = Array.from(document.querySelectorAll('.beatmapset-panel'));
  if (panels.length === 0) return;

  const token = ++scheduleToken;
  let index = 0;

  const step = () => {
    if (token !== scheduleToken) return;

    const end = Math.min(index + CHUNK_SIZE, panels.length);
    while (index < end) {
      const panel = panels[index++];
      handlers.forEach(handler => handler(panel));
    }

    if (index < panels.length) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
};

const scheduleFromMutation = () => {
  clearTimeout(moDebounceId);
  moDebounceId = setTimeout(scheduleAllPanels, 100);
};

export const panelManager = {
  init() {
    scheduleAllPanels();
    const observer = new MutationObserver(scheduleFromMutation);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  },

  register(handler) {
    handlers.push(handler);
  }
};