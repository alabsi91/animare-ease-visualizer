import './SvgPanel.css';
import React, { useCallback, useContext } from 'react';

import CTX from '../Helpers/CTX';
import { constructPath } from '../Helpers/Helpers';

/** - The radius of the points on the path. */
const pointRadius = 2;

export default function Panel() {
  const {
    zoom,
    size,
    gridPoints,
    autoHideHandles,
    points,
    undoStack,
    activeControlPoint,
    activePathPoint,
    selectedPoint,
    eventPoint,
    toggledAnchors,
    parseResult,
    setPoints,
    mouseMove,
  } = useContext(CTX);

  /** - Renders the grid numbers inside the svg panel. */
  const drawGraphNumbers = useCallback(() => {
    let numbers = [];
    for (let i = 0; i < 11; i++) {
      const e = gridPoints.current[i];
      numbers.push(
        <text key={'numberV' + i} className='grid-text' dominantBaseline='middle' textAnchor='end' x={zoom.current - 5} y={e}>
          {(10 - i * 1) / 10}
        </text>
      );
      numbers.push(
        <text
          key={'numberH' + i}
          className='grid-text'
          dominantBaseline='hanging'
          textAnchor='middle'
          x={e}
          y={size.current + zoom.current + 5}
        >
          {(i * 1) / 10}
        </text>
      );
    }
    return numbers;
  }, []);

  /** - Renders the grid lines inside the svg panel. */
  const drawGraphLines = useCallback(() => {
    let lines = [];
    for (let i = 1; i < 10; i++) {
      const e = gridPoints.current[i];
      lines.push(
        <line key={'lineV' + i} className='grid-line' x1={zoom.current} y1={e} x2={size.current + zoom.current} y2={e} />
      );
      lines.push(
        <line key={'lineH' + i} className='grid-line' x1={e} y1={zoom.current} x2={e} y2={size.current + zoom.current} />
      );
    }
    return lines;
  }, []);

  /** - Renders control points and their handles and attaches events. */
  const drawHandles = () => {
    let handlesPoints: number[][] = [];
    points.forEach((e, i) => {
      if (i === 0) return;
      if (i === 1) {
        handlesPoints.push([e[0], e[1]]);
        handlesPoints.push([e[2], e[3]]);
        return;
      }
      handlesPoints.push([e[0], e[1]]);
    });

    return handlesPoints.map((e, i) => {
      const onMouseDown = () => {
        activeControlPoint.current = i === 0 ? [1, 0] : i === 1 ? [1, 2] : [i, 0];
        document.addEventListener('pointermove', mouseMove);
        undoStack.current.push(parseResult());
      };

      const onFocus = () => {
        if (!autoHideHandles.current) return;

        const line = document.querySelectorAll('.handle-line')[i] as SVGLineElement;
        line.style.display = 'block';

        const circle = document.querySelectorAll('.handle-point')[i] as SVGCircleElement;
        const a = circle.parentElement as HTMLAnchorElement;
        a.style.display = 'block';

        const circles = document.querySelectorAll<SVGCircleElement>('.path-point');
        circles.forEach(e => (e.parentElement!.style.display = 'block'));
      };

      const onBlur = () => {
        // ? all this workaround is because of a bug in firefox.
        const itPoint = document.querySelectorAll('.path-point')[i].parentElement;
        setTimeout(() => {
          if (!autoHideHandles.current || document.activeElement === itPoint) return;

          const line = document.querySelectorAll('.handle-line')[i] as SVGLineElement;
          line.style.display = 'none';

          const circle = document.querySelectorAll('.handle-point')[i] as SVGCircleElement;
          const a = circle.parentElement as HTMLAnchorElement;
          a.style.display = 'none';

          if (document.activeElement?.nodeName !== 'a') {
            const circles = document.querySelectorAll<SVGCircleElement>('.path-point');
            circles.forEach(e => (e.parentElement!.style.display = 'none'));
          }
        }, 0);
      };

      const x2 = i === 0 ? points[0][0] : i === 1 ? points[1][4] : points[i][2];
      const y2 = i === 0 ? points[0][1] : i === 1 ? points[1][5] : points[i][3];

      return [
        <line
          key={'handlesPointsLine' + i}
          style={{ display: autoHideHandles.current ? 'none' : 'block' }}
          className='handle-line auto-hide'
          x1={e[0]}
          y1={e[1]}
          x2={x2}
          y2={y2}
        />,
        <a
          key={'handlesPoints' + i}
          style={{ display: autoHideHandles.current ? 'none' : 'block' }}
          className='auto-hide'
          href='#point'
          onFocus={onFocus}
          onBlur={onBlur}
          onDragStart={e => e.preventDefault()}
          onClick={e => e.preventDefault()}
        >
          <circle className='handle-point point' onPointerDown={onMouseDown} cx={e[0]} cy={e[1]} r={pointRadius} />
        </a>,
      ];
    });
  };

  /** - Renders and attaches events to points on the path. */
  const drawPoints = () => {
    return points.map((e, i) => {
      const onMouseDown = (e: React.MouseEvent<Element>) => {
        activePathPoint.current = i;
        selectedPoint.current = i;

        if (e.shiftKey) {
          if (toggledAnchors.has(i)) {
            toggledAnchors.delete(i);
            const Points = [...points];
            const index = i === 0 ? 1 : i;
            const pos = [i === 0 ? 0 : Points[i].length - 4, i === 0 ? 1 : Points[i].length - 3];
            Points[index][pos[0]] -= 10;
            Points[index][pos[1]] += 10;
          } else toggledAnchors.add(i);

          mouseMove(e);
        }

        document.addEventListener('pointermove', mouseMove);
        undoStack.current.push(parseResult());
      };

      const onFocus = () => {
        if (!autoHideHandles.current) return;

        const line = document.querySelectorAll('.handle-line')[i] as SVGLineElement;
        line.style.display = 'block';

        const circle = document.querySelectorAll('.handle-point')[i] as SVGCircleElement;
        const a = circle.parentElement as HTMLAnchorElement;
        a.style.display = 'block';

        const circles = document.querySelectorAll<SVGCircleElement>('.path-point');
        circles.forEach(e => ((e.parentElement as HTMLAnchorElement).style.display = 'block'));
      };

      const onBlur = () => {
        // ? all this workaround is because of a bug in firefox.
        const itHandle = document.querySelectorAll('.handle-point')[i].parentElement as HTMLAnchorElement;
        setTimeout(() => {
          if (!autoHideHandles.current || document.activeElement === itHandle) return;

          const line = document.querySelectorAll('.handle-line')[i] as SVGLineElement;
          line.style.display = 'none';

          itHandle.style.display = 'none';
          if (document.activeElement?.nodeName !== 'a') {
            const circles = document.querySelectorAll<SVGCircleElement>('.path-point');
            circles.forEach(e => ((e.parentElement as HTMLAnchorElement).style.display = 'none'));
          }
        }, 0);
      };

      return (
        <a
          key={'Points' + i}
          style={{ display: autoHideHandles.current ? 'none' : 'block' }}
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
    });
  };

  /** - Add new point on the path by pressing `Alt + Click`. */
  const addNewPoint = (e: React.MouseEvent<SVGPathElement>) => {
    if (!e.altKey) return;
    const svg = document.querySelector(`.svg`) as SVGSVGElement;
    const { left, top, width, height } = svg.getBoundingClientRect();
    // calculate mouse coordinates.
    let x = (e.clientX - left) * ((size.current + zoom.current * 2) / width);
    let y = (e.clientY - top) * ((size.current + zoom.current * 2) / height);
    x = Math.min(Math.max(x, 0), size.current + zoom.current * 2);
    y = Math.min(Math.max(y, 0), size.current + zoom.current * 2);

    const Points = [...eventPoint.current];

    // find where to insert the new point.
    let insertIndex = 0;
    for (let i = 0; i < Points.length; i++) {
      const xP = i === 0 ? Points[i][0] : i === 1 ? Points[i][4] : Points[i][2];
      if (xP > x) {
        insertIndex = i;
        break;
      }
    }

    if (insertIndex === 1) {
      // add new point after C.
      Points.splice(2, 0, [Points[1][2], Points[1][3], Points[1][4], Points[1][5]]);
      // move C point to the add position.
      Points[1][2] = x - 10;
      Points[1][3] = y + 10;
      Points[1][4] = x;
      Points[1][5] = y;
      // switch toggledAnchors indexes.
      if (toggledAnchors.has(1)) {
        toggledAnchors.delete(1);
        toggledAnchors.add(2);
        mouseMove(e); // update points.
      }
    } else Points.splice(insertIndex, 0, [x - 10, y + 10, x, y]);

    setPoints(Points);
  };

  /** - Show the points if the path gets focus only when `autoHideHandles` is enabled. */
  const onPathFocus = () => {
    if (!autoHideHandles.current) return;

    const circles = document.querySelectorAll<SVGCircleElement>('.path-point');

    circles.forEach(e => ((e.parentElement as HTMLAnchorElement).style.display = 'block'));
  };

  /** - Hide the points if the path loses focus only when `autoHideHandles` is enabled. */
  const onPathBlur = () => {
    // all this workaround is because of a bug in firefox.
    setTimeout(() => {
      if (!autoHideHandles.current || document.activeElement!.nodeName === 'a') return;

      const circles = document.querySelectorAll<SVGCircleElement>('.path-point');

      circles.forEach(e => ((e.parentElement as HTMLAnchorElement).style.display = 'none'));
    }, 0);
  };

  return (
    <svg
      className='svg'
      xmlns='http://www.w3.org/2000/svg'
      viewBox={`0 0 ${size.current + zoom.current * 2} ${size.current + zoom.current * 2}`}
    >
      {/* grid lines and numbers */}
      <g className='grid-group'>
        <rect className='svg-background' x={zoom.current} y={zoom.current} width={size.current} height={size.current} />
        {drawGraphNumbers()}
        <line
          className='grid-line'
          x1={zoom.current}
          y1={size.current + zoom.current}
          x2={size.current + zoom.current}
          y2={zoom.current}
        />
        {drawGraphLines()}
        <text className='grid-text' textAnchor='middle' x={(size.current + zoom.current * 2) / 2} y={zoom.current - 5}>
          Progress
        </text>
        <text
          className='grid-text'
          textAnchor='middle'
          x={size.current + zoom.current + 4}
          y={(size.current + zoom.current * 2) / 2}
          style={{ writingMode: 'vertical-rl' }}
        >
          Value
        </text>
      </g>

      <a
        href='#path'
        onBlur={onPathBlur}
        onFocus={onPathFocus}
        onDragStart={e => e.preventDefault()}
        onClick={e => e.preventDefault()}
      >
        <path className='path' d={constructPath(points)} onClick={addNewPoint} />
      </a>

      {/* handles and handles points */}
      <g className='handles-group'>{drawHandles()}</g>

      {/* on line points group */}
      <g className='path-points-group'>{drawPoints()}</g>

      {/* for animation group */}
      <g>
        <mask id='animation-path-mask'>
          <rect fill='white' x={zoom.current} y={0} width={0} height={size.current + zoom.current * 2} />
        </mask>

        <path className='animation-path' d={constructPath(points)} mask='url(#animation-path-mask)' />

        <line
          className='animation-horizontal-line'
          x1={zoom.current}
          y1={size.current + zoom.current}
          x2={size.current + zoom.current}
          y2={size.current + zoom.current}
        />
        <line
          className='animation-vertical-line'
          x1={zoom.current}
          y1={0}
          x2={zoom.current}
          y2={size.current + zoom.current * 2}
        />
        <line
          className='animation-fill-line-bg'
          x1={size.current + zoom.current + 10}
          y1={size.current + zoom.current}
          x2={size.current + zoom.current + 10}
          y2={zoom.current}
        />
        <line
          className='animation-fill-line'
          x1={size.current + zoom.current + 10}
          y1={size.current + zoom.current}
          x2={size.current + zoom.current + 10}
          y2={size.current + zoom.current}
        />
        <circle className='animation-point point' cx={size.current + zoom.current + 10} cy={size.current + zoom.current} r={4} />
        <text
          className='grid-text'
          id='fps'
          dominantBaseline='middle'
          x={size.current + zoom.current + 18}
          y={size.current + zoom.current}
        >
          0 FPS
        </text>
      </g>
    </svg>
  );
}
