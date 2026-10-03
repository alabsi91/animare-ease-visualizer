import { createHighlighter } from "./highlighter";

import { createAndroidInterpolatorCode } from "../export-code/android-interpolator-code";
import { getCornerProblem, getIsSingleCurve } from "../export-code/easing-path";
import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

import type { PathCommands } from "@graph-editor/helpers/types";

const exportElements = {
  dialog: getElement<Dialog>("#export-android-dialog"),
  nameInput: getElement<HTMLInputElement>("#export-android-name"),
  codePreview: getElement<CodeEditor>("#export-android-code-preview"),
  warning: getElement<HTMLDivElement>("#export-android-warning"),
  copyBtn: getElement<HTMLButtonElement>("#export-android-copy-btn"),
  downloadBtn: getElement<HTMLButtonElement>("#export-android-download-btn"),
};

export function initAndroidInterpolatorExport() {
  exportElements.codePreview.highlighter = createHighlighter("html");

  exportElements.dialog.addEventListener("openedchange", () => {
    if (exportElements.dialog.opened) generateAndroidInterpolatorCode();
  });
  exportElements.nameInput.addEventListener("input", generateAndroidInterpolatorCode);
  exportElements.copyBtn.addEventListener("click", copyAndroidInterpolatorCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadAndroidInterpolatorFile);
}

function getResourceName() {
  const name = exportElements.nameInput.value.trim();
  if (!/^[a-z][a-z0-9_]*$/.test(name)) return null;

  return name;
}

function getWarning(pathCommands: PathCommands) {
  const cornerProblem = getCornerProblem(pathCommands);
  if (cornerProblem) return cornerProblem;

  if (getIsSingleCurve(pathCommands)) {
    return "A single curve needs no path. Android takes the four control points on their own, which is what you get below.";
  }

  return null;
}

function generateAndroidInterpolatorCode() {
  const pathCommands = elements.graphEditor.points.value;

  const warning = getWarning(pathCommands);
  exportElements.warning.hidden = warning === null;
  if (warning) {
    exportElements.warning.textContent = warning;
  }

  const name = getResourceName();
  if (!name) {
    showAlert("error", "Invalid file name", "Use lowercase letters, digits and underscores, starting with a letter");
    return;
  }

  exportElements.codePreview.value = createAndroidInterpolatorCode(pathCommands);
}

function downloadAndroidInterpolatorFile() {
  const name = getResourceName();
  if (!name) return;

  const blob = new Blob([exportElements.codePreview.value], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${name}.xml`;
  link.click();
  URL.revokeObjectURL(url);
}

function copyAndroidInterpolatorCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
