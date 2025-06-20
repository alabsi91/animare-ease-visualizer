import { ease } from "animare/plugins";
import hljs from "highlight.js/lib/core";

import { elements, getElement } from "../elements";

const exportElements = {
  exportJsFunctionDialog: getElement<DialogComponent>("#export-js-function-dialog"),
  samplesInput: getElement<HTMLInputElement>("#export-js-function-samples"),
  nameInput: getElement<HTMLInputElement>("#export-js-function-name"),
  codePreview: getElement<CodeEditor>("#export-js-function-code-preview"),
  copyBtn: getElement<HTMLButtonElement>("#export-js-function-copy-btn"),
  downloadBtn: getElement<HTMLButtonElement>("#export-js-function-download-btn"),
};

export function initJsFunctionExport() {
  exportElements.codePreview.highlighter = code => hljs.highlight(code, { language: "javascript" }).value;

  exportElements.exportJsFunctionDialog.addEventListener("opened", generateJsFunctionCode);
  exportElements.samplesInput.addEventListener("input", generateJsFunctionCode);
  exportElements.nameInput.addEventListener("input", generateJsFunctionCode);
  exportElements.copyBtn.addEventListener("click", copyJsFunctionCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadJsFile);
}

function generateJsFunctionCode() {
  const name = exportElements.nameInput.value;
  try {
    new Function(name, `var ${name}`);
  } catch {
    elements.alert.alert({ message: "Invalid JavaScript variable name", type: "error", closeBtn: false });
    return;
  }

  const samples = exportElements.samplesInput.valueAsNumber;
  if (isNaN(samples) || !isFinite(samples) || samples <= 0 || samples > 1000) {
    elements.alert.alert({ message: "Invalid samples", type: "error", closeBtn: false });
    return;
  }

  const easingFunction = ease.custom(elements.graphEditor.points.valueStr);

  const values = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    values[i] = +easingFunction(t).toFixed(3);
  }

  exportElements.codePreview.value = `const values = ${JSON.stringify([...values])};\nconst lastIdx = values.length - 1;\nconst ${name} = t => {\n  'worklet';\n  return values[Math.floor(t * lastIdx)] ?? values[lastIdx];\n}\nexport default ${name};`;
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
    .then(() => elements.alert.alert({ message: "Copied to clipboard", type: "success", closeBtn: false }))
    .catch(() => elements.alert.alert({ message: "Failed to copy to clipboard", type: "error", closeBtn: false }));
}
