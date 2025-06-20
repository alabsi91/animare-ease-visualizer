import { ease } from "animare/plugins";
import hljs from "highlight.js/lib/core";

import { elements, getElement } from "../elements";

const exportElements = {
  exportCssLinearDialog: getElement<DialogComponent>("#export-css-linear-dialog"),
  samplesInput: getElement<HTMLInputElement>("#export-css-linear-samples"),
  nameInput: getElement<HTMLInputElement>("#export-css-linear-name"),
  codePreview: getElement<CodeEditor>("#export-css-linear-code-preview"),
  warning: getElement<HTMLDivElement>("#export-css-linear-warning"),
  copyBtn: getElement<HTMLButtonElement>("#export-css-linear-copy-btn"),
};

export function initCssLinearExport() {
  exportElements.codePreview.highlighter = code => hljs.highlight(code, { language: "css" }).value;

  exportElements.exportCssLinearDialog.addEventListener("opened", generateCssLinearCode);
  exportElements.samplesInput.addEventListener("input", generateCssLinearCode);
  exportElements.nameInput.addEventListener("input", generateCssLinearCode);
  exportElements.copyBtn.addEventListener("click", copyCssLinearCodeHandler);
}

function generateCssLinearCode() {
  const cssVarName = exportElements.nameInput.value;
  if (!cssVarName) {
    elements.alert.alert({ message: "Invalid name", type: "error", closeBtn: false });
    return;
  }

  // If the graph is a bezier curve
  const curves = elements.graphEditor.points.value;
  const isSingleCurve = curves.length === 2;
  if (isSingleCurve) {
    exportElements.warning.style.display = "block";
    exportElements.samplesInput.parentElement!.style.display = "none";
    const cx1 = +curves[1][0].toFixed(3);
    const cy1 = +(1 - curves[1][1]).toFixed(3);
    const cx2 = +curves[1][2].toFixed(3);
    const cy2 = +(1 - curves[1][3]).toFixed(3);
    exportElements.codePreview.value = `:root {\n  ${cssVarName}: cubic-bezier(${cx1}, ${cy1}, ${cx2}, ${cy2});\n}\n`;
    return;
  }

  exportElements.warning.style.removeProperty("display");
  exportElements.samplesInput.parentElement!.style.removeProperty("display");

  const samples = exportElements.samplesInput.valueAsNumber;
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

  exportElements.codePreview.value = `:root {\n  ${cssVarName}: linear(${values.join(",")});\n}\n`;
}

function copyCssLinearCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => elements.alert.alert({ message: "Copied to clipboard", type: "success", closeBtn: false }))
    .catch(() => elements.alert.alert({ message: "Failed to copy to clipboard", type: "error", closeBtn: false }));
}
