import { createHighlighter } from "./highlighter";
import { getUprightPathStr } from "./easing-path";

import { getElement } from "../elements";
import { showAlert } from "../alert";

const exportElements = {
  dialog: getElement<Dialog>("#export-gsap-dialog"),
  nameInput: getElement<HTMLInputElement>("#export-gsap-name"),
  codePreview: getElement<CodeEditor>("#export-gsap-code-preview"),
  copyBtn: getElement<HTMLButtonElement>("#export-gsap-copy-btn"),
};

export function initGsapEaseExport() {
  exportElements.codePreview.highlighter = createHighlighter("javascript");

  exportElements.dialog.addEventListener("opened", generateGsapEaseCode);
  exportElements.nameInput.addEventListener("input", generateGsapEaseCode);
  exportElements.copyBtn.addEventListener("click", copyGsapEaseCodeHandler);
}

function generateGsapEaseCode() {
  const name = exportElements.nameInput.value.trim();
  if (!name) {
    showAlert("error", "Invalid name", "Enter a name for the ease");
    return;
  }

  const pathStr = getUprightPathStr();
  const quotedName = JSON.stringify(name);

  exportElements.codePreview.value = `import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

CustomEase.create(${quotedName}, "${pathStr}");

gsap.to(".box", { x: 300, duration: 0.6, ease: ${quotedName} });`;
}

function copyGsapEaseCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
