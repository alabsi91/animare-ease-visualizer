/* eslint-disable no-undef */
module.exports = ctx => ({
  plugins: {
    "./scripts/postcss-inline-vars.mjs": { rootSelector: ":host", variableRegexp: ["^--def"] },

    "postcss-import": {},

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
