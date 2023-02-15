import './SidePanel.css';
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import animare, { ease, organize } from 'animare';
import { useAnimare } from 'animare/react';

import { eases } from '../Pathes';
import Select from '../components/Select/Select';
import CTX, { exportTypes } from '../Helpers/CTX';
import { convertPathToPoints } from '../Helpers/Helpers';
import HighlightTextarea from '../components/HighlightTextarea/HighlightTextarea';
import Slider from '../components/Slider/Slider';

import type { animareOnUpdate } from 'animare/lib/methods/types';
import type { ExportTypes } from '../Helpers/CTX';
import type { HighlightTextareaRef } from '../components/HighlightTextarea/HighlightTextarea';

export default function SidePanel() {
  const ctx = useContext(CTX);

  const textareaRef = useRef<HighlightTextareaRef>(null!);

  useEffect(() => {
    // update textarea text
    textareaRef.current.setValue(ctx.parseResult().replace(/\s*M/gi, 'M').replace(/\s*S/g, '\nS').replace(/\s*C/g, '\nC'));
  }, [ctx.points]);

  const pathToPoints = (path: string) => convertPathToPoints(path, ctx.size.current, ctx.zoom.current);

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
    const value = pathToPoints(e.target.value.trim());
    let isValid = false;
    value.forEach(e => (isValid = e.every(e => e !== undefined)));
    if (isValid) {
      ctx.undoStack.current.push(ctx.parseResult());
      ctx.setPoints(pathToPoints(e.target.value.trim()));
    } else {
      textareaRef.current.setValue(ctx.parseResult().replace(/\s*M/gi, 'M').replace(/\s*S/g, '\nS').replace(/\s*C/g, '\nC'));
    }
  };

  const autoHideHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    ctx.autoHideHandles.current = e.target.checked;
    document
      .querySelectorAll<HTMLAnchorElement>('.auto-hide')
      .forEach(e => (e!.style.display = ctx.autoHideHandles.current ? 'none' : 'block'));
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

  return (
    <div className='sidePanel custom-scrollbar'>
      <button onClick={close} className='close-panel'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
          <path d='M11.67 3.87L9.9 2.1 0 12l9.9 9.9 1.77-1.77L3.54 12z' />
        </svg>
      </button>

      <div className='hints'>
        <h2>
          <svg xmlns='http://www.w3.org/2000/svg' height='24px' viewBox='0 0 24 24' width='24px' fill='currentColor'>
            <path d='M9,21c0,0.55,0.45,1,1,1h4c0.55,0,1-0.45,1-1v-1H9V21z M12,2C8.14,2,5,5.14,5,9c0,2.38,1.19,4.47,3,5.74V17 c0,0.55,0.45,1,1,1h6c0.55,0,1-0.45,1-1v-2.26c1.81-1.27,3-3.36,3-5.74C19,5.14,15.86,2,12,2z M14,13.7V16h-4v-2.3 C8.48,12.63,7,11.53,7,9c0-2.76,2.24-5,5-5s5,2.24,5,5C17,11.49,15.49,12.65,14,13.7z' />
          </svg>{' '}
          Hints
        </h2>
        <ul>
          <li>
            <b>Add point</b>
            <br />
            <code>ALT + CLICK</code> on the line.
          </li>
          <li>
            <b>Toggle corner</b>
            <br />
            Hold <code>SHIFT</code> while <code>clicking</code> anchor point.
          </li>
          <li>
            <b>Delete anchor point</b>
            <br />
            Select anchor point then press <code>DELETE</code> key.
          </li>
          <li>
            <b>Undo</b>
            <br />
            Press <code>CTRL-Z</code>.
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
          <input id='hideAnchor' type='checkbox' defaultChecked={ctx.autoHideHandles.current} onChange={autoHideHandler} />
          <label htmlFor='hideAnchor'>Auto hide anchor points.</label>
        </div>
        <div className='options-duration'>
          <p>Duration</p>
          <input type='number' min='0' defaultValue='2000' step='100' onChange={e => ctx.setDuration(+e.target.value)} />
        </div>
        <div className='options-zoom'>
          <p>Zoom</p>
          <Slider max={300} defaultValue={300 - ctx.zoom.current} onChange={ctx.onZoom} showBubble={false} />
        </div>
      </div>

      <hr />

      <div className='results'>
        <h2>SVG Path</h2>

        <HighlightTextarea
          ref={textareaRef}
          defaultValue={ctx.parseResult()}
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
