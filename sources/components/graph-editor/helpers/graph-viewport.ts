import type { GraphEditor } from "../graph-editor-component";

export type ViewBoxParams = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * - The parent svg element
 * - Used as a container to provide relative coordinates
 * - Allows the graph panel to be moved and resized without thinking too much about scaling
 * - The viewBox size should match the size of it's html container
 */
export class GraphViewPort {
  readonly graphEditor: GraphEditor;
  readonly element: SVGElement;

  #x = 0;
  /** ViewBox x */
  get x() {
    return this.#x;
  }
  set x(value: number) {
    this.#x = value;
    this.element.setAttribute("viewBox", `${value} ${this.#y} ${this.#width} ${this.#height}`);
  }

  #y = 0;
  /** ViewBox y */
  get y() {
    return this.#y;
  }
  set y(value: number) {
    this.#y = value;
    this.element.setAttribute("viewBox", `${this.#x} ${value} ${this.#width} ${this.#height}`);
  }

  #width = 100;
  /** ViewBox width */
  get width() {
    return this.#width;
  }
  set width(value: number) {
    this.#width = value;
    this.element.setAttribute("viewBox", `${this.#x} ${this.#y} ${value} ${this.#height}`);
  }

  #height = 100;
  /** ViewBox height */
  get height() {
    return this.#height;
  }
  set height(value: number) {
    this.#height = value;
    this.element.setAttribute("viewBox", `${this.#x} ${this.#y} ${this.#width} ${value}`);
  }

  constructor(graphEditor: GraphEditor) {
    this.graphEditor = graphEditor;

    this.element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.element.classList.add("graph-view-port");
  }
}
