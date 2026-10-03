import { assertValidIdentifier } from "./identifier";
import { getCurveSegments, getIsSingleCurve, getSingleCurveControlPoints } from "./easing-path";

import type { CurveSegment } from "./easing-path";
import type { PathCommands } from "@graph-editor/helpers/types";

const DECIMALS = 4;

export type IosKeyframesOptions = {
  functionName: string;
};

function round(value: number) {
  return +value.toFixed(DECIMALS);
}

function formatTimingFunction(segment: CurveSegment) {
  const [x1, y1, x2, y2] = segment.controlPoints.map(round);
  return `    CAMediaTimingFunction(controlPoints: ${x1}, ${y1}, ${x2}, ${y2}),`;
}

/** A single curve becomes one timing function, which needs no keyframes */
export function createIosKeyframesCode(pathCommands: PathCommands, { functionName }: IosKeyframesOptions) {
  assertValidIdentifier(functionName);

  if (getIsSingleCurve(pathCommands)) {
    const controlPoints = getSingleCurveControlPoints(pathCommands).map(round);
    return `\nCAMediaTimingFunction(controlPoints: ${controlPoints.join(", ")})\n`;
  }

  const segments = getCurveSegments(pathCommands);

  const keyTimes = [segments[0].startTime, ...segments.map(segment => segment.endTime)];
  const progress = [segments[0].startValue, ...segments.map(segment => segment.endValue)];

  return `import UIKit

func ${functionName}(keyPath: String, from: Double, to: Double, duration: CFTimeInterval) -> CAKeyframeAnimation {
  let progress: [Double] = [${progress.map(round).join(", ")}]
  let keyTimes: [Double] = [${keyTimes.map(round).join(", ")}]

  let animation = CAKeyframeAnimation(keyPath: keyPath)
  animation.values = progress.map { from + (to - from) * $0 }
  animation.keyTimes = keyTimes.map { NSNumber(value: $0) }
  animation.timingFunctions = [
${segments.map(formatTimingFunction).join("\n")}
  ]
  animation.duration = duration
  animation.fillMode = .forwards
  animation.isRemovedOnCompletion = false

  return animation
}

let animation = ${functionName}(keyPath: "transform.translation.x", from: 0, to: 300, duration: 0.6)
view.layer.add(animation, forKey: "${functionName}")`;
}
