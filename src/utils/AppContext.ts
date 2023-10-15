import { createContext, useContext } from 'react';
import type { SetStateAction, Dispatch, MutableRefObject } from 'react';
import type { Eases } from '../presets';

export const exportTypes = ['CSS', 'SVG Path', 'JS File'] as const;
export type ExportTypes = (typeof exportTypes)[number];

type ctxType = {
  /** - SVG's drawing area size. */
  viewBoxSize: MutableRefObject<number>;
  /** - The aria around the SVG's drawing area. */
  zoom: MutableRefObject<number>;
  /** - A switch to toggle the snapping to the nearest point or to the grid. */
  magnet: MutableRefObject<boolean>;

  /** - To save path strings paths for undo. */
  undoStack: MutableRefObject<string[]>;
  registerMoveForUndo: (curves?: number[][]) => void;

  /** Current SVG view box X and Y */
  viewBoxCoordinate: MutableRefObject<{ x: number; y: number }>;
  /** - The set of point that control points are not collinear. */
  toggledCollinear: Set<number>;

  /** - A switch to toggle auto hiding points and control handles when not focused. */
  readonly autoHideHandles: boolean;
  setAutoHideHandles: Dispatch<SetStateAction<boolean>>;

  /** - An array of number to determine the grid points on the `x` and `y` axis. */
  gridPoints: MutableRefObject<number[]>;
  /** - The current moving control point `[curve index, index of control x point]`. */
  activeControlPoint: MutableRefObject<[number, 0 | 2] | null>;
  /** - The selected (focused) point, used for deletion. */
  selectedPoint: MutableRefObject<number | null>;
  /** - The current moving anchor point. */
  activePathPoint: MutableRefObject<number | null>;

  /** The current selected preset. */
  readonly preset: Eases[keyof Eases];
  onPresetSelect: (value: Eases[keyof Eases]) => void;

  /** - The current path as two dimensional array `[[M], ...[C]]` */
  readonly points: number[][];
  setPoints: Dispatch<SetStateAction<number[][]>>;
  /** - The current path as two dimensional array `[[M], ...[C]]` to be used for events. */
  eventPoint: MutableRefObject<number[][]>;

  onZoom: (value: number) => void;
  toggleExportDialog: (dialog: ExportTypes) => void;
  getPathStringFromPoints: (p?: number[][]) => string;
  mouseMove: (e: React.MouseEvent<Element> | MouseEvent) => void;

  // animations
  playCurrentEasing: () => void;
  pauseAnimation: () => void | undefined;
  setDuration: (duration: number) => void | undefined;
};

const CTX = createContext<ctxType>(null!);

export const AppProvider = CTX.Provider;

export function useApp() {
  return useContext(CTX);
}
