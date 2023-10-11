import animare, { ease, organize } from 'animare';
import { useAnimare } from 'animare/react';
import React, { useCallback, useEffect, useRef } from 'react';
import './SidePanel.css';

import { exportTypes, useApp } from '../Helpers/AppContext';
import { eases } from '../Paths';
import HighlightTextarea from '../components/HighlightTextarea/HighlightTextarea';
import Select from '../components/Select/Select';
import { parse } from '../Helpers/parsePath';

import type { animareOnUpdate } from 'animare/lib/methods/types';
import type { ExportTypes } from '../Helpers/AppContext';
import { getPointsFromPathString } from '../Helpers/utils';
import type { HighlightTextareaRef } from '../components/HighlightTextarea/HighlightTextarea';

export default function SidePanel() {
  const ctx = useApp();

  const textareaRef = useRef<HighlightTextareaRef>(null!);

  useEffect(() => {
    // update textarea text
    textareaRef.current.setValue(
      ctx.getPathStringFromPoints().replace(/\s*M/gi, 'M').replace(/\s*S/g, '\nS').replace(/\s*C/g, '\nC')
    );
  }, [ctx.points]);

  const pathToPoints = (path: string) => {
    const viewBox = {
      x: ctx.zoom.current,
      y: ctx.zoom.current,
      width: ctx.viewBoxSize.current,
      height: ctx.viewBoxSize.current,
    };
    return getPointsFromPathString(path, viewBox);
  };

  const sidePanelAnimation = useAnimare(() => {
    const container = document.querySelector('.container') as HTMLDivElement;
    const sidePanel = document.querySelector('.sidePanel') as HTMLDivElement;
    const width = sidePanel.offsetWidth;

    const { from, to, delay, get } = organize({
      translateX: { from: 0, to: 110 },
      gridTemplateColumns: { from: width, to: 76, delay: 120 },
    });

    const callback: animareOnUpdate = values => {
      const { gridTemplateColumns, translateX } = get(values);

      sidePanel.style.transform = `translateX(-${translateX}%)`;
      container.style.gridTemplateColumns = `${gridTemplateColumns}px 1fr`;
    };

    return animare({ from, to, duration: 200, delay, autoPlay: false, ease: ease.out.quad }, callback);
  });

  const close = () => {
    const sidePanel = document.querySelector('.sidePanel') as HTMLDivElement;
    sidePanelAnimation?.play({ from: [0, sidePanel.offsetWidth] });
  };

  const onTextAreaChange = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const convertPath = parse(e.target.value.trim()); // convert to path with the format M, ..C

    if (convertPath === e.target.value.trim()) return; // ignore if path didn't' change

    const points = pathToPoints(convertPath);
    const isValid = points.length && points.every(row => row.every(value => typeof value === 'number'));
    const currentPath = ctx.getPathStringFromPoints();

    if (isValid) {
      ctx.undoStack.current.push(currentPath);
      ctx.setPoints(points);
      return;
    }

    // use the current path instead
    textareaRef.current.setValue(currentPath.replace(/\s*M/gi, 'M').replace(/\s*C/g, '\nC'));
  };

  const autoHideHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    ctx.setAutoHideHandles(e.target.checked);
  };

  const textAreaOnKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    (e.target as HTMLTextAreaElement).blur();
  };

  const SelectButton = useCallback(({ title, onClick, isOpen }: { title: string; isOpen: boolean; onClick: () => void }) => {
    return (
      <div className={'builtin-select-container ' + (isOpen ? 'builtin-select-active' : '')}>
        <button className='builtin-select-button' onClick={onClick}>
          {title}
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
            <path d='M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z' />
          </svg>
        </button>
      </div>
    );
  }, []);

  const ExportButton = useCallback(({ onClick }: { onClick: () => void }) => {
    return (
      <button className='buttons' style={{ marginTop: 10 }} onClick={onClick}>
        Export
      </button>
    );
  }, []);

  const onExportSelect = (value: ExportTypes) => {
    ctx.toggleExportDialog(value);
  };

  const toggleShortcuts = () => {
    const container = document.querySelector('.hints') as HTMLDivElement;
    const arrowButton = document.querySelector('.hints-title-container svg') as SVGSVGElement;
    const currentMaxHeight = parseInt(getComputedStyle(container).getPropertyValue('max-height'));
    // close
    if (currentMaxHeight === 1000) {
      container.style.maxHeight = '60px';
      arrowButton.style.transform = 'rotate(180deg)';
      return;
    }

    // open
    container.style.maxHeight = '1000px';
    arrowButton.style.transform = 'rotate(0deg)';
  };

  return (
    <div className='sidePanel custom-scrollbar'>
      <div className='close-panel'>
        <svg onClick={close} role='button' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
          <path d='M11.67 3.87L9.9 2.1 0 12l9.9 9.9 1.77-1.77L3.54 12z' />
        </svg>
      </div>

      <div className='hints'>
        <div className='hints-title-container'>
          <h2>Shortcuts</h2>
          <svg onClick={toggleShortcuts} role='button' xmlns='http://www.w3.org/2000/svg' viewBox='0 -960 960 960'>
            <path d='M480.1-358.5q-6.1 0-10.85-2t-9.25-7L263.331-564.169Q254.5-572.5 254.5-584t9-20.5Q272-613 284-613t20.901 8.401L480-429l175.599-175.599Q664-613 675.5-613t20.5 8.5q8.5 9 8.5 21t-8.331 20.331L500.5-367.5q-5 5-9.65 7t-10.75 2Z' />
          </svg>
        </div>
        <ul>
          <li>
            <code>ALT + CLICK</code>
            <br />
            <p>Click on the line to add a new point.</p>
          </li>
          <li>
            <code>CTRL + DRAG</code>
            <br />
            <p>Drag the control point to move it independently.</p>
          </li>
          <li>
            <code>CTRL + CLICK</code>
            <br />
            <p>Click on the anchor point to reset its control points.</p>
          </li>
          <li>
            <code>SHIFT + CLICK</code>
            <br />
            <p>Click on the anchor point to toggle smooth corners.</p>
          </li>
          <li>
            <code>SPACE + DRAG</code>
            <br />
            <p>Drag to pan the canvas.</p>
          </li>
          <li>
            <code>CTRL + MOUSE WHEEL</code>
            <br />
            <p>Use the mouse wheel to zoom in and out.</p>
          </li>
          <li>
            <code>DELETE</code>
            <br />
            <p>Delete the selected anchor point.</p>
          </li>
          <li>
            <code>CTRL-Z</code>
            <br />
            <p>Undo the last modification.</p>
          </li>
        </ul>
      </div>

      <hr />

      <div className='options'>
        <div className='build-in-eases'>
          <p>Presets</p>

          <Select
            names={Object.keys(eases)}
            values={Object.values(eases)}
            value={ctx.preset}
            onChange={ctx.onPresetSelect}
            SelectButton={SelectButton}
          />
        </div>
        <div className='buttons-container'>
          <button className='buttons' onClick={ctx.playCurrentEasing}>
            Play
          </button>
          <button className='buttons' onClick={ctx.pauseAnimation}>
            Pause
          </button>
        </div>

        <Select
          names={exportTypes}
          values={exportTypes}
          onChange={onExportSelect}
          SelectButton={ExportButton}
          highlightSelected={false}
        />
        <hr />
        <h2>Options</h2>
        <div>
          <input
            id='snappeToGrid'
            type='checkbox'
            defaultChecked={ctx.magnet.current}
            onChange={e => (ctx.magnet.current = e.target.checked)}
          />
          <label htmlFor='snappeToGrid'>Enable snapping to the grid.</label>
        </div>
        <div>
          <input id='hideAnchor' type='checkbox' defaultChecked={ctx.autoHideHandles} onChange={autoHideHandler} />
          <label htmlFor='hideAnchor'>Auto hide anchor points.</label>
        </div>
        <div className='options-duration'>
          <p>Duration</p>
          <input type='number' min='0' defaultValue='2000' step='100' onChange={e => ctx.setDuration(+e.target.value)} />
        </div>
      </div>

      <hr />

      <div className='results'>
        <h2>SVG Path</h2>

        <HighlightTextarea
          ref={textareaRef}
          defaultValue={ctx.getPathStringFromPoints()}
          rows={ctx.points.length}
          onBlur={onTextAreaChange}
          onKeyDown={textAreaOnKeyDown}
          wrap='hard'
          highlight={[
            { match: /[a-z]/gi, class: 'hljs-attribute' },
            { match: /\d/g, class: 'hljs-number' },
            { match: /\./g, class: 'hljs-dot' },
          ]}
        />
      </div>
    </div>
  );
}
