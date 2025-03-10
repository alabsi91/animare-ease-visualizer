import type React from "react";

type Prettify<T> = { [K in keyof T]: T[K] } & {};

type NumberString = `${number}`;
type BooleanString = "true" | "false";

interface IWebComponent extends HTMLElement {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  adoptedCallback?(): void;
  attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
}

interface IWebComponentStatic<T extends IWebComponent = IWebComponent> {
  new (): T;
  observedAttributes?: readonly string[];
  formAssociated?: boolean;
}

type OmitElementNativeProps<T extends IWebComponent> = Omit<T, keyof (HTMLElement & IWebComponent)>;
type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;
type OmitReadonlyProps<T> = Pick<
  T,
  { [K in keyof T]: IfEquals<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, K, never> }[keyof T]
>;

interface WComponent<T extends IWebComponentStatic, ExtendAttr extends Record<string, unknown> = Record<string, unknown>> {
  Instance: InstanceType<T>;
  ObservedAttributes: T["observedAttributes"] extends infer U extends readonly string[] ? U[number] : never;
  ObserverAttributesRecord: Record<this["ObservedAttributes"], string>;
  Props: OmitReadonlyProps<OmitElementNativeProps<this["Instance"]>>;
  Attributes: Prettify<
    Partial<
      Omit<this["ObserverAttributesRecord"], keyof this["Props"] | keyof ExtendAttr> & Omit<this["Props"], keyof ExtendAttr>
    > &
      ExtendAttr
  >;
  JSX: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & this["Attributes"], this["Instance"]>;
}

export { NumberString, BooleanString, IWebComponent, WComponent };
