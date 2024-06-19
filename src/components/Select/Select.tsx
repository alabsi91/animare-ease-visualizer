import { useCallback, useEffect, useRef, useState } from 'react';
import style from './Select.module.css';

const clamp = (value: number, min: number, max: number) => (value < min ? min : value > max ? max : value);

const MAX_HEIGHT = 600;
const ITEM_HEIGHT = 40;
/** the Space between the start of the menu and the button that opens it */
const START_MARGIN = 10;
/** the Space between the end of the menu and the edge of the screen top/bottom */
const END_MARGIN = 30;
const DURATION = 200;

type Props<T> = {
  labels: readonly string[];
  values: readonly T[];
  defaultValue?: T[][number];
  value?: T[][number];
  SelectButton: React.FunctionComponent<{ title: string; isOpen: boolean; onClick: () => void }>;
  containerStyle?: React.CSSProperties;
  minWidth?: number;
  highlightSelected?: boolean;
  onChange: (value: T) => void;
};

export default function Select<T>({
  labels,
  values,
  SelectButton,
  value,
  defaultValue,
  containerStyle,
  minWidth = 100,
  highlightSelected = true,
  onChange,
}: Props<T>) {
  if (labels.length !== values.length) throw new Error('[Select] `names` and `values` should have the same length !!');

  const [selected, setSelected] = useState(labels[values.indexOf(value ?? defaultValue ?? values[0])]);
  const [show, setShow] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null!);

  const calcMenuBounding = () => {
    const menuHeight = labels.length * ITEM_HEIGHT;
    const container = dialogRef.current.parentElement;
    if (!container) return { height: 0 };

    const { left, top, bottom, width } = container.getBoundingClientRect();
    const openDownwards = window.innerHeight - (bottom + END_MARGIN) > top + START_MARGIN;

    const maxHeight = Math.min(openDownwards ? window.innerHeight - (bottom + END_MARGIN) : top - END_MARGIN, MAX_HEIGHT);
    const height = clamp(menuHeight, 0, maxHeight);
    const topPos = openDownwards ? bottom + START_MARGIN : top - START_MARGIN - height;

    return {
      height,
      maxHeight,
      width: Math.max(width, minWidth),
      top: topPos,
      left,
      openDownwards,
    };
  };

  const setMenuPos = useCallback(() => {
    const container = dialogRef.current.parentElement;
    if (!container || !dialogRef.current) return;

    const { maxHeight, width, top, left } = calcMenuBounding();

    dialogRef.current.style.maxHeight = maxHeight + 'px';
    dialogRef.current.style.width = width + 'px';
    dialogRef.current.style.left = left + 'px';
    dialogRef.current.style.top = top + 'px';
  }, []);

  const clickOutSide = useCallback((e: MouseEvent) => {
    if (!dialogRef.current) return;
    const { left, top, right, bottom } = dialogRef.current.getBoundingClientRect();
    const scroll = window.scrollY;
    const isClickInside = e.pageX >= left && e.pageX <= right && e.pageY <= bottom + scroll && e.pageY >= top + scroll;
    if (!isClickInside && dialogRef.current.open) setShow(false);
  }, []);

  const open = () => {
    if (dialogRef.current.open) return;

    dialogRef.current.showModal();

    if (highlightSelected) {
      // highlight
      const lists = dialogRef.current.querySelectorAll<HTMLUListElement>('li');
      const selectedLi = lists[labels.indexOf(selected)];

      //  scroll to the highlight item
      if (selectedLi) {
        lists.forEach(el => el.classList.remove(style.selected));
        dialogRef.current.scrollTo({ top: selectedLi.offsetTop, behavior: 'auto' });
        selectedLi.classList.add(style.selected);
      }
    }

    const { height, maxHeight, width, top, left, openDownwards } = calcMenuBounding();

    dialogRef.current.style.maxHeight = maxHeight + 'px';
    dialogRef.current.style.width = width + 'px';
    dialogRef.current.style.left = left + 'px';
    dialogRef.current.style.top = top + 'px';

    const hasScrollBar = dialogRef.current.scrollHeight > height;
    if (!hasScrollBar) dialogRef.current.style.overflow = 'hidden';

    dialogRef.current.animate(
      [
        { height: '0px', transform: openDownwards ? 'translateY(0px)' : `translateY(${height}px)` },
        { height: height + 'px', transform: 'translateY(0px)' },
      ],
      { duration: DURATION, easing: 'ease', fill: 'none' },
    ).onfinish = () => {
      dialogRef.current.style.overflow = 'auto';

      document.addEventListener('click', clickOutSide);
      window.addEventListener('scroll', setMenuPos);
      window.addEventListener('resize', setMenuPos);
    };

    // items fade in
    const items = dialogRef.current.querySelectorAll<HTMLLIElement>(`.${style.itemsContainer} ul li`);
    items.forEach(e => e.classList.add(style['fade-in']));
  };

  const close = () => {
    if (!dialogRef.current.open) return;

    const { height, openDownwards } = calcMenuBounding();
    const hasScrollBar = dialogRef.current.scrollHeight > height;

    if (!hasScrollBar) dialogRef.current.style.overflow = 'hidden';

    dialogRef.current.animate(
      [
        { height: height + 'px', transform: 'translateY(0px)' },
        { height: '0px', transform: openDownwards ? 'translateY(0px)' : `translateY(${height}px)` },
      ],
      { duration: DURATION, easing: 'ease', fill: 'none' },
    ).onfinish = () => {
      dialogRef.current.close();
      document.removeEventListener('click', clickOutSide);
      window.removeEventListener('scroll', setMenuPos);
      window.removeEventListener('resize', setMenuPos);
    };
  };

  useEffect(() => {
    if (show) open();

    if (!show) close();

    return () => {
      document.removeEventListener('click', clickOutSide);
      window.removeEventListener('scroll', setMenuPos);
      window.removeEventListener('resize', setMenuPos);
    };
  }, [show]);

  useEffect(() => {
    if (typeof value === 'undefined') return;
    setSelected(labels[values.indexOf(value)]);
  }, [value]);

  const Menu = () => {
    return labels.map((name, idx) => (
      <li key={`${values[idx]}item-key`}>
        <button
          className={style.item}
          onClick={() => {
            setShow(false);
            if (typeof value === 'undefined') setSelected(name);
            onChange(values[idx]);
          }}
        >
          {name}
        </button>
      </li>
    ));
  };

  const onCancel: React.ReactEventHandler<HTMLDialogElement> = e => {
    e.preventDefault();
    setShow(false);
  };

  const toggle = () => {
    setShow(!show);
  };

  return (
    <div style={containerStyle} className={style.container}>
      <SelectButton title={selected} isOpen={show} onClick={toggle} />

      <dialog ref={dialogRef} onCancel={onCancel} className={style.itemsContainer}>
        <ul>
          <Menu />
        </ul>
      </dialog>
    </div>
  );
}
