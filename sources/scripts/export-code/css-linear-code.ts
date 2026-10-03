import { ease } from "animare/plugins";
import { ExportOptionError } from "./export-option-error";
import { getIsSingleCurve, getSingleCurveControlPoints } from "./easing-path";
import { pickStopsWithinBudget } from "./easing-stops";

import { Points } from "@graph-editor/helpers/points";

import type { EasingStop } from "./easing-stops";
import type { PathCommands } from "@graph-editor/helpers/types";

const VALUE_DECIMALS = 3;
const HALF_VALUE_STEP = 0.5 / 10 ** VALUE_DECIMALS;

export type CssLinearFormat = "css" | "tailwind";

export type CssLinearOptions = {
  maxStops: number;
  format: CssLinearFormat;
};

/** Tailwind takes the whole function as one class, where a space is an underscore */
function formatOutput(value: string, format: CssLinearFormat) {
  if (format === "css") return value;

  return `ease-[${value.replace(/,\s*/g, ",").replace(/\s+/g, "_")}]`;
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

/** A single curve becomes a plain cubic-bezier(), which needs no stop budget and has no plot */
export function createCssLinearCode(pathCommands: PathCommands, { maxStops, format }: CssLinearOptions) {
  if (getIsSingleCurve(pathCommands)) {
    const controlPoints = getSingleCurveControlPoints(pathCommands).map(value => +value.toFixed(3));
    return { code: formatOutput(`cubic-bezier(${controlPoints.join(", ")})`, format), plot: null };
  }

  if (!Number.isInteger(maxStops) || maxStops < 2 || maxStops > 500) {
    throw new ExportOptionError("Invalid max stops", "Enter a whole number between 2 and 500");
  }

  const easingFunction = ease.custom(Points.constructPathStr(pathCommands));
  const { sampledValues, stops } = pickStopsWithinBudget(easingFunction, maxStops);
  const exportedStops = dropRedundantStops(roundStops(stops));

  return {
    code: formatOutput(`linear(${formatStops(exportedStops)})`, format),
    plot: { sampledValues, stops: exportedStops },
  };
}
