import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styles from './HighlightInput.module.css';

import type React from 'react';

type InputType = React.InputHTMLAttributes<HTMLInputElement>;

type Props = {
  highlight?: { match: string | RegExp; color?: string; class?: string }[];
  plugin?: (input: string) => string;
} & Omit<InputType, 'className' | 'id'>;

export type HighlightInputRef = {
  setValue: (value: string) => void;
};

const HighlightInputComponent: React.ForwardRefRenderFunction<HighlightInputRef, Props> = (props, ref) => {
  const { highlight, plugin, ...inputProps } = props;

  const [currentValue, setCurrentValue] = useState(props.value ?? props.defaultValue ?? '');

  const paragraphRef = useRef<HTMLParagraphElement>(null);

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = e => {
    const text = e.target.value;
    if (typeof props.value === 'undefined') setCurrentValue(text);
    props.onChange?.(e);
  };

  const applyHighlight = (v: string | number | readonly string[]) => {
    const value = v.toString();

    // if plugin props provided
    if (plugin) {
      if (paragraphRef.current) paragraphRef.current.innerHTML = plugin(value);
      return;
    }

    // if nothing provided
    if (!Array.isArray(highlight)) {
      if (paragraphRef.current) paragraphRef.current.textContent = value;
      return;
    }

    // Convert the input text into an array of HTML <span> elements, each representing a single letter.
    const letters = value.split('').map(e => {
      const el = document.createElement('span');
      el.innerText = e;
      return el;
    });

    // Loop over patterns (string or regular expression).
    for (let i = 0; i < highlight.length; i++) {
      let index = 0;
      const pattern = highlight[i].match;
      const color = highlight[i].color;
      const className = highlight[i].class;

      const matches = value.match(pattern) ?? [];

      // loop over matches
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        index = value.indexOf(match, index);

        // apply style to matched <span> elements.
        for (let m = index; m < index + match.length; m++) {
          const el = letters[m];
          if (!el) continue;
          el.classList.add(className ?? styles.highlight);
          if (color) el.style.setProperty('--color', color);
        }

        index += match.length;
      }
    }

    // merge spans
    const spans = letters[0] ? [letters[0]] : [];
    for (let i = 1; i < letters.length; i++) {
      const preSpan = letters[i - 1];
      const span = letters[i];

      const spanTag = span.outerHTML.match(/<.*?>/)?.[0];
      const preSpanTag = preSpan.outerHTML.match(/<.*?>/)?.[0];

      if (preSpanTag === spanTag) {
        spans[spans.length - 1].innerHTML += span.innerHTML ?? '';
        continue;
      }

      spans.push(span);
    }

    if (paragraphRef.current) {
      paragraphRef.current.innerHTML = '';
      for (const item of spans) {
        if (paragraphRef.current) paragraphRef.current.appendChild(item);
      }
    }
  };

  useEffect(() => {
    applyHighlight(currentValue);
  }, [currentValue]);

  useEffect(() => {
    if (typeof props.value === 'string') applyHighlight(props.value);
  }, [props.value]);

  const onInputScroll: React.UIEventHandler<HTMLInputElement> = e => {
    const inputEl = e.target as HTMLInputElement;
    if (paragraphRef.current) paragraphRef.current.scrollTo({ left: inputEl.scrollLeft });
    props.onScroll?.(e);
  };

  useImperativeHandle(ref, () => ({ setValue: setCurrentValue }), []);

  return (
    <div className={styles.container}>
      <input
        {...inputProps}
        className={`${styles.input} ${styles.textStyle}`}
        onChange={onInputChange}
        onScroll={onInputScroll} // ! not working on Safari
      />
      <p ref={paragraphRef} className={`${styles.paragraph} ${styles.textStyle}`} />
    </div>
  );
};

const HighlightInput = forwardRef<HighlightInputRef, Props>(HighlightInputComponent);
export default HighlightInput;
