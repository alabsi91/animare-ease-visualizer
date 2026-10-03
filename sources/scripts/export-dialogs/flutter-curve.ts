import { createHighlighter } from "./highlighter";
import { showExportOptionError } from "./export-option-alert";

import { createFlutterCurveCode } from "../export-code/flutter-curve-code";
import { getCornerProblem, getIsSingleCurve } from "../export-code/easing-path";
import { getIsValidIdentifier } from "../export-code/identifier";
import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

import type { PathCommands } from "@graph-editor/helpers/types";

const exportElements = {
  dialog: getElement<Dialog>("#export-flutter-dialog"),
  nameInput: getElement<HTMLInputElement>("#export-flutter-name"),
  codePreview: getElement<CodeEditor>("#export-flutter-code-preview"),
  warning: getElement<HTMLDivElement>("#export-flutter-warning"),
  copyBtn: getElement<HTMLButtonElement>("#export-flutter-copy-btn"),
  downloadBtn: getElement<HTMLButtonElement>("#export-flutter-download-btn"),
};

export function initFlutterCurveExport() {
  exportElements.codePreview.highlighter = createHighlighter("dart");

  exportElements.dialog.addEventListener("openedchange", () => {
    if (exportElements.dialog.opened) generateFlutterCurveCode();
  });
  exportElements.nameInput.addEventListener("input", generateFlutterCurveCode);
  exportElements.copyBtn.addEventListener("click", copyFlutterCurveCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadDartFile);
}

function getClassName() {
  return exportElements.nameInput.value.trim();
}

function getFileName(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/^_+/, "");
}

function getWarning(pathCommands: PathCommands) {
  const cornerProblem = getCornerProblem(pathCommands);
  if (cornerProblem) return `${cornerProblem} Flutter snaps both ends without telling you.`;

  if (getIsSingleCurve(pathCommands)) {
    return "A single curve needs no class. Flutter's own Cubic takes the four control points, which is what you get below.";
  }

  return null;
}

function generateFlutterCurveCode() {
  const pathCommands = elements.graphEditor.points.value;

  const warning = getWarning(pathCommands);
  exportElements.warning.hidden = warning === null;
  if (warning) {
    exportElements.warning.textContent = warning;
  }

  try {
    exportElements.codePreview.value = createFlutterCurveCode(pathCommands, { className: getClassName() });
  } catch (error) {
    showExportOptionError(error);
  }
}

function downloadDartFile() {
  const name = getClassName();
  if (!getIsValidIdentifier(name)) return;

  const blob = new Blob([exportElements.codePreview.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${getFileName(name)}.dart`;
  link.click();
  URL.revokeObjectURL(url);
}

function copyFlutterCurveCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
