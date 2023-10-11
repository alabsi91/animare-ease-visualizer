import type { MutableRefObject } from 'react';
import { useEffect, useRef } from 'react';
import { clamp } from '../Helpers/utils';

export default function useZoom(zoom: MutableRefObject<number>, onZoom: (v: number) => void) {
  const currentZoom = useRef(455 - zoom.current);

  const handleMouseWheel = (event: WheelEvent) => {
    if (!event.ctrlKey) return;
    event.preventDefault();

    const changeAmount = event.deltaY > 0 ? -10 : 10;

    currentZoom.current = clamp(currentZoom.current + changeAmount, 0, 600);

    onZoom(currentZoom.current);
  };

  useEffect(() => {
    document.addEventListener('wheel', handleMouseWheel, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleMouseWheel);
    };
  }, [handleMouseWheel]);
}
