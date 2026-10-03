import { ExportOptionError } from "./export-option-error";

import { Points } from "@graph-editor/helpers/points";

import type { PathCommands } from "@graph-editor/helpers/types";

const STROKE_WIDTH = 2;
const EXPORT_WIDTH = 60;
const SAMPLES_PER_SEGMENT = 60;

export type SvgPathOptions = {
  /** The size in pixels that the 0 to 1 box is scaled to */
  scale: number;
  /** Fit the view box to the curve instead of the 0 to 1 box */
  isFittedToCurve: boolean;
};

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

export function createSvgPathCode(pathCommands: PathCommands, { scale, isFittedToCurve }: SvgPathOptions) {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new ExportOptionError("Invalid scale", "Enter a number above 0");
  }

  const points = Points.scale(pathCommands, scale);
  const pathStr = Points.constructPathStr(points);

  const box = isFittedToCurve ? getFittedBox(points) : { x: 0, y: 0, width: scale, height: scale };
  const exportHeight = Math.round((EXPORT_WIDTH * box.height) / box.width);

  const openingTag = `<svg xmlns="http://www.w3.org/2000/svg" width="${EXPORT_WIDTH}" height="${exportHeight}" fill="none" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">`;

  return `${openingTag}\n  <path d="${pathStr}" stroke="currentColor" stroke-width="${STROKE_WIDTH}" />\n</svg>`;
}
