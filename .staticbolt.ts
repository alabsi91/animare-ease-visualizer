import { defineConfig } from "@staticbolt/core";
import * as plugins from "@staticbolt/core/plugins";
import postcssPresetEnv from "postcss-preset-env";

export default defineConfig({
  plugins: [
    plugins.loadSourcesPlugin({ include: ["./pages/**/*.html"] }),
    plugins.transformJsPlugin(),
    plugins.transformCssPlugin({ plugins: [postcssPresetEnv()] }),
    plugins.bundlePackagesPlugin({
      chunks: {
        staticview: { include: ["@staticview/ui/**"] },
        animation: { include: ["animare/**"] },
        highlight: { include: ["highlight.js/**"] },
      },
    }),
    plugins.importAsStringPlugin(),

    plugins.htmlLayoutPlugin(),
    plugins.htmlPagesPlugin(),
    plugins.htmlInsertPlugin(),
    plugins.htmlBundleScriptPlugin(),
    plugins.htmlBundleStylePlugin(),
    plugins.htmlInlineStylePlugin(),
    plugins.htmlInlineSvgPlugin(),
    plugins.htmlPreloadPlugin(),
    plugins.htmlMergeStylesPlugin(),

    plugins.writeFilesPlugin({ clean: true, minify: { enabled: true } }),
    plugins.convertImagePlugin(),
    plugins.copyAssetsPlugin(),
    plugins.analyzeOutputPlugin({ skipUnusedFiles: true }),

    plugins.developmentServerPlugin(),
    plugins.coreHtmlPlugin(),
    plugins.coreScriptPlugin(),
    plugins.coreStylePlugin(),
    plugins.coreWebManifestPlugin(),

    plugins.buildCliPlugin(),
    plugins.serveCliPlugin(),
  ],
});
