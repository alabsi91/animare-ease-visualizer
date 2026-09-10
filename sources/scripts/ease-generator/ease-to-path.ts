type EasingFunction = (time: number) => number;

interface Point {
  x: number;
  y: number;
}

export interface CubicSegment {
  start: Point;
  startHandle: Point;
  endHandle: Point;
  end: Point;
}

interface Knot {
  x: number;
  y: number;
  slope: number;
}

interface HandleReach {
  start: number;
  end: number;
}

interface Spline {
  knots: Knot[];
  reaches: HandleReach[];
}

export interface EaseToPathOptions {
  /** Largest allowed vertical distance between the path and the easing function. Default 0.01 */
  tolerance?: number;

  /** How many evenly spaced times are tried as anchor positions. Default 50 */
  candidateCount?: number;

  /** How many points per unit of time a segment is checked at while it is fitted. Default 100 */
  samplesPerUnit?: number;
}

const SLOPE_STEP = 1e-4;
const MIN_HANDLE_REACH = 0.05;
const MAX_FAILED_SPANS_IN_A_ROW = 3;
const GAUSS_NEWTON_ITERATIONS = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getCurveValue(start: number, startCtrl: number, endCtrl: number, end: number, t: number) {
  const rest = 1 - t;
  return rest ** 3 * start + 3 * rest ** 2 * t * startCtrl + 3 * rest * t ** 2 * endCtrl + t ** 3 * end;
}

/**
 * Both ends read from just inside. An easing function is often pinned to 0 and 1 there, and reading across that pin gives a slope
 * the curve never had.
 */
function getSlope(easing: EasingFunction, time: number) {
  const before = Math.max(0, time - SLOPE_STEP);
  const after = Math.min(1, time + SLOPE_STEP);

  if (before === time) return (easing(2 * SLOPE_STEP) - easing(SLOPE_STEP)) / SLOPE_STEP;
  if (after === time) return (easing(1 - SLOPE_STEP) - easing(1 - 2 * SLOPE_STEP)) / SLOPE_STEP;

  return (easing(after) - easing(before)) / (after - before);
}

function getSampleCount(width: number, samplesPerUnit: number) {
  return Math.max(16, Math.ceil(width * samplesPerUnit));
}

function createSegment(startKnot: Knot, endKnot: Knot, reach: HandleReach): CubicSegment {
  const width = endKnot.x - startKnot.x;
  const startReach = reach.start * width;
  const endReach = reach.end * width;

  return {
    start: { x: startKnot.x, y: startKnot.y },
    startHandle: { x: startKnot.x + startReach, y: startKnot.y + startReach * startKnot.slope },
    endHandle: { x: endKnot.x - endReach, y: endKnot.y - endReach * endKnot.slope },
    end: { x: endKnot.x, y: endKnot.y },
  };
}

function getSegmentError(easing: EasingFunction, segment: CubicSegment, sampleCount: number) {
  let largestError = 0;

  for (let i = 1; i < sampleCount; i++) {
    const t = i / sampleCount;
    const x = getCurveValue(segment.start.x, segment.startHandle.x, segment.endHandle.x, segment.end.x, t);
    const y = getCurveValue(segment.start.y, segment.startHandle.y, segment.endHandle.y, segment.end.y, t);
    largestError = Math.max(largestError, Math.abs(y - easing(x)));
  }

  return largestError;
}

/** Gauss-Newton on the vertical error. Both handles stay inside the segment, which keeps the time axis moving forward. */
function fitHandleReach(easing: EasingFunction, startKnot: Knot, endKnot: Knot, sampleCount: number) {
  const width = endKnot.x - startKnot.x;
  const minReach = MIN_HANDLE_REACH * width;

  let startReach = width / 3;
  let endReach = width / 3;

  for (let iteration = 0; iteration < GAUSS_NEWTON_ITERATIONS; iteration++) {
    let startStart = 1e-12;
    let startEnd = 0;
    let endEnd = 1e-12;
    let startGradient = 0;
    let endGradient = 0;

    for (let i = 1; i < sampleCount; i++) {
      const t = i / sampleCount;
      const rest = 1 - t;
      const startWeight = 3 * rest ** 2 * t;
      const endWeight = 3 * rest * t ** 2;

      const x = getCurveValue(startKnot.x, startKnot.x + startReach, endKnot.x - endReach, endKnot.x, t);
      const y = getCurveValue(
        startKnot.y,
        startKnot.y + startReach * startKnot.slope,
        endKnot.y - endReach * endKnot.slope,
        endKnot.y,
        t
      );

      const residual = y - easing(x);
      const easingSlope = getSlope(easing, x);

      // moving a handle shifts the curve point along the handle's slope and, through x, along the easing's slope
      const startDerivative = startWeight * (startKnot.slope - easingSlope);
      const endDerivative = endWeight * (easingSlope - endKnot.slope);

      startStart += startDerivative * startDerivative;
      startEnd += startDerivative * endDerivative;
      endEnd += endDerivative * endDerivative;
      startGradient += startDerivative * residual;
      endGradient += endDerivative * residual;
    }

    const determinant = startStart * endEnd - startEnd * startEnd;
    let startStep = 0;
    let endStep = 0;

    if (determinant > 0) {
      startStep = (endGradient * startEnd - startGradient * endEnd) / determinant;
      endStep = (startGradient * startEnd - endGradient * startStart) / determinant;
    }

    // a handle sitting on its bound and pushing outward is held there, the other one gets the whole step
    const isStartStuck = (startReach <= minReach && startStep < 0) || (startReach >= width && startStep > 0);
    const isEndStuck = (endReach <= minReach && endStep < 0) || (endReach >= width && endStep > 0);

    if (isStartStuck) {
      startStep = 0;
      endStep = -endGradient / endEnd;
    }

    if (isEndStuck) {
      endStep = 0;
      startStep = isStartStuck ? 0 : -startGradient / startStart;
    }

    startReach = clamp(startReach + startStep, minReach, width);
    endReach = clamp(endReach + endStep, minReach, width);

    if (Math.abs(startStep) + Math.abs(endStep) < 1e-9 * width) break;
  }

  const reach = { start: startReach / width, end: endReach / width };
  const maxError = getSegmentError(easing, createSegment(startKnot, endKnot, reach), sampleCount);

  return { reach, maxError };
}

