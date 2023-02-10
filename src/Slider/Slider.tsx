/* eslint-disable react-hooks/exhaustive-deps */
import style from './Slider.module.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(value, max));
const precision = (a: number) => {
  if (!isFinite(a)) return 0;
  let e = 1;
  let p = 0;
  while (Math.round(a * e) / e !== a) {
    e *= 10;
    p++;
  }
  return p;
};

type Props = {
  min?: number;
  max?: number;
  value?: number;
  defaultValue?: number;
  step?: number;
  disabled?: boolean;
  showBubble?: boolean;
  vertical?: boolean;
  onChange?: (value: number) => void;
  onComplete?: (value: number) => void;
};
export default function Slider({
  min = 0,
  max = 100,
  step = 1,
  showBubble = false,
  disabled = false,
  value,
  defaultValue,
  vertical = false,
  onChange,
  onComplete,
}: Props) {
  const valueRef = useRef(value ?? defaultValue ?? 0);
  const containerRef = useRef<HTMLDivElement>(null!); // slider container element
  const textRef = useRef<HTMLHeadingElement>(null!); // bubble text element
  const bubbleTimeOut = useRef<number | null>(null); // show/hide bubble setTimeOut
  const isActive = useRef(false);

  const [valueState, setValue] = useState(valueRef.current);

  const steps = useMemo(
    () => new Set(new Array(Math.round((max - min) / step + 1)).fill(0).map((_, i) => i * step + min)),
    [step, min, max]
  );

  const onPointerMove = useCallback((e: PointerEvent) => {
    const track = containerRef.current.querySelector('.' + style.track) as HTMLDivElement;
    const text = textRef.current;
    const { left, bottom, width, height } = track.getBoundingClientRect();

    const percentage = vertical ? clamp((bottom - e.pageY) / height, 0, 1) : clamp((e.pageX - left) / width, 0, 1);
    const val = +clamp((max - min) * percentage + min, min, max).toFixed(precision(step));

    if (!steps.has(val)) return;

    // update position if `value` prop is not given (the value is not linked to a state)
    if (typeof value !== 'number') document.body.style.setProperty('--position', percentage * 100 + '%');

    if (text) text.innerText = val + ''; // bubble text value

    if (valueRef.current !== val) {
      setValue(val);
      valueRef.current = val;
    }
  }, []);

  const onPointerDown = () => {
    isActive.current = true;

    document.addEventListener('pointermove', onPointerMove);

    const handle = containerRef.current.querySelector('.' + style.handle) as HTMLButtonElement;
    const track = containerRef.current.querySelector('.' + style.track) as HTMLDivElement;
    handle.style.opacity = '0';
    handle.style.transform = `translate(-50%, ${vertical ? 50 : -50}%) scale(0)`;
    track.style.transform = vertical ? 'scaleX(var(--scale))' : 'scaleY(var(--scale))';

    // if bubble is enabled
    if (!showBubble) return;
    if (bubbleTimeOut.current) clearTimeout(bubbleTimeOut.current);
    const bubble = containerRef.current.querySelector('.' + style.bubble) as HTMLDivElement;
    bubble.style.opacity = '1';
  };

  const onPointerUp = useCallback(() => {
    document.removeEventListener('pointermove', onPointerMove);

    if (!isActive.current) return;
    isActive.current = false;

    const handle = containerRef.current.querySelector('.' + style.handle) as HTMLButtonElement;
    const track = containerRef.current.querySelector('.' + style.track) as HTMLDivElement;
    handle.style.opacity = '1';
    handle.style.transform = `translate(-50%, ${vertical ? 50 : -50}%) scale(1)`;
    track.style.transform = 'scaleY(1)';

    if (valueRef.current !== value) onComplete?.(valueRef.current);

    // if bubble is enabled
    if (!showBubble) return;
    const bubble = containerRef.current.querySelector('.' + style.bubble) as HTMLDivElement;
    bubble.style.opacity = '0';
  }, []);

  const onTrackPress: React.MouseEventHandler<HTMLDivElement> = e => {
    onPointerMove(e as any);

    // if bubble is enabled
    if (!showBubble) return;
    const bubble = containerRef.current.querySelector('.' + style.bubble) as HTMLDivElement;
    bubble.style.opacity = '1';
    if (bubbleTimeOut.current) clearTimeout(bubbleTimeOut.current);
    bubbleTimeOut.current = setTimeout(() => {
      bubble.style.opacity = '0';
      bubbleTimeOut.current = null;
    }, 1000);
  };

  // keyboard arrow keys
  const onArrowKeys: React.KeyboardEventHandler<HTMLDivElement> = e => {
    if (e.code !== 'ArrowRight' && e.code !== 'ArrowLeft') return;

    const val = clamp(e.code !== 'ArrowRight' ? valueRef.current - step : valueRef.current + step, min, max);
    const percentage = (val - min) / (max - min);

    // update position if `value` prop is not given (the value is not linked to a state)
    if (typeof value !== 'number') document.body.style.setProperty('--position', percentage * 100 + '%');

    if (textRef.current) textRef.current.innerText = val + ''; // bubble text value

    if (valueRef.current !== val) {
      setValue(val);
      valueRef.current = val;
    }

    // if bubble is enabled
    if (!showBubble) return;
    const text = textRef.current;
    const bubble = containerRef.current.querySelector('.' + style.bubble) as HTMLDivElement;
    bubble.style.opacity = '1';
    text.innerText = val + '';

    if (bubbleTimeOut.current) clearTimeout(bubbleTimeOut.current);
    bubbleTimeOut.current = setTimeout(() => {
      bubble.style.opacity = '0';
      bubbleTimeOut.current = null;
    }, 1000);
  };

  const onArrowKeyUp: React.KeyboardEventHandler<HTMLDivElement> = e => {
    if (e.code !== 'ArrowRight' && e.code !== 'ArrowLeft') return;
    onComplete?.(valueRef.current);
  };

  useEffect(() => {
    onChange?.(valueState);
  }, [valueState]);

  useEffect(() => {
    document.addEventListener('pointerup', onPointerUp);

    return () => {
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  useEffect(() => {
    if (typeof value !== 'number') return;
    const val = clamp(value ?? defaultValue ?? 0, min, max);
    const percentage = (val - min) / (max - min);
    valueRef.current = val;
    document.body.style.setProperty('--position', clamp(percentage * 100) + '%');
    if (textRef.current) textRef.current.innerText = val + ''; // bubble text value
  }, [value]);

  return (
    <div ref={containerRef} className={style.container + (vertical ? ' ' + style.containerVertical : '')}>
      {showBubble && (
        <div className={style.bubble + (vertical ? ' ' + style.bubbleVertical : '')}>
          <h4 ref={textRef}>{valueRef.current}</h4>
          <div className={style.triangle + (vertical ? ' ' + style.triangleVertical : '')} />
        </div>
      )}
      <div
        role='slider'
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        className={style.track + (vertical ? ' ' + style.trackVertical : '')}
        onClick={disabled ? undefined : onTrackPress}
        onKeyDown={disabled ? undefined : onArrowKeys}
        onKeyUp={disabled ? undefined : onArrowKeyUp}
        tabIndex={0}
      >
        <button
          className={style.handle + (vertical ? ' ' + style.handleVertical : '')}
          onPointerDown={disabled ? undefined : onPointerDown}
          role='slider'
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
