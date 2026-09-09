import { defineConfig } from "@staticbolt/core";
import * as plugins from "@staticbolt/core/plugins";
import { staticviewPlugin } from "@staticview/staticbolt-plugin";
import postcssPresetEnv from "postcss-preset-env";

export default defineConfig({
  plugins: [
    plugins.loadSourcesPlugin({ include: ["./pages/**/*.html"] }),
    staticviewPlugin({
      include: ["sources/graph-editor/graph-editor.ts"],
      postcssPlugins: [postcssPresetEnv()],
      minifyCssClasses: false,
      minifyCssVariables: false,
    }),
    plugins.transformJsPlugin(),
    plugins.transformCssPlugin({ plugins: [postcssPresetEnv()] }),
    plugins.bundlePackagesPlugin({
      chunks: {
        packages: { include: ["animare/**", "highlight.js/**"] },
      },
    }),
    plugins.importAsStringPlugin(),

    plugins.htmlEnvOnlyPlugin(),
    plugins.htmlLayoutPlugin(),
    plugins.htmlPagesPlugin(),
    plugins.htmlInsertPlugin(),
    plugins.htmlBundleScriptPlugin(),
    plugins.htmlBundleStylePlugin(),
    plugins.htmlInlineStylePlugin(),
    plugins.htmlInlineSvgPlugin(),
    plugins.htmlPreloadPlugin(),
    plugins.htmlMergeStylesPlugin(),

    plugins.cacheBustPlugin(),
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
