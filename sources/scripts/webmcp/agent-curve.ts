import { ease } from "animare/plugins";
import { checkPathOverlap } from "../graph/path-overlap";
import { getCornerProblem, getIsSingleCurve, getSingleCurveControlPoints } from "../export-code/easing-path";
import { elements } from "../elements";

import { Points } from "@graph-editor/helpers/points";

import type { PathCommands } from "@graph-editor/helpers/types";

const SAMPLE_COUNT = 11;

export const PATH_FORMAT_DESCRIPTION =
  "An SVG path made of one `M x y` command followed by one or more `C x1 y1 x2 y2 x y` commands. " +
  "Numbers are separated by spaces or commas. " +
  "x is time from 0 to 1. y is flipped like in SVG, so y = 1 - value. " +
  "A normal easing starts at `M 0 1` and ends at `1 0`. Example ease-out: `M 0 1 C 0.33 0 0.68 0 1 0`.";

export const PATH_PROPERTY_SCHEMA = {
  type: "string",
  description: `The curve to export. Leave it out to export the curve that is open in the editor. ${PATH_FORMAT_DESCRIPTION}`,
};

export function getCurveProblems(pathCommands: PathCommands) {
  const problems: string[] = [];

  const cornerProblem = getCornerProblem(pathCommands);
  if (cornerProblem) {
    problems.push(cornerProblem);
  }

  if (checkPathOverlap(pathCommands)) {
    problems.push("The curve moves backward in time, which no easing function can do.");
  }

  return problems;
}

/** Reads a path that an agent sent. Without a path it returns the curve that is open in the editor. */
export function getPathCommandsFromInput(path: string | undefined) {
  if (path === undefined) return elements.graphEditor.points.valueCopy;

  const normalizedPath = Points.getNormalizedPathStr(path);
  if (!Points.getIsValidPathStr(normalizedPath)) {
    throw new Error(`Invalid path. ${PATH_FORMAT_DESCRIPTION}`);
  }

  return Points.parsePathStr(normalizedPath);
}

/** What an agent needs to understand a curve it cannot see */
export function createCurveDescription(pathCommands: PathCommands) {
  const path = Points.constructPathStr(pathCommands);
  const easingFunction = ease.custom(path);

  const samples = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    const time = index / (SAMPLE_COUNT - 1);
    return { time, value: +easingFunction(time).toFixed(3) };
  });

  const problems = getCurveProblems(pathCommands);

  const isCubicBezier = getIsSingleCurve(pathCommands) && getCornerProblem(pathCommands) === null;
  const cubicBezier = isCubicBezier ? getSingleCurveControlPoints(pathCommands).map(value => +value.toFixed(3)) : null;

  return { path, cubicBezier, samples, problems };
}
