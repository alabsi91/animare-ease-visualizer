export type EasingFunction = (time: number) => number;

export interface EasingStop {
  position: number;
  value: number;
}

// A position is written with one decimal. A stop can only land on a 0.1% step.
const SAMPLES_PER_PERCENT = 10;
const LAST_SAMPLE_INDEX = 100 * SAMPLES_PER_PERCENT;
const TOLERANCE_SEARCH_ROUNDS = 30;

function sampleEasing(easingFunction: EasingFunction) {
  const sampledValues: number[] = [];

  for (let sampleIndex = 0; sampleIndex <= LAST_SAMPLE_INDEX; sampleIndex++) {
    sampledValues.push(easingFunction(sampleIndex / LAST_SAMPLE_INDEX));
  }

  return sampledValues;
}

function getFewestStopSampleIndexes(sampledValues: number[], tolerance: number) {
  const stopSampleIndexes = [0];
  let startIndex = 0;

  while (startIndex < LAST_SAMPLE_INDEX) {
    let lowestAllowedSlope = -Infinity;
    let highestAllowedSlope = Infinity;
    let farthestIndex = startIndex + 1;

    for (let endIndex = startIndex + 1; endIndex <= LAST_SAMPLE_INDEX; endIndex++) {
      const width = endIndex - startIndex;
      const rise = sampledValues[endIndex] - sampledValues[startIndex];
      const chordSlope = rise / width;

      const isChordAllowed = chordSlope >= lowestAllowedSlope && chordSlope <= highestAllowedSlope;
      if (isChordAllowed) {
        farthestIndex = endIndex;
      }

      lowestAllowedSlope = Math.max(lowestAllowedSlope, (rise - tolerance) / width);
      highestAllowedSlope = Math.min(highestAllowedSlope, (rise + tolerance) / width);
      if (lowestAllowedSlope > highestAllowedSlope) break;
    }

    startIndex = farthestIndex;
    stopSampleIndexes.push(startIndex);
  }

  return stopSampleIndexes;
}

function getStopSampleIndexesWithinBudget(sampledValues: number[], maxStops: number) {
  let tooTightTolerance = 0;
  let affordableTolerance = Math.max(...sampledValues) - Math.min(...sampledValues);
  let stopSampleIndexes = getFewestStopSampleIndexes(sampledValues, affordableTolerance);

  for (let round = 0; round < TOLERANCE_SEARCH_ROUNDS; round++) {
    const tolerance = (tooTightTolerance + affordableTolerance) / 2;
    const candidateStopSampleIndexes = getFewestStopSampleIndexes(sampledValues, tolerance);

    if (candidateStopSampleIndexes.length <= maxStops) {
      affordableTolerance = tolerance;
      stopSampleIndexes = candidateStopSampleIndexes;
    } else {
      tooTightTolerance = tolerance;
    }
  }

  return stopSampleIndexes;
}

/** The fewest stops that still follow the curve, up to the budget. The samples come along for the plot */
export function pickStopsWithinBudget(easingFunction: EasingFunction, maxStops: number) {
  const sampledValues = sampleEasing(easingFunction);
  const stopSampleIndexes = getStopSampleIndexesWithinBudget(sampledValues, maxStops);

  const stops: EasingStop[] = stopSampleIndexes.map(sampleIndex => ({
    position: sampleIndex / SAMPLES_PER_PERCENT,
    value: sampledValues[sampleIndex],
  }));

  return { sampledValues, stops };
}
