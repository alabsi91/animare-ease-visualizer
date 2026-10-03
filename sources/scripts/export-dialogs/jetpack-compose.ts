import { createHighlighter } from "./highlighter";
import { showExportOptionError } from "./export-option-alert";

import { createJetpackComposeCode } from "../export-code/jetpack-compose-code";
import { getCornerProblem, getIsSingleCurve } from "../export-code/easing-path";
import { getIsValidIdentifier } from "../export-code/identifier";
import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

import type { PathCommands } from "@graph-editor/helpers/types";

const exportElements = {
  dialog: getElement<Dialog>("#export-compose-dialog"),
  nameInput: getElement<HTMLInputElement>("#export-compose-name"),
  codePreview: getElement<CodeEditor>("#export-compose-code-preview"),
  warning: getElement<HTMLDivElement>("#export-compose-warning"),
  copyBtn: getElement<HTMLButtonElement>("#export-compose-copy-btn"),
  downloadBtn: getElement<HTMLButtonElement>("#export-compose-download-btn"),
};

export function initJetpackComposeExport() {
  exportElements.codePreview.highlighter = createHighlighter("kotlin");

  exportElements.dialog.addEventListener("openedchange", () => {
    if (exportElements.dialog.opened) generateJetpackComposeCode();
  });
  exportElements.nameInput.addEventListener("input", generateJetpackComposeCode);
  exportElements.copyBtn.addEventListener("click", copyJetpackComposeCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadKotlinFile);
}

function getValueName() {
  return exportElements.nameInput.value.trim();
}

function getWarning(pathCommands: PathCommands) {
  const cornerProblem = getCornerProblem(pathCommands);
  if (cornerProblem) return cornerProblem;

  if (getIsSingleCurve(pathCommands)) {
    return "A single curve needs no path. CubicBezierEasing takes the four control points, which is what you get below.";
  }

  return null;
}

function generateJetpackComposeCode() {
  const pathCommands = elements.graphEditor.points.value;

  const warning = getWarning(pathCommands);
  exportElements.warning.hidden = warning === null;
  if (warning) {
    exportElements.warning.textContent = warning;
  }

  try {
    exportElements.codePreview.value = createJetpackComposeCode(pathCommands, { valueName: getValueName() });
  } catch (error) {
    showExportOptionError(error);
  }
}

function downloadKotlinFile() {
  const name = getValueName();
  if (!getIsValidIdentifier(name)) return;

  const blob = new Blob([exportElements.codePreview.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${name}.kt`;
  link.click();
  URL.revokeObjectURL(url);
}

function copyJetpackComposeCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
