/** - Converts a path string to two dimensional array `[[M], [C], ...[S]]` */
export function convertPathToPoints(path: string, size: number, zoom: number) {
  // get numbers from the string and convert them to percentage values 0 -> 1 .
  const pathData = path.match(/-?[0-9.]+/g)?.map((v, i) => (i % 2 ? 1 - +v : +v) * size + zoom);
  const points: number[][] = [];

  if (!pathData) return points;

  points.push([pathData[0], pathData[1]]); // M points
  points.push([pathData[2], pathData[3], pathData[4], pathData[5], pathData[6], pathData[7]]); // C points

  for (let i = 8; i < pathData.length; i += 4) {
    // S points
    points.push([pathData[i], pathData[i + 1], pathData[i + 2], pathData[i + 3]]);
  }

  return points;
}

/** - Find points that has smooth conrner enabled on load and when choosing a new easing. */
export function findSmoothCorners(points: number[][], toggledAnchors: Set<number>) {
  for (let i = 0; i < points.length; i++) {
    const e = points[i];

    if (i === 0) continue;

    if (i === 1) {
      if (e[0] === points[0][0] && e[1] === points[0][1]) toggledAnchors.add(0);
      if (e[2] === e[4] && e[3] === e[5]) toggledAnchors.add(1);
      continue;
    }

    if (e[0] === e[2] && e[1] === e[3]) toggledAnchors.add(i);
  }
}

type Point = { x: number; y: number };
type S_Point = { c1: Point; p1: Point };
type C_Point = { p0: Point; c0: Point; c1: Point; p1: Point };

/** - Parse svg path to cubic curve points */
export function parsePath(path: string): C_Point[] {
  const reg_s = /S[\s|,]?(?<c1x>-?\d\.?\d*)[\s|,](?<c1y>-?\d\.?\d*)[\s|,](?<p1x>-?\d\.?\d*)[\s|,](?<p1y>-?\d\.?\d*)/g;
  const reg_c =
    /M[\s|,]?((?<p0x>-?\d\.?\d*)[\s|,](?<p0y>-?\d\.?\d*))[\s|,]C[\s|,|-]?(?<c0x>-?\d\.?\d*)[\s|,](?<c0y>-?\d\.?\d*)[\s|,](?<c1x>-?\d\.?\d*)[\s|,](?<c1y>-?\d\.?\d*)[\s|,](?<p1x>-?\d\.?\d*)[\s|,](?<p1y>-?\d\.?\d*)/;

  // check if the path string is valid
  if (!reg_c.test(path) || (path.includes('S') && !reg_s.test(path))) throw new Error('path is not valid');

  reg_s.lastIndex = 0;
  reg_c.lastIndex = 0;

  const s_curves = [...path.matchAll(reg_s)].map(e =>
    e.groups ? { c1: { x: +e.groups.c1x, y: +e.groups.c1y }, p1: { x: +e.groups.p1x, y: +e.groups.p1y } } : e
  ) as S_Point[];

  // get first point c curve.
  const c_curve_match = reg_c.exec(path)?.groups;
  if (!c_curve_match) throw new Error('path is not valid');
  const c_curve: C_Point = {
    p0: { x: +c_curve_match.p0x, y: +c_curve_match.p0y },
    c0: { x: +c_curve_match.c0x, y: +c_curve_match.c0y },
    c1: { x: +c_curve_match.c1x, y: +c_curve_match.c1y },
    p1: { x: +c_curve_match.p1x, y: +c_curve_match.p1y },
  };

  const results: [C_Point, ...S_Point[]] = [c_curve, ...s_curves];

  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1];
    results[i] = {
      p0: prev.p1,
      c0: { x: (prev.p1.x - prev.c1.x) * 2 + prev.c1.x, y: (prev.p1.y - prev.c1.y) * 2 + prev.c1.y },
      c1: results[i].c1,
      p1: results[i].p1,
    };
  }

  return results as C_Point[];
}

/** Takes a curve points, and a time value, and returns a point on the curve at that time */
export function Bezier(p0: Point, c0: Point, c1: Point, p1: Point, t: number): Point {
  const point = { x: 0, y: 0 },
    mt = 1 - t,
    mt2 = mt * mt,
    mt3 = mt2 * mt;

  point.x = p0.x * mt3 + c0.x * 3 * mt2 * t + c1.x * 3 * mt * t * t + p1.x * t ** 3;
  point.y = p0.y * mt3 + c0.y * 3 * mt2 * t + c1.y * 3 * mt * t * t + p1.y * t ** 3;

  return point;
}

/** Get Y axix points as an array */
export async function getYpoints(d: string, samples = 1000, onUpdate?: (i: number) => void, signal?: AbortSignal) {
  let stopped = false;

  signal?.addEventListener('abort', () => {
    stopped = true;
  });

  const points = parsePath(d);
  const values = new Float32Array(samples);
  let count = 0;
  let percent = 0;

  for (let e = 0; e < points.length; e++) {
    if (stopped) throw new Error('stopped');

    const { p0, c0, c1, p1 } = points[e];

    percent = (e + 1) / points.length;
    onUpdate?.(percent);

    await new Promise(resolve => setTimeout(resolve, 10)); // for fast calculations.

    for (let i = 0; i < samples; i++) {
      if (stopped) throw new Error('stopped');

      const point = i / samples;
      const dist = (p1.x - 0) * samples;

      let start = 0,
        end = 1,
        target = (start + end) / 2,
        times = 0,
        result: number | null = 0;

      while (target >= start && target <= 1) {
        if (stopped) throw new Error('stopped');

        const pos = Bezier(p0, c0, c1, p1, target);

        times++;

        if (times > 50) {
          result = null;
          break;
        }

        if (Math.abs(pos.x - point) <= 0.001) {
          result = pos.y;
          break;
        }

        if (pos.x >= point) end = target;
        else start = target;

        target = (start + end) / 2;
      }

      if (result !== null && count <= dist) {
        values[count] = result;
        count++;
      }
    }
  }

  values[0] = points[0].p0.y;
  values[samples - 1] = points[points.length - 1].p1.y;

  return values;
}

/** - Check if the path is overlapping to turrned it `red`. */
export function checkOverlap(path: string): boolean {
  const samples = 100;
  const points = parsePath(path);
  let largest = 0;

  for (let e = 0; e < points.length; e++) {
    const { p0, c0, c1, p1 } = points[e];

    for (let i = 0; i < samples; i++) {
      const point = i / samples;
      const { x } = Bezier(p0, c0, c1, p1, point);
      if (x > largest) largest = x;
      if (x < largest) return true;
    }
  }

  return false;
}

/** - Converts a two dimensional array to a path string. */
export function constructPath(p: number[][]): string {
  let d = '';
  p = p.map(e => e.map(i => +i.toFixed(3)));
  p.forEach((e, i) => {
    const seperator = i === p.length - 1 ? '' : ' ';
    if (i === 0) {
      d += `M ${e[0]} ${e[1]}` + seperator;
    } else if (i === 1) {
      d += `C ${e[0]} ${e[1]} ${e[2]} ${e[3]} ${e[4]} ${e[5]}` + seperator;
    } else {
      d += `S ${e[0]} ${e[1]} ${e[2]} ${e[3]}` + seperator;
    }
  });
  return d;
}
