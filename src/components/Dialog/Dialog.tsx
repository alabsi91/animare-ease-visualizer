import { CreateFromFC } from 'idify-react-component';
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styles from './Dialog.module.css';

type Props = {
  /** - Bind the visibility of the dialog to a state. */
  show?: boolean;
  /** - This callback will only be called if the `show` prop is provided and when the dialog is being dismissed. */
  onRequestClose?: () => void;
  onShow?: () => void;
  onHide?: () => void;
  /** - Hides the dialog when the user clicks anywhere outside of it. */
  hideOnOutsideClick?: boolean;
  /** - Unmounts the children when the component is hidden and remounts them when it is shown again.*/
  unmountOnHide?: boolean;
  children: React.ReactNode;
  style?: React.HTMLAttributes<HTMLDialogElement>['style'];
};

export type DialogRef = {
  show: () => void;
  hide: () => void;
  toggle: () => void;
};

function DialogRC(props: Props, ref: React.ForwardedRef<DialogRef>) {
  const { hideOnOutsideClick = true } = props;

  const [mount, setMount] = useState(!props.unmountOnHide);

  const dialogEl = useRef<HTMLDialogElement>(null);

  const clickOutside = useCallback((e: MouseEvent) => {
    if (!dialogEl.current) return;

    const { x, y, width, height } = dialogEl.current.getBoundingClientRect();
    const isClickInside = e.clientX >= x && e.clientX <= x + width && e.clientY <= y + height && e.clientY >= y;
    if (isClickInside) return;

    if (typeof props.show === 'boolean') {
      props.onRequestClose?.();
      return;
    }

    closeMethod();
  }, []);

  const showMethod = () => {
    if (!dialogEl.current) return;

    props.onShow?.();

    if (props.unmountOnHide) setMount(true);

    dialogEl.current.showModal();

    if (hideOnOutsideClick) {
      const addEvent = () => document.addEventListener('click', clickOutside);
      dialogEl.current.addEventListener('animationend', addEvent, { once: true });
    }
  };

  function closeMethod() {
    if (!dialogEl.current) return;

    if (props.show) {
      props.onRequestClose?.();
      return;
    }

    dialogEl.current.classList.add(styles.hide);

    if (hideOnOutsideClick) document.removeEventListener('click', clickOutside);

    const onAnimationend = () => {
      if (!dialogEl.current) return;
      dialogEl.current.classList.remove(styles.hide);
      dialogEl.current.close();
      props.onHide?.();
      if (props.unmountOnHide) setMount(false);
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
    if (typeof props.show !== 'boolean') return;
    const isOpen = dialogEl.current?.open;
    if (props.show && !isOpen) showMethod();
    if (!props.show && isOpen) closeMethod();
  }, [props.show]);

  useEffect(() => {
    return () => document.removeEventListener('click', clickOutside);
  }, []);

  const onCancel: React.ReactEventHandler<HTMLDialogElement> = e => {
    e.preventDefault();
    closeMethod();
  };

  return (
    <dialog ref={dialogEl} className={styles.container} onCancel={onCancel} style={props.style}>
      {mount && props.children}
    </dialog>
  );
}

const Dialog = CreateFromFC(DialogRC).setIdType<'exportJs' | 'exportSvg' | 'exportCssKeyframe' | 'exportCssLinear'>();
export default Dialog;
