import { findPointFromT, generateEasingFunctionFromArray } from './geometry';

/** - Find points that has smooth corner enabled on load and when choosing a new easing. */
export function findSmoothCorners(curves: number[][], toggledAnchors: Set<number>) {
  for (let i = 0; i < curves.length; i++) {
    const curve = curves[i];
    const nextCurve = curves[i + 1];

    // M
    if (i === 0) {
      if (curve[0] === nextCurve[0] && curve[1] === nextCurve[1]) toggledAnchors.add(i);
      continue;
    }

    const p1x = curve[4]; // curve ending x point
    const p1y = curve[5]; // curve ending y point
    const c1x = curve[2]; // curve second control x point
    const c1y = curve[3]; // curve second control y point

    // last curve
    if (i === curves.length - 1) {
      if (p1x === c1x && p1y === c1y) toggledAnchors.add(i);
      continue;
    }

    const c0x = nextCurve[0]; // next curve first control x point
    const c0y = nextCurve[1]; // next curve first control y point

    if (p1x === c1x && p1y === c1y && p1x === c0x && p1y === c0y) {
      toggledAnchors.add(i);
    }
  }
}

/** Get Y Axis points as an array */
export async function convertEasingFunctionToPoints(curves: number[][], samples = 1000, onUpdate?: (i: number) => void, signal?: AbortSignal) {
  let stopped = false;

  signal?.addEventListener('abort', () => {
    stopped = true;
  });

  const values = new Float32Array(samples);
  let count = 0;
  let percent = 0;

  const easingFunction = generateEasingFunctionFromArray(curves);

  for (let i = 0; i < samples; i++) {
    if (stopped) throw new Error('stopped');

    percent = (i + 1) / curves.length;
    onUpdate?.(percent);

    await new Promise(resolve => setTimeout(resolve, 10));

    const t = i / (samples - 1);
    values[count++] = easingFunction(t);
  }

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
