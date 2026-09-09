import hljs from "highlight.js/lib/core";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import html from "highlight.js/lib/languages/xml";

import { followColorScheme } from "../code-theme";
import { initCssKeyframeExport } from "./css-keyframes";
import { initCssLinearExport } from "./css-linear";
import { initJsFunctionExport } from "./js-function";
import { initSvgCodeExport } from "./svg-path";

export function initExportDialogs() {
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("html", html);
  hljs.registerLanguage("css", css);

  initCssKeyframeExport();
  initCssLinearExport();
  initJsFunctionExport();
  initSvgCodeExport();

  followColorScheme([...document.querySelectorAll<CodeEditor>(".export-dialog sv-code-editor")]);
}
