import css from "@eslint/css";
import pluginJs from "@eslint/js";
import html from "@html-eslint/eslint-plugin";
import staticview from "@staticview/eslint-plugin";
import compat from "eslint-plugin-compat";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tsEslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["dist", "scripts", "eslint.config.mjs", "sources/graph-editor/types"]),

  {
    files: ["sources/**/*.{ts,html,css}", "pages/**/*.html", ".staticbolt.ts"],
    extends: [eslintPluginPrettierRecommended],
    rules: {
      "prettier/prettier": "warn",
    },
  },

  {
    files: ["sources/**/*.css"],
    plugins: { css },
    language: "css/css",
    languageOptions: { tolerant: true },
  },

  {
    files: ["sources/**/*.ts", ".staticbolt.ts"],
    extends: [pluginJs.configs.recommended, tsEslint.configs.strict, compat.configs["flat/recommended"]],
    languageOptions: { globals: globals.browser },
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-dynamic-delete": "off",
    },
  },

  {
    files: ["sources/graph-editor/**/*.ts"],
    extends: [staticview.configs.recommended],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "sv/no-import-export-value": "off",
    },
  },

  {
    files: ["sources/**/*.html", "pages/**/*.html"],
    plugins: { html },
    extends: ["html/recommended"],
    languageOptions: { parser: html.parser },
    language: "html/html",
    rules: {
      "html/attrs-newline": "off",
      "html/no-extra-spacing-attrs": "off",
      "html/no-extra-spacing-tags": "off",
      "html/element-newline": "off",
      "html/no-multiple-h1": "off",
      "html/indent": "off",
      "html/require-closing-tags": "off",
      "html/use-baseline": ["error", { available: "newly" }],
    },
  }
);
