import { defineConfig } from "@staticbolt/core";
import * as plugins from "@staticbolt/core/plugins";
import postcssImport from "postcss-import";
import postcssPresetEnv from "postcss-preset-env";

import inlineCssVariables from "./scripts/postcss-inline-vars.mjs";

// Only this file is pulled into the stylesheet that imports it. Every other @import is left alone.
const fileToInline = "wcp-default-styles.css";

export default defineConfig({
  plugins: [
    plugins.loadSourcesPlugin({ include: ["./pages/**/*.html"] }),
    plugins.transformJsPlugin(),
    plugins.transformCssPlugin({
      plugins: [
        inlineCssVariables({ rootSelector: ":host", variableRegexp: ["^--def"] }),
        postcssImport({ filter: url => url.endsWith(fileToInline) }),
        postcssPresetEnv(),
      ],
    }),
    plugins.bundlePackagesPlugin({ chunks: { staticview: { include: ["@staticview/ui/**"] } } }),
    plugins.importAsStringPlugin(),

    plugins.htmlLayoutPlugin(),
    plugins.htmlPagesPlugin(),
    plugins.htmlInsertPlugin(),
    plugins.htmlBundleScriptPlugin(),
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
