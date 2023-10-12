import { getPointsFromPathString, preparePointsForAnimation } from './utils';

type Point = {
  x: number;
  y: number;
};

function lerp(p0x: number, p0y: number, p1x: number, p1y: number, t: number): Point {
  const x = p0x + (p1x - p0x) * t;
  const y = p0y + (p1y - p0y) * t;
  return { x, y };
}

function slope([x0, y0]: number[], [x1, y1]: number[]) {
  return (y1 - y0) / (x1 - x0);
}

/** Use De Casteljau's algorithm to split the curve at parameter `t` */
export function splitCurveAtT(
  p0x: number,
  p0y: number,
  c0x: number,
  c0y: number,
  c1x: number,
  c1y: number,
  p1x: number,
  p1y: number,
  t: number
) {
  const q0 = lerp(p0x, p0y, c0x, c0y, t);
  const q1 = lerp(c0x, c0y, c1x, c1y, t);
  const q2 = lerp(c1x, c1y, p1x, p1y, t);

  const r0 = lerp(q0.x, q0.y, q1.x, q1.y, t);
  const r1 = lerp(q1.x, q1.y, q2.x, q2.y, t);

  const s0 = lerp(r0.x, r0.y, r1.x, r1.y, t);

  // The result is two sets of control points for the split curves
  const left = [p0x, p0y, q0.x, q0.y, r0.x, r0.y, s0.x, s0.y];
  const right = [s0.x, s0.y, r1.x, r1.y, q2.x, q2.y, p1x, p1y];

  return { left, right };
}

/** Computes time `t` [0 to 1] for a point X on the curve */
export function solveTFromPositionX(
  p0x: number,
  p0y: number,
  c0x: number,
  c0y: number,
  c1x: number,
  c1y: number,
  p1x: number,
  p1y: number,
  targetX: number
) {
  // Desired precision on the computation.
  const epsilon = 1e-6;

  // A binary search algorithm is used to determine the Y-coordinate value
  // corresponding to a specified position on the X-coordinate.
  let start = 0,
    end = 1,
    target = (start + end) / 2,
    times = 0;

  while (target >= start && target <= 1) {
    const { x, y } = findPointFromT(p0x, p0y, c0x, c0y, c1x, c1y, p1x, p1y, target);

    // If the point cannot be found within 50 attempts, a safe loop break will be triggered.
    if (++times > 50) return y;

    // Return the located Y-coordinate value.
    if (Math.abs(x - targetX) <= epsilon) return target;

    if (x >= targetX) end = target;
    else start = target;

    target = (start + end) / 2;
  }

  return 0;
}

/** Computes the Y-coordinate of a point on the curve given its X-coordinate.*/
export function solvePositionYFromT(
  p0x: number,
  p0y: number,
  c0x: number,
  c0y: number,
  c1x: number,
  c1y: number,
  p1x: number,
  p1y: number,
  pointX: number
): number {
  // Desired precision on the computation.
  const epsilon = 1e-6;

  // A binary search algorithm is used to determine the Y-coordinate value
  // corresponding to a specified position on the X-coordinate.
  let start = 0,
    end = 1,
    target = (start + end) / 2,
    times = 0;

  while (target >= start && target <= 1) {
    const { x, y } = findPointFromT(p0x, p0y, c0x, c0y, c1x, c1y, p1x, p1y, target);

    // If the point cannot be found within 50 attempts, a safe loop break will be triggered.
    if (++times > 50) return y;

    // Return the located Y-coordinate value.
    if (Math.abs(x - pointX) <= epsilon) return y;

    if (x >= pointX) end = target;
    else start = target;

    target = (start + end) / 2;
  }

  return 0;
}

/** Computes the point (x, y) on the curve for a given time `t` [0 to 1] */
export function findPointFromT(
  p0x: number,
  p0y: number,
  c0x: number,
  c0y: number,
  c1x: number,
  c1y: number,
  p1x: number,
  p1y: number,
  t: number
) {
  const point = { x: 0, y: 0 },
    mt = 1 - t,
    mt2 = mt * mt,
    mt3 = mt2 * mt;

  point.x = p0x * mt3 + c0x * 3 * mt2 * t + c1x * 3 * mt * t * t + p1x * t ** 3;
  point.y = p0y * mt3 + c0y * 3 * mt2 * t + c1y * 3 * mt * t * t + p1y * t ** 3;

  return point;
}

