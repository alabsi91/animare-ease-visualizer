import { ease } from "animare/plugins";
import { pickStopsWithinBudget } from "./easing-stops";
import { drawPlot, resetPlot } from "./export-plot";
import { createHighlighter } from "./highlighter";

import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

const VALUE_DECIMALS = 2;

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
  exportElements.dialog.addEventListener("opened", setHighlighters, { once: true });

  exportElements.dialog.addEventListener("opened", generateCssKeyframesCode);
  exportElements.propertyInput.addEventListener("update", generateCssKeyframesCode);
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

function showInvalidInputAlert(title: string, hint: string) {
  resetPlot(exportElements.plot);
  showAlert("error", title, hint);
}

function generateCssKeyframesCode() {
  const curves = elements.graphEditor.points.value;
  const isSingleCurve = curves.length === 2;
  setSingleCurveMode(isSingleCurve);

  if (isSingleCurve) {
    const cx1 = +curves[1][0].toFixed(3);
    const cy1 = +(1 - curves[1][1]).toFixed(3);
    const cx2 = +curves[1][2].toFixed(3);
    const cy2 = +(1 - curves[1][3]).toFixed(3);
    exportElements.codePreview.value = `.element {\n  transition: transform 0.6s cubic-bezier(${cx1}, ${cy1}, ${cx2}, ${cy2});\n}`;
    return;
  }

  const maxKeyframes = exportElements.maxKeyframesInput.valueAsNumber;
  if (isNaN(maxKeyframes) || !isFinite(maxKeyframes) || maxKeyframes < 2 || maxKeyframes > 500) {
    showInvalidInputAlert("Invalid max keyframes", "Enter a whole number between 2 and 500");
    return;
  }

  const from = exportElements.fromInput.valueAsNumber;
  if (!Number.isFinite(from)) {
    showInvalidInputAlert("Invalid from value", "Enter a number");
    return;
  }

  const to = exportElements.toInput.valueAsNumber;
  if (!Number.isFinite(to)) {
    showInvalidInputAlert("Invalid to value", "Enter a number");
    return;
  }

  const property = exportElements.propertyInput.value;
  const easingFunction = ease.custom(elements.graphEditor.points.valueStr);
  const { sampledValues, stops } = pickStopsWithinBudget(easingFunction, maxKeyframes);

  let codeStr = "";
  for (const stop of stops) {
    const value = +(from + (to - from) * stop.value).toFixed(VALUE_DECIMALS);
    codeStr += `\n  ${stop.position}% { ${property.replaceAll("{value}", value.toString())} }`;
  }

  exportElements.codePreview.value = `@keyframes my-custom-easing {${codeStr}\n}`;
  drawPlot(exportElements.plot, sampledValues, stops);
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
