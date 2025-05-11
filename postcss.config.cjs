/* eslint-disable no-undef */
module.exports = ctx => ({
  plugins: {
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
