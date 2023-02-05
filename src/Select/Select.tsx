/* eslint-disable react-hooks/exhaustive-deps */
import style from './Select.module.css';
import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

const clamp = (value: number, min: number, max: number) => (value < min ? min : value > max ? max : value);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_HIEGHT = 600;
const BOTTOM_MARGIN = 30;

type BASIC = string | number | boolean | null | undefined;
type Props<T extends Array<BASIC>> = {
  names: readonly string[];
  values: readonly [...T];
  defaultValue?: [...T][number];
  SelectButton: React.FunctionComponent<{ title: string; onClick: () => void }>;
  containerStyle?: React.CSSProperties;
  minWidth?: number;
  onChange: (value: T[number]) => void;
};
export type SelectRef<F extends Array<any> = string[]> = {
  setValue: (value: [...F][number]) => void;
};

function SelectComponent<T extends Array<BASIC>>(
  { names, values, SelectButton, defaultValue, containerStyle, minWidth= 100, onChange }: Props<T>,
  ref: React.ForwardedRef<SelectRef>
) {
  if (names.length !== values.length) throw new Error('[Select] `names` and `values` should have the same length !!');

  const [selected, setSelected] = useState(names[values.indexOf(defaultValue ?? values[0])]);
  const [show, setShow] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null!);

  const getMenuHeight = () => {
    const menuHeight = names.length * 40;
    const container = dialogRef.current.parentElement;
    if (!container) return menuHeight;

    const { bottom } = container.getBoundingClientRect();

    const maxHeight = Math.min(window.innerHeight - (bottom + BOTTOM_MARGIN), MAX_HIEGHT);

    return clamp(menuHeight, 0, maxHeight);
  };

  const setMenuPos = useCallback(() => {
    const container = dialogRef.current.parentElement;
    if (!container || !dialogRef.current) return;

    const { left, bottom, width } = container.getBoundingClientRect();

    dialogRef.current.style.left = left + 'px';
    dialogRef.current.style.top = bottom + 10 + 'px';
    dialogRef.current.style.width = Math.max(width, minWidth) + 'px';

    const maxHeight = Math.min(window.innerHeight - (bottom + BOTTOM_MARGIN), MAX_HIEGHT);
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

    setMenuPos();

    dialogRef.current.style.overflow = 'hidden';
    dialogRef.current.style.height = '0px';
    await sleep(1);
    dialogRef.current.style.height = getMenuHeight() + 'px';

    // items fade in
    const items = dialogRef.current.querySelectorAll<HTMLLIElement>(`.${style.itemsContainer} ul li`);
    items.forEach(e => e.classList.add(style['fade-in']));

    await sleep(200);

    dialogRef.current.style.removeProperty('height');
    dialogRef.current.style.overflow = 'auto';

    document.addEventListener('click', clickOutSide);
    window.addEventListener('scroll', setMenuPos);
    window.addEventListener('resize', setMenuPos);
  };

  const close = async () => {
    dialogRef.current.style.overflow = 'hidden';
    dialogRef.current.style.height = getMenuHeight() + 'px';
    await sleep(1);
    dialogRef.current.style.height = '0px';

    await sleep(200);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const Menu = () => {
    return names.map((name, idx) => (
      <li key={values[idx] + 'key'}>
        <button
          className={style.item}
          onClick={() => {
            setShow(false);
            setSelected(name);
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useImperativeHandle(ref, () => ({ setValue: value => setSelected(names[values.indexOf(value)]) }), []);

  const toggle = () => {
    setShow(!show);
  };

  return (
    <div style={containerStyle} className={style.container}>
      <SelectButton title={selected} onClick={toggle} />

      <dialog ref={dialogRef} onCancel={onCancel} className={style.itemsContainer}>
        <ul>{Menu()}</ul>
      </dialog>
    </div>
  );
}

const Select = forwardRef(SelectComponent) as <T extends Array<BASIC>>(
  props: Props<T> & { ref?: React.ForwardedRef<SelectRef> }
) => ReturnType<typeof SelectComponent>;

export default Select;
