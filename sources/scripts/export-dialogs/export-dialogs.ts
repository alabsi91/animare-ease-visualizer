import { followColorScheme } from "../code-theme";
import { initCssKeyframeExport } from "./css-keyframes";
import { initCssLinearExport } from "./css-linear";
import { initJsFunctionExport } from "./js-function";
import { initSvgCodeExport } from "./svg-path";

export function initExportDialogs() {
  initCssKeyframeExport();
  initCssLinearExport();
  initJsFunctionExport();
  initSvgCodeExport();

  followColorScheme([...document.querySelectorAll<CodeEditor>(".export-dialog sv-code-editor")]);
}
