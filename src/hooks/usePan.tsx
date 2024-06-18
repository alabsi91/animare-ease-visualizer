import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

export default function usePan(
  svgViewBoxSize: MutableRefObject<number>,
  zoom: MutableRefObject<number>,
  viewBoxCoordinate: MutableRefObject<{ x: number; y: number }>,
) {
  const startingPos = useRef({ x: 0, y: 0, viewX: 0, viewY: 0 });

  const panMove = useCallback((e: MouseEvent) => {
    const svg = document.querySelector('.svg') as SVGSVGElement;
    const { width, height } = svg.getBoundingClientRect();
    const boxSize = svgViewBoxSize.current + zoom.current * 2;
    const x = (startingPos.current.x - e.pageX) * (boxSize / width);
    const y = (startingPos.current.y - e.pageY) * (boxSize / height);

    viewBoxCoordinate.current.x = x + startingPos.current.viewX;
    viewBoxCoordinate.current.y = y + startingPos.current.viewY;

    svg.setAttribute('viewBox', `${x + startingPos.current.viewX} ${y + startingPos.current.viewY} ${boxSize} ${boxSize}`);
  }, []);

  const panMouseUp = useCallback(() => {
    document.body.style.cursor = 'grab';
    document.removeEventListener('pointermove', panMove);
  }, []);

  const panMouseDown = useCallback((e: MouseEvent) => {
    const svg = document.querySelector('.svg') as SVGSVGElement;
    const viwBox = svg.getAttribute('viewBox')!.split(' ').map(parseFloat);
    startingPos.current.x = e.pageX;
    startingPos.current.y = e.pageY;
    startingPos.current.viewX = viwBox[0];
    startingPos.current.viewY = viwBox[1];
    document.body.style.cursor = 'grabbing';
    document.addEventListener('pointermove', panMove);
  }, []);

  const panKeyDown = (e: KeyboardEvent) => {
    if (e.key !== ' ' || e.code !== 'Space' || e.repeat) return;
    document.body.style.cursor = 'grab';
    document.addEventListener('mousedown', panMouseDown);
    document.addEventListener('mouseup', panMouseUp);
  };

  const panKeyUp = (e: KeyboardEvent) => {
    if (e.key !== ' ' || e.code !== 'Space') return;
    document.body.style.removeProperty('cursor');
    document.removeEventListener('mousedown', panMouseDown);
    document.removeEventListener('mouseup', panMouseUp);
    document.removeEventListener('pointermove', panMove);
  };

  useEffect(() => {
    document.addEventListener('keydown', panKeyDown);
    document.addEventListener('keyup', panKeyUp);

    return () => {
      document.removeEventListener('keydown', panKeyDown);
      document.removeEventListener('keyup', panKeyUp);
    };
  }, []);
}
