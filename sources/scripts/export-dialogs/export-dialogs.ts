import { followColorScheme } from "../code-theme";
import { initAndroidInterpolatorExport } from "./android-interpolator";
import { initCssKeyframeExport } from "./css-keyframes";
import { initJetpackComposeExport } from "./jetpack-compose";
import { initCssLinearExport } from "./css-linear";
import { initFlutterCurveExport } from "./flutter-curve";
import { initGsapEaseExport } from "./gsap-ease";
import { initIosKeyframesExport } from "./ios-keyframes";
import { initJsFunctionExport } from "./js-function";
import { initSvgCodeExport } from "./svg-path";

export function initExportDialogs() {
  initAndroidInterpolatorExport();
  initJetpackComposeExport();
  initCssKeyframeExport();
  initCssLinearExport();
  initFlutterCurveExport();
  initGsapEaseExport();
  initIosKeyframesExport();
  initJsFunctionExport();
  initSvgCodeExport();

  followColorScheme([...document.querySelectorAll<CodeEditor>(".export-dialog sv-code-editor")]);
}
