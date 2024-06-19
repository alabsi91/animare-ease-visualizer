import animare, { Timing } from 'animare';
import { ease } from 'animare/plugins';
import { useAnimare } from 'animare/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import './index.css';

import ExportCss from './ExportCss/ExportCss';
import ExportCssLinear from './ExportCssLinear/ExportCssLinear';
import ExportJsFile from './ExportJsFile/ExportJsFile';
import ExportSvg from './ExportSvg/ExportSvg';
import SidePanel from './SidePanel/SidePanel';
import SmallSidePanel from './SidePanel/SmallSidePanel';
import Panel from './SvgPanel/SvgPanel';
import Dialog from './components/Dialog/Dialog';
import usePan from './hooks/usePan';
import useZoom from './hooks/useZoom';
import { eases } from './presets';
import { AppProvider } from './utils/AppContext';
import { calculateMirrorPoint } from './utils/geometry';
import {
  checkForDisabledCollinearPoints,
  checkOverlap,
  clamp,
  constructPathFromPoints,
  convertPointsToRelativeValues,
  getPointsFromPathString,
} from './utils/utils';

import type { Eases } from './presets';

/** - Threshold for checking path overlapping. */
let timeout = false,
  /** - To set the path color after the animation end (red or normal). */
  isOverLapping = false,
  /** - To pause checking for path overlapping while zooming using the slide. */
  isZooming = false;

/** - The set of point that control points are not collinear. */
const toggledCollinear = new Set<number>();

