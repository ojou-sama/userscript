// Usage:
//   router.onNavigate('/users/*', (path) => { ... });
//   router.onNavigate('*', () => cleanup());

const _handlers = [];
let _lastPath = location.pathname;
let _dispatchedPath = location.pathname;
let _debounce;

function matchPattern(pattern, path) {
  const re = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  return re.test(path);
}

function dispatch(path) {
  if (path === _dispatchedPath) return;
  _dispatchedPath = path;
  for (const { pattern, cb } of _handlers) {
    if (matchPattern(pattern, path)) cb(path);
  }
}

// hook pushState so navigation calls trigger dispatch immediately
const _origPush = history.pushState.bind(history);
history.pushState = function (...args) {
  _origPush(...args);
  dispatch(location.pathname);
};

// hook replaceState as well
const _origReplace = history.replaceState.bind(history);
history.replaceState = function (...args) {
  _origReplace(...args);
  dispatch(location.pathname);
};

// browser back/forward buttons
window.addEventListener("popstate", () => dispatch(location.pathname));

// observe DOM changes to catch client-side navigation that doesn't use pushState
new MutationObserver(() => {
  clearTimeout(_debounce);
  _debounce = setTimeout(() => {
    if (location.pathname !== _lastPath) {
      _lastPath = location.pathname;
      dispatch(_lastPath);
    }
  }, 50);
}).observe(document.body, { childList: true, subtree: true });

export const router = {
  /**
   * Register a callback for a URL pattern.
   * Pattern supports glob-style wildcards: '/users/*', '*'
   * @param {string}   pattern
   * @param {function} cb  - called with the matched path string
   */
  onNavigate(pattern, cb) {
    _handlers.push({ pattern, cb });
  },
};
