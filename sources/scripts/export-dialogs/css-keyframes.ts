import { ease } from "animare/plugins";
import hljs from "highlight.js/lib/core";

import { elements, getElement } from "../elements";

const exportElements = {
  dialog: getElement<Dialog>("#export-css-keyframe-dialog"),
  inputsContainer: getElement<HTMLDivElement>("#export-css-keyframe-inputs-container"),
  propertyInput: getElement<CodeEditor>("#export-css-keyframe-property"),
  samplesInput: getElement<HTMLInputElement>("#export-css-keyframe-samples"),
  fromInput: getElement<HTMLInputElement>("#export-css-keyframe-from"),
  toInput: getElement<HTMLInputElement>("#export-css-keyframe-to"),
  codePreview: getElement<CodeEditor>("#export-css-keyframe-code-preview"),
  warning: getElement<HTMLDivElement>("#export-css-keyframe-warning"),
  copyBtn: getElement<HTMLButtonElement>("#export-css-keyframe-copy-btn"),
};

export function initCssKeyframeExport() {
  exportElements.propertyInput.highlighter = code => hljs.highlight(code, { language: "css" }).value;
  exportElements.codePreview.highlighter = code => hljs.highlight(code, { language: "css" }).value;

  exportElements.dialog.addEventListener("opened", generateCssKeyframesCode);
  exportElements.propertyInput.addEventListener("update", generateCssKeyframesCode);
  exportElements.samplesInput.addEventListener("input", generateCssKeyframesCode);
  exportElements.fromInput.addEventListener("input", generateCssKeyframesCode);
  exportElements.toInput.addEventListener("input", generateCssKeyframesCode);
  exportElements.copyBtn.addEventListener("click", copyCssKeyframesCodeHandler);
}

function generateCssKeyframesCode() {
  // If the graph is a bezier curve
  const curves = elements.graphEditor.points.value;
  const isSingleCurve = curves.length === 2;
  if (isSingleCurve) {
    exportElements.warning.style.display = "block";
    exportElements.inputsContainer.style.display = "none";
    const cx1 = +curves[1][0].toFixed(3);
    const cy1 = +(1 - curves[1][1]).toFixed(3);
    const cx2 = +curves[1][2].toFixed(3);
    const cy2 = +(1 - curves[1][3]).toFixed(3);
    exportElements.codePreview.value = `.element {\n  transition: transform 0.6s cubic-bezier(${cx1}, ${cy1}, ${cx2}, ${cy2});\n}`;
    return;
  }

  exportElements.warning.style.removeProperty("display");
  exportElements.inputsContainer.style.removeProperty("display");

  const isValidNum = (value: number) => {
    if (isNaN(value) || !isFinite(value) || value < 0) return false;
    return true;
  };

  const samples = exportElements.samplesInput.valueAsNumber;
  if (!isValidNum(samples) || samples < 2 || samples > 500) {
    elements.alert.alert({ message: "Invalid samples", type: "error", closeBtn: false });
    return;
  }

  const from = exportElements.fromInput.valueAsNumber;
  if (!isValidNum(from)) {
    elements.alert.alert({ message: "Invalid from value", type: "error", closeBtn: false });
    return;
  }

  const to = exportElements.toInput.valueAsNumber;
  if (!isValidNum(to)) {
    elements.alert.alert({ message: "Invalid to value", type: "error", closeBtn: false });
    return;
  }

  const property = exportElements.propertyInput.value;

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

  exportElements.codePreview.value = `@keyframes my-custom-easing {${codeStr}\n}`;
}

function copyCssKeyframesCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => {
      elements.alert.alert({ message: "Copied to clipboard", type: "success", closeBtn: false });
    })
    .catch(() => {
      elements.alert.alert({ message: "Failed to copy to clipboard", type: "error", closeBtn: false });
    });
}
