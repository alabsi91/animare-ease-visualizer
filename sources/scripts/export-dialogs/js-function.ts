import { ease } from "animare/plugins";
import { createHighlighter } from "./highlighter";

import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

const exportElements = {
  exportJsFunctionDialog: getElement<Dialog>("#export-js-function-dialog"),
  samplesInput: getElement<HTMLInputElement>("#export-js-function-samples"),
  warning: getElement<HTMLDivElement>("#export-js-function-warning"),
  nameInput: getElement<HTMLInputElement>("#export-js-function-name"),
  codePreview: getElement<CodeEditor>("#export-js-function-code-preview"),
  copyBtn: getElement<HTMLButtonElement>("#export-js-function-copy-btn"),
  downloadBtn: getElement<HTMLButtonElement>("#export-js-function-download-btn"),
  targetControl: getElement<SegmentedControl>("#export-js-function-target"),
};

function buildJavaScriptFunction(name: string, valuesLiteral: string) {
  return [
    `const values = ${valuesLiteral};`,
    "const lastIdx = values.length - 1;",
    `const ${name} = t => values[Math.floor(t * lastIdx)] ?? values[lastIdx];`,
    `export default ${name};`,
  ].join("\n");
}

function buildAfterEffectsExpression(name: string, valuesLiteral: string) {
  return [
    `var values = ${valuesLiteral};`,
    "var lastIdx = values.length - 1;",
    "",
    `function ${name}(t) {`,
    "  var index = Math.floor(t * lastIdx);",
    "  if (index < 0) index = 0;",
    "  if (index > lastIdx) index = lastIdx;",
    "  return values[index];",
    "}",
    "",
    "var duration = 2;",
    "var from = 0;",
    "var to = 500;",
    "",
    "var progress = clamp((time - inPoint) / duration, 0, 1);",
    `from + (to - from) * ${name}(progress);`,
  ].join("\n");
}

function getSelectedTarget() {
  return exportElements.targetControl.value;
}

export function initJsFunctionExport() {
  exportElements.codePreview.highlighter = createHighlighter("javascript");

  exportElements.exportJsFunctionDialog.addEventListener("opened", generateJsFunctionCode);
  exportElements.samplesInput.addEventListener("input", generateJsFunctionCode);
  exportElements.nameInput.addEventListener("input", generateJsFunctionCode);
  exportElements.copyBtn.addEventListener("click", copyJsFunctionCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadJsFile);
  exportElements.targetControl.addEventListener("valuechange", generateJsFunctionCode);
}

function setSingleCurveMode(isSingleCurve: boolean) {
  exportElements.warning.hidden = !isSingleCurve;

  if (isSingleCurve) {
    exportElements.warning.textContent =
      "The current path uses a single curve, which the CSS cubic-bezier() function covers on its own.";
  }
}

function generateJsFunctionCode() {
  const name = exportElements.nameInput.value;
  try {
    new Function(name, `var ${name}`);
  } catch {
    showAlert("error", "Invalid JavaScript variable name");
    return;
  }

  setSingleCurveMode(elements.graphEditor.points.value.length === 2);

  const samples = exportElements.samplesInput.valueAsNumber;
  if (isNaN(samples) || !isFinite(samples) || samples <= 0 || samples > 1000) {
    showAlert("error", "Invalid samples");
    return;
  }

  const easingFunction = ease.custom(elements.graphEditor.points.valueStr);

  const values = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    values[i] = +easingFunction(t).toFixed(3);
  }

  const valuesLiteral = JSON.stringify([...values]);
  const target = getSelectedTarget();

  if (target === "after-effects") {
    exportElements.codePreview.value = buildAfterEffectsExpression(name, valuesLiteral);
    return;
  }

  exportElements.codePreview.value = buildJavaScriptFunction(name, valuesLiteral);
}

function downloadJsFile() {
  const name = exportElements.nameInput.value;
  const string = exportElements.codePreview.value;
  const blob = new Blob([string], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${name}.js`;
  link.click();
  URL.revokeObjectURL(url);
}

function copyJsFunctionCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
