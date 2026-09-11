import { ease } from "animare/plugins";
import { pickStopsWithinBudget } from "./easing-stops";
import { drawPlot, resetPlot } from "./export-plot";
import { createHighlighter, createTailwindClassHighlighter } from "./highlighter";

import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

import type { EasingStop } from "./easing-stops";

const VALUE_DECIMALS = 3;
const HALF_VALUE_STEP = 0.5 / 10 ** VALUE_DECIMALS;

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

function isTailwindSelected() {
  return exportElements.formatControl.value === "tailwind";
}

/** Tailwind takes the whole function as one class, where a space is an underscore */
function formatOutput(value: string) {
  if (!isTailwindSelected()) return value;

  return `ease-[${value.replace(/,\s*/g, ",").replace(/\s+/g, "_")}]`;
}

function onFormatChange() {
  exportElements.codePreview.highlighter = isTailwindSelected() ? createTailwindClassHighlighter() : createHighlighter("css");

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

  exportElements.exportCssLinearDialog.addEventListener("opened", generateCssLinearCode);
  exportElements.maxStopsInput.addEventListener("input", generateCssLinearCode);
  exportElements.formatControl.addEventListener("valuechange", onFormatChange);
  exportElements.copyBtn.addEventListener("click", copyCssLinearCodeHandler);
}

function roundStops(stops: EasingStop[]): EasingStop[] {
  return stops.map(stop => ({
    position: stop.position,
    value: Number(stop.value.toFixed(VALUE_DECIMALS)),
  }));
}

function dropRedundantStops(stops: EasingStop[]) {
  const keptStops = [stops[0]];

  for (let index = 1; index < stops.length - 1; index++) {
    const previousStop = keptStops[keptStops.length - 1];
    const stop = stops[index];
    const nextStop = stops[index + 1];

    const positionFraction = (stop.position - previousStop.position) / (nextStop.position - previousStop.position);
    const valueOnChord = previousStop.value + (nextStop.value - previousStop.value) * positionFraction;

    const isOnChord = Math.abs(valueOnChord - stop.value) <= HALF_VALUE_STEP;
    if (!isOnChord) {
      keptStops.push(stop);
    }
  }

  keptStops.push(stops[stops.length - 1]);

  return keptStops;
}

function formatStops(stops: EasingStop[]) {
  const formattedStops = stops.map((stop, index) => {
    const isEndStop = index === 0 || index === stops.length - 1;
    return isEndStop ? `${stop.value}` : `${stop.value} ${stop.position}%`;
  });

  return formattedStops.join(", ");
}

function generateCssLinearCode() {
  const curves = elements.graphEditor.points.value;
  const isSingleCurve = curves.length === 2;
  setSingleCurveMode(isSingleCurve);

  if (isSingleCurve) {
    const cx1 = +curves[1][0].toFixed(3);
    const cy1 = +(1 - curves[1][1]).toFixed(3);
    const cx2 = +curves[1][2].toFixed(3);
    const cy2 = +(1 - curves[1][3]).toFixed(3);
    exportElements.codePreview.value = formatOutput(`cubic-bezier(${cx1}, ${cy1}, ${cx2}, ${cy2})`);
    return;
  }

  const maxStops = exportElements.maxStopsInput.valueAsNumber;
  if (isNaN(maxStops) || !isFinite(maxStops) || maxStops < 2 || maxStops > 500) {
    resetPlot(exportElements.plot);
    showAlert("error", "Invalid max stops", "Enter a whole number between 2 and 500");
    return;
  }

  const easingFunction = ease.custom(elements.graphEditor.points.valueStr);
  const { sampledValues, stops } = pickStopsWithinBudget(easingFunction, maxStops);
  const exportedStops = dropRedundantStops(roundStops(stops));

  exportElements.codePreview.value = formatOutput(`linear(${formatStops(exportedStops)})`);
  drawPlot(exportElements.plot, sampledValues, exportedStops);
}

function copyCssLinearCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
