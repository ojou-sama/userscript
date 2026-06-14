export default {
  entry: "./src/main.js",
  output: "./dist/osu-assorted.user.js",

  meta: {
    name: "osu! assorted",
    version: "1.0.0",
    author: "ojou-sama",
    description: "A collection of small scripts for osu! web.",
    match: [ "https://osu.ppy.sh/*" ],
    grant: [ "GM_addStyle", "GM_getValue", "GM_setValue", "GM_deleteValue" ],
    connect: [ "assets.ppy.sh", "b.ppy.sh" ],
    // include: [],
    // icon: "",
    // downloadURL: "",
    // updateURL: "",
    // supportURL: "",
    // homepageURL: "",
    // namespace: "",
    // runAt: "document-idle",
    // license: "",
  },

  devMode: {
    hmr: "websocket",
    reloadAll: true,
  },
};
