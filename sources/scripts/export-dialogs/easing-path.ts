import { elements } from "../elements";

import type { PathCommands } from "../../graph-editor/helpers/types";

const COORDINATE_DECIMALS = 4;

export type CurveSegment = {
  startTime: number;
  startValue: number;
  endTime: number;
  endValue: number;
  controlPoints: [number, number, number, number];
};

export function getIsSingleCurve() {
  return elements.graphEditor.points.value.length === 2;
}

export function getSingleCurveControlPoints() {
  const [, curveCommand] = elements.graphEditor.points.value;

  return [curveCommand[0], 1 - curveCommand[1], curveCommand[2], 1 - curveCommand[3]];
}

export function getCornerProblem() {
  const pathCommands = elements.graphEditor.points.value;

  const moveCommand = pathCommands[0];
  const lastCurveCommand = pathCommands[pathCommands.length - 1];

  const startsAtCorner = moveCommand[0] === 0 && moveCommand[1] === 1;
  const endsAtCorner = lastCurveCommand[4] === 1 && lastCurveCommand[5] === 0;

  if (startsAtCorner && endsAtCorner) return null;

  return "The curve has to start at the bottom left corner and end at the top right one.";
}

export function getCurveSegments(pathCommands: PathCommands): CurveSegment[] {
  const [moveCommand, ...curveCommands] = pathCommands;

  const segments: CurveSegment[] = [];

  let startTime: number = moveCommand[0];
  let startValue = 1 - moveCommand[1];

  for (const command of curveCommands) {
    const endTime = command[4];
    const endValue = 1 - command[5];

    const timeSpan = endTime - startTime;
    const valueSpan = endValue - startValue;

    const toUnitTime = (time: number) => (timeSpan === 0 ? 0 : (time - startTime) / timeSpan);
    const toUnitValue = (value: number) => (valueSpan === 0 ? 0 : (value - startValue) / valueSpan);

    segments.push({
      startTime,
      startValue,
      endTime,
      endValue,
      controlPoints: [toUnitTime(command[0]), toUnitValue(1 - command[1]), toUnitTime(command[2]), toUnitValue(1 - command[3])],
    });

    startTime = endTime;
    startValue = endValue;
  }

  return segments;
}

export function getUprightPoints() {
  return elements.graphEditor.points.value.map(command => {
    const points: { x: number; y: number }[] = [];

    for (let index = 0; index < command.length; index += 2) {
      points.push({
        x: +command[index].toFixed(COORDINATE_DECIMALS),
        y: +(1 - command[index + 1]).toFixed(COORDINATE_DECIMALS),
      });
    }

    return points;
  });
}

export function getUprightPathStr() {
  return getUprightPoints()
    .map((points, index) => {
      const letter = index === 0 ? "M" : "C";
      return `${letter}${points.map(point => `${point.x},${point.y}`).join(" ")}`;
    })
    .join(" ");
}
