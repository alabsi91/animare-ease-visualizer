import styles from './HighlightTextarea.module.css';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

type InputType = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

type Props = {
  highlight?: { match: string | RegExp; color?: string; class?: string }[];
  plugin?: (input: string) => string;
} & Omit<InputType, 'className' | 'id'>;

export type HighlightTextareaRef = {
  setValue: (value: string) => void;
};
const HighlightTextareaComponent: React.ForwardRefRenderFunction<HighlightTextareaRef, Props> = function (props, ref) {
  let { highlight, plugin, ...inputProps } = props;

  const [currentValue, setCurrentValue] = useState(props.value ?? props.defaultValue ?? '');

  const paragraphRef = useRef<HTMLParagraphElement>(null!);
  const textareaRef = useRef<HTMLTextAreaElement>(null!);

  const onInputChange: React.ChangeEventHandler<HTMLTextAreaElement> = e => {
    const text = e.target.value;

    if (typeof props.value === 'undefined') setCurrentValue(text);
    props.onChange?.(e);
  };

  const applyHighlight = (v: string | number | readonly string[]) => {
    const value = v.toString();

    if (plugin) {
      paragraphRef.current.innerHTML = plugin(value).replace(/\s+$/, '<span>$& &#8205;</span>');
      return;
    }

    if (!Array.isArray(highlight)) {
      paragraphRef.current.textContent = value;
      const extraSpace = value.match(/\s+$/);
      if (!extraSpace) return;
      paragraphRef.current.innerHTML += `<span>${extraSpace[0]} &#8205;</span>`;
      return;
    }

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

    paragraphRef.current.innerHTML = '';
    letters.forEach(el => paragraphRef.current.appendChild(el));
    const extraSpace = value.match(/\s+$/);
    if (!extraSpace) return;
    paragraphRef.current.innerHTML += `<span>${extraSpace[0]} &#8205;</span>`;
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      const textareaEl = textareaRef.current;

      const scrollbarWidth = parseFloat(getComputedStyle(textareaEl.parentElement!).getPropertyValue('--scrollbar-width'));

      paragraphRef.current.style.removeProperty('bottom');
      paragraphRef.current.style.removeProperty('right');

      if (textareaEl.offsetWidth < textareaEl.scrollWidth) paragraphRef.current.style.bottom = scrollbarWidth + 'px';
      if (textareaEl.offsetHeight < textareaEl.scrollHeight) paragraphRef.current.style.right = scrollbarWidth + 'px';
    });

    resizeObserver.observe(textareaRef.current);

    return () => {
      resizeObserver.unobserve(textareaRef.current);
    };
  }, []);

  useEffect(() => {
    applyHighlight(currentValue);
  }, [currentValue]);

  useEffect(() => {
    if (typeof props.value === 'string') applyHighlight(props.value);
  }, [props.value]);

  const onInputScroll: React.UIEventHandler<HTMLTextAreaElement> = e => {
    const textareaEl = e.target as HTMLInputElement;
    paragraphRef.current.scrollTo({ left: textareaEl.scrollLeft, top: textareaEl.scrollTop });
    props.onScroll?.(e);
  };

  const updateValue = (v: string | number | readonly string[]) => {
    textareaRef.current.value = v.toString();
    setCurrentValue(v);
  };

  useImperativeHandle(ref, () => ({ setValue: updateValue }), []);

  return (
    <div className={styles.container}>
      <textarea
        {...inputProps}
        ref={textareaRef}
        className={styles.input + ' ' + styles.textStyle}
        onChange={onInputChange}
        onScroll={onInputScroll}
      />
      <p ref={paragraphRef} className={styles.paragraph + ' ' + styles.textStyle} />
    </div>
  );
};

const HighlightTextarea = forwardRef<HighlightTextareaRef, Props>(HighlightTextareaComponent);
export default HighlightTextarea;
