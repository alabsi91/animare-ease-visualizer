import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import html from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import { elements } from "./elements";
import { ease } from "animare/plugins";
import { Points } from "../components/GraphEditor/helpers/Points";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("html", html);
hljs.registerLanguage("css", css);

function cssHighlighter(code: string) {
  return hljs.highlight(code, { language: "css" }).value;
}

function htmlHighlighter(code: string) {
  return hljs.highlight(code, { language: "html" }).value;
}

function jsHighlighter(code: string) {
  return hljs.highlight(code, { language: "javascript" }).value;
}

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Element ${selector} not found`);
  return element;
}

const exportElements = {
  cssKeyframes: {
    dialog: getElement<HTMLDialogElement>("#export-css-keyframe-dialog"),
    inputsContainer: getElement<HTMLDivElement>("#export-css-keyframe-inputs-container"),
    propertyInput: getElement<CodeEditor>("#export-css-keyframe-property"),
    samplesInput: getElement<HTMLInputElement>("#export-css-keyframe-samples"),
    fromInput: getElement<HTMLInputElement>("#export-css-keyframe-from"),
    toInput: getElement<HTMLInputElement>("#export-css-keyframe-to"),
    codePreview: getElement<CodeEditor>("#export-css-keyframe-code-preview"),
    warning: getElement<HTMLDivElement>("#export-css-keyframe-warning"),
    copyBtn: getElement<HTMLButtonElement>("#export-css-keyframe-copy-btn"),
  },
  cssLinear: {
    exportCssLinearDialog: getElement<HTMLDialogElement>("#export-css-linear-dialog"),
    samplesInput: getElement<HTMLInputElement>("#export-css-linear-samples"),
    nameInput: getElement<HTMLInputElement>("#export-css-linear-name"),
    codePreview: getElement<CodeEditor>("#export-css-linear-code-preview"),
    warning: getElement<HTMLDivElement>("#export-css-linear-warning"),
    copyBtn: getElement<HTMLButtonElement>("#export-css-linear-copy-btn"),
  },
  jsFunction: {
    exportJsFunctionDialog: getElement<HTMLDialogElement>("#export-js-function-dialog"),
    samplesInput: getElement<HTMLInputElement>("#export-js-function-samples"),
    nameInput: getElement<HTMLInputElement>("#export-js-function-name"),
    codePreview: getElement<CodeEditor>("#export-js-function-code-preview"),
    copyBtn: getElement<HTMLButtonElement>("#export-js-function-copy-btn"),
    downloadBtn: getElement<HTMLButtonElement>("#export-js-function-download-btn"),
  },
  svgCode: {
    exportSvgDialog: getElement<HTMLDialogElement>("#export-svg-dialog"),
    scaleInput: getElement<HTMLInputElement>("#export-svg-scale"),
    codePreview: getElement<CodeEditor>("#export-svg-code-preview"),
    copyBtn: getElement<HTMLButtonElement>("#export-svg-copy-btn"),
    downloadBtn: getElement<HTMLButtonElement>("#export-svg-download-btn"),
  },
};

//#region CSS Keyframes
export function initCssKeyframeExport() {
  exportElements.cssKeyframes.propertyInput.highlighter = cssHighlighter;
  exportElements.cssKeyframes.codePreview.highlighter = cssHighlighter;

  exportElements.cssKeyframes.dialog.addEventListener("open", generateCssKeyframesCode);
  exportElements.cssKeyframes.propertyInput.addEventListener("input", generateCssKeyframesCode);
  exportElements.cssKeyframes.samplesInput.addEventListener("input", generateCssKeyframesCode);
  exportElements.cssKeyframes.fromInput.addEventListener("input", generateCssKeyframesCode);
  exportElements.cssKeyframes.toInput.addEventListener("input", generateCssKeyframesCode);
  exportElements.cssKeyframes.copyBtn.addEventListener("click", copyCssKeyframesCodeHandler);
}

function generateCssKeyframesCode() {
  // If the graph is a bezier curve
  const curves = elements.graphEditor.points.value;
  const isSingleCurve = curves.length === 2;
  if (isSingleCurve) {
    exportElements.cssKeyframes.warning.style.display = "block";
    exportElements.cssKeyframes.inputsContainer.style.display = "none";
    const cx1 = +curves[1][0].toFixed(3);
    const cy1 = +(1 - curves[1][1]).toFixed(3);
    const cx2 = +curves[1][2].toFixed(3);
    const cy2 = +(1 - curves[1][3]).toFixed(3);
    exportElements.cssKeyframes.codePreview.value = `.element {\n  transition: transform 0.6s cubic-bezier(${cx1}, ${cy1}, ${cx2}, ${cy2});\n}`;
    return;
  }

  exportElements.cssKeyframes.warning.style.removeProperty("display");
  exportElements.cssKeyframes.inputsContainer.style.removeProperty("display");

  const isValidNum = (value: number) => {
    if (isNaN(value) || !isFinite(value) || value < 0) return false;
    return true;
  };

  const samples = exportElements.cssKeyframes.samplesInput.valueAsNumber;
  if (!isValidNum(samples) || samples < 2 || samples > 500) {
    elements.alert.alert({ message: "Invalid samples", type: "error", closeBtn: false });
    return;
  }

  const from = exportElements.cssKeyframes.fromInput.valueAsNumber;
  if (!isValidNum(from)) {
    elements.alert.alert({ message: "Invalid from value", type: "error", closeBtn: false });
    return;
  }

  const to = exportElements.cssKeyframes.toInput.valueAsNumber;
  if (!isValidNum(to)) {
    elements.alert.alert({ message: "Invalid to value", type: "error", closeBtn: false });
    return;
  }

  const property = exportElements.cssKeyframes.propertyInput.value;

  const easingFunction = ease.custom(elements.graphEditor.points.valueStr);

  const results: { progress: number; value: number }[] = [];
  for (let i = 0; i < samples; i++) {
    const progress0to1 = i / (samples - 1);
    const progress0to100 = Math.round(progress0to1 * 100);
    const value = +(from + (to - from) * easingFunction(progress0to1)).toFixed(2);

    // collapse duplicates (untested)
    // const prev = results.at(-1);
    // if (prev && prev.progress && prev.value === value) {
    //   prev.progress = progress0to100;
    //   continue;
    // }

    results.push({ progress: progress0to100, value });
  }

  let codeStr = "";
  for (const { progress, value } of results) {
    codeStr += `\n  ${progress}% { ${property.replaceAll("{value}", value.toString())} }`;
  }

  exportElements.cssKeyframes.codePreview.value = `@keyframes my-custom-easing {${codeStr}\n}`;
}

function copyCssKeyframesCodeHandler() {
  const code = exportElements.cssKeyframes.codePreview.value;
  navigator.clipboard.writeText(code);
  elements.alert.alert({ message: "Copied to clipboard", type: "success", closeBtn: false });
}
//#endregion

//#region CSS Linear
export function initCssLinearExport() {
  exportElements.cssLinear.codePreview.highlighter = cssHighlighter;

  exportElements.cssLinear.exportCssLinearDialog.addEventListener("open", generateCssLinearCode);
  exportElements.cssLinear.samplesInput.addEventListener("input", generateCssLinearCode);
  exportElements.cssLinear.nameInput.addEventListener("input", generateCssLinearCode);
  exportElements.cssLinear.copyBtn.addEventListener("click", copyCssLinearCodeHandler);
}

function generateCssLinearCode() {
  const cssVarName = exportElements.cssLinear.nameInput.value;
  if (!cssVarName) {
    elements.alert.alert({ message: "Invalid name", type: "error", closeBtn: false });
    return;
  }

  // If the graph is a bezier curve
  const curves = elements.graphEditor.points.value;
  const isSingleCurve = curves.length === 2;
  if (isSingleCurve) {
    exportElements.cssLinear.warning.style.display = "block";
    exportElements.cssLinear.samplesInput.parentElement!.style.display = "none";
    const cx1 = +curves[1][0].toFixed(3);
    const cy1 = +(1 - curves[1][1]).toFixed(3);
    const cx2 = +curves[1][2].toFixed(3);
    const cy2 = +(1 - curves[1][3]).toFixed(3);
    exportElements.cssLinear.codePreview.value = `:root {\n  ${cssVarName}: cubic-bezier(${cx1}, ${cy1}, ${cx2}, ${cy2});\n}\n`;
    return;
  }

  exportElements.cssLinear.warning.style.removeProperty("display");
  exportElements.cssLinear.samplesInput.parentElement!.style.removeProperty("display");

  const samples = exportElements.cssLinear.samplesInput.valueAsNumber;
  if (isNaN(samples) || !isFinite(samples) || samples <= 0 || samples > 500) {
    elements.alert.alert({ message: "Invalid samples", type: "error", closeBtn: false });
    return;
  }

  const easingFunction = ease.custom(elements.graphEditor.points.valueStr);

  const values = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    values[i] = +easingFunction(t).toFixed(3);
  }

  exportElements.cssLinear.codePreview.value = `:root {\n  ${cssVarName}: linear(${values.join(",")});\n}\n`;
}

function copyCssLinearCodeHandler() {
  const code = exportElements.cssLinear.codePreview.value;
  navigator.clipboard.writeText(code);
  elements.alert.alert({ message: "Copied to clipboard", type: "success", closeBtn: false });
}
//#endregion

//#region JS Function
export function initJsFunctionExport() {
  exportElements.jsFunction.codePreview.highlighter = jsHighlighter;

  exportElements.jsFunction.exportJsFunctionDialog.addEventListener("open", generateJsFunctionCode);
  exportElements.jsFunction.samplesInput.addEventListener("input", generateJsFunctionCode);
  exportElements.jsFunction.nameInput.addEventListener("input", generateJsFunctionCode);
  exportElements.jsFunction.copyBtn.addEventListener("click", copyJsFunctionCodeHandler);
  exportElements.jsFunction.downloadBtn.addEventListener("click", downloadJsFile);
}

function generateJsFunctionCode() {
  const name = exportElements.jsFunction.nameInput.value;
  try {
    new Function(name, `var ${name}`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    elements.alert.alert({ message: "Invalid JavaScript variable name", type: "error", closeBtn: false });
    return;
  }

  const samples = exportElements.jsFunction.samplesInput.valueAsNumber;
  if (isNaN(samples) || !isFinite(samples) || samples <= 0 || samples > 1000) {
    elements.alert.alert({ message: "Invalid samples", type: "error", closeBtn: false });
    return;
  }

  const easingFunction = ease.custom(elements.graphEditor.points.valueStr);

  const values = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    values[i] = +easingFunction(t).toFixed(3);
  }

  exportElements.jsFunction.codePreview.value = `const values = ${JSON.stringify([...values])};\nconst lastIdx = values.length - 1;\nconst ${name} = t => {\n  'worklet';\n  return values[Math.floor(t * lastIdx)] ?? values[lastIdx];\n}\nexport default ${name};`;
}

function downloadJsFile() {
  const name = exportElements.jsFunction.nameInput.value;
  const string = exportElements.jsFunction.codePreview.value;
  const blob = new Blob([string], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${name}.js`;
  link.click();
  URL.revokeObjectURL(url);
}

