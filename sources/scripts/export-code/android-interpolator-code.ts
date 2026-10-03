import { getIsSingleCurve, getSingleCurveControlPoints, getUprightPathStr } from "./easing-path";

import type { PathCommands } from "@graph-editor/helpers/types";

export function createAndroidInterpolatorCode(pathCommands: PathCommands) {
  const declaration = `<?xml version="1.0" encoding="utf-8"?>\n`;

  if (getIsSingleCurve(pathCommands)) {
    const [x1, y1, x2, y2] = getSingleCurveControlPoints(pathCommands).map(value => +value.toFixed(4));

    return `${declaration}
<pathInterpolator xmlns:android="http://schemas.android.com/apk/res/android" android:controlX1="${x1}" android:controlY1="${y1}" android:controlX2="${x2}" android:controlY2="${y2}" />`;
  }

  const pathStr = getUprightPathStr(pathCommands);

  return `${declaration}
<pathInterpolator xmlns:android="http://schemas.android.com/apk/res/android" android:pathData="${pathStr}" />`;
}
