/* eslint-disable react-hooks/exhaustive-deps */
import './CustomEase.css';
import { animare, ease } from 'animare';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { eases } from './Pathes';
import Dialog from './Dialog';

const size = 200; // SVG drawing area size.
let zoom = 50, // SVG around the drawing area.
  pointRadius = 2, // Radius of the points.
  activePoint = null, // currently moving point.
  activeHandle = null, // currently moving handle point.
  selectedPoint = null, // last selected point for deletion.
  magnet = true, // snap to the nearest point or to the grid.
  autoHideHandles = false, // hide handles when not in focus.
  animation = null, // animation object.
  tmout = null, // check for overlapping path threshold.
  isOverLapping = false, // to set path correct color after animation end.
  isZooming = false, // check for zooming on slider change to pause overlap check.
  selectedEase = window.localStorage.getItem('saved') ? 'none' : 'easeInSine',
  gridPoints = new Array(11).fill(0).map((_, i) => zoom + (i * size) / 10);

const undoStack = [],
  toggledAnchors = new Set(); // enabled smooth anchors.

export default function CustomEase() {
  const dialog = useRef();

  const convertPathToPoints = path => {
    const pathData = path.match(/-?[0-9.]+/g).map((v, i) => (i % 2 ? 1 - +v : +v) * size + zoom);
    const points = [];
    points.push([pathData[0], pathData[1]]);
    points.push([pathData[2], pathData[3], pathData[4], pathData[5], pathData[6], pathData[7]]);
    for (let i = 8; i < pathData.length; i += 4) {
      points.push([pathData[i], pathData[i + 1], pathData[i + 2], pathData[i + 3]]);
    }

    return points;
  };

  const [points, setPoints] = useState(convertPathToPoints(window.localStorage.getItem('saved') || eases.easeInSine));

  const eventPoint = useRef(points);

  const checkOverlap = useCallback(p => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', parseResult(p));

    let largest = 0;
    for (let i = 0; i <= 100; i++) {
      const y = i / 100;
      const pathLength = y * path.getTotalLength();
      const x = Math.round(path.getPointAtLength(pathLength).x * 1000) / 1000;
      if (x > largest) largest = x;
      if (x < largest) return true;
    }
    return false;
  }, []);

  const mouseMove = useCallback(e => {
    const svg = document.querySelector('.svg');
    const { left, top, width, height } = svg.getBoundingClientRect();

    // calculate mouse coordinates.
    let x = (e.clientX - left) * ((size + zoom * 2) / width);
    let y = (e.clientY - top) * ((size + zoom * 2) / height);
    x = Math.min(Math.max(x, 0), size + zoom * 2);
    y = Math.min(Math.max(y, 0), size + zoom * 2);

    selectedEase = 'none';

    const Points = [...eventPoint.current];

    // stick to the grid.
    if (magnet) {
      const threshold = 2;
      const pointsX = [];
      const pointsY = [];
      Points.forEach((p, i) => {
        i === 0 ? pointsX.push(p[0]) : i === 1 ? pointsX.push(p[0], p[2], p[4]) : pointsX.push(p[0], p[2]);
        i === 0 ? pointsY.push(p[1]) : i === 1 ? pointsY.push(p[1], p[3], p[5]) : pointsY.push(p[1], p[3]);
      });
      if (activeHandle !== null) {
        pointsX.splice(pointsX.indexOf(Points[activeHandle[0]][activeHandle[1]]), 1);
        pointsY.splice(pointsY.indexOf(Points[activeHandle[0]][activeHandle[1] + 1]), 1);
      } else if (activePoint !== null) {
        const p = Points[activePoint];
        pointsX.splice(pointsX.indexOf(Points[activePoint][p.length - 2]), 1);
        pointsY.splice(pointsY.indexOf(Points[activePoint][p.length - 1]), 1);
      }
      x = [...gridPoints, ...pointsX].find(p => x + threshold > p && x - threshold < p) || x;
      y = [...gridPoints, ...pointsY].find(p => y + threshold > p && y - threshold < p) || y;
    }

    // move line point.
    if (activePoint !== null) {
      const p = Points[activePoint];
      const handleIndex = activePoint === 0 ? 1 : activePoint;
      const handlePos = [activePoint === 0 ? 0 : p.length - 4, activePoint === 0 ? 1 : p.length - 3];

      // keep the first and the last point fixed on the x axis.
      x = activePoint === 0 ? zoom : activePoint === Points.length - 1 ? size + zoom : x;

      // the distance between the point and the handle point.
      const distance = [
        Points[handleIndex][handlePos[0]] - Points[activePoint][p.length - 2],
        Points[handleIndex][handlePos[1]] - Points[activePoint][p.length - 1],
      ];

      Points[activePoint][p.length - 2] = x;
      Points[activePoint][p.length - 1] = y;
      // move handle point with the same distance from the active point.
      Points[handleIndex][handlePos[0]] = distance[0] + x;
      Points[handleIndex][handlePos[1]] = distance[1] + y;

      // to hide anchors handles.
      if (toggledAnchors.has(activePoint)) {
        const index = activePoint === 1 ? 2 : 0;
        x = activePoint === 0 ? zoom : activePoint === Points.length - 1 ? size + zoom : x;
        Points[activePoint === 0 ? 1 : activePoint][index] = x;
        Points[activePoint === 0 ? 1 : activePoint][index + 1] = y;
      }

      setPoints(Points);
    }

    // move handle point.
    if (activeHandle !== null) {
      Points[activeHandle[0]][activeHandle[1]] = x;
      Points[activeHandle[0]][activeHandle[1] + 1] = y;

      setPoints(Points);
    }
  }, []);

  const parsePoints = (p = points) => {
    let d = '';
    p = p.map(e => e.map(i => +i.toFixed(3)));
    p.forEach((e, i) => {
      const space = i === p.length - 1 ? '' : ' ';
      if (i === 0) {
        d += `M ${e[0]} ${e[1]}` + space;
      } else if (i === 1) {
        d += `C ${e[0]} ${e[1]} ${e[2]} ${e[3]} ${e[4]} ${e[5]}` + space;
      } else {
        d += `S ${e[0]} ${e[1]} ${e[2]} ${e[3]}` + space;
      }
    });
    return d;
  };

  const parseResult = (p = points) =>
    parsePoints(p.map(el => el.map((e, i) => ([1, 3, 5].includes(i) ? 1 - (e - zoom) / size : (e - zoom) / size))));

  const drawPoints = () => {
    return points.map((e, i) => {
      const onMouseDown = e => {
        activePoint = i;
        selectedPoint = i;
        if (e.shiftKey) {
          if (toggledAnchors.has(i)) {
            toggledAnchors.delete(i);
            const Points = [...points];
            const index = i === 0 ? 1 : i;
            const pos = [i === 0 ? 0 : Points[i].length - 4, i === 0 ? 1 : Points[i].length - 3];
            Points[index][pos[0]] -= 10;
            Points[index][pos[1]] += 10;
          } else {
            toggledAnchors.add(i);
          }
          mouseMove(e);
        }
        window.addEventListener('mousemove', mouseMove);
        undoStack.push(parseResult());
      };

      const onFocus = () => {
        if (!autoHideHandles) return;
        document.querySelectorAll('.handle-line')[i].style.display = 'block';
        document.querySelectorAll('.handle-point')[i].parentElement.style.display = 'block';
        document.querySelectorAll('.path-point').forEach(e => (e.parentElement.style.display = 'block'));
      };

      const onBlur = () => {
        // all this workaround is because of the bug in firefox.
        const itHandle = document.querySelectorAll('.handle-point')[i].parentElement;
        setTimeout(() => {
          if (!autoHideHandles || document.activeElement === itHandle) return;
          document.querySelectorAll('.handle-line')[i].style.display = 'none';
          itHandle.style.display = 'none';
          if (document.activeElement.nodeName !== 'a')
            document.querySelectorAll('.path-point').forEach(e => (e.parentElement.style.display = 'none'));
        }, 0);
      };

      return (
        <a
          key={'Points' + i}
          className='auto-hide'
          xlinkHref='#Points'
          href='#Points'
          onFocus={onFocus}
          onBlur={onBlur}
          onDragStart={e => e.preventDefault()}
          onClick={e => e.preventDefault()}
          style={{
            display:
              autoHideHandles && document.activeElement !== document.querySelector('.path')?.parentElement ? 'none' : 'block',
          }}
        >
          <circle
            className='path-point point'
            onMouseDown={onMouseDown}
            cx={e[e.length - 2]}
            cy={e[e.length - 1]}
            r={pointRadius}
          />
        </a>
      );
    });
  };

  const drawHandles = () => {
    let handlesPoints = [];
    points.forEach((e, i) => {
      if (i === 0) return;
      if (i === 1) {
        handlesPoints.push([e[0], e[1]]);
        handlesPoints.push([e[2], e[3]]);
      } else {
        handlesPoints.push([e[0], e[1]]);
      }
    });

    return handlesPoints.map((e, i) => {
      const onMouseDown = () => {
        activeHandle = i === 0 ? [1, 0] : i === 1 ? [1, 2] : [i, 0];
        window.addEventListener('mousemove', mouseMove);
        undoStack.push(parseResult());
      };

      const onFocus = () => {
        if (!autoHideHandles) return;
        document.querySelectorAll('.handle-line')[i].style.display = 'block';
        document.querySelectorAll('.handle-point')[i].parentElement.style.display = 'block';
        document.querySelectorAll('.path-point').forEach(e => (e.parentElement.style.display = 'block'));
      };

      const onBlur = () => {
        // all this workaround is because of the bug in firefox.
        const itPoint = document.querySelectorAll('.path-point')[i].parentElement;
        setTimeout(() => {
          if (!autoHideHandles || document.activeElement === itPoint) return;
          document.querySelectorAll('.handle-line')[i].style.display = 'none';
          document.querySelectorAll('.handle-point')[i].parentElement.style.display = 'none';
          if (document.activeElement.nodeName !== 'a')
            document.querySelectorAll('.path-point').forEach(e => (e.parentElement.style.display = 'none'));
        }, 0);
      };

      const x2 = i === 0 ? points[0][0] : i === 1 ? points[1][4] : points[i][2];
      const y2 = i === 0 ? points[0][1] : i === 1 ? points[1][5] : points[i][3];

      return [
        <line
          key={'handlesPointsLine' + i}
          style={{ display: autoHideHandles ? 'none' : 'block' }}
          className='handle-line auto-hide'
          x1={e[0]}
          y1={e[1]}
          x2={x2}
          y2={y2}
        />,
        <a
          key={'handlesPoints' + i}
          className='auto-hide'
          xlinkHref='#point'
          href='#point'
          onFocus={onFocus}
          onBlur={onBlur}
          onDragStart={e => e.preventDefault()}
          onClick={e => e.preventDefault()}
          style={{ display: autoHideHandles ? 'none' : 'block' }}
        >
          <circle className='handle-point point' onMouseDown={onMouseDown} cx={e[0]} cy={e[1]} r={pointRadius} />
        </a>,
      ];
    });
  };

  const addNewPoint = e => {
    if (e.altKey) {
      const svg = document.querySelector(`.svg`);
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
      } else {
        Points.splice(insertIndex, 0, [x - 10, y + 10, x, y]);
      }

      setPoints(Points);
    }
  };

  const deletePoint = useCallback(e => {
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

  const GraphLines = useCallback(() => {
    let lines = [];
    for (let i = 1; i < 10; i++) {
      const e = gridPoints[i];
      lines.push(<line key={'lineV' + i} className='grid-line' x1={zoom} y1={e} x2={size + zoom} y2={e} />);
      lines.push(<line key={'lineH' + i} className='grid-line' x1={e} y1={zoom} x2={e} y2={size + zoom} />);
    }
    return lines;
  }, []);

  const GraphNumbers = useCallback(() => {
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

  const setupAnimation = useCallback(() => {
    const ball = document.querySelector(`.animation-point`),
      fillLine = document.querySelector(`.animation-fill-line`),
      lineH = document.querySelector(`.animation-horizontal-line`),
      lineV = document.querySelector(`.animation-vertical-line`),
      mask = document.querySelector(`#animation-path-mask rect`),
      path = document.querySelector(`.path`),
      maskedPath = document.querySelector(`.animation-path`),
      fpsEl = document.getElementById(`fps`);

    animation = animare(
      {
        from: [zoom, size + zoom, 0],
        to: [size + zoom, zoom, size],
        duration: 5000,
        ease: [ease.linear, ease.custom(parseResult())],
        autoPlay: false,
      },
      async ([x, y, w], { isFirstFrame, isFinished, fps }) => {
        if (isFirstFrame) {
          lineH.style.display = 'block';
          lineV.style.display = 'block';
          maskedPath.style.display = 'block';
          path.style.transition = 'none';
          path.style.stroke = 'gray';
        }

        ball.setAttribute('cy', y);
        fpsEl.textContent = fps + ' FPS';
        fillLine.setAttribute('y2', y);
        mask.setAttribute('width', Math.abs(w));
        lineH.setAttribute('y2', y);
        lineH.setAttribute('y1', y);
        lineV.setAttribute('x2', x);
        lineV.setAttribute('x1', x);

        if (isFinished) {
          lineH.style.display = 'none';
          lineV.style.display = 'none';
          maskedPath.style.display = 'none';
          path.style.stroke = isOverLapping ? 'red' : 'white';
          await new Promise(resolve => setTimeout(resolve, 300));
          path.style.removeProperty('transition');
        }
      }
    );
  }, []);

  const autoHideHandler = e => {
    autoHideHandles = e.target.checked;
    document.querySelectorAll('.auto-hide').forEach(e => (e.style.display = autoHideHandles ? 'none' : 'block'));
  };

  const copyToClipboard = () => {
    navigator.permissions.query({ name: 'clipboard-write' }).then(result => {
      if (result.state === 'granted' || result.state === 'prompt') {
        navigator.clipboard.writeText(parseResult());
      }
    });
  };

  const undo = e => {
    if (undoStack.length === 0 || !(e.ctrlKey && e.key.toLowerCase() === 'z')) return;
    setPoints(convertPathToPoints(undoStack[undoStack.length - 1]));
    undoStack.pop();
  };

  useEffect(() => {
    setupAnimation();
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', mouseMove);
      activePoint = null;
      activeHandle = null;
      isZooming = false;
      document.querySelector('.build-in-eases select').value = selectedEase;
      window.localStorage.setItem('saved', parseResult(eventPoint.current));
    });
    window.addEventListener('keydown', deletePoint);
    window.addEventListener('keydown', undo);
  }, []);

  useEffect(() => {
    eventPoint.current = points;
    animation?.setOptions({ ease: [ease.linear, ease.custom(parseResult())] });
    document.querySelector('.results textarea').value = parseResult().replace(/ S/g, '\nS').replace(/ C/g, '\nC');

    if (!tmout && !isZooming) {
      tmout = true;
      setTimeout(() => {
        isOverLapping = checkOverlap(points);
        document.querySelector('.path').style.stroke = isOverLapping ? 'red' : 'white';
        tmout = false;
      }, 200);
    }
  }, [points]);

  const onLineFocus = useCallback(() => {
    if (!autoHideHandles) return;
    document.querySelectorAll(`.path-point`).forEach(e => (e.parentElement.style.display = 'block'));
  }, []);

  const onLineBlur = useCallback(() => {
    // all this workaround is because of the bug in firefox.
    setTimeout(() => {
      if (!autoHideHandles || document.activeElement.nodeName === 'a') return;
      document.querySelectorAll(`.path-point`).forEach(e => (e.parentElement.style.display = 'none'));
    }, 0);
  }, []);

  const onEaseSelect = useCallback(e => {
    if (e.target.value === 'none') return;
    selectedEase = e.target.value;
    const Points = convertPathToPoints(eases[e.target.value]);
    setPoints(Points);
  }, []);

  const onZoom = e => {
    isZooming = true;
    const p = parseResult();
    zoom = 300 - +e.target.value;
    gridPoints = new Array(11).fill(0).map((_, i) => zoom + (i * size) / 10);
    setPoints(convertPathToPoints(p));
    animation?.setOptions({ from: [zoom, size + zoom, 0], to: [size + zoom, zoom, size] });
  };

  const onResultChange = e => {
    const value = convertPathToPoints(e.target.value.trim());
    let isValid = false;
    value.forEach(e => (isValid = e.every(e => e !== undefined)));
    if (isValid) {
      undoStack.push(parseResult());
      setPoints(convertPathToPoints(e.target.value.trim()));
    } else e.target.value = parseResult().replace(/ S/g, '\nS').replace(/ C/g, '\nC');
  };

  return (
    <>
      <Dialog ref={dialog} parseResult={parseResult} />
      <div className='container'>
        <div className='sidePanel'>
          <div className='hints'>
            <h2>Hints</h2>
            <p>- Add point: ALT-CLICK on line.</p>
            <p>- Toggle corner: Hold SHIFT while clicking anchor point.</p>
            <p>- Delete anchor: Press DELETE key.</p>
            <p>- Undo: Press CTRL-Z.</p>
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
                defaultValue='5000'
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
                <option key={ease} className='easesItems' value={ease}>
                  {ease}
                </option>
              ))}
            </select>
          </div>

          <div className='buttons-container'>
            <button className='buttons' onClick={() => animation?.resume()}>
              Play
            </button>
            <button className='buttons' onClick={() => animation?.pause()}>
              Pause
            </button>
          </div>

          <button className='buttons' style={{ marginTop: 10 }} onClick={() => dialog.current.show()}>
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
                  e.target.blur();
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
              <GraphLines />
              <line className='grid-line' x1={zoom} y1={size + zoom} x2={size + zoom} y2={zoom} />
              <GraphNumbers />
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
              xlinkHref='#path'
              href='#path'
              onBlur={onLineBlur}
              onFocus={onLineFocus}
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
    </>
  );
}