import React, { useContext } from 'react';
import animare, { ease, organize } from 'animare';
import { useAnimare } from 'animare/react';

import CTX from '../Helpers/CTX';

import type { animareOnUpdate } from 'animare/lib/methods/types';

export default function SmallSidePanel() {
  const ctx = useContext(CTX);

  const toggleMagnet: React.MouseEventHandler<HTMLButtonElement> = e => {
    const target = e.target as Element;
    const svg = target.closest('svg') as SVGSVGElement;
    const checkbox = document.getElementById('snappeToGrid') as HTMLInputElement;
    ctx.magnet.current = !ctx.magnet.current;
    if (ctx.magnet.current) svg.style.fill = 'var(--active-point)';
    if (!ctx.magnet.current) svg.style.removeProperty('fill');
    checkbox.checked = ctx.magnet.current;
  };

  const togglePathPoints: React.MouseEventHandler<HTMLButtonElement> = e => {
    const target = e.target as Element;
    const svg = target.closest('svg') as SVGSVGElement;
    const checkbox = document.getElementById('hideAnchor') as HTMLInputElement;
    ctx.autoHideHandles.current = !ctx.autoHideHandles.current;

    if (ctx.autoHideHandles.current) svg.style.fill = 'var(--active-point)';
    if (!ctx.autoHideHandles.current) svg.style.removeProperty('fill');

    checkbox.checked = ctx.autoHideHandles.current;

    document
      .querySelectorAll<HTMLAnchorElement>('.auto-hide')
      .forEach(e => (e!.style.display = ctx.autoHideHandles.current ? 'none' : 'block'));
  };

  const sidePanelAnimation = useAnimare(() => {
    const container = document.querySelector('.container') as HTMLDivElement;
    const sidePanel = document.querySelector('.sidePanel') as HTMLDivElement;
    const width = sidePanel.offsetWidth;

    const { from, to, delay, get } = organize({
      translateX: { from: 110, to: 0, delay: 120 },
      gridTemplateColumns: { from: 76, to: width },
    });

    const callback: animareOnUpdate = (values, { isFinished }) => {
      const { gridTemplateColumns, translateX } = get(values);

      sidePanel.style.transform = `translateX(-${translateX}%)`;
      container.style.gridTemplateColumns = `${gridTemplateColumns}px 1fr`;

      if (isFinished) container.style.removeProperty('grid-template-columns');
    };

    return animare({ from, to, duration: 200, delay, autoPlay: false, ease: ease.out.quad }, callback);
  });

  const open = () => {
    const container = document.querySelector('.container') as HTMLDivElement;
    container.style.removeProperty('grid-template-columns');
    const sidePanel = document.querySelector('.sidePanel') as HTMLDivElement;
    sidePanelAnimation?.play({ to: [0, sidePanel.offsetWidth] });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ctx.parseResult());
  };

  return (
    <div className='small-side-panel'>
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

      <button title='Enable snapping to the grid' onClick={toggleMagnet}>
        <svg
          style={{ fill: !ctx.magnet.current ? 'var(--text-color)' : 'var(--active-point)' }}
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
        >
          <path d='M17.374 20.235c2.444-2.981 6.626-8.157 6.626-8.157l-3.846-3.092s-2.857 3.523-6.571 8.097c-4.312 5.312-11.881-2.41-6.671-6.671 4.561-3.729 8.097-6.57 8.097-6.57l-3.092-3.842s-5.173 4.181-8.157 6.621c-2.662 2.175-3.76 4.749-3.76 7.24 0 5.254 4.867 10.139 10.121 10.139 2.487 0 5.064-1.095 7.253-3.765zm4.724-7.953l-1.699 2.111-1.74-1.397 1.701-2.114 1.738 1.4zm-10.386-10.385l1.4 1.738-2.113 1.701-1.397-1.74 2.11-1.699z' />
        </svg>
      </button>

      <button title='Auto hide anchor points.' onClick={togglePathPoints}>
        <svg
          style={{ fill: !ctx.autoHideHandles.current ? 'var(--text-color)' : 'var(--active-point)' }}
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

      <button title='download as a js file' onClick={() => ctx.downloadDialogRef.current.show()}>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
          <path d='M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z' />
        </svg>
      </button>

      {/* @ts-ignore */}
      <input type='range' min='0' max='300' defaultValue={300 - ctx.zoom.current} onChange={ctx.onZoom} orient='vertical' />

      <svg id='zoom-slider-icon' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
        <path d='M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z' />
      </svg>
    </div>
  );
}
