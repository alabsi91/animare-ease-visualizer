import { arePointsOnSameLine, findPointFromT, generateEasingFunctionFromArray } from './geometry';

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Converts the values in a two-dimensional array to percentage values (ranging from 0 to 1). */
export function convertPointsToRelativeValues(array: number[][], viewBox: ViewBox) {
  const x = viewBox.x;
  const y = viewBox.y;
  const height = viewBox.height;
  const width = viewBox.width;

  return array.map(curve => curve.map((v, i) => (i % 2 === 0 ? (v - x) / width : (v - y) / height)));
}

/**
 * - Convert to relative value ->
 * - Flip the Y points ->
 * - Store only Cubic curves with starting, control, and ending points (without the first M command).
 */
export function preparePointsForAnimation(array: number[][], viewBox: ViewBox) {
  const relativePoints = convertPointsToRelativeValues(array, viewBox);

  const results: number[][] = [];

  let x = 0;
  let y = 0;
  for (let i = 0; i < relativePoints.length; i++) {
    const curve = relativePoints[i];

    const c1x = curve[0];
    const c1y = 1 - curve[1];

    if (!i) {
      x = c1x;
      y = c1y;
      continue;
    }

    const c2x = curve[2];
    const c2y = 1 - curve[3];
    const px = curve[4];
    const py = 1 - curve[5];

    results.push([x, y, c1x, c1y, c2x, c2y, px, py]);

    x = px;
    y = py;
  }

  return results;
}

/** Converts a two dimensional array to string path ( M , ...C ). */
export function constructPathFromPoints(points: number[][]): string {
  points = points.map(e => e.map(i => +i.toFixed(3)));

  let d = '';
  for (let i = 0; i < points.length; i++) {
    const e = points[i];
    const separator = i === points.length - 1 ? '' : ' ';

    if (!i) {
      d += `M ${e[0]} ${e[1]}` + separator;
      continue;
    }

    d += `C ${e[0]} ${e[1]} ${e[2]} ${e[3]} ${e[4]} ${e[5]}` + separator;
  }

  return d;
}

/** - Converts a path string to two dimensional array `[[M], ...[C]]` */
export function getPointsFromPathString(path: string, viewBox: ViewBox) {
  const x = viewBox.x;
  const y = viewBox.y;
  const height = viewBox.height;
  const width = viewBox.width;

  // get numbers from the string and convert them from percentage values.
  const pathData = path
    .match(/-?[0-9.]+/g)
    ?.map((v, i) => (i % 2 === 0 ? parseFloat(v) * width + x : parseFloat(v) * height + y));

  const points: number[][] = [];

  if (!pathData) return points;

  points.push([pathData[0], pathData[1]]); // M points

  // C points
  for (let i = 2; i < pathData.length; i += 6) {
    points.push([pathData[i], pathData[i + 1], pathData[i + 2], pathData[i + 3], pathData[i + 4], pathData[i + 5]]);
  }

  return points;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Get Y Axis points as an array */
export async function convertEasingFunctionToPoints(
  curves: number[][],
  samples = 1000,
  onUpdate?: (i: number) => void,
  signal?: AbortSignal
) {
  let stopped = false;

  const onAbort = () => {
    stopped = true;
  };

  if (signal) signal.addEventListener('abort', onAbort, { once: true });

  const values = new Float32Array(samples);
  let count = 0;

  const easingFunction = generateEasingFunctionFromArray(curves);

  for (let i = 0; i < samples; i++) {
    if (stopped) throw new Error('stopped');

    const t = i / (samples - 1);

    onUpdate?.(t);

    await new Promise(resolve => setTimeout(resolve, 1));

    values[count++] = easingFunction(t);
  }

  if (signal) signal.removeEventListener('abort', onAbort);
  return values;
}

/** - Check if the path is overlapping to turned it `red`. */
export function checkOverlap(points: number[][]): boolean {
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

      if (typeof largest === 'undefined') {
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

export function throttle(func: Function, delay: number) {
  let lastCall = 0;
  return function wrapper(...args: any[]) {
    const now = new Date().getTime();
    if (now - lastCall < delay) return;
    lastCall = now;
    return func(...args);
  };
}

export function isPointHasSmoothCorner(points: number[][], pointIndex: number) {
  const currentCurve = points[pointIndex]; // M or C
  const nextCurve = points[pointIndex + 1];

  // case M
  if (!pointIndex) {
    if (currentCurve[0] === nextCurve[0] && currentCurve[1] === nextCurve[1]) {
      return true;
    }
    return false;
  }

  const c1x = currentCurve[2];
  const c1y = currentCurve[3];
  const p1x = currentCurve[4];
  const p1y = currentCurve[5];

  // last curve
  if (!nextCurve) {
    if (c1x === p1x && c1y === p1y) return true;
    return false;
  }

  const c0x = nextCurve[0];
  const c0y = nextCurve[1];

  if (c0x === p1x && c0y === p1y && c1x === p1x && c1y === p1y) return true;

  return false;
}

export function checkForDisabledCollinearPoints(points: number[][]) {
  const disabledPoints: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const currentCurve = points[i]; // M or C
    const nextCurve = points[i + 1];

    // case M
    if (!i) continue;

    // last curve
    if (!nextCurve) continue;

    const c0x = nextCurve[0];
    const c0y = nextCurve[1];
    const c1x = currentCurve[2];
    const c1y = currentCurve[3];
    const p1x = currentCurve[4];
    const p1y = currentCurve[5];

    // the anchor point has smooth corners enabled
    if (c0x === p1x && c0y === p1y && c1x === p1x && c1y === p1y) continue;

    if (!arePointsOnSameLine([c1x, c1y], [p1x, p1y], [c0x, c0y])) disabledPoints.push(i);
  }

  return disabledPoints;
}
