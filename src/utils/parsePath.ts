import {
  SeveralBezierToCubicBezier,
  arcToCubicCurves,
  lineToCubicBezier,
  quadraticCurveToCubic,
  tShortcutToCubic,
} from './geometry';
import { convertPointsToRelativeValues } from './utils';

type CommandsUpperCase = 'M' | 'L' | 'H' | 'V' | 'C' | 'S' | 'Q' | 'T' | 'A' | 'Z';
type Commands = Lowercase<CommandsUpperCase> | CommandsUpperCase;

type FixedArray<N extends number, A extends any[] = []> = A['length'] extends N ? A : FixedArray<N, [number, ...A]>;

type SEG<T extends CommandsUpperCase, N extends number> = { command: Lowercase<T> | T; values: FixedArray<N> };
type Segments =
  | SEG<'M', 2>
  | SEG<'L', 2>
  | SEG<'H', 1>
  | SEG<'V', 1>
  | SEG<'C', 6>
  | SEG<'S', 4>
  | SEG<'Q', 4>
  | SEG<'T', 2>
  | SEG<'A', 7>
  | SEG<'Z', 0>;

function parseToSegmentsFromPathString(path: string) {
  // normalize path
  path = path
    .replace(/\n/g, ' ') // replace new lines with a space
    .replace(/[MLHVCSQTAZ]/gi, '\n$& ') // space before and after command
    .replace(/,/g, ' ') // , => space
    .replace(/-/g, ' $&') // 43-46 => 43 -46
    .replace(/(\D-?)(\.\d+)/g, '$10$2') // .34 " -.34" => 0.34 | -0.34
    .replace(/(\D-?(?:\d?)+\.\d+)((?:\.\d+)+)/g, (_m: string, g1: string, g2: string) => g1 + g2.replace(/\./g, ' 0.')) // 1.3.4 => 1.3 0.4
    .replace(/([^0-9.]-?)(0)(\d+[^.])/g, '$1$2 $3') // 09 => 0 9
    .replace(/([^0-9.]-?)(00)/g, '$10 0') // 0 0 => 0 0
    .replace(/[^\S\r\n]{2,}/g, ' ') // remove extra space
    .trim();

  // Array to store the path segments
  const segments: Segments[] = [];

  const rows = path.split('\n');
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const command = row[0] as Commands;
    const values = row.slice(1).split(' ').filter(Boolean).map(parseFloat);

    if (command === 'M' || command === 'm') {
      segments.push({ command, values: [values[0], values[1]] });

      if (values.length > 2) {
        for (let i = 2; i < values.length; i = i + 2) {
          segments.push({ command: command === 'M' ? 'L' : 'l', values: [values[i], values[i + 1]] as FixedArray<2> });
        }
      }
      continue;
    }
    if (command === 'L' || command === 'l') {
      for (let i = 0; i < values.length; i = i + 2) {
        segments.push({ command, values: [values[i], values[i + 1]] });
      }
      continue;
    }
    if (command === 'H' || command === 'h') {
      for (let i = 0; i < values.length; i++) {
        segments.push({ command, values: [values[i]] });
      }
      continue;
    }
    if (command === 'V' || command === 'v') {
      for (let i = 0; i < values.length; i++) {
        segments.push({ command, values: [values[i]] });
      }
      continue;
    }
    if (command === 'C' || command === 'c') {
      for (let i = 0; i < values.length; i = i + 6) {
        segments.push({
          command,
          values: [values[i], values[i + 1], values[i + 2], values[i + 3], values[i + 4], values[i + 5]],
        });
      }
      continue;
    }
    if (command === 'S' || command === 's') {
      for (let i = 0; i < values.length; i = i + 4) {
        segments.push({ command, values: [values[i], values[i + 1], values[i + 2], values[i + 3]] });
      }
      continue;
    }
    if (command === 'Q' || command === 'q') {
      for (let i = 0; i < values.length; i = i + 4) {
        segments.push({ command, values: [values[i], values[i + 1], values[i + 2], values[i + 3]] });
      }
      continue;
    }
    if (command === 'T' || command === 't') {
      for (let i = 0; i < values.length; i = i + 2) {
        segments.push({ command, values: [values[i], values[i + 1]] });
      }
      continue;
    }
    if (command === 'A' || command === 'a') {
      // Separate numbers from flags
      let start = 3;
      if (values.length % 7 !== 0) {
        while (true) {
          const arcFlagStr = values[start]?.toString();
          if (typeof arcFlagStr === 'undefined') break;

          if (arcFlagStr.length > 1) {
            values[start] = +arcFlagStr[0];
            values.splice(start + 1, 0, +arcFlagStr.slice(1));
          }

          const sweepFlagStr = values[start + 1]?.toString();
          if (typeof sweepFlagStr === 'undefined') break;

          if (sweepFlagStr.length > 1) {
            values[start + 1] = +sweepFlagStr[0];
            values.splice(start + 2, 0, +sweepFlagStr.slice(1));
          }

          start += 7;
        }
      }

      for (let i = 0; i < values.length; i = i + 7) {
        segments.push({
          command,
          values: [values[i], values[i + 1], values[i + 2], values[i + 3], values[i + 4], values[i + 5], values[i + 6]],
        });
      }
      continue;
    }
    if (command === 'Z' || command === 'z') {
      segments.push({ command, values: [] });
    }
  }

  return segments;
}

