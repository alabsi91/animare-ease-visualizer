/** Computes the point (x, y) on the curve for a given time `t` [0 to 1] */
function findPointFromT(
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
  const point = { x: 0, y: 0 };
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  point.x = p0x * mt3 + c0x * 3 * mt2 * t + c1x * 3 * mt * t * t + p1x * t ** 3;
  point.y = p0y * mt3 + c0y * 3 * mt2 * t + c1y * 3 * mt * t * t + p1y * t ** 3;

  return point;
}

/** `true` when the curve moves backward in time, which is not a valid easing */
export function checkPathOverlap(points: number[][]): boolean {
  const samples = 1000;
  let largest: number | undefined = undefined;

  let x0 = 0;
  let y0 = 0;
  for (let e = 0; e < points.length; e++) {
    if (!e) {
      x0 = points[e][0];
      y0 = points[e][1];
      continue;
    }

    const [x1, y1, x2, y2, x3, y3] = points[e];

    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const { x } = findPointFromT(x0, 1 - y0, x1, 1 - y1, x2, 1 - y2, x3, 1 - y3, t);

      if (typeof largest === "undefined") {
        largest = x;
        continue;
      }

      if (x > largest) largest = x;
      if (x < largest) return true;
    }

    x0 = x3;
    y0 = y3;
  }

  return false;
}
