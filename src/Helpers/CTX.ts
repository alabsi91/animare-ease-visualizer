import { createContext } from 'react';
import type { DialogRef } from '../Dialog/Dialog';

type ctxType = {
  points: number[][];
  size: React.MutableRefObject<number>;
  zoom: React.MutableRefObject<number>;
  magnet: React.MutableRefObject<boolean>;
  undoStack: React.MutableRefObject<string[]>;
  toggledAnchors: Set<number>;
  autoHideHandles: React.MutableRefObject<boolean>;
  gridPoints: React.MutableRefObject<number[]>;
  downloadDialogRef: React.MutableRefObject<DialogRef>;
  activeControlPoint: React.MutableRefObject<number[] | null>;
  selectedPoint: React.MutableRefObject<number | null>;
  activePathPoint: React.MutableRefObject<number | null>;
  eventPoint: React.MutableRefObject<number[][]>;
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
