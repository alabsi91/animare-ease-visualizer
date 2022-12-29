import style from './Select.module.css';
import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

const clamp = (value: number, min: number, max: number) => (value < min ? min : value > max ? max : value);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type BASIC = string | number | boolean | null | undefined;
type Props<T extends Array<BASIC>> = {
  names: string[];
  values: [...T];
  defaultValue?: [...T][number];
  SelectButton: React.FunctionComponent<{ title: string; onClick: () => void }>;
  onChange: (value: T[number]) => void;
};
export type SelectRef<F extends Array<any> = string[]> = {
  setValue: (value: [...F][number]) => void;
};

function SelectComponent<T extends Array<BASIC>>(
  { names, values, SelectButton, defaultValue, onChange }: Props<T>,
  ref: React.ForwardedRef<SelectRef>
) {
  if (names.length !== values.length) throw new Error('[Select] `names` and `values` should have the same length !!');

  const [selected, setSelected] = useState(names[values.indexOf(defaultValue ?? values[0])]);
  const [show, setShow] = useState(false);

  const el = useRef<HTMLDialogElement>(null!);

  const getMenuHeight = () => {
    const menuHeight = names.length * 40;
    const container = el.current.parentElement;
    if (!container) return menuHeight;
    const { bottom } = container.getBoundingClientRect();
    const maxHeight = window.innerHeight - (bottom + 20);

    return clamp(menuHeight, 0, maxHeight);
  };

  const setMenuPos = useCallback(() => {
    const container = el.current.parentElement;
    if (!container || !el.current) return;
    const { left, bottom, width } = container.getBoundingClientRect();
    el.current.style.left = left + 'px';
    el.current.style.top = bottom + 10 + 'px';
    el.current.style.width = width + 'px';
    el.current.style.maxHeight = window.innerHeight - (bottom + 20) + 'px';
  }, []);

  const clickOutSide = useCallback((e: MouseEvent) => {
    if (!el.current) return;
    const { left, top, right, bottom } = el.current.getBoundingClientRect();
    const scroll = window.scrollY;
    const isClickInside = e.pageX >= left && e.pageX <= right && e.pageY <= bottom + scroll && e.pageY >= top + scroll;
    if (!isClickInside && el.current.open) setShow(false);
  }, []);

  const open = async () => {
    el.current.showModal();

    setMenuPos();

    el.current.style.overflow = 'hidden';
    el.current.style.height = '0px';
    await sleep(1);
    el.current.style.height = getMenuHeight() + 'px';

    const items = el.current.querySelectorAll<HTMLLIElement>(`.${style.itemsContainer} ul li`);
    items.forEach(e => e.classList.add(style['fade-in']));

    await sleep(200);

    el.current.style.removeProperty('height');
    el.current.style.overflow = 'auto';

    document.addEventListener('click', clickOutSide);
    window.addEventListener('scroll', setMenuPos);
    window.addEventListener('resize', setMenuPos);
  };

  const close = async () => {
    el.current.style.overflow = 'hidden';
    el.current.style.height = getMenuHeight() + 'px';
    await sleep(1);
    el.current.style.height = '0px';

    await sleep(200);

    el.current.close();
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

  return (
    <div className={style.container}>
      <SelectButton title={selected} onClick={() => setShow(!show)} />

      <dialog ref={el} onCancel={onCancel} className={style.itemsContainer}>
        <ul>{Menu()}</ul>
      </dialog>
    </div>
  );
}

const Select = forwardRef(SelectComponent) as <T extends Array<BASIC>>(
  props: Props<T> & { ref?: React.ForwardedRef<SelectRef> }
) => ReturnType<typeof SelectComponent>;

export default Select;
