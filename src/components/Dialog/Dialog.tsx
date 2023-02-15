import { useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from 'react';
import styles from './Dialog.module.css';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type propsT = {
  children: React.ReactNode;
  style?: React.HTMLAttributes<HTMLDialogElement>['style'];
};

export type DialogRef = {
  show: () => Promise<void>;
  hide: () => Promise<void>;
  toggle: () => void;
};

export default forwardRef<DialogRef, propsT>(({ children, style }: propsT, ref: React.Ref<DialogRef>) => {
  const dialogEl = useRef<HTMLDialogElement>(null);

  const clickOutside = useCallback((e: MouseEvent) => {
    if (!dialogEl.current) return;
    const { x, y, width, height } = dialogEl.current.getBoundingClientRect();
    const isClickInside = e.clientX >= x && e.clientX <= x + width && e.clientY <= y + height && e.clientY >= y;
    if (!isClickInside) closeMethod();
  }, []);

  const showMethod = async () => {
    if (!dialogEl.current) return;
    dialogEl.current.showModal();
    await sleep(230);
    document.addEventListener('click', clickOutside);
  };

  async function closeMethod() {
    if (!dialogEl.current) return;
    dialogEl.current.classList.add(styles.hide);

    document.removeEventListener('click', clickOutside);

    await sleep(200);

    dialogEl.current.classList.remove(styles.hide);
    dialogEl.current.close();
  }

  const toggle = () => {
    if (dialogEl.current?.open) closeMethod();
    else showMethod();
  };

  useImperativeHandle(ref, () => ({
    show: showMethod,
    hide: closeMethod,
    toggle,
  }));

  useEffect(() => {
    return () => document.removeEventListener('click', clickOutside);
  }, []);

  const onCancel: React.ReactEventHandler<HTMLDialogElement> = e => {
    e.preventDefault();
    closeMethod();
  };

  return (
    <dialog ref={dialogEl} onCancel={onCancel} style={style} id={styles.container}>
      {children}
    </dialog>
  );
});
