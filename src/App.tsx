/* eslint-disable react-hooks/exhaustive-deps */
import './index.css';
import animare, { ease, organize } from 'animare';
import { useAnimare } from 'animare/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { eases } from './Pathes';
import Dialog, { Bezier, parsePath } from './Dialog';
import { animareOnUpdate } from 'animare/lib/methods/types';

/** - SVG's drawing area size. */
const size = 200;
/** - the aria around the SVG's drawing area. */
let zoom = 50,
  /** - The radius of the points on the path. */
  pointRadius = 2,
  /** - The current moving point. */
  activePathPoint: number | null = null,
  /** - The current moving control point. */
  activeControlPoint: number[] | null = null,
  /** - The selected (focused) point, used for deletion. */
  selectedPoint: number | null = null,
  /** - A switch to toggle the snappint to the nearest point or to the grid. */
  magnet = true,
  /** - A switch to toggle auto hidding points and control handles when not focused. */
  autoHideHandles = false,
  /** - Threshold for checking path overlapping. */
  tmout = false,
  /** - To set the path color after the animation end (red or normal). */
  isOverLapping = false,
  /** - To pause checking for path overlapping while zooming using the slide. */
  isZooming = false,
  /** - The current selected built-in easing. */
  selectedEase = window.localStorage.getItem('saved') ? 'none' : 'ease.in.sine',
  /** - An array of number to determine the grid points on the `x` and `y` axis. */
  gridPoints = new Array(11).fill(0).map((_, i) => zoom + (i * size) / 10);

/** - To save path strings pathes for undo. */
const undoStack: string[] = [],
  /** - The set of point that has the smooth corner enabled. */
  toggledAnchors = new Set();

