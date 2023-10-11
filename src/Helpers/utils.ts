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
