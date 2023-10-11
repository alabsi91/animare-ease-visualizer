import { useEffect, useRef } from 'react';
import { clamp, throttle } from '../utils/utils';

import type { MutableRefObject } from 'react';

export default function useZoom(zoom: MutableRefObject<number>, onZoom: (v: number) => void) {
  const currentZoom = useRef(455 - zoom.current);

  const throttledOnZoom = throttle(onZoom, 2000);

  const handleMouseWheel = (event: WheelEvent) => {
    if (!event.ctrlKey) return;
    event.preventDefault();

    const changeAmount = event.deltaY > 0 ? -10 : 10;

    currentZoom.current = clamp(currentZoom.current + changeAmount, 0, 600);

    throttledOnZoom(currentZoom.current);
  };

  useEffect(() => {
    document.addEventListener('wheel', handleMouseWheel, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleMouseWheel);
    };
  }, [handleMouseWheel]);
}