function isLowerCase(char: string) {
  return char.toLowerCase() === char;
}

/** Convert all SVG path commands to Cubic Bezier curves with relative values (0-1) */
export function parse(path: string, viewBoxSize?: { x: number; y: number; width: number; height: number }): string {
  const segments = parseToSegmentsFromPathString(path);

  const curves: number[][] = [];

  const viewBox = { width: 0, height: 0, x: 0, y: 0 };

  let p0x = 0;
  let p0y = 0;
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Z (or) z
    if (seg.command === 'Z' || seg.command === 'z') {
      if (seg.values.length !== 0) {
        throw new Error(`Input is not a valid "${seg.command}" command; it has ${seg.values.length} points instead of ${0}`);
      }

      const firstCommand = segments[0];
      if (firstCommand.command === 'M' || firstCommand.command === 'm') {
        curves.push(lineToCubicBezier(p0x, p0y, firstCommand.values[0], firstCommand.values[1]));
      }

      continue;
    }
    // M x y (or) m dx dy
    if (seg.command === 'M' || seg.command === 'm') {
      if (seg.values.length !== 2) {
        throw new Error(`Input is not a valid "${seg.command}" command; it has ${seg.values.length} points instead of ${2}`);
      }
      const isValid = seg.values.every(value => typeof value === 'number' && !isNaN(value));
      if (!isValid) throw new Error(`Failed to parse the "${seg.command}" command properly`);

      if (isLowerCase(seg.command)) {
        seg.values[0] += p0x; // dx
        seg.values[1] += p0y; // dy
      }

      p0x = seg.values[0];
      p0y = seg.values[1];
      minX = Math.min(minX, p0x);
      maxX = Math.max(maxX, p0x);
      minY = Math.min(minY, p0y);
      maxY = Math.max(maxY, p0y);
      continue;
    }
    // L x y (or) l dx dy
    if (seg.command === 'L' || seg.command === 'l') {
      if (seg.values.length !== 2) {
        throw new Error(`Input is not a valid "${seg.command}" command; it has ${seg.values.length} points instead of ${2}`);
      }
      const isValid = seg.values.every(value => typeof value === 'number' && !isNaN(value));
      if (!isValid) throw new Error(`Failed to parse the "${seg.command}" command properly`);

      if (isLowerCase(seg.command)) {
        seg.values[0] += p0x; // dx
        seg.values[1] += p0y; // dy
      }

      curves.push(lineToCubicBezier(p0x, p0y, seg.values[0], seg.values[1]));

      p0x = seg.values[0];
      p0y = seg.values[1];
      minX = Math.min(minX, p0x);
      maxX = Math.max(maxX, p0x);
      minY = Math.min(minY, p0y);
      maxY = Math.max(maxY, p0y);
      continue;
    }
    // H x (or) h dx
    if (seg.command === 'H' || seg.command === 'h') {
      if (seg.values.length !== 1) {
        throw new Error(`Input is not a valid "${seg.command}" command; it has ${seg.values.length} points instead of ${1}`);
      }
      const isValid = seg.values.every(value => typeof value === 'number' && !isNaN(value));
      if (!isValid) throw new Error(`Failed to parse the "${seg.command}" command properly`);

      if (isLowerCase(seg.command)) {
        seg.values[0] += p0x; // dx
      }

      curves.push(lineToCubicBezier(p0x, p0y, seg.values[0], p0y));

      p0x = seg.values[0];
      minX = Math.min(minX, p0x);
      maxX = Math.max(maxX, p0x);
      continue;
    }
    // V y (or) v dy
    if (seg.command === 'V' || seg.command === 'v') {
      if (seg.values.length !== 1) {
        throw new Error(`Input is not a valid "${seg.command}" command; it has ${seg.values.length} points instead of ${1}`);
      }
      const isValid = seg.values.every(value => typeof value === 'number' && !isNaN(value));
      if (!isValid) throw new Error(`Failed to parse the "${seg.command}" command properly`);

      if (isLowerCase(seg.command)) {
        seg.values[0] += p0y; // dy
      }

      curves.push(lineToCubicBezier(p0x, p0y, p0x, seg.values[0]));

      p0y = seg.values[0];
      minY = Math.min(minY, p0y);
      maxY = Math.max(maxY, p0y);
      continue;
    }
    // C x1 y1, x2 y2, x y (or) c dx1 dy1, dx2 dy2, dx dy
    if (seg.command === 'C' || seg.command === 'c') {
      if (seg.values.length !== 6) {
        throw new Error(`Input is not a valid "${seg.command}" command; it has ${seg.values.length} points instead of ${6}`);
      }
      const isValid = seg.values.every(value => typeof value === 'number' && !isNaN(value));
      if (!isValid) throw new Error(`Failed to parse the "${seg.command}" command properly`);

      if (isLowerCase(seg.command)) {
        seg.command = 'C';
        seg.values[0] += p0x; // dx1
        seg.values[1] += p0y; // dy1
        seg.values[2] += p0x; // dx2
        seg.values[3] += p0y; // dy2
        seg.values[4] += p0x; // dx
        seg.values[5] += p0y; // dy
      }

      curves.push([p0x, p0y, ...seg.values]);

      p0x = seg.values[4];
      p0y = seg.values[5];
      minX = Math.min(minX, p0x);
      maxX = Math.max(maxX, p0x);
      minY = Math.min(minY, p0y);
      maxY = Math.max(maxY, p0y);
      continue;
    }
    // S x2 y2, x y (or) s dx2 dy2, dx dy
    if (seg.command === 'S' || seg.command === 's') {
      if (seg.values.length !== 4) {
        throw new Error(`Input is not a valid "${seg.command}" command; it has ${seg.values.length} points instead of ${4}`);
      }
      const isValid = seg.values.every(value => typeof value === 'number' && !isNaN(value));
      if (!isValid) throw new Error(`Failed to parse the "${seg.command}" command properly`);

      if (isLowerCase(seg.command)) {
        seg.command = 'S';
        seg.values[0] += p0x; // dx2
        seg.values[1] += p0y; // dy2
        seg.values[2] += p0x; // dx
        seg.values[3] += p0y; // dy
      }

      const prevCurve = curves[curves.length - 1];
      curves.push(
        SeveralBezierToCubicBezier(
          p0x,
          p0y,
          seg.values[0],
          seg.values[1],
          seg.values[2],
          seg.values[3],
          prevCurve[4],
          prevCurve[5]
        )
      );

      p0x = seg.values[2];
      p0y = seg.values[3];
      minX = Math.min(minX, p0x);
      maxX = Math.max(maxX, p0x);
      minY = Math.min(minY, p0y);
      maxY = Math.max(maxY, p0y);
      continue;
    }
    // Q x1 y1, x y (or) q dx1 dy1, dx dy
    if (seg.command === 'Q' || seg.command === 'q') {
      if (seg.values.length !== 4) {
        throw new Error(`Input is not a valid "${seg.command}" command; it has ${seg.values.length} points instead of ${4}`);
      }
      const isValid = seg.values.every(value => typeof value === 'number' && !isNaN(value));
      if (!isValid) throw new Error(`Failed to parse the "${seg.command}" command properly`);

      if (isLowerCase(seg.command)) {
        seg.command = 'Q';
        seg.values[0] += p0x; // dx1
        seg.values[1] += p0y; // dy1
        seg.values[2] += p0x; // dx
        seg.values[3] += p0y; // dy
      }

      curves.push(quadraticCurveToCubic(p0x, p0y, seg.values[0], seg.values[1], seg.values[2], seg.values[3]));

      p0x = seg.values[2];
      p0y = seg.values[3];
      minX = Math.min(minX, p0x);
      maxX = Math.max(maxX, p0x);
      minY = Math.min(minY, p0y);
      maxY = Math.max(maxY, p0y);
      continue;
    }
    // T x y (or) t dx dy
    if (seg.command === 'T' || seg.command === 't') {
      if (seg.values.length !== 2) {
        throw new Error(`Input is not a valid "${seg.command}" command; it has ${seg.values.length} points instead of ${2}`);
      }
      const isValid = seg.values.every(value => typeof value === 'number' && !isNaN(value));
      if (!isValid) throw new Error(`Failed to parse the "${seg.command}" command properly`);

      if (isLowerCase(seg.command)) {
        seg.command = 'T';
        seg.values[0] += p0x; // dx
        seg.values[1] += p0y; // dy
      }

      const prevSegment = segments[i - 1];
      let prevCX: number | undefined;
      let prevCY: number | undefined;
      if (prevSegment && prevSegment.command === 'Q') {
        prevCX = prevSegment.values[0];
        prevCY = prevSegment.values[1];
      }
      curves.push(tShortcutToCubic(p0x, p0y, seg.values[0], seg.values[1], prevCX, prevCY));

      p0x = seg.values[0];
      p0y = seg.values[1];
      minX = Math.min(minX, p0x);
      maxX = Math.max(maxX, p0x);
      minY = Math.min(minY, p0y);
      maxY = Math.max(maxY, p0y);
      continue;
    }
    // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
    // a rx ry x-axis-rotation large-arc-flag sweep-flag dx dy
    if (seg.command === 'A' || seg.command === 'a') {
      if (seg.values.length !== 7) {
        throw new Error(`Input is not a valid "${seg.command}" command; it has ${seg.values.length} points instead of ${7}`);
      }
      const isValid = seg.values.every(value => typeof value === 'number' && !isNaN(value));
      if (!isValid) throw new Error(`Failed to parse the "${seg.command}" command properly`);

      if (isLowerCase(seg.command)) {
        seg.command = 'A';
        seg.values[5] += p0y; // dx
        seg.values[6] += p0y; // dy
      }

      const rx = Math.abs(seg.values[0]);
      const ry = Math.abs(seg.values[1]);
      const p1x = seg.values[5];
      const p1y = seg.values[6];

      const toCubic = arcToCubicCurves(
        p0x,
        p0y,
        p1x,
        p1y,
        rx,
        ry,
        seg.values[2], // x-axis-rotation
        seg.values[3], // large-arc-flag
        seg.values[4] // sweep-flag
      );

      curves.push(...toCubic);

      p0x = seg.values[5];
      p0y = seg.values[6];
      minX = Math.min(minX, p0x);
      maxX = Math.max(maxX, p0x);
      minY = Math.min(minY, p0y);
      maxY = Math.max(maxY, p0y);
      continue;
    }
  }

  if (viewBoxSize) {
    viewBox.x = viewBoxSize.x;
    viewBox.y = viewBoxSize.y;
    viewBox.width = viewBoxSize.width;
    viewBox.height = viewBoxSize.height;
  } else {
    viewBox.x = minX;
    viewBox.y = minY;
    viewBox.width = maxX - minX;
    viewBox.height = maxY - minY;
  }

  const percentagePoints = convertPointsToRelativeValues(curves, viewBox);

  let pathString = '';
  for (let i = 0; i < percentagePoints.length; i++) {
    const e = percentagePoints[i];
    if (!i) {
      pathString += `M ${e[0]} ${e[1]} C ${e[2]} ${e[3]} ${e[4]} ${e[5]} ${e[6]} ${e[7]}\n`;
      continue;
    }
    pathString += `C ${e[2]} ${e[3]} ${e[4]} ${e[5]} ${e[6]} ${e[7]}\n`;
  }

  return pathString;
}
