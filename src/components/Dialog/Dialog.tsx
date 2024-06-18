import { useRef, forwardRef, useImperativeHandle, useEffect, useCallback, useState } from 'react';
import styles from './Dialog.module.css';

type propsT = {
  /** - Bind the visibility of the dialog to a state. */
  show?: boolean;
  /** - This callback will only be called if the `show` prop is provided and when the dialog is being dismissed. */
  onRequestClose?: () => void;
  onShow?: () => void;
  onHide?: () => void;
  /** - Hides the dialog when the user clicks anywhere outside of it. */
  hideOnOutsideClick?: boolean;
  /** - Unmounts the children when the component is hidden and remounts them when it is shown again.*/
  unmoutOnHide?: boolean;
  children: React.ReactNode;
  style?: React.HTMLAttributes<HTMLDialogElement>['style'];
};

export type DialogRef = {
  show: () => void;
  hide: () => void;
  toggle: () => void;
};

export default forwardRef<DialogRef, propsT>(
  (
    { children, show, hideOnOutsideClick = true, unmoutOnHide = false, onShow, onHide, onRequestClose, style }: propsT,
    ref: React.Ref<DialogRef>,
  ) => {
    const [mount, setMount] = useState(!unmoutOnHide);

    const dialogEl = useRef<HTMLDialogElement>(null);

    const clickOutside = useCallback((e: MouseEvent) => {
      if (!dialogEl.current) return;

      const { x, y, width, height } = dialogEl.current.getBoundingClientRect();
      const isClickInside = e.clientX >= x && e.clientX <= x + width && e.clientY <= y + height && e.clientY >= y;
      if (isClickInside) return;

      if (typeof show === 'boolean') {
        onRequestClose?.();
        return;
      }

      closeMethod();
    }, []);

    const showMethod = () => {
      if (!dialogEl.current) return;
      dialogEl.current.showModal();
      onShow?.();
      if (unmoutOnHide) setMount(true);

      if (hideOnOutsideClick) {
        const addEvent = () => document.addEventListener('click', clickOutside);
        dialogEl.current.addEventListener('animationend', addEvent, { once: true });
      }
    };

    function closeMethod() {
      if (!dialogEl.current) return;

      if (show === true) {
        onRequestClose?.();
        return;
      }

      dialogEl.current.classList.add(styles.hide);

      if (hideOnOutsideClick) document.removeEventListener('click', clickOutside);

      const onAnimationend = () => {
        if (!dialogEl.current) return;
        dialogEl.current.classList.remove(styles.hide);
        dialogEl.current.close();
        onHide?.();
        if (unmoutOnHide) setMount(false);
      };
      dialogEl.current.addEventListener('animationend', onAnimationend, { once: true });
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
      if (typeof show !== 'boolean') return;
      const isOpen = dialogEl.current?.open;
      if (show && !isOpen) showMethod();
      if (!show && isOpen) closeMethod();
    }, [show]);

    useEffect(() => {
      return () => document.removeEventListener('click', clickOutside);
    }, []);

    const onCancel: React.ReactEventHandler<HTMLDialogElement> = e => {
      e.preventDefault();
      closeMethod();
    };

    return (
      <dialog ref={dialogEl} onCancel={onCancel} style={style} id={styles.container}>
        {mount && children}
      </dialog>
    );
  },
);
