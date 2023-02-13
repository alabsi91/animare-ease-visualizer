/* eslint-disable react-hooks/exhaustive-deps */
import styles from './HighlightInput.module.css';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

type InputType = React.InputHTMLAttributes<HTMLInputElement>;

type Props = {
  keywords?: (string | RegExp)[];
  colors?: string[];
  highlight?: { match: string | RegExp; color?: string }[];
} & Omit<InputType, 'className' | 'id'>;

export type HighlightInputRef = {
  setValue: (value: string) => void;
};
const HighlightInputComponent: React.ForwardRefRenderFunction<HighlightInputRef, Props> = function (props, ref) {
  let { keywords, colors, highlight, ...inputProps } = props;

  const [currentValue, setCurrentValue] = useState(props.value ?? props.defaultValue ?? '');

  const paragraphRef = useRef<HTMLParagraphElement>(null!);

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = e => {
    const text = e.target.value;
    if (typeof props.value === 'undefined') setCurrentValue(text);
    props.onChange?.(e);
  };

  const applyHighlight = (v: string | number | readonly string[]) => {
    const value = v.toString();
    keywords ??= [];
    colors ??= [];
    highlight ??= [];

    // Convert the input text into an array of HTML <span> elements, each representing a single letter.
    const letters = value.split('').map(e => {
      const el = document.createElement('span');
      el.innerText = e;
      return el;
    });

    // Loop over pattrens (string or regular expression).
    for (let i = 0; i < highlight.length; i++) {
      let index = 0;
      const pattern = highlight[i].match;
      const color = highlight[i].color;

      const matches = value.match(pattern) ?? [];

      // loop over matches
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        index = value.indexOf(match, index);

        // apply style to matched <span> elements.
        for (let m = index; m < index + match.length; m++) {
          const el = letters[m];
          if (!el) continue;
          el.classList.add(styles.highlight);
          if (color) el.style.setProperty('--color', color);
        }

        index += match.length;
      }
    }

    paragraphRef.current.innerHTML = '';
    letters.forEach(el => paragraphRef.current.appendChild(el));
  };

  useEffect(() => {
    applyHighlight(currentValue);
  }, [currentValue]);

  useEffect(() => {
    if (typeof props.value === 'string') applyHighlight(props.value);
  }, [props.value]);

  const onInputScroll: React.UIEventHandler<HTMLInputElement> = e => {
    const inputEl = e.target as HTMLInputElement;
    paragraphRef.current.scrollTo({ left: inputEl.scrollLeft });
    props.onScroll?.(e);
  };

  useImperativeHandle(ref, () => ({ setValue: setCurrentValue }), []);

  return (
    <div className={styles.container}>
      <input
        {...inputProps}
        className={styles.input + ' ' + styles.textStyle}
        onChange={onInputChange}
        onScroll={onInputScroll}
      />
      <p ref={paragraphRef} className={styles.paragraph + ' ' + styles.textStyle} />
    </div>
  );
};

const HighlightInput = forwardRef<HighlightInputRef, Props>(HighlightInputComponent);
export default HighlightInput;