function copyJsFunctionCodeHandler() {
  const code = exportElements.jsFunction.codePreview.value;
  navigator.clipboard.writeText(code);
  elements.alert.alert({ message: "Copied to clipboard", type: "success", closeBtn: false });
}
//#endregion

//#region SVG Code
export function initSvgCodeExport() {
  exportElements.svgCode.codePreview.highlighter = htmlHighlighter;

  exportElements.svgCode.exportSvgDialog.addEventListener("open", generateSvgCode);
  exportElements.svgCode.scaleInput.addEventListener("input", generateSvgCode);
  exportElements.svgCode.copyBtn.addEventListener("click", copySvgCodeHandler);
  exportElements.svgCode.downloadBtn.addEventListener("click", downloadSvg);
}

function generateSvgCode() {
  const scale = exportElements.svgCode.scaleInput.valueAsNumber;
  if (isNaN(scale) || !isFinite(scale) || scale <= 0) {
    elements.alert.alert({ message: "Invalid scale", type: "error", closeBtn: false });
    return;
  }

  const points = elements.graphEditor.points.scale(scale);
  const pathStr = Points.constructPathStr(points);

  exportElements.svgCode.codePreview.value = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="none" viewBox="0 0 ${scale} ${scale}">\n  <path d="${pathStr}" stroke="currentColor" stroke-width="2" />\n</svg>`;
}

function downloadSvg() {
  const string = exportElements.svgCode.codePreview.value;
  const blob = new Blob([string], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `svg-${Date.now()}.svg`;
  link.click();
  URL.revokeObjectURL(url);
}

function copySvgCodeHandler() {
  const code = exportElements.svgCode.codePreview.value;
  navigator.clipboard.writeText(code);
  elements.alert.alert({ message: "Copied to clipboard", type: "success", closeBtn: false });
}
//#endregion