export default function App() {
  const viewBoxSize = useRef(300);
  const viewBoxCoordinate = useRef({ x: 0, y: 0 });

  /** - The aria around the SVG's drawing area. */
  const zoom = useRef(50);
  /** - A switch to toggle the snapping to the nearest point or to the grid. */
  const magnet = useRef(true);
  /** - An array of number to determine the grid points on the `x` and `y` axis. */
  const gridPoints = useRef(new Array(11).fill(0).map((_, i) => zoom.current + (i * viewBoxSize.current) / 10));
  /** - To save path strings paths for undo. */
  const undoStack = useRef<string[]>([]);
  /** - The current moving control point `[curve index, index of control x point]`. */
  const activeControlPoint = useRef<[number, 0 | 2] | null>(null);
  /** - The current moving anchor point. */
  const activePathPoint = useRef<number | null>(null);
  const isPresetSelected = useRef(true);
  /** - The selected (focused) point, used for deletion. */
  const selectedPoint = useRef<number | null>(null);

  const pathToPoints = (path: string) => {
    const viewBox = {
      x: zoom.current,
      y: zoom.current,
      width: viewBoxSize.current,
      height: viewBoxSize.current,
    };
    return getPointsFromPathString(path, viewBox);
  };

  /** - The current path as two dimensional array `[[M], ...[C]]` */
  const [points, setPoints] = useState(pathToPoints(window.localStorage.getItem('saved') || eases['ease.in.sine']));
  const [preset, setPreset] = useState<Eases[keyof Eases]>('none');

  /** - A switch to toggle auto hiding points and control handles when not focused. */
  const [autoHideHandles, setAutoHideHandles] = useState(false);

  /** - The current path as two dimensional array `[[M], ...[C]]` to be used for events. */
  const eventPoint = useRef(points);

  const getStickingPoints = () => {
    const Points = eventPoint.current; // a copy of the current path points.

    const pointsX: number[] = [], // stick to these points on the x axis
      pointsY: number[] = []; // stick to these points on the y axis

    // grab x and y positions for points and control points on the path  -> M, ...C
    for (let i = 0; i < Points.length; i++) {
      const curve = Points[i];

      const c1 = { x: curve[0], y: curve[1] };
      const c2 = { x: curve[2], y: curve[3] };
      const p = { x: curve[curve.length - 2], y: curve[curve.length - 1] }; // using last index, compatible with M

      // user is dragging a point on the path
      if (activePathPoint.current !== null) {
        // don't add the connected control point
        if (i && activePathPoint.current + 1 !== i) {
          pointsX.push(c1.x);
          pointsY.push(c1.y);
        }

        if (activePathPoint.current !== i) {
          pointsX.push(p.x);
          pointsY.push(p.y);

          // exclude M
          if (!i) continue;

          pointsX.push(c2.x);
          pointsY.push(c2.y);
        }

        continue;
      }

      // user is dragging a control point
      if (activeControlPoint.current !== null) {
        const [curveIndex, ctrlIndex] = activeControlPoint.current;

        pointsX.push(p.x);
        pointsY.push(p.y);

        // exclude M and
        if (!i) continue;

        // add only the opposite control point of the active control point
        if (curveIndex === i) {
          if (ctrlIndex === 2) {
            pointsX.push(c1.x);
            pointsY.push(c1.y);
          }
          if (ctrlIndex === 0) {
            pointsX.push(c2.x);
            pointsY.push(c2.y);
          }

          continue;
        }

        pointsX.push(c1.x);
        pointsY.push(c1.y);
        pointsX.push(c2.x);
        pointsY.push(c2.y);
      }
    }

    return [pointsX, pointsY];
  };

  const mouseMove = useCallback((e: React.MouseEvent<Element> | MouseEvent) => {
    const svg = document.querySelector('.svg') as SVGSVGElement;
    const { left, top, width, height } = svg.getBoundingClientRect();

    // Calculate mouse coordinates relative to the SVG.
    let x = (e.clientX - left) * ((viewBoxSize.current + zoom.current * 2) / width);
    let y = (e.clientY - top) * ((viewBoxSize.current + zoom.current * 2) / height);
    // Prevent x and y from going beyond the SVG edges.
    x = clamp(x, 0, viewBoxSize.current + zoom.current * 2) + viewBoxCoordinate.current.x;
    y = clamp(y, 0, viewBoxSize.current + zoom.current * 2) + viewBoxCoordinate.current.y;

    const Points = [...eventPoint.current]; // a copy of the current path points.

    // * stick to the grid or points
    if (magnet.current) {
      const threshold = 2;
      const [pointsX, pointsY] = getStickingPoints();
      // Add the grid points and calculate which point is nearest to stick to.
      x = pointsX.concat(gridPoints.current).find(p => x + threshold > p && x - threshold < p) || x;
      y = pointsY.concat(gridPoints.current).find(p => y + threshold > p && y - threshold < p) || y;
    }

    // * The user is dragging a point on the path.
    if (activePathPoint.current !== null) {
      const currentPointIndex = activePathPoint.current;
      const currentCurve = Points[currentPointIndex]; // M or C

      // Keep the first and last points fixed on the x-axis.
      x =
        currentPointIndex === 0 ? zoom.current : currentPointIndex === Points.length - 1 ? viewBoxSize.current + zoom.current : x;

      // * Move control points
      // Control point X Y index.
      const ctrlPointIndex = [currentPointIndex === 0 ? 0 : 2, currentPointIndex === 0 ? 1 : 3];
      // Map the 'M' command to the first 'C' curve.
      const ctrlCurveIndex = currentPointIndex === 0 ? 1 : currentPointIndex;
      // The distance between the point on the path and the control point in the same curve.
      const distanceX = Points[ctrlCurveIndex][ctrlPointIndex[0]] - currentCurve[currentCurve.length - 2];
      const distanceY = Points[ctrlCurveIndex][ctrlPointIndex[1]] - currentCurve[currentCurve.length - 1];
      // Move the control point the same distance from the active point.
      Points[ctrlCurveIndex][ctrlPointIndex[0]] = distanceX + x;
      Points[ctrlCurveIndex][ctrlPointIndex[1]] = distanceY + y;

      // Do the same for the opposite control point.
      const nextCurve = Points[currentPointIndex + 1];
      if (nextCurve && currentPointIndex !== 0) {
        const nextCtrlPointIndex = [0, 1];
        const nextDistanceX = nextCurve[nextCtrlPointIndex[0]] - currentCurve[4];
        const nextDistanceY = nextCurve[nextCtrlPointIndex[1]] - currentCurve[5];
        nextCurve[nextCtrlPointIndex[0]] = nextDistanceX + x;
        nextCurve[nextCtrlPointIndex[1]] = nextDistanceY + y;
      }

      // * Move the point
      currentCurve[currentCurve.length - 2] = x;
      currentCurve[currentCurve.length - 1] = y;

      setPoints(Points);
      return;
    }

    // * The user is dragging a control point
    if (activeControlPoint.current !== null) {
      const [ctrlCurveIndex, ctrlIndex] = activeControlPoint.current;
      const currentCurve = Points[ctrlCurveIndex];

      // Move the current control point
      currentCurve[ctrlIndex] = x;
      currentCurve[ctrlIndex + 1] = y;

      const nextCurve = Points[ctrlCurveIndex + 1];
      const previousCurve = Points[ctrlCurveIndex - 1];

      // Register the point to disable mirroring of the opposite control point.
      if (e.ctrlKey) {
        if (ctrlIndex === 2) toggledCollinear.add(ctrlCurveIndex);
        if (previousCurve && previousCurve.length === 6 && ctrlIndex === 0) toggledCollinear.add(ctrlCurveIndex - 1);
      }

      // Move the opposite side control point (mirror)
      if (!e.ctrlKey) {
        if (nextCurve && ctrlIndex === 2 && !toggledCollinear.has(ctrlCurveIndex)) {
          const centerX = currentCurve[4];
          const centerY = currentCurve[5];
          const newCtrlPos = calculateMirrorPoint(x, y, nextCurve[0], nextCurve[1], centerX, centerY);
          nextCurve[0] = newCtrlPos.x;
          nextCurve[1] = newCtrlPos.y;
        }

        if (previousCurve && previousCurve.length === 6 && ctrlIndex === 0 && !toggledCollinear.has(ctrlCurveIndex - 1)) {
          const centerX = previousCurve[4];
          const centerY = previousCurve[5];
          const newCtrlPos = calculateMirrorPoint(x, y, previousCurve[2], previousCurve[3], centerX, centerY);
          previousCurve[2] = newCtrlPos.x;
          previousCurve[3] = newCtrlPos.y;
        }
      }
      setPoints(Points);
    }
  }, []);

  const getPercentagePoints = (curves = points) => {
    const viewBox = {
      x: zoom.current,
      y: zoom.current,
      width: viewBoxSize.current,
      height: viewBoxSize.current,
    };
    return convertPointsToRelativeValues(curves, viewBox);
  };

  /** Converts curve points to percentage points and constructs a path string (M, ...C). */
  const getPathStringFromPoints = (curves = points) => {
    const percentagePoints = getPercentagePoints(curves);
    return constructPathFromPoints(percentagePoints);
  };

  /** - Delete the last selected point on the path by pressing the `delete` key. */
  const deletePoint = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' && selectedPoint.current && eventPoint.current.length > 2) {
      const i = selectedPoint.current;
      const Points = [...eventPoint.current];
      const currentCurve = Points[i];
      const nextCurve = Points[i + 1];
      nextCurve[0] = currentCurve[0];
      nextCurve[1] = currentCurve[1];
      Points.splice(selectedPoint.current, 1);

      setPoints(Points);
    }
  }, []);

  const animation = useAnimare(() => {
    const ball = document.querySelector('.animation-point') as SVGCircleElement,
      fillLine = document.querySelector('.animation-fill-line') as SVGLineElement,
      lineH = document.querySelector('.animation-horizontal-line') as SVGLineElement,
      lineV = document.querySelector('.animation-vertical-line') as SVGLineElement,
      mask = document.querySelector('#animation-path-mask rect') as SVGRectElement,
      path = document.querySelector('.path') as SVGPathElement,
      maskedPath = document.querySelector('.animation-path') as SVGMaskElement,
      fpsEl = document.querySelector('#fps') as SVGTextElement;

    return animare.group(
      {
        from: [zoom.current, viewBoxSize.current + zoom.current, 0],
        to: [viewBoxSize.current + zoom.current, zoom.current, viewBoxSize.current],
        duration: 2000,
        ease: [ease.linear, ease.custom(getPathStringFromPoints())],
        timing: Timing.FromStart,
        autoPlay: false,
      },
      async (info, { isFirstFrame, isFinished, fps }) => {
        const x = info[0].value,
          y = info[1].value,
          w = info[2].value;

        if (isFirstFrame) {
          lineH.style.display = 'block';
          lineV.style.display = 'block';
          maskedPath.style.display = 'block';
          path.style.transition = 'none';
          path.style.stroke = 'var(--blurred-path)';
          if (!autoHideHandles)
            document.querySelectorAll<HTMLAnchorElement>('.auto-hide').forEach(e => (e!.style.display = 'none'));
        }

        ball.setAttribute('cy', y.toString());
        fpsEl.textContent = fps + ' FPS';
        fillLine.setAttribute('y2', y.toString());
        mask.setAttribute('width', Math.abs(w).toString());
        lineH.setAttribute('y2', y.toString());
        lineH.setAttribute('y1', y.toString());
        lineV.setAttribute('x2', x.toString());
        lineV.setAttribute('x1', x.toString());

        if (isFinished) {
          lineH.style.display = 'none';
          lineV.style.display = 'none';
          maskedPath.style.display = 'none';
          path.style.stroke = isOverLapping ? 'red' : 'var(--active-path)';
          document
            .querySelectorAll<HTMLAnchorElement>('.auto-hide')
            .forEach(e => (e.style.display = autoHideHandles ? 'none' : 'block'));
          await new Promise(resolve => setTimeout(resolve, 300));
          path.style.removeProperty('transition');
        }
      },
    );
  });

  /** Registers a move or action to be used for undo functionality later. */
  const registerMoveForUndo = (curves = points) => {
    const pathString = getPathStringFromPoints(curves);
    undoStack.current.push(pathString);
  };

  const undo = (e: KeyboardEvent) => {
    if (undoStack.current.length === 0 || !(e.ctrlKey && e.key.toLowerCase() === 'z')) return;
    const viewBox = {
      x: zoom.current,
      y: zoom.current,
      width: viewBoxSize.current,
      height: viewBoxSize.current,
    };
    const pathString = undoStack.current[undoStack.current.length - 1];
    const parsedPoints = getPointsFromPathString(pathString, viewBox);
    setPoints(parsedPoints);
    undoStack.current.pop();
  };

  useEffect(() => {
    toggledCollinear.clear();
    const disabledCollinear = checkForDisabledCollinearPoints(points);
    disabledCollinear.forEach(toggledCollinear.add, toggledCollinear);

    const onMouseUp = () => {
      document.removeEventListener('pointermove', mouseMove);
      activePathPoint.current = null;
      activeControlPoint.current = null;
      isZooming = false;
      window.localStorage.setItem('saved', getPathStringFromPoints(eventPoint.current));
    };

    document.addEventListener('pointerup', onMouseUp);
    document.addEventListener('keydown', deletePoint);
    document.addEventListener('keydown', undo);

    return () => {
      document.removeEventListener('pointerup', onMouseUp);
      document.removeEventListener('keydown', deletePoint);
      document.removeEventListener('keydown', undo);
    };
  }, []);

  useEffect(() => {
    eventPoint.current = points;

    // reset presets menu to 'none' if the point changed.
    if (isPresetSelected.current) isPresetSelected.current = false;
    else if (preset !== 'none' && !isZooming) setPreset('none');

    if (!timeout && !isZooming) {
      timeout = true;
      setTimeout(() => {
        const percentagePoints = getPercentagePoints();
        isOverLapping = checkOverlap(percentagePoints);
        (document.querySelector('.path') as SVGPathElement).style.stroke = isOverLapping ? 'red' : 'var(--active-path)';
        timeout = false;
      }, 50);
    }
  }, [points]);

  const onZoom = (value: number) => {
    isZooming = true;
    const p = getPathStringFromPoints();
    zoom.current = 455 - value;
    gridPoints.current = new Array(11).fill(0).map((_, i) => zoom.current + (i * viewBoxSize.current) / 10);
    setPoints(pathToPoints(p));

    animation.updateValues([
      { name: '0', from: zoom.current, to: viewBoxSize.current + zoom.current },
      { name: '1', from: viewBoxSize.current + zoom.current, to: zoom.current },
      { name: '2', from: 0, to: viewBoxSize.current },
    ]);
  };

  const onPresetSelect = (value: Eases[keyof Eases]) => {
    if (value === 'none') return;

    const path = document.querySelector('.path') as SVGPathElement;
    path.style.transition = 'all 500ms ease 0s';

    isPresetSelected.current = true;
    const Points = pathToPoints(value);

    toggledCollinear.clear();
    const disabledCollinear = checkForDisabledCollinearPoints(Points);
    disabledCollinear.forEach(toggledCollinear.add, toggledCollinear);

    setPoints(Points);
    setPreset(value);

    setTimeout(() => {
      path.style.transition = 'none';
    }, 500);
  };

  const playCurrentEasing = () => {
    const pathString = getPathStringFromPoints();
    animation.updateValues([{ name: '1', ease: ease.custom(pathString) }]);

    if (animation.timelineInfo.isPaused) animation.resume();
    else animation.play();
  };

  const pauseAnimation = () => animation.pause();

  const setDuration = (duration: number) => {
    animation.updateValues([
      { name: '0', duration },
      { name: '1', duration },
      { name: '2', duration },
    ]);
  };

  // add event listener to drag SVG panel around SPACE + DRAGG
  usePan(viewBoxSize, zoom, viewBoxCoordinate);
  // add event listener to perform a zoom on SVG CTRL + Wheel
  useZoom(zoom, onZoom);

  const contextValue = {
    activeControlPoint,
    activePathPoint,
    autoHideHandles,
    eventPoint,
    gridPoints,
    magnet,
    mouseMove,
    onPresetSelect,
    onZoom,
    getPathStringFromPoints,
    pauseAnimation,
    playCurrentEasing,
    points,
    preset,
    selectedPoint,
    registerMoveForUndo,
    setAutoHideHandles,
    setDuration,
    setPoints,
    toggledCollinear,
    undoStack,
    viewBoxCoordinate,
    viewBoxSize,
    zoom,
  };

  return (
    <AppProvider value={contextValue}>
      <Dialog id='exportJs' unmountOnHide>
        <ExportJsFile />
      </Dialog>

      <Dialog id='exportSvg' unmountOnHide>
        <ExportSvg />
      </Dialog>

      <Dialog id='exportCssKeyframe' unmountOnHide>
        <ExportCss />
      </Dialog>

      <Dialog id='exportCssLinear' unmountOnHide>
        <ExportCssLinear />
      </Dialog>

      <div className='container'>
        <SidePanel />

        <div style={{ position: 'relative' }}>
          <h2 className='title'>Animare Easing Visualizer</h2>

          <Panel />
        </div>
      </div>

      <SmallSidePanel />
    </AppProvider>
  );
}
