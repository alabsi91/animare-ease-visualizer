/* eslint-disable react-hooks/exhaustive-deps */
import './index.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import animare, { ease } from 'animare';
import { useAnimare } from 'animare/react';

import { checkOverlap, constructPath, convertPathToPoints, findSmoothCorners } from './Helpers/Helpers';
import { eases } from './Pathes';
import CTX from './Helpers/CTX';
import Dialog, { DialogRef } from './Dialog/Dialog';
import Panel from './SvgPanel/SvgPanel';
import SidePanel from './SidePanel/SidePanel';
import SmallSidePanel from './SidePanel/SmallSidePanel';
import ExportJsFile from './ExportJsFile/ExportJsFile';
import ExportCss from './ExportCss/ExportCss';
import ExportSvg from './ExportSvg/ExportSvg';

import type { ExportTypes } from './Helpers/CTX';

/** - Threshold for checking path overlapping. */
let tmout = false,
  /** - To set the path color after the animation end (red or normal). */
  isOverLapping = false,
  /** - To pause checking for path overlapping while zooming using the slide. */
  isZooming = false;

/** - The set of point that has the smooth corner enabled. */
const toggledAnchors = new Set<number>();

export default function App() {
  /** - SVG's drawing area size. */
  const size = useRef(200),
    /** - the aria around the SVG's drawing area. */
    zoom = useRef(50),
    /** - A switch to toggle the snappint to the nearest point or to the grid. */
    magnet = useRef(true),
    /** - A switch to toggle auto hidding points and control handles when not focused. */
    autoHideHandles = useRef(false),
    /** - An array of number to determine the grid points on the `x` and `y` axis. */
    gridPoints = useRef(new Array(11).fill(0).map((_, i) => zoom.current + (i * size.current) / 10)),
    /** - To save path strings pathes for undo. */
    undoStack = useRef<string[]>([]),
    /** - The current moving control point. */
    activeControlPoint = useRef<number[] | null>(null),
    /** - The current moving point. */
    activePathPoint = useRef<number | null>(null),
    /** - The selected (focused) point, used for deletion. */
    selectedPoint = useRef<number | null>(null);

  /** - To show and hide the download to js file dialog. */
  const exportJsDialogRef = useRef<DialogRef>(null!);
  const exportSvgDialogRef = useRef<DialogRef>(null!);
  const cssDialogRef = useRef<DialogRef>(null!);

  const pathToPoints = (path: string) => convertPathToPoints(path, size.current, zoom.current);

  /** - The current path as two dimensional array `[[M], [C], ...[S]]` */
  const [points, setPoints] = useState(pathToPoints(window.localStorage.getItem('saved') || eases['ease.in.sine']));

  /** - The current path as two dimensional array `[[M], [C], ...[S]]` to be used for events. */
  const eventPoint = useRef(points);

  const mouseMove = useCallback((e: React.MouseEvent<Element> | MouseEvent) => {
    const svg = document.querySelector('.svg') as SVGSVGElement;
    const { left, top, width, height } = svg.getBoundingClientRect();

    // calculate mouse coordinates.
    let x = (e.clientX - left) * ((size.current + zoom.current * 2) / width);
    let y = (e.clientY - top) * ((size.current + zoom.current * 2) / height);
    x = Math.min(Math.max(x, 0), size.current + zoom.current * 2); // clamp
    y = Math.min(Math.max(y, 0), size.current + zoom.current * 2); // clamp

    const Points = [...eventPoint.current]; // a copy of the current path points.

    // stick to the grid.
    if (magnet.current) {
      const threshold = 2,
        pointsX = [], // stick to these points on the x axis
        pointsY = []; // stick to these points on the y axis

      // grab x and y position for points on the path and for control points -> M, C, ...S
      for (let i = 0; i < Points.length; i++) {
        const p = Points[i];
        i === 0 ? pointsX.push(p[0]) : i === 1 ? pointsX.push(p[0], p[2], p[4]) : pointsX.push(p[0], p[2]);
        i === 0 ? pointsY.push(p[1]) : i === 1 ? pointsY.push(p[1], p[3], p[5]) : pointsY.push(p[1], p[3]);
      }

      // if the active control point is selected remove it from the array to prevent it to stick to it self.
      if (activeControlPoint.current !== null) {
        pointsX.splice(pointsX.indexOf(Points[activeControlPoint.current[0]][activeControlPoint.current[1]]), 1);
        pointsY.splice(pointsY.indexOf(Points[activeControlPoint.current[0]][activeControlPoint.current[1] + 1]), 1);
        // if the active point on the path is selected remove it from the array to prevent it to stick to it self.
      } else if (activePathPoint.current !== null) {
        const p = Points[activePathPoint.current];
        pointsX.splice(pointsX.indexOf(Points[activePathPoint.current][p.length - 2]), 1);
        pointsY.splice(pointsY.indexOf(Points[activePathPoint.current][p.length - 1]), 1);
        // if smooth corner is enabled prevent the point on the path to stick to it's control point.
        if (toggledAnchors.has(activePathPoint.current)) {
          const index = activePathPoint.current === 1 ? 2 : 0;
          pointsX.splice(pointsX.indexOf(Points[activePathPoint.current === 0 ? 1 : activePathPoint.current][index]), 1);
          pointsY.splice(pointsY.indexOf(Points[activePathPoint.current === 0 ? 1 : activePathPoint.current][index + 1]), 1);
        }
      }

      // add grid, and calculate which point in the nearest to stick to.
      x = [...gridPoints.current, ...pointsX].find(p => x + threshold > p && x - threshold < p) || x;
      y = [...gridPoints.current, ...pointsY].find(p => y + threshold > p && y - threshold < p) || y;
    }

    // move control point when moving the point on the path.
    if (activePathPoint.current !== null) {
      const p = Points[activePathPoint.current];
      const handleIndex = activePathPoint.current === 0 ? 1 : activePathPoint.current;
      const handlePos = [activePathPoint.current === 0 ? 0 : p.length - 4, activePathPoint.current === 0 ? 1 : p.length - 3];

      // keep the first and the last point fixed on the x axis.
      x =
        activePathPoint.current === 0
          ? zoom.current
          : activePathPoint.current === Points.length - 1
          ? size.current + zoom.current
          : x;

      // the distance between the point and the handle point.
      const distance = [
        Points[handleIndex][handlePos[0]] - Points[activePathPoint.current][p.length - 2],
        Points[handleIndex][handlePos[1]] - Points[activePathPoint.current][p.length - 1],
      ];

      // move the point on the path.
      Points[activePathPoint.current][p.length - 2] = x;
      Points[activePathPoint.current][p.length - 1] = y;

      // move the control point with the same distance from the active point.
      Points[handleIndex][handlePos[0]] = distance[0] + x;
      Points[handleIndex][handlePos[1]] = distance[1] + y;

      // if the smooth corners is on for this point.
      if (toggledAnchors.has(activePathPoint.current)) {
        const index = activePathPoint.current === 1 ? 2 : 0;
        x =
          activePathPoint.current === 0
            ? zoom.current
            : activePathPoint.current === Points.length - 1
            ? size.current + zoom.current
            : x;
        Points[activePathPoint.current === 0 ? 1 : activePathPoint.current][index] = x;
        Points[activePathPoint.current === 0 ? 1 : activePathPoint.current][index + 1] = y;
      }

      setPoints(Points);
      return;
    }

    // move handle point.
    if (activeControlPoint.current !== null) {
      Points[activeControlPoint.current[0]][activeControlPoint.current[1]] = x;
      Points[activeControlPoint.current[0]][activeControlPoint.current[1] + 1] = y;

      setPoints(Points);
    }
  }, []);

  /** - Converts a two dimensional array to a path string as `(0 to 1)` points. */
  const parseResult = (p = points) => {
    const points_0to1 = p.map(el =>
      el.map((e, i) => ([1, 3, 5].includes(i) ? 1 - (e - zoom.current) / size.current : (e - zoom.current) / size.current))
    );
    return constructPath(points_0to1);
  };

  /** - Delete the last selected point on the path by pressing the `delete` key. */
  const deletePoint = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' && selectedPoint.current !== null && selectedPoint.current !== 0 && eventPoint.current.length > 2) {
      const Points = [...eventPoint.current];
      // if C point is selected, delete the one after it and move C point to its position.
      if (selectedPoint.current === 1) {
        // copy C point from the next point.
        Points[1][2] = Points[2][0];
        Points[1][3] = Points[2][1];
        Points[1][4] = Points[2][2];
        Points[1][5] = Points[2][3];
        // delete the next point.
        Points.splice(2, 1);
        // if the point is selected to be deleted.
      } else if (selectedPoint.current === Points.length - 1) {
        if (Points.length - 2 === 1) {
          Points[1][4] = Points[Points.length - 1][2];
          Points[1][5] = Points[Points.length - 2][3];
        } else {
          Points[Points.length - 2][2] = Points[Points.length - 1][2];
          Points[Points.length - 2][3] = Points[Points.length - 2][3];
        }
        Points.splice(selectedPoint.current, 1);
      } else {
        Points.splice(selectedPoint.current, 1);
      }

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

    return animare(
      {
        from: [zoom.current, size.current + zoom.current, 0],
        to: [size.current + zoom.current, zoom.current, size.current],
        duration: 2000,
        ease: [ease.linear, ease.custom(parseResult())],
        autoPlay: false,
      },
      async ([x, y, w], { isFirstFrame, isFinished, fps }) => {
        if (isFirstFrame) {
          lineH.style.display = 'block';
          lineV.style.display = 'block';
          maskedPath.style.display = 'block';
          path.style.transition = 'none';
          path.style.stroke = 'var(--blured-path)';
          if (!autoHideHandles.current)
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
            .forEach(e => (e!.style.display = autoHideHandles.current ? 'none' : 'block'));
          await new Promise(resolve => setTimeout(resolve, 300));
          path.style.removeProperty('transition');
        }
      }
    );
  });

  const undo = (e: KeyboardEvent) => {
    if (undoStack.current.length === 0 || !(e.ctrlKey && e.key.toLowerCase() === 'z')) return;
    setPoints(convertPathToPoints(undoStack.current[undoStack.current.length - 1], size.current, zoom.current));
    undoStack.current.pop();
  };

  useEffect(() => {
    findSmoothCorners(points, toggledAnchors);

    const onMouseUp = () => {
      document.removeEventListener('pointermove', mouseMove);
      activePathPoint.current = null;
      activeControlPoint.current = null;
      isZooming = false;
      window.localStorage.setItem('saved', parseResult(eventPoint.current));
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

    // update textarea text
    (document.querySelector('.results textarea') as HTMLTextAreaElement).value = parseResult()
      .replace(/\s*M/gi, '›M')
      .replace(/\s*S/g, '\n›S')
      .replace(/\s*C/g, '\n›C');

    if (!tmout && !isZooming) {
      tmout = true;
      setTimeout(() => {
        isOverLapping = checkOverlap(parseResult());
        (document.querySelector('.path') as SVGPathElement).style.stroke = isOverLapping ? 'red' : 'var(--active-path)';
        tmout = false;
      }, 50);
    }
  }, [points]);

  const onZoom = (value: number) => {
    isZooming = true;
    const p = parseResult();
    zoom.current = 300 - value;
    gridPoints.current = new Array(11).fill(0).map((_, i) => zoom.current + (i * size.current) / 10);
    setPoints(pathToPoints(p));
    animation?.setOptions({
      from: [zoom.current, size.current + zoom.current, 0],
      to: [size.current + zoom.current, zoom.current, size.current],
    });
  };

  const playCurrentEasing = () => {
    animation?.setOptions({ ease: [ease.linear, ease.custom(parseResult())] });
    animation?.resume();
  };

  const pauseAnimation = () => animation?.pause();

  const setDuration = (duration: number) => animation?.setOptions({ duration });

  const toggleExportDialog = (dialog: ExportTypes) => {
    if (dialog === 'CSS') cssDialogRef.current.toggle();
    if (dialog === 'SVG Path') exportSvgDialogRef.current.toggle();
    if (dialog === 'JS File') exportJsDialogRef.current.toggle();
  };

  const contextValue = {
    points,
    size,
    zoom,
    magnet,
    undoStack,
    toggledAnchors,
    gridPoints,
    autoHideHandles,
    activeControlPoint,
    selectedPoint,
    activePathPoint,
    eventPoint,
    onZoom,
    setPoints,
    parseResult,
    playCurrentEasing,
    pauseAnimation,
    setDuration,
    mouseMove,
    toggleExportDialog,
  };

  return (
    <CTX.Provider value={contextValue}>
      <Dialog ref={exportJsDialogRef}>
        <ExportJsFile />
      </Dialog>

      <Dialog ref={exportSvgDialogRef}>
        <ExportSvg />
      </Dialog>

      <Dialog ref={cssDialogRef}>
        <ExportCss />
      </Dialog>

      <div className='container'>
        <SidePanel />

        <div style={{ position: 'relative' }}>
          <h2 className='title'>Animare Ease Visualizer</h2>

          <Panel />
        </div>
      </div>

      <SmallSidePanel />
    </CTX.Provider>
  );
}
