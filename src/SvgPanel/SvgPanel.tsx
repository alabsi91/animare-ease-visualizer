import React, { Fragment, useCallback } from 'react';
import './SvgPanel.css';

import { useApp } from '../utils/AppContext';
import { clamp } from '../utils/utils';
import { calculateMirrorPoint, solveTFromPositionX, splitCurveAtT } from '../utils/geometry';
import { constructPathFromPoints } from '../utils/utils';

/** The radius of the points along the path */
const pointRadius = 2;

export default function Panel() {
  const ctx = useApp();

  /** Render grid numbers inside the SVG panel. */
  const drawGraphNumbers = useCallback(() => {
    const textElements = [];
    for (let i = 0; i < 11; i++) {
      const e = ctx.gridPoints.current[i];

      // vertical
      const verticalNumber = (10 - i * 1) / 10;
      const verticalPos = { x: ctx.zoom.current - 5, y: e };
      textElements.push(
        <text
          key={'numberV' + i}
          className='grid-text'
          dominantBaseline='middle'
          textAnchor='end'
          x={verticalPos.x}
          y={verticalPos.y}
        >
          {verticalNumber}
        </text>
      );

      // horizontal
      const horizontalNumber = (i * 1) / 10;
      const horizontalPos = { x: e, y: ctx.viewBoxSize.current + ctx.zoom.current + 5 };
      textElements.push(
        <text
          key={'numberH' + i}
          className='grid-text'
          dominantBaseline='hanging'
          textAnchor='middle'
          x={horizontalPos.x}
          y={horizontalPos.y}
        >
          {horizontalNumber}
        </text>
      );
    }

    return textElements;
  }, []);

  /** Render grid lines inside the SVG panel. */
  const drawGraphLines = useCallback(() => {
    const lineElements = [];
    for (let i = 1; i < 10; i++) {
      const e = ctx.gridPoints.current[i];

      // vertical
      const verticalLineStartPos = { x: ctx.zoom.current, y: e };
      const verticalLineEndPos = { x: ctx.viewBoxSize.current + ctx.zoom.current, y: e };
      lineElements.push(
        <line
          key={'lineV' + i}
          className='grid-line'
          x1={verticalLineStartPos.x}
          y1={verticalLineStartPos.y}
          x2={verticalLineEndPos.x}
          y2={verticalLineEndPos.y}
        />
      );

      // horizontal
      const horizontalLineStartPos = { x: e, y: ctx.zoom.current };
      const horizontalLineEndPos = { x: e, y: ctx.viewBoxSize.current + ctx.zoom.current };
      lineElements.push(
        <line
          key={'lineH' + i}
          className='grid-line'
          x1={horizontalLineStartPos.x}
          y1={horizontalLineStartPos.y}
          x2={horizontalLineEndPos.x}
          y2={horizontalLineEndPos.y}
        />
      );
    }

    return lineElements;
  }, []);

  /** Render control points along with their handles and attaches the necessary events. */
  const drawControlPointsAndHandles = () => {
    // get the two control points positions for each curve
    const handlesPoints: { x1: number; y1: number; x2: number; y2: number; curveIndex: number; ctlIndex: 0 | 2 }[] = [];
    for (let i = 0; i < ctx.points.length; i++) {
      if (i === 0) continue; // M

      const currentCurve = ctx.points[i];
      const previousCurve = ctx.points[i - 1];

      handlesPoints.push({
        x1: currentCurve[0], // c0x first control point
        y1: currentCurve[1], // c0y first control point
        x2: previousCurve[previousCurve.length - 2], // p0x curve starting point
        y2: previousCurve[previousCurve.length - 1], // p0y curve starting point
        ctlIndex: 0, // control point x index inside the curve array
        curveIndex: i, // curve array index inside the path points array
      });

      handlesPoints.push({
        x1: currentCurve[2], // c1x second control point
        y1: currentCurve[3], // c1y second control point
        x2: currentCurve[4], // p1x curve ending point
        y2: currentCurve[5], // p1y curve ending point
        ctlIndex: 2, // control point x index inside the curve array
        curveIndex: i, // curve array index inside the path points array
      });
    }

    const elements = [];
    for (let i = 0; i < handlesPoints.length; i++) {
      const e = handlesPoints[i];

      const onMouseDown = () => {
        ctx.activeControlPoint.current = i === 0 ? [1, 0] : [e.curveIndex, e.ctlIndex];
        document.addEventListener('pointermove', ctx.mouseMove);
        ctx.registerMoveForUndo();
      };

      const onBlur = () => {
        // ? This workaround is necessary due to a bug in Firefox.
        const pointIndex = e.ctlIndex === 0 ? e.curveIndex - 1 : e.curveIndex;
        const point = document.querySelectorAll('.path-point')[pointIndex].parentElement;
        const ctrlAnchors = [...document.querySelectorAll<HTMLAnchorElement>(`a[data-for-curve="${pointIndex}"]`)];
        setTimeout(() => {
          const activeEl = document.activeElement as HTMLAnchorElement;
          if (!ctx.autoHideHandles || [point, ...ctrlAnchors].includes(activeEl)) return;

          // Hide all control points.
          document
            .querySelectorAll<HTMLAnchorElement>(`[data-for-curve="${pointIndex}"]`)
            .forEach(e => (e.style.display = 'none'));

          // Hide all points when another point is not active.
          if (document.activeElement?.nodeName !== 'a') {
            const circles = document.querySelectorAll<SVGCircleElement>('.path-point');
            circles.forEach(e => ((e.parentElement as HTMLAnchorElement).style.display = 'none'));
          }
        }, 0);
      };

      elements.push(
        <Fragment key={'handlesPointsLine' + i}>
          <line
            style={{ display: ctx.autoHideHandles ? 'none' : 'block' }}
            className='handle-line auto-hide'
            data-for-curve={e.ctlIndex === 0 ? e.curveIndex - 1 : e.curveIndex}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
          />
          <a
            style={{ display: ctx.autoHideHandles ? 'none' : 'block' }}
            className='auto-hide'
            data-for-curve={e.ctlIndex === 0 ? e.curveIndex - 1 : e.curveIndex}
            href='#point'
            onBlur={onBlur}
            onDragStart={e => e.preventDefault()}
            onClick={e => e.preventDefault()}
          >
            <circle className='handle-point point' onPointerDown={onMouseDown} cx={e.x1} cy={e.y1} r={pointRadius} />
          </a>
        </Fragment>
      );
    }

    return elements;
  };

  /** Render and attach events to points on the path. */
  const drawAnchorPoints = () => {
    const elements = [];
    for (let i = 0; i < ctx.points.length; i++) {
      const e = ctx.points[i];

      const onMouseDown = (e: React.MouseEvent<Element>) => {
        ctx.registerMoveForUndo();

        ctx.activePathPoint.current = i;
        ctx.selectedPoint.current = i;

        // Disable control points collinear.
        if (e.ctrlKey && ctx.toggledCollinear.delete(i) && i !== ctx.points.length - 1) {
          ctx.toggledCollinear.delete(i);
          const curves = [...ctx.points];
          const curveIndex = i === 0 ? 1 : i;
          const currentCurve = curves[curveIndex];
          const nextCurve = curves[curveIndex + 1];
          const ctrlIndex = curveIndex === 0 ? 0 : 2;

          const centerX = currentCurve[4];
          const centerY = currentCurve[5];
          const c0x = currentCurve[ctrlIndex];
          const c0y = currentCurve[ctrlIndex + 1];
          const c1x = nextCurve[0];
          const c1y = nextCurve[0];

          const { x, y } = calculateMirrorPoint(c0x, c0y, c1x, c1y, centerX, centerY);

          nextCurve[0] = x;
          nextCurve[1] = y;

          ctx.mouseMove(e); // force update
        }

        // Toggle smooth corner.
        if (e.shiftKey) {
          if (ctx.toggledAnchors.delete(i)) {
            const curves = [...ctx.points];
            const nextCurve = curves[i + 1];
            const ctrlIndex = i === 0 ? 0 : 2;
            curves[i][ctrlIndex] -= 10;
            curves[i][ctrlIndex + 1] += 10;
            if (nextCurve) {
              nextCurve[0] += 10;
              nextCurve[1] -= 10;
            }
          } else {
            ctx.toggledAnchors.add(i);
          }

          ctx.mouseMove(e); // force update
        }

        document.addEventListener('pointermove', ctx.mouseMove);
      };

      const onFocus = () => {
        if (!ctx.autoHideHandles) return;

        // Show attached control points.
        const ctrl = document.querySelectorAll<SVGLineElement>(`[data-for-curve="${i}"]`);
        ctrl.forEach(e => (e.style.display = 'block'));

        // Show all points
        const circles = document.querySelectorAll<SVGCircleElement>('.path-point');
        circles.forEach(e => ((e.parentElement as HTMLAnchorElement).style.display = 'block'));
      };

      const onBlur = () => {
        // ? This workaround is necessary due to a bug in Firefox.
        const ctrlAnchors = [...document.querySelectorAll<HTMLAnchorElement>(`a[data-for-curve="${i}"]`)];
        setTimeout(() => {
          const activeEl = document.activeElement as HTMLAnchorElement;
          if (!ctx.autoHideHandles || ctrlAnchors.includes(activeEl)) return;

          // Hide all control points.
          const ctrl = document.querySelectorAll<SVGLineElement>(`[data-for-curve="${i}"]`);
          ctrl.forEach(e => (e.style.display = 'none'));

          // Hide all points when another point is not active.
          if (document.activeElement?.nodeName !== 'a') {
            const circles = document.querySelectorAll<SVGCircleElement>('.path-point');
            circles.forEach(e => ((e.parentElement as HTMLAnchorElement).style.display = 'none'));
          }
        }, 0);
      };

      elements.push(
        <a
          key={'Points' + i}
          style={{ display: ctx.autoHideHandles ? 'none' : 'block' }}
          className='auto-hide'
          href='#Points'
          onFocus={onFocus}
          onBlur={onBlur}
          onDragStart={e => e.preventDefault()}
          onClick={e => e.preventDefault()}
        >
          <circle
            className='path-point point'
            onPointerDown={onMouseDown}
            cx={e[e.length - 2]}
            cy={e[e.length - 1]}
            r={pointRadius}
          />
        </a>
      );
    }

    return elements;
  };

  /** Add a new point to the path by pressing `Alt + Click`. */
  const addNewPoint = (e: React.MouseEvent<SVGPathElement>) => {
    if (!e.altKey) return;

    ctx.registerMoveForUndo();

    const svg = document.querySelector(`.svg`) as SVGSVGElement;
    const { left, width } = svg.getBoundingClientRect();

    // Calculate mouse X-coordinates.
    let x = (e.clientX - left) * ((ctx.viewBoxSize.current + ctx.zoom.current * 2) / width);
    // Prevent x from going beyond the SVG edges.
    x = clamp(x, 0, ctx.viewBoxSize.current + ctx.zoom.current * 2) + ctx.viewBoxCoordinate.current.x;

    const Points = [...ctx.eventPoint.current];

    // Determine the insertion index for the new point.
    let insertIndex = 0;
    for (let i = 0; i < Points.length; i++) {
      const xP = i === 0 ? Points[i][0] : Points[i][4];
      if (xP > x) {
        insertIndex = i;
        break;
      }
    }

    const previousCurve = Points[insertIndex - 1]; // M or C
    const currentCurve = Points[insertIndex]; // C

    const p0x = previousCurve[previousCurve.length - 2],
      p0y = previousCurve[previousCurve.length - 1],
      c0x = currentCurve[0],
      c0y = currentCurve[1],
      c1x = currentCurve[2],
      c1y = currentCurve[3],
      p1x = currentCurve[4],
      p1y = currentCurve[5];

    const t = solveTFromPositionX(p0x, p0y, c0x, c0y, c1x, c1y, p1x, p1y, x);
    const { left: leftCurve, right: rightCurve } = splitCurveAtT(p0x, p0y, c0x, c0y, c1x, c1y, p1x, p1y, t);

    Points.splice(insertIndex, 0, [leftCurve[2], leftCurve[3], leftCurve[4], leftCurve[5], leftCurve[6], leftCurve[7]]);

    currentCurve[0] = rightCurve[2]; // c0x
    currentCurve[1] = rightCurve[3]; // c0y
    currentCurve[2] = rightCurve[4]; // c1x
    currentCurve[3] = rightCurve[5]; // c1y

    ctx.setPoints(Points);
  };

  /** Show the points when the path gains focus, but only when `autoHideHandles` is enabled. */
  const onPathFocus = () => {
    if (!ctx.autoHideHandles) return;
    const circles = document.querySelectorAll<SVGCircleElement>('.path-point');
    circles.forEach(e => ((e.parentElement as HTMLAnchorElement).style.display = 'block'));
  };

  /** Hide the points when the path loses focus, but only when `autoHideHandles` is enabled. */
  const onPathBlur = () => {
    // ? This workaround is necessary due to a bug in Firefox.
    setTimeout(() => {
      if (!ctx.autoHideHandles || document.activeElement!.nodeName === 'a') return;
      document.querySelectorAll<SVGCircleElement>('.auto-hide').forEach(e => (e.style.display = 'none'));
    }, 0);
  };

  const pathString = constructPathFromPoints(ctx.points);

  return (
    <svg
      className='svg'
      xmlns='http://www.w3.org/2000/svg'
      viewBox={`${ctx.viewBoxCoordinate.current.x} ${ctx.viewBoxCoordinate.current.y} ${
        ctx.viewBoxSize.current + ctx.zoom.current * 2
      } ${ctx.viewBoxSize.current + ctx.zoom.current * 2}`}
    >
      {/* grid lines and numbers */}
      <g className='grid-group'>
        <rect
          className='svg-background'
          x={ctx.zoom.current}
          y={ctx.zoom.current}
          width={ctx.viewBoxSize.current}
          height={ctx.viewBoxSize.current}
        />
        {drawGraphNumbers()}
        <line
          className='grid-line'
          x1={ctx.zoom.current}
          y1={ctx.viewBoxSize.current + ctx.zoom.current}
          x2={ctx.viewBoxSize.current + ctx.zoom.current}
          y2={ctx.zoom.current}
        />
        {drawGraphLines()}
        <text
          className='grid-text'
          textAnchor='middle'
          x={(ctx.viewBoxSize.current + ctx.zoom.current * 2) / 2}
          y={ctx.zoom.current - 5}
        >
          Time (Progress)
        </text>
        <text
          className='grid-text'
          textAnchor='middle'
          x={ctx.viewBoxSize.current + ctx.zoom.current + 4}
          y={(ctx.viewBoxSize.current + ctx.zoom.current * 2) / 2}
          style={{ writingMode: 'vertical-rl' }}
        >
          Y-axis - Value
        </text>
      </g>

      <a
        href='#path'
        onBlur={onPathBlur}
        onFocus={onPathFocus}
        onDragStart={e => e.preventDefault()}
        onClick={e => e.preventDefault()}
      >
        <path className='path' d={pathString} onClick={addNewPoint} />
      </a>

      {/* handles and handles points */}
      <g className='handles-group'>{drawControlPointsAndHandles()}</g>

      {/* on line points group */}
      <g className='path-points-group'>{drawAnchorPoints()}</g>

      {/* for animation group */}
      <g>
        <mask id='animation-path-mask'>
          <rect fill='white' x={ctx.zoom.current} y={0} width={0} height={ctx.viewBoxSize.current + ctx.zoom.current * 2} />
        </mask>

        <path className='animation-path' d={pathString} mask='url(#animation-path-mask)' />

        <line
          className='animation-horizontal-line'
          x1={ctx.zoom.current}
          y1={ctx.viewBoxSize.current + ctx.zoom.current}
          x2={ctx.viewBoxSize.current + ctx.zoom.current}
          y2={ctx.viewBoxSize.current + ctx.zoom.current}
        />
        <line
          className='animation-vertical-line'
          x1={ctx.zoom.current}
          y1={-200}
          x2={ctx.zoom.current}
          y2={ctx.viewBoxSize.current + ctx.zoom.current * 2 + 200}
        />
        <line
          className='animation-fill-line-bg'
          x1={ctx.viewBoxSize.current + ctx.zoom.current + 10}
          y1={ctx.viewBoxSize.current + ctx.zoom.current}
          x2={ctx.viewBoxSize.current + ctx.zoom.current + 10}
          y2={ctx.zoom.current}
        />
        <line
          className='animation-fill-line'
          x1={ctx.viewBoxSize.current + ctx.zoom.current + 10}
          y1={ctx.viewBoxSize.current + ctx.zoom.current}
          x2={ctx.viewBoxSize.current + ctx.zoom.current + 10}
          y2={ctx.viewBoxSize.current + ctx.zoom.current}
        />
        <circle
          className='animation-point point'
          cx={ctx.viewBoxSize.current + ctx.zoom.current + 10}
          cy={ctx.viewBoxSize.current + ctx.zoom.current}
          r={4}
        />
        <text
          className='grid-text'
          id='fps'
          dominantBaseline='middle'
          x={ctx.viewBoxSize.current + ctx.zoom.current + 18}
          y={ctx.viewBoxSize.current + ctx.zoom.current}
        >
          0 FPS
        </text>
      </g>
    </svg>
  );
}
