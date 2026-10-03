import { createHighlighter } from "./highlighter";
import { showExportOptionError } from "./export-option-alert";

import { createJsFunctionCode } from "../export-code/js-function-code";
import { getIsSingleCurve } from "../export-code/easing-path";
import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

import type { JsFunctionTarget } from "../export-code/js-function-code";

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

function getSelectedTarget(): JsFunctionTarget {
  return exportElements.targetControl.value === "after-effects" ? "after-effects" : "javascript";
}

export function initJsFunctionExport() {
  exportElements.codePreview.highlighter = createHighlighter("javascript");

  exportElements.exportJsFunctionDialog.addEventListener("openedchange", () => {
    if (exportElements.exportJsFunctionDialog.opened) generateJsFunctionCode();
  });
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
  const pathCommands = elements.graphEditor.points.value;
  setSingleCurveMode(getIsSingleCurve(pathCommands));

  try {
    exportElements.codePreview.value = createJsFunctionCode(pathCommands, {
      functionName: exportElements.nameInput.value,
      samples: exportElements.samplesInput.valueAsNumber,
      target: getSelectedTarget(),
    });
  } catch (error) {
    showExportOptionError(error);
  }
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
