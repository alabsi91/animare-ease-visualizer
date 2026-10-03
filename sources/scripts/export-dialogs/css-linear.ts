import { drawPlot, resetPlot } from "./export-plot";
import { createHighlighter, createTailwindClassHighlighter } from "./highlighter";
import { showExportOptionError } from "./export-option-alert";

import { createCssLinearCode } from "../export-code/css-linear-code";
import { getIsSingleCurve } from "../export-code/easing-path";
import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

import type { CssLinearFormat } from "../export-code/css-linear-code";

const exportElements = {
  exportCssLinearDialog: getElement<Dialog>("#export-css-linear-dialog"),
  maxStopsInput: getElement<HTMLInputElement>("#export-css-linear-max-stops"),
  maxStopsRow: getElement<HTMLDivElement>("#export-css-linear-max-stops-row"),
  codePreview: getElement<CodeEditor>("#export-css-linear-code-preview"),
  warning: getElement<HTMLDivElement>("#export-css-linear-warning"),
  copyBtn: getElement<HTMLButtonElement>("#export-css-linear-copy-btn"),
  plot: getElement<HTMLCanvasElement>("#export-css-linear-plot"),
  formatControl: getElement<SegmentedControl>("#export-css-linear-format"),
};

function getSelectedFormat(): CssLinearFormat {
  return exportElements.formatControl.value === "tailwind" ? "tailwind" : "css";
}

function onFormatChange() {
  exportElements.codePreview.highlighter =
    getSelectedFormat() === "tailwind" ? createTailwindClassHighlighter() : createHighlighter("css");

  generateCssLinearCode();
}

/** A single curve is a plain cubic-bezier, which needs neither a budget nor a plot */
function setSingleCurveMode(isSingleCurve: boolean) {
  exportElements.warning.hidden = !isSingleCurve;
  exportElements.maxStopsRow.hidden = isSingleCurve;
  exportElements.plot.hidden = isSingleCurve;
}

export function initCssLinearExport() {
  onFormatChange();

  exportElements.exportCssLinearDialog.addEventListener("openedchange", () => {
    if (exportElements.exportCssLinearDialog.opened) generateCssLinearCode();
  });
  exportElements.maxStopsInput.addEventListener("input", generateCssLinearCode);
  exportElements.formatControl.addEventListener("valuechange", onFormatChange);
  exportElements.copyBtn.addEventListener("click", copyCssLinearCodeHandler);
}

function generateCssLinearCode() {
  const pathCommands = elements.graphEditor.points.value;
  setSingleCurveMode(getIsSingleCurve(pathCommands));

  try {
    const { code, plot } = createCssLinearCode(pathCommands, {
      maxStops: exportElements.maxStopsInput.valueAsNumber,
      format: getSelectedFormat(),
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

function copyCssLinearCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
