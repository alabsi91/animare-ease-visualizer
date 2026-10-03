import { assertValidIdentifier } from "./identifier";
import { getCurveSegments, getIsSingleCurve, getSingleCurveControlPoints } from "./easing-path";

import type { CurveSegment } from "./easing-path";
import type { PathCommands } from "@graph-editor/helpers/types";

const DECIMALS = 4;

export type FlutterCurveOptions = {
  className: string;
};

function formatDouble(value: number) {
  const rounded = +value.toFixed(DECIMALS);
  return Number.isInteger(rounded) ? rounded.toFixed(1) : String(rounded);
}

function formatSegment(segment: CurveSegment) {
  return `    Cubic(${segment.controlPoints.map(formatDouble).join(", ")}),`;
}

/** A single curve becomes Flutter's own Cubic, which needs no class name */
export function createFlutterCurveCode(pathCommands: PathCommands, { className }: FlutterCurveOptions) {
  assertValidIdentifier(className);

  if (getIsSingleCurve(pathCommands)) {
    return `const Cubic(${getSingleCurveControlPoints(pathCommands).map(formatDouble).join(", ")})`;
  }

  const segments = getCurveSegments(pathCommands);

  const times = [segments[0].startTime, ...segments.map(segment => segment.endTime)];
  const values = [segments[0].startValue, ...segments.map(segment => segment.endValue)];

  return `import 'package:flutter/animation.dart';

class ${className} extends Curve {
  const ${className}();

  static const List<double> _times = [${times.map(formatDouble).join(", ")}];
  static const List<double> _values = [${values.map(formatDouble).join(", ")}];
  static const List<Cubic> _segments = [
${segments.map(formatSegment).join("\n")}
  ];

  @override
  double transformInternal(double t) {
    for (var index = 0; index < _segments.length; index += 1) {
      if (t > _times[index + 1] && index < _segments.length - 1) continue;

      final double span = _times[index + 1] - _times[index];
      final double localTime = span == 0 ? 0.0 : (t - _times[index]) / span;
      final double fraction = _segments[index].transform(localTime.clamp(0.0, 1.0));

      return _values[index] + (_values[index + 1] - _values[index]) * fraction;
    }

    return _values.last;
  }
}`;
}
