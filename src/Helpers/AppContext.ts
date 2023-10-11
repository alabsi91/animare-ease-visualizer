import { createContext, useContext } from 'react';
import type { SetStateAction, Dispatch, MutableRefObject } from 'react';

export const exportTypes = ['CSS', 'SVG Path', 'JS File'] as const;
export type ExportTypes = (typeof exportTypes)[number];

type ctxType = {
  /** - SVG's drawing area size. */
  viewBoxSize: MutableRefObject<number>;
  zoom: MutableRefObject<number>;
  magnet: MutableRefObject<boolean>;
  undoStack: MutableRefObject<string[]>;
  viewBoxCoordinate: MutableRefObject<{ x: number; y: number }>;
  toggledAnchors: Set<number>;
  toggledCollinear: Set<number>;
  readonly autoHideHandles: boolean;
  registerMoveForUndo: (curves?: number[][]) => void;
  setAutoHideHandles: Dispatch<SetStateAction<boolean>>;
  gridPoints: MutableRefObject<number[]>;
  activeControlPoint: MutableRefObject<[number, 0 | 2] | null>;
  selectedPoint: MutableRefObject<number | null>;
  activePathPoint: MutableRefObject<number | null>;
  eventPoint: MutableRefObject<number[][]>;
  preset: string;
  onPresetSelect: (value: string) => void;
  onZoom: (value: number) => void;
  toggleExportDialog: (dialog: ExportTypes) => void;
  readonly points: number[][];
  setPoints: Dispatch<SetStateAction<number[][]>>;
  getPathStringFromPoints: (p?: number[][]) => string;
  playCurrentEasing: () => void;
  pauseAnimation: () => void | undefined;
  setDuration: (duration: number) => void | undefined;
  mouseMove: (e: React.MouseEvent<Element> | MouseEvent) => void;
};

const CTX = createContext<ctxType>(null!);

export const AppProvider = CTX.Provider;

export function useApp() {
  return useContext(CTX);
}
