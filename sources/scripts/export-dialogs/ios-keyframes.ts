import { createHighlighter } from "./highlighter";
import { showExportOptionError } from "./export-option-alert";

import { createIosKeyframesCode } from "../export-code/ios-keyframes-code";
import { getIsSingleCurve } from "../export-code/easing-path";
import { getIsValidIdentifier } from "../export-code/identifier";
import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

const exportElements = {
  dialog: getElement<Dialog>("#export-ios-dialog"),
  nameInput: getElement<HTMLInputElement>("#export-ios-name"),
  codePreview: getElement<CodeEditor>("#export-ios-code-preview"),
  warning: getElement<HTMLDivElement>("#export-ios-warning"),
  copyBtn: getElement<HTMLButtonElement>("#export-ios-copy-btn"),
  downloadBtn: getElement<HTMLButtonElement>("#export-ios-download-btn"),
};

export function initIosKeyframesExport() {
  exportElements.codePreview.highlighter = createHighlighter("swift");

  exportElements.dialog.addEventListener("openedchange", () => {
    if (exportElements.dialog.opened) generateIosKeyframesCode();
  });
  exportElements.nameInput.addEventListener("input", generateIosKeyframesCode);
  exportElements.copyBtn.addEventListener("click", copyIosKeyframesCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadSwiftFile);
}

function getFunctionName() {
  return exportElements.nameInput.value.trim();
}

function generateIosKeyframesCode() {
  const pathCommands = elements.graphEditor.points.value;

  const isSingleCurve = getIsSingleCurve(pathCommands);
  exportElements.warning.hidden = !isSingleCurve;
  if (isSingleCurve) {
    exportElements.warning.textContent =
      "A single curve needs no keyframes. One timing function covers it, which is what you get below.";
  }

  try {
    exportElements.codePreview.value = createIosKeyframesCode(pathCommands, { functionName: getFunctionName() });
  } catch (error) {
    showExportOptionError(error);
  }
}

function downloadSwiftFile() {
  const name = getFunctionName();
  if (!getIsValidIdentifier(name)) return;

  const blob = new Blob([exportElements.codePreview.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${name}.swift`;
  link.click();
  URL.revokeObjectURL(url);
}

function copyIosKeyframesCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
