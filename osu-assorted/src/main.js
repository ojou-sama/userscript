import { router } from "./core/router.js";
import { settings } from "./core/settings.js";
import * as modules from "./modules/index.js";

const _modules = Object.values(modules);

// cleanup on each navigation
// router.onNavigate('*', () => {
//   // do some cleanup 
// });

// init all modules
_modules.forEach(m => m.init());

// create settings UI
settings.createSettingsUI();