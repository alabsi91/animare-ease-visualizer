import type { C_CMD, X, Y } from "./types";

function lerp(x0: number, y0: number, x1: number, y1: number, t: number) {
  const x = x0 + (x1 - x0) * t;
  const y = y0 + (y1 - y0) * t;
  return { x, y };
}

/**
 * Mirrors the **angle** of a `source` point to a `target` point around an `anchor` point.
 *
 * @param current - The source point whose angle will be mirrored.
 * @param opposite - The target point whose angle will change to match the source.
 * @param anchor - The point around which the mirroring occurs.
 * @returns - The new coordinates of the mirrored target point.
 */
export function mirrorPoint(current: [X, Y], opposite: [X, Y], anchor: [X, Y]): [X, Y] {
  const vectorX = current[0] - anchor[0];
  const vectorY = current[1] - anchor[1];

  const angle = Math.atan2(vectorY, vectorX);

  const distance = Math.sqrt((opposite[0] - anchor[0]) ** 2 + (opposite[1] - anchor[1]) ** 2);

  const mirrorX = anchor[0] + distance * Math.cos(angle + Math.PI);
  const mirrorY = anchor[1] + distance * Math.sin(angle + Math.PI);

  return [mirrorX, mirrorY];
}

/** Calculates the slope between two points */
function slope([x0, y0]: [X, Y], [x1, y1]: [X, Y]) {
  return (y1 - y0) / (x1 - x0);
}

/** Check if three points are collinear (on the same line). */
export function arePointsCollinear(p1: [number, number], p2: [number, number], p3: [number, number], tolerance = 0.02) {
  const isOnVerticalLine = p1[0] === p2[0] && p2[0] === p3[0];
  if (isOnVerticalLine) return true;

  const isOnHorizontalLine = p1[1] === p2[1] && p2[1] === p3[1];
  if (isOnHorizontalLine) return true;

  const slope1_2 = slope(p1, p2);
  const slope2_3 = slope(p2, p3);
  const slope3_1 = slope(p3, p1);

  const diff1 = Math.abs(slope1_2 - slope2_3);
  const diff2 = Math.abs(slope2_3 - slope3_1);

  return diff1 <= tolerance && diff2 <= tolerance;
}

/** Computes the point (x, y) on the curve for a given time `t` [0 to 1] */
function findPointFromT(p0: [X, Y], c0: [X, Y], c1: [X, Y], p1: [X, Y], t: number): [X, Y] {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  const res: number[] = [];
  res[0] = p0[0] * mt3 + c0[0] * 3 * mt2 * t + c1[0] * 3 * mt * t * t + p1[0] * t ** 3;
  res[1] = p0[1] * mt3 + c0[1] * 3 * mt2 * t + c1[1] * 3 * mt * t * t + p1[1] * t ** 3;

  return res as [X, Y];
}

/** Computes time `t` [0 to 1] for a point X on the curve, returns `null` if not found */
export function solveTFromPositionX(p0: [X, Y], c0: [X, Y], c1: [X, Y], p1: [X, Y], targetX: number) {
  // Desired precision on the computation.
  const epsilon = 1e-6;

  // A binary search algorithm is used to determine the Y-coordinate value
  // corresponding to a specified position on the X-coordinate.
  let start = 0;
  let end = 1;
  let target = (start + end) / 2;
  let iterations = 0;

  while (target >= start && target <= 1) {
    const [x] = findPointFromT(p0, c0, c1, p1, target);

    // a safe loop break
    if (++iterations > 50) return null;

    // Return the located Y-coordinate value.
    if (Math.abs(x - targetX) <= epsilon) return target;

    if (x >= targetX) end = target;
    else start = target;

    target = (start + end) / 2;
  }

  return null;
}

/** Use De Casteljau's algorithm to split the curve at parameter `t` */
export function splitCurveAtT(p0: [X, Y], c0: [X, Y], c1: [X, Y], p1: [X, Y], t: number) {
  const q0 = lerp(p0[0], p0[1], c0[0], c0[1], t);
  const q1 = lerp(c0[0], c0[1], c1[0], c1[1], t);
  const q2 = lerp(c1[0], c1[1], p1[0], p1[1], t);

  const r0 = lerp(q0.x, q0.y, q1.x, q1.y, t);
  const r1 = lerp(q1.x, q1.y, q2.x, q2.y, t);

  const s0 = lerp(r0.x, r0.y, r1.x, r1.y, t);

  // The result is two sets of control points for the split curves
  const left = [q0.x, q0.y, r0.x, r0.y, s0.x, s0.y] as C_CMD;
  const right = [r1.x, r1.y, q2.x, q2.y, p1[0], p1[1]] as C_CMD;

  return { left, right };
}
