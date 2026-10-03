import { ease } from "animare/plugins";
import { ExportOptionError } from "./export-option-error";
import { getIsSingleCurve, getSingleCurveControlPoints } from "./easing-path";
import { pickStopsWithinBudget } from "./easing-stops";

import { Points } from "@graph-editor/helpers/points";

import type { PathCommands } from "@graph-editor/helpers/types";

const VALUE_DECIMALS = 2;

export type CssKeyframesOptions = {
  /** A declaration where `{value}` stands for the animated number */
  property: string;
  maxKeyframes: number;
  from: number;
  to: number;
};

/** A single curve becomes a plain cubic-bezier() transition, which ignores the options and has no plot */
export function createCssKeyframesCode(pathCommands: PathCommands, { property, maxKeyframes, from, to }: CssKeyframesOptions) {
  if (getIsSingleCurve(pathCommands)) {
    const controlPoints = getSingleCurveControlPoints(pathCommands).map(value => +value.toFixed(3));
    const code = `.element {\n  transition: transform 0.6s cubic-bezier(${controlPoints.join(", ")});\n}`;

    return { code, plot: null };
  }

  if (!Number.isInteger(maxKeyframes) || maxKeyframes < 2 || maxKeyframes > 500) {
    throw new ExportOptionError("Invalid max keyframes", "Enter a whole number between 2 and 500");
  }

  if (!Number.isFinite(from)) {
    throw new ExportOptionError("Invalid from value", "Enter a number");
  }

  if (!Number.isFinite(to)) {
    throw new ExportOptionError("Invalid to value", "Enter a number");
  }

  const easingFunction = ease.custom(Points.constructPathStr(pathCommands));
  const { sampledValues, stops } = pickStopsWithinBudget(easingFunction, maxKeyframes);

  let keyframesStr = "";
  for (const stop of stops) {
    const value = +(from + (to - from) * stop.value).toFixed(VALUE_DECIMALS);
    keyframesStr += `\n  ${stop.position}% { ${property.replaceAll("{value}", value.toString())} }`;
  }

  return { code: `@keyframes my-custom-easing {${keyframesStr}\n}`, plot: { sampledValues, stops } };
}
