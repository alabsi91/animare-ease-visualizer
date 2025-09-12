/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/ban-ts-comment */

/** - Make the object type pretty (when hovering over it) and partial (optional) */
type Partialify<T> = { [K in keyof T]?: T[K] } & {};

export type NumberString = `${number}`;
export type BooleanString = "true" | "false";

/** Extends the HTMLElement `addEventListener` event names. */
export type AddEventListener<T extends Record<string, Event>, This = HTMLElement> = <
  K extends keyof HTMLElementEventMap | keyof T,
>(
  type: K,
  listener: (
    this: This,
    ev: K extends keyof T ? T[K] : K extends keyof HTMLElementEventMap ? HTMLElementEventMap[K] : never
  ) => void,
  options?: boolean | AddEventListenerOptions
) => void;

export interface IWebComponent extends HTMLElement {
  /**
   * Called each time the element is added to the document. The specification recommends that, as far as possible, developers
   * should implement custom element setup in this callback rather than the constructor.
   */
  connectedCallback?(): void;
  /**
   * When defined, this is called instead of `connectedCallback()` and `disconnectedCallback()` each time the element is moved to
   * a different place in the DOM via `Element.moveBefore()`. Use this to avoid running initialization/cleanup code in the
   * `connectedCallback()` and `disconnectedCallback()` callbacks when the element is not actually being added to or removed from
   * the DOM. See [Lifecycle callbacks and state-preserving moves for more
   * details](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#lifecycle_callbacks_and_state-preserving_moves)
   * for more details.
   */
  connectedMoveCallback?(): void;
  /** Called each time the element is removed from the document. */
  disconnectedCallback?(): void;
  /** Called each time the element is moved to a new document. */
  adoptedCallback?(): void;
  /**
   * Called when attributes are changed, added, removed, or replaced. See Responding to attribute changes for more details about
   * this callback.
   */
  attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): undefined;
  /** Returns whether the element is valid. */
  checkValidity?(): boolean;
  /** Returns whether the element is valid and reports its validity to its form owner. */
  reportValidity?(): boolean;
  /** Returns the error message that would be shown if the element's value is invalid. */
  readonly validationMessage?: string;
  /** Returns the validity states that an element has. */
  readonly validity?: ValidityState;
  /** Returns the form element to which this element is attached. */
  readonly form?: HTMLFormElement | null;
  /** Name of the form element, used in form data submission. */
  readonly name?: string;
  /**
   * Called in one of two circumstances:
   *
   * - When the browser restores the state of the element (for example, after a navigation, or when the browser restarts). The mode
   *   argument is "restore" in this case.
   * - When the browser's input-assist features such as form autofilling sets a value. The mode argument is "autocomplete" in this
   *   case.
   */
  formStateRestoreCallback?(state: string, mode: "restore" | "autocomplete"): void;
  /**
   * Called after the form is reset. The element should reset itself to some kind of default state. For <input> elements, this
   * usually involves setting the value property to match the value attribute set in markup (or in the case of a checkbox, setting
   * the checked property to match the checked attribute.
   */
  formResetCallback?(): void;
  /**
   * Called after the disabled state of the element changes, either because the disabled attribute of this element was added or
   * removed; or because the disabled state changed on a <fieldset> that's an ancestor of this element. The disabled parameter
   * represents the new disabled state of the element. The element may, for example, disable elements in its shadow DOM when it is
   * disabled.
   */
  formDisabledCallback?(disabled: boolean): void;
  /** Called when the browser associates the element with a form element, or disassociates the element from a form element. */
  formAssociatedCallback?(form: HTMLFormElement): void;
}

export interface IWebComponentStatic<T extends IWebComponent = IWebComponent> {
  new (): T;
  /**
   * A static property. This must be an array containing the names of all attributes for which the element needs change
   * notifications. An implementation of the `attributeChangedCallback()` lifecycle callback.
   */
  observedAttributes?: readonly [Lowercase<string>, ...Lowercase<string>[]];
  /** A static property. To inform the browser that the element is form-associated. */
  formAssociated?: boolean;
}

/** - Omit the native HTMLElement properties to get only the custom properties */
type OmitElementNativeProps<T extends IWebComponent> = Omit<T, keyof (HTMLElement & IWebComponent)>;

/** - Omit readonly properties to get only the writable properties */
type OmitReadonlyProps<T> = Pick<
  T,
  { [K in keyof T]: IfEquals<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, K, never> }[keyof T]
>;
type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

/** - Create { [onevnetname]: (e: EventType) => void } type for JSX props */
type MapEvents<T> = { [K in keyof T as K extends string ? `on${K}` : K]: (e: T[K]) => void };

export interface WComponent<
  T extends IWebComponentStatic,
  ExtendAttr extends Record<string, string> = {},
  WEvents extends Record<string, Event> = {},
> {
  Instance: InstanceType<T>;
  ObservedAttributes: T["observedAttributes"] extends infer U extends readonly string[] ? U[number] : never;
  Attributes: Record<this["ObservedAttributes"], string>;
  Props: OmitReadonlyProps<OmitElementNativeProps<this["Instance"]>>;
  Events: MapEvents<WEvents>;
  JsxProps: Partialify<
    Omit<this["Props"], keyof ExtendAttr | keyof this["Events"]> &
      Omit<this["Attributes"], keyof this["Props"] | keyof ExtendAttr | keyof this["Events"]> &
      ExtendAttr &
      this["Events"]
  >;
  JsxPropsOld: Partialify<Omit<this["Attributes"], keyof ExtendAttr> & ExtendAttr>;
}

// @ts-ignore React might be not installed
export type ReactWComponent<P extends Record<string, unknown>, C extends IWebComponent> = React.DetailedHTMLProps<
  // @ts-ignore React might be not installed
  React.HTMLAttributes<HTMLElement> & P,
  C
>;

/**
 * - A Guard to prevent using HTML element native events
 * - Prevent using hyphenated events to be compatible with JSX
 */
export type WEvent<T extends Record<string, CustomEventI<unknown, string>>> = {
  [K in keyof T]: K extends keyof HTMLElementEventMap
    ? { ERROR: "Error: Cannot use HTML element events" }
    : K extends `${string}-${string}`
      ? { ERROR: "Error: Cannot use hyphenated events" }
      : T[K] extends CustomEvent<infer D>
        ? CustomEventI<D, K & string> // Ensure K remains a string literal type
        : never;
};

export type WithDispatch<T extends Record<string, CustomEventI<unknown, string>>> = T & {
  /**
   * - Dispatch a custom event
   *
   * Example: `dispatch: (type, val) => this.dispatchEvent(new CustomEvent(type, { detail: val }))`
   */
  dispatch<K extends keyof T>(type: K, ...rest: unknown extends T[K]["detail"] ? [init?: any] : [init: T[K]["detail"]]): boolean;
};

// @ts-ignore Preact might be not installed
export type PreactWComponent<P extends Record<string, unknown>> = preact.JSX.HTMLAttributes<HTMLElement> & P;

interface CustomEventI<T, N extends string> extends Event {
  readonly detail: T;
  initCustomEvent(type: N, bubbles?: boolean, cancelable?: boolean, detail?: T): void;
}

export interface CustomEventT {
  prototype: CustomEvent;
  new <T, N extends string>(type: N, eventInitDict?: CustomEventInit<T>): CustomEventI<T, N>;
}

interface ElementInternalsT<States extends string> extends ElementInternals {
  states: Set<States>;
}

declare global {
  interface HTMLElement {
    attachInternals<States extends string = string>(): ElementInternalsT<States>;
  }
}
