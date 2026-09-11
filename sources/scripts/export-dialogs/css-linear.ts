import { ease } from "animare/plugins";
import { createHighlighter, createTailwindClassHighlighter } from "./highlighter";

import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

type EasingFunction = (time: number) => number;

interface LinearStop {
  position: number;
  value: number;
}

// A position is written with one decimal. A stop can only land on a 0.1% step.
const SAMPLES_PER_PERCENT = 10;
const LAST_SAMPLE_INDEX = 100 * SAMPLES_PER_PERCENT;
const VALUE_DECIMALS = 3;
const HALF_VALUE_STEP = 0.5 / 10 ** VALUE_DECIMALS;
const TOLERANCE_SEARCH_ROUNDS = 30;

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

function sampleEasing(easingFunction: EasingFunction) {
  const sampledValues: number[] = [];

  for (let sampleIndex = 0; sampleIndex <= LAST_SAMPLE_INDEX; sampleIndex++) {
    sampledValues.push(easingFunction(sampleIndex / LAST_SAMPLE_INDEX));
  }

  return sampledValues;
}

function getFewestStopSampleIndexes(sampledValues: number[], tolerance: number) {
  const stopSampleIndexes = [0];
  let startIndex = 0;

  while (startIndex < LAST_SAMPLE_INDEX) {
    let lowestAllowedSlope = -Infinity;
    let highestAllowedSlope = Infinity;
    let farthestIndex = startIndex + 1;

    for (let endIndex = startIndex + 1; endIndex <= LAST_SAMPLE_INDEX; endIndex++) {
      const width = endIndex - startIndex;
      const rise = sampledValues[endIndex] - sampledValues[startIndex];
      const chordSlope = rise / width;

      const isChordAllowed = chordSlope >= lowestAllowedSlope && chordSlope <= highestAllowedSlope;
      if (isChordAllowed) {
        farthestIndex = endIndex;
      }

      lowestAllowedSlope = Math.max(lowestAllowedSlope, (rise - tolerance) / width);
      highestAllowedSlope = Math.min(highestAllowedSlope, (rise + tolerance) / width);
      if (lowestAllowedSlope > highestAllowedSlope) break;
    }

    startIndex = farthestIndex;
    stopSampleIndexes.push(startIndex);
  }

  return stopSampleIndexes;
}

function getStopSampleIndexesWithinBudget(sampledValues: number[], maxStops: number) {
  let tooTightTolerance = 0;
  let affordableTolerance = Math.max(...sampledValues) - Math.min(...sampledValues);
  let stopSampleIndexes = getFewestStopSampleIndexes(sampledValues, affordableTolerance);

  for (let round = 0; round < TOLERANCE_SEARCH_ROUNDS; round++) {
    const tolerance = (tooTightTolerance + affordableTolerance) / 2;
    const candidateStopSampleIndexes = getFewestStopSampleIndexes(sampledValues, tolerance);

    if (candidateStopSampleIndexes.length <= maxStops) {
      affordableTolerance = tolerance;
      stopSampleIndexes = candidateStopSampleIndexes;
    } else {
      tooTightTolerance = tolerance;
    }
  }

  return stopSampleIndexes;
}

function createRoundedStops(sampledValues: number[], stopSampleIndexes: number[]): LinearStop[] {
  return stopSampleIndexes.map(sampleIndex => ({
    position: sampleIndex / SAMPLES_PER_PERCENT,
    value: Number(sampledValues[sampleIndex].toFixed(VALUE_DECIMALS)),
  }));
}

function dropRedundantStops(stops: LinearStop[]) {
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

function formatStops(stops: LinearStop[]) {
  const formattedStops = stops.map((stop, index) => {
    const isEndStop = index === 0 || index === stops.length - 1;
    return isEndStop ? `${stop.value}` : `${stop.value} ${stop.position}%`;
  });

  return formattedStops.join(", ");
}

/** Resizes the canvas to what css gave it, which also wipes whatever was drawn before */
function resetPlot() {
  const canvas = exportElements.plot;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = canvas.clientWidth * pixelRatio;
  canvas.height = canvas.clientHeight * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  return { context, width: canvas.clientWidth, height: canvas.clientHeight };
}

/** Draws the curve the stops rebuild. A tighter budget shows its cost here */
function drawPlot(sampledValues: number[], stops: LinearStop[]) {
  const canvas = exportElements.plot;
  const prepared = resetPlot();
  if (!prepared) return;

  const { context, width, height } = prepared;

  const lowest = Math.min(...sampledValues, 0);
  const highest = Math.max(...sampledValues, 1);
  const padding = 12;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const toX = (time: number) => padding + time * plotWidth;
  const toY = (value: number) => padding + plotHeight - ((value - lowest) / (highest - lowest)) * plotHeight;

  context.strokeStyle = getComputedStyle(canvas).color;
  context.fillStyle = context.strokeStyle;

  // the 0 and the 1 lines, which is what an overshoot is read against
  context.globalAlpha = 0.2;
  context.lineWidth = 1;
  for (const value of [0, 1]) {
    context.beginPath();
    context.moveTo(padding, toY(value));
    context.lineTo(padding + plotWidth, toY(value));
    context.stroke();
  }

  context.globalAlpha = 1;
  context.lineWidth = 1.5;
  context.beginPath();
  stops.forEach((stop, index) => {
    const x = toX(stop.position / 100);
    const y = toY(stop.value);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

function generateCssLinearCode() {
  // If the graph is a bezier curve
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
    resetPlot();
    showAlert("error", "Invalid max stops", "Enter a whole number between 2 and 500");
    return;
  }

  const easingFunction = ease.custom(elements.graphEditor.points.valueStr);
  const sampledValues = sampleEasing(easingFunction);
  const stopSampleIndexes = getStopSampleIndexesWithinBudget(sampledValues, maxStops);
  const stops = dropRedundantStops(createRoundedStops(sampledValues, stopSampleIndexes));

  exportElements.codePreview.value = formatOutput(`linear(${formatStops(stops)})`);
  drawPlot(sampledValues, stops);
}

function copyCssLinearCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