/** The times an anchor may land on: an even grid, plus every time the easing function turns around */
function getCandidateTimes(easing: EasingFunction, candidateCount: number) {
  const times = new Set<number>();

  for (let i = 0; i <= candidateCount; i++) {
    times.add(i / candidateCount);
  }

  const scanCount = 400;
  let previousSlope = getSlope(easing, 0);

  for (let i = 1; i < scanCount; i++) {
    const time = i / scanCount;
    const slope = getSlope(easing, time);

    if (previousSlope > 0 !== slope > 0) {
      times.add(Number(time.toFixed(4)));
    }

    previousSlope = slope;
  }

  return [...times].sort((a, b) => a - b);
}

/**
 * Picks the anchor times that need the fewest segments, by dynamic programming over the candidate times.
 *
 * Two neighbouring candidates may always form a segment. That keeps the search solvable when the function has a cliff no fit can
 * absorb.
 */
function selectKnots(easing: EasingFunction, tolerance: number, candidateCount: number, samplesPerUnit: number): Spline {
  const knots: Knot[] = getCandidateTimes(easing, candidateCount).map(x => ({ x, y: easing(x), slope: getSlope(easing, x) }));

  type Best = { segmentCount: number; errorSum: number; previous: number; reach: HandleReach };
  const bestByKnot: Best[] = [{ segmentCount: 0, errorSum: 0, previous: -1, reach: { start: 0, end: 0 } }];

  for (let end = 1; end < knots.length; end++) {
    let best: Best | null = null;
    let failuresInARow = 0;

    for (let start = end - 1; start >= 0; start--) {
      const sampleCount = getSampleCount(knots[end].x - knots[start].x, samplesPerUnit);
      const fit = fitHandleReach(easing, knots[start], knots[end], sampleCount);

      const isAllowed = fit.maxError <= tolerance || start === end - 1;
      if (!isAllowed) {
        failuresInARow++;
        if (failuresInARow >= MAX_FAILED_SPANS_IN_A_ROW) break;
        continue;
      }
      failuresInARow = 0;

      const candidate: Best = {
        segmentCount: bestByKnot[start].segmentCount + 1,
        errorSum: bestByKnot[start].errorSum + fit.maxError,
        previous: start,
        reach: fit.reach,
      };

      const isBetter =
        best === null ||
        candidate.segmentCount < best.segmentCount ||
        (candidate.segmentCount === best.segmentCount && candidate.errorSum < best.errorSum);

      if (isBetter) {
        best = candidate;
      }
    }

    bestByKnot[end] = best!;
  }

  const selectedKnots: Knot[] = [];
  const selectedReaches: HandleReach[] = [];

  for (let index = knots.length - 1; index >= 0; index = bestByKnot[index].previous) {
    selectedKnots.unshift(knots[index]);

    if (bestByKnot[index].previous >= 0) {
      selectedReaches.unshift(bestByKnot[index].reach);
    }
  }

  return { knots: selectedKnots, reaches: selectedReaches };
}

function getSplineError(easing: EasingFunction, spline: Spline, samplesPerSegment: number) {
  let largestError = 0;

  for (let j = 0; j < spline.reaches.length; j++) {
    const segment = createSegment(spline.knots[j], spline.knots[j + 1], spline.reaches[j]);
    largestError = Math.max(largestError, getSegmentError(easing, segment, samplesPerSegment));
  }

  return largestError;
}

/** Fits the easing function with as few cubic segments as the tolerance allows */
export function fitEasing(easing: EasingFunction, options: EaseToPathOptions = {}) {
  const { tolerance = 0.005, candidateCount = 50, samplesPerUnit = 100 } = options;

  const spline = selectKnots(easing, tolerance, candidateCount, samplesPerUnit);

  const segments = spline.reaches.map((reach, j) => createSegment(spline.knots[j], spline.knots[j + 1], reach));
  const maxError = getSplineError(easing, spline, 512);

  return { segments, maxError };
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(4));
}

/**
 * Draws an easing function as an SVG path the editor can load.
 *
 * The y axis is flipped, because the editor draws a finished animation at the top.
 */
export function easeToPathStr(easing: EasingFunction, options?: EaseToPathOptions) {
  const { segments } = fitEasing(easing, options);

  let pathStr = `M 0 ${roundCoordinate(1 - segments[0].start.y)}`;

  for (const segment of segments) {
    const numbers = [
      segment.startHandle.x,
      1 - segment.startHandle.y,
      segment.endHandle.x,
      1 - segment.endHandle.y,
      segment.end.x,
      1 - segment.end.y,
    ].map(roundCoordinate);

    pathStr += ` C ${numbers.join(" ")}`;
  }

  return pathStr;
}
