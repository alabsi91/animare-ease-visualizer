/* eslint-disable react-hooks/exhaustive-deps */
import style from './Slider.module.css';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

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
const cls = (isActive = false, className = '') => (isActive ? ` ${className}` : '');

const easeOutCubic = (t: number) => --t * t * t + 1;

function animate(from: number, to: number, duration: number, update: (value: number) => void) {
  let start = performance.now();
  let current = from;

  function animateStep(timestamp: number) {
    let progress = (timestamp - start) / duration;
    progress = Math.min(progress, 1);
    progress = easeOutCubic(progress);
    current = from + (to - from) * progress;
    update(current);

    if (progress < 1) {
      requestAnimationFrame(animateStep);
    }
  }

  requestAnimationFrame(animateStep);
}

type Props = {
  min?: number;
  max?: number;
  value?: number;
  defaultValue?: number;
  step?: number;
  disabled?: boolean;
  showBubble?: boolean;
  vertical?: boolean;
  reverse?: boolean;
  reverseBubble?: boolean;
  onChange?: (value: number) => void;
  onComplete?: (value: number) => void;
};

export type SliderRef = {
  setValue: (value: number) => void;
};

const SliderComponent: React.ForwardRefRenderFunction<SliderRef, Props> = function (
  {
    min = 0,
    max = 100,
    step = 1,
    showBubble = true,
    reverseBubble = false,
    disabled = false,
    value,
    defaultValue,
    vertical = false,
    reverse = false,
    onChange,
    onComplete,
  },
  ref
) {
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

  const onPointerMove = useCallback((e: { clientX: number; clientY: number }, withAnim = false) => {
    const track = containerRef.current.querySelector(`.${style.track}`) as HTMLDivElement,
      text = textRef.current,
      { left, right, bottom, top, width, height } = track.getBoundingClientRect();

    const length = vertical ? height : width,
      axis = vertical ? e.clientY : e.clientX,
      forNormal = vertical ? bottom - axis : axis - left,
      forReverse = vertical ? axis - top : right - axis,
      percentage = clamp((reverse ? forReverse : forNormal) / length, 0, 1),
      val = +clamp((max - min) * percentage + min, min, max).toFixed(precision(step));

    if (!steps.has(val)) return;

    // update position if `value` prop is not given (the value is not linked to a state)
    if (typeof value !== 'number') document.body.style.setProperty('--position', percentage * 100 + '%');
    // animate to the new pos (for on track press event)
    if (withAnim) {
      const from = ((valueRef.current - min) / (max - min)) * 100;
      animate(from, percentage * 100, 300, v => document.body.style.setProperty('--position', v + '%'));
    }

    if (text) text.innerText = `${val}`; // bubble text value

    setValue(val);
  }, []);

  const onPointerDown = () => {
    isActive.current = true;

    document.addEventListener('pointermove', onPointerMove);

    const handle = containerRef.current.querySelector(`.${style.handle}`) as HTMLButtonElement;
    const track = containerRef.current.querySelector(`.${style.track}`) as HTMLDivElement;
    handle.style.opacity = '0';
    handle.style.transform = `translate(${reverse && !vertical ? 50 : -50}%, ${vertical && !reverse ? 50 : -50}%) scale(0)`;
    track.style.transform = vertical ? 'scaleX(var(--scale))' : 'scaleY(var(--scale))';

    // if bubble is enabled
    if (!showBubble) return;
    if (bubbleTimeOut.current) clearTimeout(bubbleTimeOut.current);
    const bubble = containerRef.current.querySelector('.' + style.bubble) as HTMLDivElement;
    bubble.style.opacity = '1';
  };

  const onPointerUp = () => {
    document.removeEventListener('pointermove', onPointerMove);

    if (!isActive.current) return;
    isActive.current = false;

    const handle = containerRef.current.querySelector(`.${style.handle}`) as HTMLButtonElement;
    const track = containerRef.current.querySelector(`.${style.track}`) as HTMLDivElement;
    handle.style.opacity = '1';
    handle.style.transform = `translate(${reverse && !vertical ? 50 : -50}%, ${vertical && !reverse ? 50 : -50}%) scale(1)`;
    track.style.transform = 'scaleY(1)';

    onComplete?.(valueState);

    // if bubble is enabled
    if (!showBubble) return;
    const bubble = containerRef.current.querySelector(`.${style.bubble}`) as HTMLDivElement;
    bubble.style.opacity = '0';
  };

  const onTrackPress: React.MouseEventHandler<HTMLDivElement> = e => {
    onPointerMove(e, true);

    // if bubble is enabled
    if (!showBubble) return;
    const bubble = containerRef.current.querySelector(`.${style.bubble}`) as HTMLDivElement;
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

    if (textRef.current) textRef.current.innerText = `${val}`; // bubble text value

    setValue(val);

    // if bubble is enabled
    if (!showBubble) return;
    const text = textRef.current;
    const bubble = containerRef.current.querySelector(`.${style.bubble}`) as HTMLDivElement;
    bubble.style.opacity = '1';
    text.innerText = `${val}`;

    if (bubbleTimeOut.current) clearTimeout(bubbleTimeOut.current);
    bubbleTimeOut.current = setTimeout(() => {
      bubble.style.opacity = '0';
      bubbleTimeOut.current = null;
    }, 1000);
  };

  const onArrowKeyUp: React.KeyboardEventHandler<HTMLDivElement> = e => {
    if (e.code !== 'ArrowRight' && e.code !== 'ArrowLeft') return;
    onComplete?.(valueState);
  };

  useEffect(() => {
    if (valueState !== valueRef.current) onChange?.(valueState);
    valueRef.current = valueState;
  }, [valueState]);

  useEffect(() => {
    document.addEventListener('pointerup', onPointerUp);

    return () => {
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [valueState]);

  useEffect(() => {
    valueRef.current = clamp(value ?? defaultValue ?? 0, min, max);
    const percentage = (valueRef.current - min) / (max - min);
    document.body.style.setProperty('--position', clamp(percentage * 100) + '%');
    if (textRef.current) textRef.current.innerText = `${valueRef.current}`; // bubble text value
  }, [value]);

  const updateValue = (v: number) => {
    valueRef.current = clamp(v ?? defaultValue ?? 0, min, max);
    setValue(valueRef.current);
    const percentage = (valueRef.current - min) / (max - min);
    document.body.style.setProperty('--position', clamp(percentage * 100) + '%');
    if (textRef.current) textRef.current.innerText = `${valueRef.current}`; // bubble text value
  };

  useImperativeHandle(ref, () => ({ setValue: updateValue }), []);

  return (
    <div ref={containerRef} className={style.container + cls(vertical, style.containerVertical)}>
      {showBubble && (
        <div
          className={
            style.bubble +
            cls(reverseBubble && !vertical, style.bubbleDown) +
            cls(vertical, style.bubbleVertical) +
            cls(vertical && reverseBubble, style.bubbleVerticalRight) +
            cls(reverse && !vertical, style.bubbleReverse) +
            cls(reverse && vertical, style.bubbleVerticalReverse)
          }
        >
          <h4 ref={textRef}>{valueRef.current}</h4>

          <div
            className={
              style.triangle +
              cls(reverseBubble && !vertical, style.triangleUp) +
              cls(vertical, style.triangleVertical) +
              cls(vertical && reverseBubble, style.triangleVerticalRight)
            }
          />
        </div>
      )}
      <div
        role='slider'
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        className={
          style.track +
          cls(vertical, style.trackVertical) +
          cls(reverse && !vertical, style.trackReverse) +
          cls(reverse && vertical, style.trackVerticalReverse)
        }
        onClick={disabled ? undefined : onTrackPress}
        onKeyDown={disabled ? undefined : onArrowKeys}
        onKeyUp={disabled ? undefined : onArrowKeyUp}
        tabIndex={0}
      >
        <button
          className={
            style.handle +
            cls(vertical, style.handleVertical) +
            cls(reverse && !vertical, style.handleReverse) +
            cls(reverse && vertical, style.handleVerticalReverse)
          }
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
};

const Slider = forwardRef<SliderRef, Props>(SliderComponent);
export default Slider;
