export function waitForElement(selector, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`[waitForElement] "${selector}" not found within ${timeout}ms`));
    }, timeout);
  });
}

export function log(moduleId, ...args) {
  unsafeWindow.console.log(`[${moduleId}]`, ...args);
}