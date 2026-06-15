import { beatmapsetData } from "./core/beatmapset-data.js";
import { panelManager } from "./core/panel-manager.js";
import { router } from "./core/router.js";
import { settings } from "./core/settings.js";
import * as modules from "./modules/index.js";

const _modules = Object.values(modules);

// cleanup on each navigation
// router.onNavigate('*', () => {
//   // do some cleanup 
// });

// init core stuff
beatmapsetData.init();
panelManager.init();

// init modules
settings.createSettingsUI(_modules);
_modules.forEach(m => {
  if (settings.isEnabled(m.id)) {
    m.init();
  }
});
