import { createHighlighter } from "./highlighter";
import { showExportOptionError } from "./export-option-alert";

import { createSvgPathCode } from "../export-code/svg-path-code";
import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

const exportElements = {
  exportSvgDialog: getElement<Dialog>("#export-svg-dialog"),
  scaleInput: getElement<HTMLInputElement>("#export-svg-scale"),
  codePreview: getElement<CodeEditor>("#export-svg-code-preview"),
  copyBtn: getElement<HTMLButtonElement>("#export-svg-copy-btn"),
  downloadBtn: getElement<HTMLButtonElement>("#export-svg-download-btn"),
  preview: getElement<HTMLDivElement>("#export-svg-preview"),
  fitToggle: getElement<ToggleCheckbox>("#export-svg-fit"),
};

export function initSvgCodeExport() {
  exportElements.codePreview.highlighter = createHighlighter("html");

  exportElements.exportSvgDialog.addEventListener("openedchange", () => {
    if (exportElements.exportSvgDialog.opened) generateSvgCode();
  });
  exportElements.scaleInput.addEventListener("input", generateSvgCode);
  exportElements.fitToggle.addEventListener("checkedchange", generateSvgCode);
  exportElements.copyBtn.addEventListener("click", copySvgCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadSvg);
}

function generateSvgCode() {
  try {
    exportElements.codePreview.value = createSvgPathCode(elements.graphEditor.points.value, {
      scale: exportElements.scaleInput.valueAsNumber,
      isFittedToCurve: exportElements.fitToggle.checked,
    });
    exportElements.preview.innerHTML = exportElements.codePreview.value;
  } catch (error) {
    exportElements.preview.replaceChildren();
    showExportOptionError(error);
  }
}

function downloadSvg() {
  const string = exportElements.codePreview.value;
  const blob = new Blob([string], { type: "image/svg+xml" });
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
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
