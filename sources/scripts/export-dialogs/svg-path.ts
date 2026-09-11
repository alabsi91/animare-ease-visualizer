import { createHighlighter } from "./highlighter";

import { Points } from "@graph-editor/helpers/points";
import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

const STROKE_WIDTH = 2;
const EXPORT_WIDTH = 60;
const SAMPLES_PER_SEGMENT = 60;

function getPathBounds(points: number[][]) {
  let [startX, startY] = points[0];

  let lowestX = startX;
  let highestX = startX;
  let lowestY = startY;
  let highestY = startY;

  for (let index = 1; index < points.length; index++) {
    const [firstCtrlX, firstCtrlY, secondCtrlX, secondCtrlY, endX, endY] = points[index];

    for (let sample = 1; sample <= SAMPLES_PER_SEGMENT; sample++) {
      const t = sample / SAMPLES_PER_SEGMENT;
      const rest = 1 - t;

      const x = rest ** 3 * startX + 3 * rest ** 2 * t * firstCtrlX + 3 * rest * t ** 2 * secondCtrlX + t ** 3 * endX;
      const y = rest ** 3 * startY + 3 * rest ** 2 * t * firstCtrlY + 3 * rest * t ** 2 * secondCtrlY + t ** 3 * endY;

      lowestX = Math.min(lowestX, x);
      highestX = Math.max(highestX, x);
      lowestY = Math.min(lowestY, y);
      highestY = Math.max(highestY, y);
    }

    startX = endX;
    startY = endY;
  }

  return { lowestX, highestX, lowestY, highestY };
}

/** The bounds with room for the stroke, half of which sits outside the path */
function getFittedBox(points: number[][]) {
  const bounds = getPathBounds(points);
  const padding = STROKE_WIDTH / 2;

  return {
    x: +(bounds.lowestX - padding).toFixed(2),
    y: +(bounds.lowestY - padding).toFixed(2),
    width: +(bounds.highestX - bounds.lowestX + STROKE_WIDTH).toFixed(2),
    height: +(bounds.highestY - bounds.lowestY + STROKE_WIDTH).toFixed(2),
  };
}

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

  exportElements.exportSvgDialog.addEventListener("opened", generateSvgCode);
  exportElements.scaleInput.addEventListener("input", generateSvgCode);
  exportElements.fitToggle.addEventListener("clicked", generateSvgCode);
  exportElements.copyBtn.addEventListener("click", copySvgCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadSvg);
}

function generateSvgCode() {
  const scale = exportElements.scaleInput.valueAsNumber;
  if (isNaN(scale) || !isFinite(scale) || scale <= 0) {
    exportElements.preview.replaceChildren();
    showAlert("error", "Invalid scale", "Enter a number above 0");
    return;
  }

  const points = elements.graphEditor.points.scale(scale);
  const pathStr = Points.constructPathStr(points);

  const box = exportElements.fitToggle.checked ? getFittedBox(points) : { x: 0, y: 0, width: scale, height: scale };
  const exportHeight = Math.round((EXPORT_WIDTH * box.height) / box.width);

  const openingTag = `<svg xmlns="http://www.w3.org/2000/svg" width="${EXPORT_WIDTH}" height="${exportHeight}" fill="none" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">`;

  exportElements.codePreview.value = `${openingTag}\n  <path d="${pathStr}" stroke="currentColor" stroke-width="${STROKE_WIDTH}" />\n</svg>`;
  exportElements.preview.innerHTML = exportElements.codePreview.value;
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
