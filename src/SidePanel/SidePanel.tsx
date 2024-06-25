import animare, { Timing, createAnimations } from 'animare';
import { ease } from 'animare/plugins';
import { useAnimare } from 'animare/react';
import React, { useCallback, useEffect, useRef } from 'react';
import './SidePanel.css';

import Dialog from '../components/Dialog/Dialog';
import HighlightTextarea from '../components/HighlightTextarea/HighlightTextarea';
import Select from '../components/Select/Select';
import { eases } from '../presets';
import { DialogExportTypes, useApp } from '../utils/AppContext';
import { parse } from '../utils/parsePath';
import { checkForDisabledCollinearPoints, getPointsFromPathString } from '../utils/utils';

import type { OnUpdateCallback, TimelineGlobalOptions } from 'animare';
import type { HighlightTextareaRef } from '../components/HighlightTextarea/HighlightTextarea';

export default function SidePanel() {
  const ctx = useApp();

  const textareaRef = useRef<HighlightTextareaRef>(null!);
  const textareaCurrentValue = useRef('');

  useEffect(() => {
    // update textarea text
    textareaRef.current.setValue(
      ctx.getPathStringFromPoints().replace(/\s*M/gi, 'M').replace(/\s*S/g, '\nS').replace(/\s*C/g, '\nC'),
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
    const smallPanel = document.querySelector('.small-side-panel') as HTMLDivElement;
    const width = sidePanel.offsetWidth;

    const animations = createAnimations([
      { name: 'translateX', from: 0, to: 110 },
      { name: 'gridTemplateColumns', from: width, to: 76, delay: 120 },
      { name: 'showSmallPanel', from: 100, to: 0 },
    ]);

    const globalOptions: TimelineGlobalOptions = {
      ease: ease.out.quad,
      duration: 200,
      autoPlay: false,
      timing: Timing.FromStart,
    };

    const callback: OnUpdateCallback<typeof animations> = values => {
      const { gridTemplateColumns, translateX, showSmallPanel } = values;

      sidePanel.style.transform = `translateX(-${translateX.value}%)`;
      container.style.gridTemplateColumns = `${gridTemplateColumns.value}px 1fr`;
      smallPanel.style.transform = `translateX(-${showSmallPanel.value}%)`;
    };

    return animare.timeline(animations, callback, globalOptions);
  });

  const close = () => {
    const sidePanel = document.querySelector('.sidePanel') as HTMLDivElement;
    sidePanelAnimation.updateValues([{ name: 'gridTemplateColumns', from: sidePanel.offsetWidth }]);
    sidePanelAnimation.play();
  };

  const onTextAreaChange = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const text = e.target.value.trim();
    if (textareaCurrentValue.current === text) return; // ignore if path didn't' change

    const re = /M\s((-?(?!0\d)\d*\.?\d+)\s){2}(C\s((-?(?!0\d)\d*\.?\d+)\s?){6})+$/;

    const needParsing = !re.test(text);

    let path: string;
    try {
      path = needParsing ? parse(text) : text;
    } catch (error) {
      console.error(error);
      path = text;
    }

    const points = pathToPoints(path);
    const isValid = points.length && points.every(row => row.every(value => typeof value === 'number'));
    const currentPath = ctx.getPathStringFromPoints();

    if (isValid) {
      ctx.undoStack.current.push(currentPath);

      ctx.toggledCollinear.clear();
      const disabledCollinear = checkForDisabledCollinearPoints(points);
      disabledCollinear.forEach(ctx.toggledCollinear.add, ctx.toggledCollinear);

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

  const onExportSelect = (value: DialogExportTypes) => {
    Dialog[value]?.toggle();
  };

  const toggleShortcuts = () => {
    const container = document.querySelector('.hints') as HTMLDivElement;
    const arrowButton = document.querySelector('.hints-title-container svg') as SVGSVGElement;

    // open
    if (container.classList.contains('close')) {
      arrowButton.style.transform = 'rotate(0deg)';
      container.classList.add('open');
      container.classList.remove('close');
      return;
    }

    // open
    container.classList.add('close');
    container.classList.remove('open');
    arrowButton.style.transform = 'rotate(180deg)';
  };

  return (
    <div className='sidePanel custom-scrollbar'>
      <div className='close-panel'>
        <svg onClick={close} role='button' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
          <path d='M11.67 3.87L9.9 2.1 0 12l9.9 9.9 1.77-1.77L3.54 12z' />
        </svg>
      </div>

      <div className='links'>
        <a href='https://github.com/alabsi91/animare' target='_blank' rel='me'>
          <span>GitHub</span>
          <svg aria-hidden='true' width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
            <path d='M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.08 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3Z'></path>
          </svg>
        </a>

        <a href='https://x.com/alabsi91' target='_blank' rel='me'>
          <span>X</span>
          <svg aria-hidden='true' width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
            <path d='M 18.242188 2.25 L 21.554688 2.25 L 14.324219 10.507812 L 22.828125 21.75 L 16.171875 21.75 L 10.953125 14.933594 L 4.992188 21.75 L 1.679688 21.75 L 9.40625 12.914062 L 1.257812 2.25 L 8.082031 2.25 L 12.792969 8.480469 Z M 17.082031 19.773438 L 18.914062 19.773438 L 7.082031 4.125 L 5.113281 4.125 Z M 17.082031 19.773438 '></path>
          </svg>
        </a>

        <a href='https://alabsi91.github.io/animare' target='_blank' rel='me'>
          <span>animare</span>
          <svg
            fill='currentColor'
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 500 500'
            enableBackground='new 0 0 500 500'
            xml-space='preserve'
          >
            <path d='M250-0.006C111.926-0.006,0,111.932,0,250.006c0,138.062,111.926,250,250,250c138.062,0,250-111.938,250-250C500,111.932,388.062-0.006,250-0.006z M250,469.371c-120.961,0-219.365-98.404-219.365-219.365   S129.039,30.629,250,30.629c120.955,0,219.365,98.416,219.365,219.377S370.955,469.371,250,469.371z'></path>
            <polygon points='173.005,250.006 173.005,349.953 361.28,250.006 173.005,150.059'></polygon>
          </svg>
        </a>
      </div>

      <hr style={{ marginTop: 0, marginBottom: 16 }} />

      <div className='hints'>
        <div className='hints-title-container'>
          <h2>Shortcuts</h2>
          <svg onClick={toggleShortcuts} role='button' xmlns='http://www.w3.org/2000/svg' viewBox='0 -960 960 960'>
            <path d='M480.1-358.5q-6.1 0-10.85-2t-9.25-7L263.331-564.169Q254.5-572.5 254.5-584t9-20.5Q272-613 284-613t20.901 8.401L480-429l175.599-175.599Q664-613 675.5-613t20.5 8.5q8.5 9 8.5 21t-8.331 20.331L500.5-367.5q-5 5-9.65 7t-10.75 2Z' />
          </svg>
        </div>
        <ul>
          <li title='Add a new point'>
            <code>ALT + CLICK</code> Add a new point
          </li>
          <li title='Move the control point'>
            <code>CTRL + DRAG</code> Move the control point
          </li>
          <li title='Reset control points'>
            <code>CTRL + CLICK</code> Reset control points
          </li>
          <li title='Toggle smooth corners'>
            <code>SHIFT + CLICK</code> Toggle smooth corners
          </li>
          <li title='Pan the canvas'>
            <code>SPACE + DRAG</code> Pan the canvas
          </li>
          <li title='Zoom in/out'>
            <code>CTRL + MOUSE WHEEL</code> Zoom in/out
          </li>
          <li title='Delete the point'>
            <code>DELETE</code> Delete the point
          </li>
          <li title='Undo last change'>
            <code>CTRL-Z</code> Undo last change
          </li>
        </ul>
      </div>

      <hr style={{ marginTop: 10 }} />

      <div className='options'>
        <div className='build-in-eases'>
          <p>Presets</p>

          <Select
            labels={Object.keys(eases)}
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
          labels={Object.values(DialogExportTypes)}
          values={Object.values(DialogExportTypes)}
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
        <h2 style={{ marginBottom: 0 }}>SVG Path</h2>
        <p style={{ marginTop: 0, opacity: 0.6 }}>Edit/Paste SVG path here</p>

        <HighlightTextarea
          ref={textareaRef}
          defaultValue={ctx.getPathStringFromPoints()}
          rows={ctx.points.length}
          onFocus={e => (textareaCurrentValue.current = e.target.value)}
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