export function generateEasingFunctionFromString(path: string) {
  const viewBox = { x: 0, y: 0, width: 1, height: 1 };
  const points = getPointsFromPathString(path, viewBox);
  const curves = preparePointsForAnimation(points, viewBox);

  return (t: number) => {
    // Special case start and end.
    if (t === 0) return curves[0][1]; // The Y-coordinate of the first point of the first curve
    if (t === 1) return curves[curves.length - 1][7]; // The Y-coordinate of the end point of the last curve

    let from = 0;
    for (let i = 0; i < curves.length; i++) {
      const [x0, y0, x1, y1, x2, y2, x3, y3] = curves[i];
      if (t >= from && t <= x3) {
        from = x3;
        return solvePositionYFromT(x0, y0, x1, y1, x2, y2, x3, y3, t);
      }
    }

    return 0;
  };
}

export function generateEasingFunctionFromArray(curves: number[][]) {
  return (t: number) => {
    // Special case start and end.
    if (t === 0) return curves[0][1]; // The Y-coordinate of the first point of the first curve
    if (t === 1) return curves[curves.length - 1][7]; // The Y-coordinate of the end point of the last curve

    let from = 0;
    for (let i = 0; i < curves.length; i++) {
      const [x0, y0, x1, y1, x2, y2, x3, y3] = curves[i];
      if (t >= from && t <= x3) {
        from = x3;
        return solvePositionYFromT(x0, y0, x1, y1, x2, y2, x3, y3, t);
      }
    }

    return 0;
  };
}

/** Check if three points are collinear. */
export function arePointsOnSameLine(
  point1: [number, number],
  point2: [number, number],
  point3: [number, number],
  tolerance = 0.02
) {
  const slope1_2 = slope(point1, point2);
  const slope2_3 = slope(point2, point3);
  const slope3_1 = slope(point3, point1);

  // Check if the absolute difference between slopes is within the tolerance
  const diff1 = Math.abs(slope1_2 - slope2_3);
  const diff2 = Math.abs(slope2_3 - slope3_1);

  return diff1 <= tolerance && diff2 <= tolerance && diff1 <= tolerance;
}

/** Calculate the opposite control point position for a moving control point, relative to a given center point. */
export function calculateMirrorPoint(
  movingPointX: number,
  movingPointY: number,
  oppositePointX: number,
  oppositePointY: number,
  centerX: number,
  centerY: number
): Point {
  // Calculate the vector from the midpoint to the moving point
  const vectorX = movingPointX - centerX;
  const vectorY = movingPointY - centerY;

  // Calculate the angle of this vector
  const angle = Math.atan2(vectorY, vectorX);

  // Calculate the distance from the midpoint to the original point
  const distance = Math.sqrt((oppositePointX - centerX) ** 2 + (oppositePointY - centerY) ** 2);

  // Calculate the new coordinates for the mirror point
  const mirrorX = centerX + distance * Math.cos(angle + Math.PI);
  const mirrorY = centerY + distance * Math.sin(angle + Math.PI);

  return { x: mirrorX, y: mirrorY };
}

/** Convert L command to C */
export function lineToCubicBezier(x0: number, y0: number, x1: number, y1: number) {
  const mx = (x0 + x1) / 2; // Midpoint X
  const my = (y0 + y1) / 2; // Midpoint Y
  return [x0, y0, mx, my, mx, my, x1, y1];
}

/** Convert S command to C */
export function SeveralBezierToCubicBezier(
  x0: number,
  y0: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  prevCX?: number,
  prevCY?: number
) {
  let cx1, cy1;

  // If the previous command was C or S, calculate reflection control points
  if (typeof prevCX === 'number' && typeof prevCY === 'number') {
    cx1 = (x0 - prevCX) * 2 + prevCX;
    cy1 = (y0 - prevCY) * 2 + prevCY;
  } else {
    // If the previous command was not C or S, use the initial point
    cx1 = x0;
    cy1 = y0;
  }

  return [x0, y0, cx1, cy1, x2, y2, x3, y3];
}

/** Convert Q command to C */
export function quadraticCurveToCubic(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) {
  // Calculate the cubic Bezier control points
  const cx1 = x0 + (2 / 3) * (x1 - x0);
  const cy1 = y0 + (2 / 3) * (y1 - y0);
  const cx2 = x2 + (2 / 3) * (x1 - x2);
  const cy2 = y2 + (2 / 3) * (y1 - y2);

  return [x0, y0, cx1, cy1, cx2, cy2, x2, y2];
}

/** Convert T command to C */
export function tShortcutToCubic(x0: number, y0: number, x1: number, y1: number, prevCX?: number, prevCY?: number) {
  let qx1, qy1;

  // If the previous command was Q or T, calculate the reflection control point
  if (typeof prevCX === 'number' && typeof prevCY === 'number') {
    qx1 = (x0 - prevCX) * 2 + prevCX;
    qy1 = (y0 - prevCY) * 2 + prevCY;
  } else {
    // If the previous command was not Q or T, use the initial point
    qx1 = x0;
    qy1 = y0;
  }

  // Use the calculated control point in the cubic Bezier conversion
  return quadraticCurveToCubic(x0, y0, qx1, qy1, x1, y1);
}

