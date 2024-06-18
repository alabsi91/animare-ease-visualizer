import { useCallback, useEffect, useRef, useState } from 'react';
import style from './Select.module.css';

const clamp = (value: number, min: number, max: number) => (value < min ? min : value > max ? max : value);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_HEIGHT = 600;
const ITEM_HEIGHT = 40;
const TOP_MARGIN = 10;
const BOTTOM_MARGIN = 30;
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

  const getMenuHeight = () => {
    const menuHeight = labels.length * ITEM_HEIGHT;
    const container = dialogRef.current.parentElement;
    if (!container) return menuHeight;

    const { bottom } = container.getBoundingClientRect();

    const maxHeight = Math.min(window.innerHeight - (bottom + BOTTOM_MARGIN), MAX_HEIGHT);

    return clamp(menuHeight, 0, maxHeight);
  };

  const setMenuPos = useCallback(() => {
    const container = dialogRef.current.parentElement;
    if (!container || !dialogRef.current) return;

    const { left, bottom, width } = container.getBoundingClientRect();

    dialogRef.current.style.left = left + 'px';
    dialogRef.current.style.top = bottom + TOP_MARGIN + 'px';
    dialogRef.current.style.width = Math.max(width, minWidth) + 'px';

    const maxHeight = Math.min(window.innerHeight - (bottom + BOTTOM_MARGIN), MAX_HEIGHT);
    dialogRef.current.style.maxHeight = maxHeight + 'px';
  }, []);

  const clickOutSide = useCallback((e: MouseEvent) => {
    if (!dialogRef.current) return;
    const { left, top, right, bottom } = dialogRef.current.getBoundingClientRect();
    const scroll = window.scrollY;
    const isClickInside = e.pageX >= left && e.pageX <= right && e.pageY <= bottom + scroll && e.pageY >= top + scroll;
    if (!isClickInside && dialogRef.current.open) setShow(false);
  }, []);

  const open = async () => {
    dialogRef.current.showModal();

    // highlight and scroll to the selected item
    if (highlightSelected) {
      const lists = dialogRef.current.querySelectorAll<HTMLUListElement>('li');
      const selectedLi = lists[labels.indexOf(selected)];

      if (selectedLi) {
        lists.forEach(el => el.classList.remove(style.selected));
        dialogRef.current.scrollTo({ top: selectedLi.offsetTop, behavior: 'auto' });
        selectedLi.classList.add(style.selected);
      }
    }

    setMenuPos();

    const menuHeight = getMenuHeight();
    const hasScrollBar = dialogRef.current.scrollHeight > menuHeight;

    if (!hasScrollBar) dialogRef.current.style.overflow = 'hidden';
    dialogRef.current.style.height = '0px'; // animate from height 0
    await sleep(1);
    dialogRef.current.style.height = menuHeight + 'px'; // animate to height

    // items fade in
    const items = dialogRef.current.querySelectorAll<HTMLLIElement>(`.${style.itemsContainer} ul li`);
    items.forEach(e => e.classList.add(style['fade-in']));

    await sleep(DURATION);

    dialogRef.current.style.removeProperty('height');
    dialogRef.current.style.overflow = 'auto';

    document.addEventListener('click', clickOutSide);
    window.addEventListener('scroll', setMenuPos);
    window.addEventListener('resize', setMenuPos);
  };

  const close = async () => {
    const menuHeight = getMenuHeight();
    const hasScrollBar = dialogRef.current.scrollHeight > menuHeight;

    if (!hasScrollBar) dialogRef.current.style.overflow = 'hidden';
    dialogRef.current.style.height = menuHeight + 'px'; // animate from height
    await sleep(1);
    dialogRef.current.style.height = '0px'; // animate to height 0

    await sleep(DURATION);

    dialogRef.current.close();
    document.removeEventListener('click', clickOutSide);
    window.removeEventListener('scroll', setMenuPos);
    window.removeEventListener('resize', setMenuPos);
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
