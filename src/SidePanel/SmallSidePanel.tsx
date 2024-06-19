import animare, { Timing, createAnimations } from 'animare';
import { ease } from 'animare/plugins';
import { useAnimare } from 'animare/react';
import React, { useCallback } from 'react';
import './SmallSidePanel.css';

import Dialog from '../components/Dialog/Dialog';
import Select from '../components/Select/Select';
import { eases } from '../presets';
import { ExportTypes, useApp } from '../utils/AppContext';

import type { OnUpdateCallback, TimelineGlobalOptions } from 'animare';
import type { Eases } from '../presets';

export default function SmallSidePanel() {
  const ctx = useApp();

  const toggleMagnet: React.MouseEventHandler<HTMLButtonElement> = e => {
    const target = e.target as Element;
    const svg = target.closest('svg') as SVGSVGElement;
    const checkbox = document.getElementById('snappeToGrid') as HTMLInputElement;
    ctx.magnet.current = !ctx.magnet.current;
    if (ctx.magnet.current) svg.style.fill = 'var(--main-color)';
    if (!ctx.magnet.current) svg.style.removeProperty('fill');
    checkbox.checked = ctx.magnet.current;
  };

  const togglePathPoints: React.MouseEventHandler<HTMLButtonElement> = e => {
    const target = e.target as Element;
    const svg = target.closest('svg') as SVGSVGElement;
    const checkbox = document.getElementById('hideAnchor') as HTMLInputElement;

    ctx.setAutoHideHandles(!ctx.autoHideHandles);

    if (ctx.autoHideHandles) svg.style.fill = 'var(--main-color)';
    if (!ctx.autoHideHandles) svg.style.removeProperty('fill');

    checkbox.checked = ctx.autoHideHandles;

    document
      .querySelectorAll<HTMLAnchorElement>('.auto-hide')
      .forEach(e => (e!.style.display = ctx.autoHideHandles ? 'none' : 'block'));
  };

  const sidePanelAnimation = useAnimare(() => {
    const container = document.querySelector('.container') as HTMLDivElement;
    const sidePanel = document.querySelector('.sidePanel') as HTMLDivElement;
    const smallPanel = document.querySelector('.small-side-panel') as HTMLDivElement;
    const width = sidePanel.offsetWidth;

    const animations = createAnimations([
      { name: 'translateX', from: 110, to: 0, delay: 120 },
      { name: 'gridTemplateColumns', from: 76, to: width },
      { name: 'hideSmallPanel', to: 100 },
    ]);

    const globalOptions: TimelineGlobalOptions = {
      ease: ease.out.quad,
      duration: 200,
      autoPlay: false,
      timing: Timing.FromStart,
    };

    const callback: OnUpdateCallback<typeof animations> = (values, { isFinished }) => {
      const { gridTemplateColumns, translateX, hideSmallPanel } = values;

      sidePanel.style.transform = `translateX(-${translateX.value}%)`;
      container.style.gridTemplateColumns = `${gridTemplateColumns.value}px 1fr`;
      smallPanel.style.transform = `translateX(-${hideSmallPanel.value}%)`;

      if (isFinished) container.style.removeProperty('grid-template-columns');
    };

    return animare.timeline(animations, callback, globalOptions);
  });

  const open = () => {
    const container = document.querySelector('.container') as HTMLDivElement;
    container.style.removeProperty('grid-template-columns');
    const sidePanel = document.querySelector('.sidePanel') as HTMLDivElement;
    sidePanelAnimation.updateValues([{ name: 'gridTemplateColumns', to: sidePanel.offsetWidth }]);
    sidePanelAnimation.play();
  };

  const PresetsButton = useCallback(({ onClick }: { onClick: () => void }) => {
    return (
      <button className='small-side-panel-buttons' style={{ marginBottom: 0 }} title='presets' onClick={onClick}>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
          <path d='M13 13v8h8v-8h-8zM3 21h8v-8H3v8zM3 3v8h8V3H3zm13.66-1.31L11 7.34 16.66 13l5.66-5.66-5.66-5.65z' />
        </svg>
      </button>
    );
  }, []);

  const ExportButton = useCallback(({ onClick }: { onClick: () => void }) => {
    return (
      <button className='small-side-panel-buttons' style={{ marginBottom: 0 }} title='export' onClick={onClick}>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
          <path d='M16.9498 5.96781L15.5356 7.38203L13 4.84646V17.0421H11V4.84653L8.46451 7.38203L7.05029 5.96781L12 1.01807L16.9498 5.96781Z' />
          <path d='M5 20.9819V10.9819H9V8.98193H3V22.9819H21V8.98193H15V10.9819H19V20.9819H5Z' />
        </svg>
      </button>
    );
  }, []);

  const onExportSelect = (value: ExportTypes) => {
    switch (value) {
      case ExportTypes.CSS_Keyframe:
        Dialog.$exportCssKeyframe?.toggle();
        break;
      case ExportTypes.CSS_Linear:
        Dialog.$exportCssLinear?.toggle();
        break;
      case ExportTypes.SVG_Path:
        Dialog.$exportSvg?.toggle();
        break;
      case ExportTypes.JS_File:
        Dialog.$exportJs?.toggle();
        break;
    }
  };

  return (
    <div>
      <div className='small-side-panel custom-scrollbar'>
        <button title='show the side panel' className='open-panel' onClick={open}>
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
            <polygon points='6.23,20.23 8,22 18,12 8,2 6.23,3.77 14.46,12' />
          </svg>
        </button>

        <button title='play the current easing' onClick={ctx.playCurrentEasing}>
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
            <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z' />
          </svg>
        </button>

        <Select
          containerStyle={{ flex: 0 }}
          minWidth={175}
          labels={Object.keys(eases) as (keyof Eases)[]}
          values={Object.values(eases) as Eases[keyof Eases][]}
          value={ctx.preset}
          onChange={ctx.onPresetSelect}
          SelectButton={PresetsButton}
        />

        <Select
          containerStyle={{ flex: 0 }}
          minWidth={175}
          labels={Object.values(ExportTypes)}
          values={Object.values(ExportTypes)}
          onChange={onExportSelect}
          SelectButton={ExportButton}
          highlightSelected={false}
        />

        <button title='Enable snapping to the grid' onClick={toggleMagnet}>
          <svg
            style={{ fill: !ctx.magnet.current ? 'var(--text-color)' : 'var(--main-color)' }}
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
          >
            <path d='M17.374 20.235c2.444-2.981 6.626-8.157 6.626-8.157l-3.846-3.092s-2.857 3.523-6.571 8.097c-4.312 5.312-11.881-2.41-6.671-6.671 4.561-3.729 8.097-6.57 8.097-6.57l-3.092-3.842s-5.173 4.181-8.157 6.621c-2.662 2.175-3.76 4.749-3.76 7.24 0 5.254 4.867 10.139 10.121 10.139 2.487 0 5.064-1.095 7.253-3.765zm4.724-7.953l-1.699 2.111-1.74-1.397 1.701-2.114 1.738 1.4zm-10.386-10.385l1.4 1.738-2.113 1.701-1.397-1.74 2.11-1.699z' />
          </svg>
        </button>

        <button title='Auto hide anchor points.' onClick={togglePathPoints}>
          <svg
            style={{ fill: !ctx.autoHideHandles ? 'var(--text-color)' : 'var(--main-color)' }}
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
          >
            <path d='M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z' />
          </svg>
        </button>
      </div>
    </div>
  );
}
