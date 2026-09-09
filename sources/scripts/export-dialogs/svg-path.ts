import hljs from "highlight.js/lib/core";

import { Points } from "@components/graph-editor/helpers/points";
import { elements, getElement } from "../elements";

const exportElements = {
  exportSvgDialog: getElement<DialogComponent>("#export-svg-dialog"),
  scaleInput: getElement<HTMLInputElement>("#export-svg-scale"),
  codePreview: getElement<CodeEditor>("#export-svg-code-preview"),
  copyBtn: getElement<HTMLButtonElement>("#export-svg-copy-btn"),
  downloadBtn: getElement<HTMLButtonElement>("#export-svg-download-btn"),
};

export function initSvgCodeExport() {
  exportElements.codePreview.highlighter = code => hljs.highlight(code, { language: "html" }).value;

  exportElements.exportSvgDialog.addEventListener("opened", generateSvgCode);
  exportElements.scaleInput.addEventListener("input", generateSvgCode);
  exportElements.copyBtn.addEventListener("click", copySvgCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadSvg);
}

function generateSvgCode() {
  const scale = exportElements.scaleInput.valueAsNumber;
  if (isNaN(scale) || !isFinite(scale) || scale <= 0) {
    elements.alert.alert({ message: "Invalid scale", type: "error", closeBtn: false });
    return;
  }

  const points = elements.graphEditor.points.scale(scale);
  const pathStr = Points.constructPathStr(points);

  exportElements.codePreview.value = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="none" viewBox="0 0 ${scale} ${scale}">\n  <path d="${pathStr}" stroke="currentColor" stroke-width="2" />\n</svg>`;
}

function downloadSvg() {
  const string = exportElements.codePreview.value;
  const blob = new Blob([string], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `svg-${Date.now()}.svg`;
  link.click();
  URL.revokeObjectURL(url);
}

function copySvgCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => elements.alert.alert({ message: "Copied to clipboard", type: "success", closeBtn: false }))
    .catch(() => elements.alert.alert({ message: "Failed to copy to clipboard", type: "error", closeBtn: false }));
}
