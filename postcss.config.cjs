/* eslint-disable */
const path = require("path");

module.exports = ctx => ({
  plugins: {
    "./scripts/postcss-inline-vars.mjs": { rootSelector: ":host", variableRegexp: ["^--def"] },

    "postcss-import": {
      filter(url) {
        const fileName = path.basename(url);
        const filesToInline = new Set(["wcp-default-styles.css"]);
        return filesToInline.has(fileName);
      },
    },

    "postcss-preset-env": {
      browsers: ctx.browserslist,
    },

    "postcss-svgo": {
      encode: true,
      multipass: true,
      plugins: [{ name: "preset-default" }],
    },

    cssnano: ctx.minify && ctx.env === "production" ? { preset: "default" } : false,
  },
});
