import { createHighlighter } from "./highlighter";
import { getCornerProblem, getIsSingleCurve, getSingleCurveControlPoints, getUprightPathStr } from "./easing-path";

import { getElement } from "../elements";
import { showAlert } from "../alert";

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

  exportElements.dialog.addEventListener("opened", generateAndroidInterpolatorCode);
  exportElements.nameInput.addEventListener("input", generateAndroidInterpolatorCode);
  exportElements.copyBtn.addEventListener("click", copyAndroidInterpolatorCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadAndroidInterpolatorFile);
}

function getResourceName() {
  const name = exportElements.nameInput.value.trim();
  if (!/^[a-z][a-z0-9_]*$/.test(name)) return null;

  return name;
}

function getWarning(isSingleCurve: boolean) {
  const cornerProblem = getCornerProblem();
  if (cornerProblem) return cornerProblem;

  if (isSingleCurve) {
    return "A single curve needs no path. Android takes the four control points on their own, which is what you get below.";
  }

  return null;
}

function generateAndroidInterpolatorCode() {
  const isSingleCurve = getIsSingleCurve();

  const warning = getWarning(isSingleCurve);
  exportElements.warning.hidden = warning === null;
  if (warning) {
    exportElements.warning.textContent = warning;
  }

  const name = getResourceName();
  if (!name) {
    showAlert("error", "Invalid file name", "Use lowercase letters, digits and underscores, starting with a letter");
    return;
  }

  const declaration = `<?xml version="1.0" encoding="utf-8"?>\n`;

  if (isSingleCurve) {
    const [x1, y1, x2, y2] = getSingleCurveControlPoints().map(value => +value.toFixed(4));

    exportElements.codePreview.value = `${declaration}
<pathInterpolator xmlns:android="http://schemas.android.com/apk/res/android" android:controlX1="${x1}" android:controlY1="${y1}" android:controlX2="${x2}" android:controlY2="${y2}" />`;
    return;
  }

  const pathStr = getUprightPathStr();

  exportElements.codePreview.value = `${declaration}
<pathInterpolator xmlns:android="http://schemas.android.com/apk/res/android" android:pathData="${pathStr}" />`;
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
