import { drawPlot, resetPlot } from "./export-plot";
import { createHighlighter } from "./highlighter";
import { showExportOptionError } from "./export-option-alert";

import { createCssKeyframesCode } from "../export-code/css-keyframes-code";
import { getIsSingleCurve } from "../export-code/easing-path";
import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

const exportElements = {
  dialog: getElement<Dialog>("#export-css-keyframe-dialog"),
  inputsContainer: getElement<HTMLDivElement>("#export-css-keyframe-inputs-container"),
  propertyInput: getElement<CodeEditor>("#export-css-keyframe-property"),
  maxKeyframesInput: getElement<HTMLInputElement>("#export-css-keyframe-max-keyframes"),
  fromInput: getElement<HTMLInputElement>("#export-css-keyframe-from"),
  toInput: getElement<HTMLInputElement>("#export-css-keyframe-to"),
  codePreview: getElement<CodeEditor>("#export-css-keyframe-code-preview"),
  warning: getElement<HTMLDivElement>("#export-css-keyframe-warning"),
  copyBtn: getElement<HTMLButtonElement>("#export-css-keyframe-copy-btn"),
  plot: getElement<HTMLCanvasElement>("#export-css-keyframe-plot"),
};

export function initCssKeyframeExport() {
  exportElements.dialog.addEventListener("openedchange", setHighlighters, { once: true });

  exportElements.dialog.addEventListener("openedchange", () => {
    if (exportElements.dialog.opened) generateCssKeyframesCode();
  });
  exportElements.propertyInput.addEventListener("valuechange", generateCssKeyframesCode);
  exportElements.maxKeyframesInput.addEventListener("input", generateCssKeyframesCode);
  exportElements.fromInput.addEventListener("input", generateCssKeyframesCode);
  exportElements.toInput.addEventListener("input", generateCssKeyframesCode);
  exportElements.copyBtn.addEventListener("click", copyCssKeyframesCodeHandler);
}

function setHighlighters() {
  exportElements.propertyInput.highlighter = createHighlighter("css");
  exportElements.codePreview.highlighter = createHighlighter("css");
}

/** A single curve is a plain cubic-bezier, which needs neither the inputs nor a plot */
function setSingleCurveMode(isSingleCurve: boolean) {
  exportElements.warning.hidden = !isSingleCurve;
  exportElements.inputsContainer.hidden = isSingleCurve;
  exportElements.plot.hidden = isSingleCurve;
}

function generateCssKeyframesCode() {
  const pathCommands = elements.graphEditor.points.value;
  setSingleCurveMode(getIsSingleCurve(pathCommands));

  try {
    const { code, plot } = createCssKeyframesCode(pathCommands, {
      property: exportElements.propertyInput.value,
      maxKeyframes: exportElements.maxKeyframesInput.valueAsNumber,
      from: exportElements.fromInput.valueAsNumber,
      to: exportElements.toInput.valueAsNumber,
    });

    exportElements.codePreview.value = code;
    if (plot) {
      drawPlot(exportElements.plot, plot.sampledValues, plot.stops);
    }
  } catch (error) {
    resetPlot(exportElements.plot);
    showExportOptionError(error);
  }
}

function copyCssKeyframesCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => {
      showAlert("success", "Copied to clipboard");
    })
    .catch(() => {
      showAlert("error", "Failed to copy to clipboard");
    });
}