export default function App() {
  /** - To show and hide the download to js file dialog. */
  const dialog = useRef<{ show: () => Promise<void> }>(null);

  /** - Converts a path string to two dimensional array `[[M], [C], ...[S]]` */
  const convertPathToPoints = (path: string) => {
    // get numbers from the string and convert them to percentage values 0 -> 1 .
    const pathData = path.match(/-?[0-9.]+/g)?.map((v, i) => (i % 2 ? 1 - +v : +v) * size + zoom);
    const points: number[][] = [];

    if (!pathData) return points;

    points.push([pathData[0], pathData[1]]); // M points
    points.push([pathData[2], pathData[3], pathData[4], pathData[5], pathData[6], pathData[7]]); // C points

    for (let i = 8; i < pathData.length; i += 4) {
      // S points
      points.push([pathData[i], pathData[i + 1], pathData[i + 2], pathData[i + 3]]);
    }

    return points;
  };

  /** - The current path as two dimensional array `[[M], [C], ...[S]]` */
  const [points, setPoints] = useState(convertPathToPoints(window.localStorage.getItem('saved') || eases['ease.in.sine']));

  /** - The current path as two dimensional array `[[M], [C], ...[S]]` to be used for events. */
  const eventPoint = useRef(points);

  /** - Check if the path is overlapping to turrned it `red`. */
  const checkOverlap = () => {
    const samples = 100;
    const points = parsePath(parseResult());
    let largest = 0;

    for (let e = 0; e < points.length; e++) {
      const { p0, c0, c1, p1 } = points[e];

      for (let i = 0; i < samples; i++) {
        const point = i / samples;
        const { x } = Bezier(p0, c0, c1, p1, point);
        if (x > largest) largest = x;
        if (x < largest) return true;
      }
    }

    return false;
  };

  const mouseMove = useCallback((e: React.MouseEvent<Element> | MouseEvent) => {
    const svg = document.querySelector('.svg') as SVGSVGElement;
    const { left, top, width, height } = svg.getBoundingClientRect();

    // calculate mouse coordinates.
    let x = (e.clientX - left) * ((size + zoom * 2) / width);
    let y = (e.clientY - top) * ((size + zoom * 2) / height);
    x = Math.min(Math.max(x, 0), size + zoom * 2); // clamp
    y = Math.min(Math.max(y, 0), size + zoom * 2); // clamp

    selectedEase = 'none'; // when editing the path it become a custom one none of the built in easing.

    const Points = [...eventPoint.current]; // a copy of the current path points.

    // stick to the grid.
    if (magnet) {
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
      if (activeControlPoint !== null) {
        pointsX.splice(pointsX.indexOf(Points[activeControlPoint[0]][activeControlPoint[1]]), 1);
        pointsY.splice(pointsY.indexOf(Points[activeControlPoint[0]][activeControlPoint[1] + 1]), 1);
        // if the active point on the path is selected remove it from the array to prevent it to stick to it self.
      } else if (activePathPoint !== null) {
        const p = Points[activePathPoint];
        pointsX.splice(pointsX.indexOf(Points[activePathPoint][p.length - 2]), 1);
        pointsY.splice(pointsY.indexOf(Points[activePathPoint][p.length - 1]), 1);
        // if smooth corner is enabled prevent the point on the path to stick to it's control point.
        if (toggledAnchors.has(activePathPoint)) {
          const index = activePathPoint === 1 ? 2 : 0;
          pointsX.splice(pointsX.indexOf(Points[activePathPoint === 0 ? 1 : activePathPoint][index]), 1);
          pointsY.splice(pointsY.indexOf(Points[activePathPoint === 0 ? 1 : activePathPoint][index + 1]), 1);
        }
      }

      // add grid, and calculate which point in the nearest to stick to.
      x = [...gridPoints, ...pointsX].find(p => x + threshold > p && x - threshold < p) || x;
      y = [...gridPoints, ...pointsY].find(p => y + threshold > p && y - threshold < p) || y;
    }

    // move control point when moving the point on the path.
    if (activePathPoint !== null) {
      const p = Points[activePathPoint];
      const handleIndex = activePathPoint === 0 ? 1 : activePathPoint;
      const handlePos = [activePathPoint === 0 ? 0 : p.length - 4, activePathPoint === 0 ? 1 : p.length - 3];

      // keep the first and the last point fixed on the x axis.
      x = activePathPoint === 0 ? zoom : activePathPoint === Points.length - 1 ? size + zoom : x;

      // the distance between the point and the handle point.
      const distance = [
        Points[handleIndex][handlePos[0]] - Points[activePathPoint][p.length - 2],
        Points[handleIndex][handlePos[1]] - Points[activePathPoint][p.length - 1],
      ];

      // move the point on the path.
      Points[activePathPoint][p.length - 2] = x;
      Points[activePathPoint][p.length - 1] = y;

      // move the control point with the same distance from the active point.
      Points[handleIndex][handlePos[0]] = distance[0] + x;
      Points[handleIndex][handlePos[1]] = distance[1] + y;

      // if the smooth corners is on for this point.
      if (toggledAnchors.has(activePathPoint)) {
        const index = activePathPoint === 1 ? 2 : 0;
        x = activePathPoint === 0 ? zoom : activePathPoint === Points.length - 1 ? size + zoom : x;
        Points[activePathPoint === 0 ? 1 : activePathPoint][index] = x;
        Points[activePathPoint === 0 ? 1 : activePathPoint][index + 1] = y;
      }

      setPoints(Points);
      return;
    }

    // move handle point.
    if (activeControlPoint !== null) {
      Points[activeControlPoint[0]][activeControlPoint[1]] = x;
      Points[activeControlPoint[0]][activeControlPoint[1] + 1] = y;

      setPoints(Points);
    }
  }, []);

  /** - Converts a two dimensional array to a path string. */
  const parsePoints = (p = points) => {
    let d = '';
    p = p.map(e => e.map(i => +i.toFixed(3)));
    p.forEach((e, i) => {
      const seperator = i === p.length - 1 ? '' : ' ';
      if (i === 0) {
        d += `M ${e[0]} ${e[1]}` + seperator;
      } else if (i === 1) {
        d += `C ${e[0]} ${e[1]} ${e[2]} ${e[3]} ${e[4]} ${e[5]}` + seperator;
      } else {
        d += `S ${e[0]} ${e[1]} ${e[2]} ${e[3]}` + seperator;
      }
    });
    return d;
  };

  /** - Converts a two dimensional array to a path string as `(0 to 1)` points. */
  const parseResult = (p = points) => {
    const points_0to1 = p.map(el => el.map((e, i) => ([1, 3, 5].includes(i) ? 1 - (e - zoom) / size : (e - zoom) / size)));
    return parsePoints(points_0to1);
  };

  /** - Renders and attaches events to points on the path. */
  const drawPoints = () => {
    return points.map((e, i) => {
      const onMouseDown = (e: React.MouseEvent<Element>) => {
        activePathPoint = i;
        selectedPoint = i;

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
        undoStack.push(parseResult());
      };

      const onFocus = () => {
        if (!autoHideHandles) return;

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
          if (!autoHideHandles || document.activeElement === itHandle) return;

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
        activeControlPoint = i === 0 ? [1, 0] : i === 1 ? [1, 2] : [i, 0];
        document.addEventListener('pointermove', mouseMove);
        undoStack.push(parseResult());
      };

      const onFocus = () => {
        if (!autoHideHandles) return;

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
          if (!autoHideHandles || document.activeElement === itPoint) return;

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
        <line key={'handlesPointsLine' + i} className='handle-line auto-hide' x1={e[0]} y1={e[1]} x2={x2} y2={y2} />,
        <a
          key={'handlesPoints' + i}
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

  /** - Add new point on the path by pressing `Alt + Click`. */
  const addNewPoint = (e: React.MouseEvent<SVGPathElement>) => {
    if (!e.altKey) return;
    const svg = document.querySelector(`.svg`) as SVGSVGElement;
    const { left, top, width, height } = svg.getBoundingClientRect();
    // calculate mouse coordinates.
    let x = (e.clientX - left) * ((size + zoom * 2) / width);
    let y = (e.clientY - top) * ((size + zoom * 2) / height);
    x = Math.min(Math.max(x, 0), size + zoom * 2);
    y = Math.min(Math.max(y, 0), size + zoom * 2);

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

  /** - Delete the last selected point on the path by pressing the `delete` key. */
  const deletePoint = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' && selectedPoint !== null && selectedPoint !== 0 && eventPoint.current.length > 2) {
      const Points = [...eventPoint.current];
      // if C point is selected, delete the one after it and move C point to its position.
      if (selectedPoint === 1) {
        // copy C point from the next point.
        Points[1][2] = Points[2][0];
        Points[1][3] = Points[2][1];
        Points[1][4] = Points[2][2];
        Points[1][5] = Points[2][3];
        // delete the next point.
        Points.splice(2, 1);
        // if the point is selected to be deleted.
      } else if (selectedPoint === Points.length - 1) {
        if (Points.length - 2 === 1) {
          Points[1][4] = Points[Points.length - 1][2];
          Points[1][5] = Points[Points.length - 2][3];
        } else {
          Points[Points.length - 2][2] = Points[Points.length - 1][2];
          Points[Points.length - 2][3] = Points[Points.length - 2][3];
        }
        Points.splice(selectedPoint, 1);
      } else {
        Points.splice(selectedPoint, 1);
      }

      setPoints(Points);
    }
  }, []);

  /** - Renders the grid lines inside the svg panel. */
  const drawGraphLines = useCallback(() => {
    let lines = [];
    for (let i = 1; i < 10; i++) {
      const e = gridPoints[i];
      lines.push(<line key={'lineV' + i} className='grid-line' x1={zoom} y1={e} x2={size + zoom} y2={e} />);
      lines.push(<line key={'lineH' + i} className='grid-line' x1={e} y1={zoom} x2={e} y2={size + zoom} />);
    }
    return lines;
  }, []);

  /** - Renders the grid numbers inside the svg panel. */
  const drawGraphNumbers = useCallback(() => {
    let numbers = [];
    for (let i = 0; i < 11; i++) {
      const e = gridPoints[i];
      numbers.push(
        <text key={'numberV' + i} className='grid-text' dominantBaseline='middle' textAnchor='end' x={zoom - 5} y={e}>
          {(10 - i * 1) / 10}
        </text>
      );
      numbers.push(
        <text key={'numberH' + i} className='grid-text' dominantBaseline='hanging' textAnchor='middle' x={e} y={size + zoom + 5}>
          {(i * 1) / 10}
        </text>
      );
    }
    return numbers;
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
        from: [zoom, size + zoom, 0],
        to: [size + zoom, zoom, size],
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
            .forEach(e => (e!.style.display = autoHideHandles ? 'none' : 'block'));
          await new Promise(resolve => setTimeout(resolve, 300));
          path.style.removeProperty('transition');
        }
      }
    );
  });

  const sidePanelAnimation = useAnimare(() => {
    const container = document.querySelector('.container') as HTMLDivElement;
    const sidePanel = document.querySelector('.sidePanel') as HTMLDivElement;
    const width = sidePanel.offsetWidth;

    const { from, to, get } = organize({
      translateX: { from: 0, to: 110 },
      gridTemplateColumns: { from: width, to: 0 },
    });

    const callback: animareOnUpdate = (values, { isFinished, isReversePlay }) => {
      const { gridTemplateColumns, translateX } = get(values);

      sidePanel.style.transform = `translateX(-${translateX}%)`;
      container.style.gridTemplateColumns = `${gridTemplateColumns}px 1fr`;

      if (isFinished && isReversePlay) {
        container.style.removeProperty('grid-template-columns');
      }
    };

    return animare({ from, to, duration: 200, delay: [0, 200], autoPlay: false, ease: ease.out.quad }, callback);
  });

  const autoHideHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    autoHideHandles = e.target.checked;
    document
      .querySelectorAll<HTMLAnchorElement>('.auto-hide')
      .forEach(e => (e!.style.display = autoHideHandles ? 'none' : 'block'));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(parseResult());
  };

  const undo = (e: KeyboardEvent) => {
    if (undoStack.length === 0 || !(e.ctrlKey && e.key.toLowerCase() === 'z')) return;
    setPoints(convertPathToPoints(undoStack[undoStack.length - 1]));
    undoStack.pop();
  };

  useEffect(() => {
    const onMouseUp = () => {
      document.removeEventListener('pointermove', mouseMove);
      activePathPoint = null;
      activeControlPoint = null;
      isZooming = false;
      (document.querySelector('.build-in-eases select') as HTMLSelectElement).value = selectedEase;
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
    (document.querySelector('.results textarea') as HTMLTextAreaElement).value = parseResult()
      .replace(/ S/g, '\nS')
      .replace(/ C/g, '\nC');

    if (!tmout && !isZooming) {
      tmout = true;
      setTimeout(() => {
        isOverLapping = checkOverlap();
        (document.querySelector('.path') as SVGPathElement).style.stroke = isOverLapping ? 'red' : 'var(--active-path)';
        tmout = false;
      }, 200);
    }
  }, [points]);

  /** - Show the points if the path gets focus only when `autoHideHandles` is enabled. */
  const onPathFocus = () => {
    if (!autoHideHandles) return;

    const circles = document.querySelectorAll<SVGCircleElement>('.path-point');

    circles.forEach(e => ((e.parentElement as HTMLAnchorElement).style.display = 'block'));
  };

  /** - Hide the points if the path loses focus only when `autoHideHandles` is enabled. */
  const onPathBlur = () => {
    // all this workaround is because of a bug in firefox.
    setTimeout(() => {
      if (!autoHideHandles || document.activeElement!.nodeName === 'a') return;

      const circles = document.querySelectorAll<SVGCircleElement>('.path-point');

      circles.forEach(e => ((e.parentElement as HTMLAnchorElement).style.display = 'none'));
    }, 0);
  };

  const onEaseSelect = (e: React.ChangeEvent<HTMLSelectElement> | React.MouseEvent<HTMLOptionElement>) => {
    const target = e.target as HTMLSelectElement;
    if (target.value === 'none') return;
    selectedEase = target.value;
    toggledAnchors.clear();
    const Points = convertPathToPoints(eases[selectedEase]);
    setPoints(Points);
  };

  const onZoom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliders = document.querySelectorAll<HTMLInputElement>("input[type='range']");
    sliders.forEach(el => (el.value = e.target.value));
    isZooming = true;
    const p = parseResult();
    zoom = 300 - +e.target.value;
    gridPoints = new Array(11).fill(0).map((_, i) => zoom + (i * size) / 10);
    setPoints(convertPathToPoints(p));
    animation?.setOptions({ from: [zoom, size + zoom, 0], to: [size + zoom, zoom, size] });
  };

  /** - When edit the text aria: update the path if it's valid. */
  const onResultChange = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const value = convertPathToPoints(e.target.value.trim());
    let isValid = false;
    value.forEach(e => (isValid = e.every(e => e !== undefined)));
    if (isValid) {
      undoStack.push(parseResult());
      setPoints(convertPathToPoints(e.target.value.trim()));
    } else e.target.value = parseResult().replace(/ S/g, '\nS').replace(/ C/g, '\nC');
  };

  const playCurrentEasing = () => {
    animation?.setOptions({ ease: [ease.linear, ease.custom(parseResult())] });
    animation?.resume();
  };

  return (
    <>
      <Dialog ref={dialog} parseResult={parseResult} />
      <div className='container'>
        <div className='sidePanel'>
          <button
            onClick={() => {
              const sidePanel = document.querySelector('.sidePanel') as HTMLDivElement;
              sidePanelAnimation?.play({ from: [0, sidePanel.offsetWidth], delay: [0, 120] });
            }}
            className='close-panel'
          >
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
              <path d='M11.67 3.87L9.9 2.1 0 12l9.9 9.9 1.77-1.77L3.54 12z' />
            </svg>
          </button>

          <div className='hints'>
            <h2>
              Hints{' '}
              <svg xmlns='http://www.w3.org/2000/svg' height='24px' viewBox='0 0 24 24' width='24px' fill='currentColor'>
                <path d='M9,21c0,0.55,0.45,1,1,1h4c0.55,0,1-0.45,1-1v-1H9V21z M12,2C8.14,2,5,5.14,5,9c0,2.38,1.19,4.47,3,5.74V17 c0,0.55,0.45,1,1,1h6c0.55,0,1-0.45,1-1v-2.26c1.81-1.27,3-3.36,3-5.74C19,5.14,15.86,2,12,2z M14,13.7V16h-4v-2.3 C8.48,12.63,7,11.53,7,9c0-2.76,2.24-5,5-5s5,2.24,5,5C17,11.49,15.49,12.65,14,13.7z' />
              </svg>
            </h2>
            <ul>
              <li>
                <b>Add point :</b>
                <br />
                <code>ALT-CLICK</code> on the line.
              </li>
              <li>
                <b>Toggle corner :</b>
                <br />
                Hold <code>SHIFT</code> while <code>clicking</code> anchor point.
              </li>
              <li>
                <b>Delete anchor :</b>
                <br />
                Press <code>DELETE</code> key.
              </li>
              <li>
                <b>Undo :</b>
                <br />
                Press <code>CTRL-Z</code>.
              </li>
            </ul>
          </div>

          <hr />

          <div className='options'>
            <h2>Options</h2>

            <div>
              <input id='snappeToGrid' type='checkbox' defaultChecked={magnet} onChange={e => (magnet = e.target.checked)} />
              <label htmlFor='snappeToGrid'>Enable snapping to the grid.</label>
            </div>

            <div>
              <input id='hideAnchor' type='checkbox' defaultChecked={autoHideHandles} onChange={autoHideHandler} />
              <label htmlFor='hideAnchor'>Auto hide anchor points.</label>
            </div>

            <div className='options-duration'>
              <p>Duration : </p>
              <input
                type='number'
                min='0'
                defaultValue='2000'
                step='100'
                onChange={e => animation?.setOptions({ duration: +e.target.value })}
              />
            </div>

            <div className='options-zoom'>
              <p>Zoom : </p>
              <input type='range' min='0' max='300' defaultValue={300 - zoom} onChange={onZoom} />
            </div>
          </div>

          <hr />

          <div className='build-in-eases'>
            <p>Built-in : </p>

            <select onChange={onEaseSelect} defaultValue={selectedEase}>
              <option className='easesItems' value='none'>
                ....
              </option>
              {Object.keys(eases).map(ease => (
                <option onClick={onEaseSelect} key={ease} className='easesItems' value={ease}>
                  {ease}
                </option>
              ))}
            </select>
          </div>

          <div className='buttons-container'>
            <button className='buttons' onClick={playCurrentEasing}>
              Play
            </button>
            <button className='buttons' onClick={() => animation?.pause()}>
              Pause
            </button>
          </div>

          <button className='buttons' style={{ marginTop: 10 }} onClick={() => dialog.current!.show()}>
            Download as file
          </button>

          <hr />

          <div className='results'>
            <button className='copyButton' onClick={copyToClipboard}>
              Copy to clipboard
            </button>
            <textarea
              defaultValue={parseResult()}
              rows={points.length}
              onBlur={onResultChange}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
            />
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <h2 className='title'>Animare Ease Visualizer</h2>

          <svg className='svg' xmlns='http://www.w3.org/2000/svg' viewBox={`0 0 ${size + zoom * 2} ${size + zoom * 2}`}>
            {/* grid lines and numbers */}
            <g className='grid-group'>
              <rect className='svg-background' x={zoom} y={zoom} width={size} height={size} />
              {drawGraphNumbers()}
              <line className='grid-line' x1={zoom} y1={size + zoom} x2={size + zoom} y2={zoom} />
              {drawGraphLines()}
              <text className='grid-text' textAnchor='middle' x={(size + zoom * 2) / 2} y={zoom - 5}>
                Progress
              </text>
              <text
                className='grid-text'
                textAnchor='middle'
                x={size + zoom + 4}
                y={(size + zoom * 2) / 2}
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
              <path className='path' d={parsePoints()} onClick={addNewPoint} />
            </a>

            {/* handles and handles points */}
            <g className='handles-group'>{drawHandles()}</g>

            {/* on line points group */}
            <g className='path-points-group'>{drawPoints()}</g>

            {/* for animation group */}
            <g>
              <mask id='animation-path-mask'>
                <rect fill='white' x={zoom} y={0} width={0} height={size + zoom * 2} />
              </mask>

              <path className='animation-path' d={parsePoints()} mask='url(#animation-path-mask)' />

              <line className='animation-horizontal-line' x1={zoom} y1={size + zoom} x2={size + zoom} y2={size + zoom} />
              <line className='animation-vertical-line' x1={zoom} y1={0} x2={zoom} y2={size + zoom * 2} />
              <line className='animation-fill-line-bg' x1={size + zoom + 10} y1={size + zoom} x2={size + zoom + 10} y2={zoom} />
              <line
                className='animation-fill-line'
                x1={size + zoom + 10}
                y1={size + zoom}
                x2={size + zoom + 10}
                y2={size + zoom}
              />
              <circle className='animation-point point' cx={size + zoom + 10} cy={size + zoom} r={4} />
              <text className='grid-text' id='fps' dominantBaseline='middle' x={size + zoom + 18} y={size + zoom}>
                0 FPS
              </text>
            </g>
          </svg>
        </div>
      </div>

      <div className='small-side-panel'>
        <button
          title='show the side panel'
          className='open-panel'
          onClick={() => {
            sidePanelAnimation?.reverse({ delay: [120, 0] });
          }}
        >
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
            <polygon points='6.23,20.23 8,22 18,12 8,2 6.23,3.77 14.46,12' />
          </svg>
        </button>

        <button title='play the current easing' onClick={playCurrentEasing}>
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
            <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z' />
          </svg>
        </button>

        <button
          title='Enable snapping to the grid'
          onClick={e => {
            const target = e.target as Element;
            const svg = target.closest('svg') as SVGSVGElement;
            const checkbox = document.getElementById('snappeToGrid') as HTMLInputElement;
            magnet = !magnet;
            if (magnet) svg.style.fill = 'var(--active-point)';
            if (!magnet) svg.style.removeProperty('fill');
            checkbox.checked = magnet;
          }}
        >
          <svg
            style={{ fill: !magnet ? 'var(--text-color)' : 'var(--active-point)' }}
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
          >
            <path d='M17.374 20.235c2.444-2.981 6.626-8.157 6.626-8.157l-3.846-3.092s-2.857 3.523-6.571 8.097c-4.312 5.312-11.881-2.41-6.671-6.671 4.561-3.729 8.097-6.57 8.097-6.57l-3.092-3.842s-5.173 4.181-8.157 6.621c-2.662 2.175-3.76 4.749-3.76 7.24 0 5.254 4.867 10.139 10.121 10.139 2.487 0 5.064-1.095 7.253-3.765zm4.724-7.953l-1.699 2.111-1.74-1.397 1.701-2.114 1.738 1.4zm-10.386-10.385l1.4 1.738-2.113 1.701-1.397-1.74 2.11-1.699z' />
          </svg>
        </button>

        <button
          title='Auto hide anchor points.'
          onClick={e => {
            const target = e.target as Element;
            const svg = target.closest('svg') as SVGSVGElement;
            const checkbox = document.getElementById('hideAnchor') as HTMLInputElement;
            autoHideHandles = !autoHideHandles;

            if (autoHideHandles) svg.style.fill = 'var(--active-point)';
            if (!autoHideHandles) svg.style.removeProperty('fill');

            checkbox.checked = autoHideHandles;

            document
              .querySelectorAll<HTMLAnchorElement>('.auto-hide')
              .forEach(e => (e!.style.display = autoHideHandles ? 'none' : 'block'));
          }}
        >
          <svg
            style={{ fill: !autoHideHandles ? 'var(--text-color)' : 'var(--active-point)' }}
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
          >
            <path d='M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z' />
          </svg>
        </button>

        <button title='copy the result to the clipboard' onClick={copyToClipboard}>
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
            <path d='M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z' />
          </svg>
        </button>

        <button title='download as a js file' onClick={() => dialog.current!.show()}>
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
            <path d='M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z' />
          </svg>
        </button>

        {/* @ts-ignore */}
        <input type='range' min='0' max='300' defaultValue={300 - zoom} onChange={onZoom} orient='vertical' />
      </div>
    </>
  );
}