/** Convert A command to C */
export function arcToCubicCurves(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r1: number,
  r2: number,
  angle: number,
  largeArcFlag: number,
  sweepFlag: number,
  _recursive?: number[]
): number[][] {
  const degToRad = (degrees: number) => (Math.PI * degrees) / 180;

  const rotate = (x: number, y: number, angleRad: number) => {
    const X = x * Math.cos(angleRad) - y * Math.sin(angleRad);
    const Y = x * Math.sin(angleRad) + y * Math.cos(angleRad);
    return { x: X, y: Y };
  };

  const angleRad = degToRad(angle);
  let params: number[][] = [];
  let f1, f2, cx, cy;

  if (_recursive) {
    f1 = _recursive[0];
    f2 = _recursive[1];
    cx = _recursive[2];
    cy = _recursive[3];
  } else {
    const p1 = rotate(x1, y1, -angleRad);
    x1 = p1.x;
    y1 = p1.y;

    const p2 = rotate(x2, y2, -angleRad);
    x2 = p2.x;
    y2 = p2.y;

    const x = (x1 - x2) / 2;
    const y = (y1 - y2) / 2;
    let h = (x * x) / (r1 * r1) + (y * y) / (r2 * r2);

    if (h > 1) {
      h = Math.sqrt(h);
      r1 = h * r1;
      r2 = h * r2;
    }

    const sign = largeArcFlag === sweepFlag ? -1 : 1;

    const r1Pow = r1 * r1;
    const r2Pow = r2 * r2;

    const left = r1Pow * r2Pow - r1Pow * y * y - r2Pow * x * x;
    const right = r1Pow * y * y + r2Pow * x * x;

    const k = sign * Math.sqrt(Math.abs(left / right));

    cx = (k * r1 * y) / r2 + (x1 + x2) / 2;
    cy = (k * -r2 * x) / r1 + (y1 + y2) / 2;

    f1 = Math.asin(parseFloat(((y1 - cy) / r2).toFixed(9)));
    f2 = Math.asin(parseFloat(((y2 - cy) / r2).toFixed(9)));

    if (x1 < cx) f1 = Math.PI - f1;
    if (x2 < cx) f2 = Math.PI - f2;
    if (f1 < 0) f1 = Math.PI * 2 + f1;
    if (f2 < 0) f2 = Math.PI * 2 + f2;
    if (sweepFlag && f1 > f2) f1 = f1 - Math.PI * 2;
    if (!sweepFlag && f2 > f1) f2 = f2 - Math.PI * 2;
  }

  let df = f2 - f1;

  if (Math.abs(df) > (Math.PI * 120) / 180) {
    const f2old = f2;
    const x2old = x2;
    const y2old = y2;

    if (sweepFlag && f2 > f1) {
      f2 = f1 + ((Math.PI * 120) / 180) * 1;
    } else {
      f2 = f1 + ((Math.PI * 120) / 180) * -1;
    }

    x2 = cx + r1 * Math.cos(f2);
    y2 = cy + r2 * Math.sin(f2);
    params = arcToCubicCurves(x2, y2, x2old, y2old, r1, r2, angle, 0, sweepFlag, [f2, f2old, cx, cy]);
  }

  df = f2 - f1;

  const c1 = Math.cos(f1),
    s1 = Math.sin(f1),
    c2 = Math.cos(f2),
    s2 = Math.sin(f2),
    t = Math.tan(df / 4),
    hx = (4 / 3) * r1 * t,
    hy = (4 / 3) * r2 * t;

  const m1 = [x1, y1],
    m2 = [x1 + hx * s1, y1 - hy * c1],
    m3 = [x2 + hx * s2, y2 - hy * c2],
    m4 = [x2, y2];

  m2[0] = 2 * m1[0] - m2[0];
  m2[1] = 2 * m1[1] - m2[1];

  if (_recursive) return [m2, m3, m4].concat(params);

  params = [m2, m3, m4].concat(params);

  const curves = [];
  for (let i = 0; i < params.length; i += 3) {
    const r1 = rotate(params[i][0], params[i][1], angleRad);
    const r2 = rotate(params[i + 1][0], params[i + 1][1], angleRad);
    const r3 = rotate(params[i + 2][0], params[i + 2][1], angleRad);
    curves.push([x1, y1, r1.x, r1.y, r2.x, r2.y, r3.x, r3.y]);
  }

  return curves;
}
