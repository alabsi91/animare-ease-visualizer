import { createHighlighter } from "./highlighter";
import { showExportOptionError } from "./export-option-alert";

import { createGsapEaseCode } from "../export-code/gsap-ease-code";
import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

const exportElements = {
  dialog: getElement<Dialog>("#export-gsap-dialog"),
  nameInput: getElement<HTMLInputElement>("#export-gsap-name"),
  codePreview: getElement<CodeEditor>("#export-gsap-code-preview"),
  copyBtn: getElement<HTMLButtonElement>("#export-gsap-copy-btn"),
};

export function initGsapEaseExport() {
  exportElements.codePreview.highlighter = createHighlighter("javascript");

  exportElements.dialog.addEventListener("openedchange", () => {
    if (exportElements.dialog.opened) generateGsapEaseCode();
  });
  exportElements.nameInput.addEventListener("input", generateGsapEaseCode);
  exportElements.copyBtn.addEventListener("click", copyGsapEaseCodeHandler);
}

function generateGsapEaseCode() {
  try {
    exportElements.codePreview.value = createGsapEaseCode(elements.graphEditor.points.value, {
      easeName: exportElements.nameInput.value.trim(),
    });
  } catch (error) {
    showExportOptionError(error);
  }
}

function copyGsapEaseCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
