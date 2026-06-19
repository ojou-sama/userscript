import { beatmapsetData } from "./core/beatmapset-data.js";
import { elementManager } from "./core/element-manager.js"; 
import { router } from "./core/router.js";
import { settings } from "./core/settings.js";
import { settingsUI } from "./core/settings-ui.js"; 
import * as modules from "./modules/index.js";

const _modules = Object.values(modules);

beatmapsetData.init();
elementManager.init(); 

settingsUI.create(_modules); 

_modules.forEach(m => {
  if (settings.isEnabled(m.id)) {
    m.init();
  }
});