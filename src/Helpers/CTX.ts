import { createContext } from 'react';

export const exportTypes = ['CSS', 'SVG Path', 'JS File'] as const;
export type ExportTypes = typeof exportTypes[number];

type ctxType = {
  points: number[][];
  size: React.MutableRefObject<number>;
  zoom: React.MutableRefObject<number>;
  magnet: React.MutableRefObject<boolean>;
  undoStack: React.MutableRefObject<string[]>;
  toggledAnchors: Set<number>;
  autoHideHandles: React.MutableRefObject<boolean>;
  gridPoints: React.MutableRefObject<number[]>;
  activeControlPoint: React.MutableRefObject<number[] | null>;
  selectedPoint: React.MutableRefObject<number | null>;
  activePathPoint: React.MutableRefObject<number | null>;
  eventPoint: React.MutableRefObject<number[][]>;
  toggleExportDialog: (dialog: ExportTypes) => void;
  onZoom: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setPoints: React.Dispatch<React.SetStateAction<number[][]>>;
  parseResult: (p?: number[][]) => string;
  playCurrentEasing: () => void;
  pauseAnimation: () => void | undefined;
  setDuration: (duration: number) => void | undefined;
  mouseMove: (e: React.MouseEvent<Element> | MouseEvent) => void;
};
const CTX = createContext<ctxType>(null!);

export default CTX;
