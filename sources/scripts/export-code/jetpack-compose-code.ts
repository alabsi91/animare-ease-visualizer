import { assertValidIdentifier } from "./identifier";
import { getSingleCurveControlPoints, getUprightPoints } from "./easing-path";

import type { PathCommands } from "@graph-editor/helpers/types";

export type JetpackComposeOptions = {
  valueName: string;
};

function formatFloat(value: number) {
  return `${value}f`;
}

/** A single curve becomes a CubicBezierEasing, any other curve a PathEasing */
export function createJetpackComposeCode(pathCommands: PathCommands, { valueName }: JetpackComposeOptions) {
  assertValidIdentifier(valueName);

  const uprightPoints = getUprightPoints(pathCommands);

  const isSingleCurve = uprightPoints.length === 2;
  if (isSingleCurve) {
    return `import androidx.compose.animation.core.CubicBezierEasing

val ${valueName} = CubicBezierEasing(${getSingleCurveControlPoints(pathCommands).map(formatFloat).join(", ")})`;
  }

  const [movePoint] = uprightPoints[0];

  const pathCalls = [`        moveTo(${formatFloat(movePoint.x)}, ${formatFloat(movePoint.y)})`];
  for (const points of uprightPoints.slice(1)) {
    const coordinates = points.flatMap(point => [point.x, point.y]).map(formatFloat);
    pathCalls.push(`        cubicTo(${coordinates.join(", ")})`);
  }

  return `import androidx.compose.animation.core.PathEasing
import androidx.compose.ui.graphics.Path

val ${valueName} = PathEasing(
    Path().apply {
${pathCalls.join("\n")}
    }
)`;
}
