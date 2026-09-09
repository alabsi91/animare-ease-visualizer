import type { GraphEditor } from "../graph-editor-component";

export type PanelSVGOptions = {
  x: number;
  y: number;
  size: number;
};

/**
 * The graph svg panel that includes:
 *
 * - The graph svg itself
 * - A background rectangle
 * - Grid lines
 * - Numbers for each grid line
 * - Text labels
 * - Animation representation (vertical progress bar and fps counter text label)
 */
export class GraphPanel {
  readonly #NUMBERS_OFFSET: number | string = 8; // px or percentage
  readonly #TXT_OFFSET: number | string = 0; // px or percentage
  readonly #ANIM_REPR_OFFSET: number = 4; // percentage only

  readonly graphEditor: GraphEditor;
  readonly element: SVGElement;

  #animFilledLine: SVGLineElement = null!;
  #animCircleIndicator: SVGCircleElement = null!;
  #animTargetVerticalLine: SVGLineElement = null!;
  #animTargetHorizontalLine: SVGLineElement = null!;
  #fpsCounter: SVGTextElement = null!;

  /** Sets the filled line and moves the circle indicator of the animation representation */
  set animLine(value: number) {
    this.#animFilledLine.setAttribute("y2", `${100 - value}%`);
    this.#animCircleIndicator.setAttribute("cy", `${100 - value}%`);
  }

  set animTargetLinesVertical(value: number) {
    this.#animTargetVerticalLine.setAttribute("x1", `${value}%`);
    this.#animTargetVerticalLine.setAttribute("x2", `${value}%`);
  }

  set animTargetLinesHorizontal(value: number) {
    this.#animTargetHorizontalLine.setAttribute("y1", `${100 - value}%`);
    this.#animTargetHorizontalLine.setAttribute("y2", `${100 - value}%`);
  }

  set fps(value: number) {
    this.#fpsCounter.textContent = value.toFixed(0) + " FPS";
  }

  #x = 0;
  /** ViewBox x */
  get x() {
    return this.#x;
  }
  set x(value: number) {
    this.#x = value;
    this.element.setAttribute("x", `${value}`);
  }

  #y = 0;
  /** ViewBox y */
  get y() {
    return this.#y;
  }
  set y(value: number) {
    this.#y = value;
    this.element.setAttribute("y", `${value}`);
  }

  #size = 0;
  /** ViewBox size */
  get size() {
    return this.#size;
  }
  set size(value: number) {
    this.#size = value;
    this.element.setAttribute("height", `${value}`);
    this.element.setAttribute("width", `${value}`);
    this.element.style.setProperty("--grid-size", `${value}`);
  }

  constructor(graphEditor: GraphEditor) {
    this.graphEditor = graphEditor;

    this.element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.element.classList.add("graph-panel");

    // background
    const gridBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    gridBackground.classList.add("graph-panel-background");
    gridBackground.setAttribute("x", "0");
    gridBackground.setAttribute("y", "0");
    gridBackground.setAttribute("height", "100%");
    gridBackground.setAttribute("width", "100%");
    this.element.appendChild(gridBackground);

    this.size = graphEditor.settings.panelSize;

    this.#drawLines();
    this.#drawNumbers();
    this.#drawTxt();
    this.#drawAnimRepresentation();
  }

  center = () => {
    this.x = (this.graphEditor.viewport.width - this.size) / 2;
    this.y = (this.graphEditor.viewport.height - this.size) / 2;
  };

  hideAnimTargetLines() {
    this.#animTargetVerticalLine.classList.add("hidden");
    this.#animTargetHorizontalLine.classList.add("hidden");
  }

  showAnimTargetLines() {
    this.#animTargetVerticalLine.classList.remove("hidden");
    this.#animTargetHorizontalLine.classList.remove("hidden");
  }

  /** Draw the grid lines */
  #drawLines() {
    const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gridGroup.classList.add("graph-panel-grid-lines");

    const verticalLinesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    verticalLinesGroup.classList.add("graph-panel-grid-vertical-lines");

    for (let i = 1; i < 10; i++) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      const spacing = `${i * 10}%`;
      line.setAttribute("x1", spacing);
      line.setAttribute("y1", "0");
      line.setAttribute("x2", spacing);
      line.setAttribute("y2", "100%");
      verticalLinesGroup.appendChild(line);
    }

    const horizontalLinesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    horizontalLinesGroup.classList.add("graph-panel-grid-horizontal-lines");

    for (let i = 1; i < 10; i++) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      const spacing = `${i * 10}%`;
      line.setAttribute("x1", "0");
      line.setAttribute("y1", spacing);
      line.setAttribute("x2", "100%");
      line.setAttribute("y2", spacing);
      horizontalLinesGroup.appendChild(line);
    }

    gridGroup.appendChild(verticalLinesGroup);
    gridGroup.appendChild(horizontalLinesGroup);
    this.element.appendChild(gridGroup);

    // diagonal line
    const diagonalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    diagonalLine.setAttribute("x1", "0%");
    diagonalLine.setAttribute("y1", "100%");
    diagonalLine.setAttribute("x2", "100%");
    diagonalLine.setAttribute("y2", "0%");
    gridGroup.appendChild(diagonalLine);
  }

  /** Draw vertical and horizontal grid numbers */
  #drawNumbers() {
    const gridNumbersGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gridNumbersGroup.classList.add("graph-panel-grid-numbers");

    const verticalNumbersGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    verticalNumbersGroup.classList.add("graph-panel-grid-vertical-numbers");

    for (let i = 0; i <= 10; i++) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const spacing = `${(i / 10) * 100}%`;
      text.setAttribute("x", "0");
      text.setAttribute("y", spacing);
      text.setAttribute("dx", `-${this.#NUMBERS_OFFSET}`);
      text.setAttribute("text-rendering", "geometricPrecision");
      text.setAttribute("text-anchor", "end");
      text.setAttribute("dominant-baseline", "middle");
      text.textContent = (+(1 - i / 10).toFixed(1)).toString();
      verticalNumbersGroup.appendChild(text);
    }

    const horizontalNumbersGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    horizontalNumbersGroup.classList.add("graph-panel-grid-horizontal-numbers");

    for (let i = 0; i <= 10; i++) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const spacing = `${(i / 10) * 100}%`;
      text.setAttribute("x", spacing);
      text.setAttribute("y", "100%");
      text.setAttribute("dy", `${this.#NUMBERS_OFFSET}`);
      text.setAttribute("dominant-baseline", "text-before-edge");
      text.setAttribute("text-anchor", "middle");
      text.textContent = (+(i / 10).toFixed(1)).toString();
      horizontalNumbersGroup.appendChild(text);
    }

    this.element.appendChild(gridNumbersGroup);
    gridNumbersGroup.appendChild(verticalNumbersGroup);
    gridNumbersGroup.appendChild(horizontalNumbersGroup);
  }

  /** Draw extra information about the grid */
  #drawTxt() {
    const txtGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    txtGroup.classList.add("graph-panel-labels");

    // Top text
    const topTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    topTxt.setAttribute("x", "50%");
    topTxt.setAttribute("y", "0");
    topTxt.setAttribute("dy", `-${this.#TXT_OFFSET}`);
    topTxt.setAttribute("dominant-baseline", "text-after-edge");
    topTxt.setAttribute("text-anchor", "middle");
    topTxt.textContent = "Time (Progress)";
    txtGroup.appendChild(topTxt);

    // Right side text
    const rightTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    rightTxt.style.writingMode = "vertical-lr";
    rightTxt.setAttribute("x", "100%");
    rightTxt.setAttribute("y", "50%");
    rightTxt.setAttribute("dx", `${this.#TXT_OFFSET}`);
    rightTxt.setAttribute("dominant-baseline", "text-after-edge");
    rightTxt.setAttribute("text-anchor", "middle");
    rightTxt.textContent = "Y-axis (Value)";
    txtGroup.appendChild(rightTxt);

    // Fps counter
    const fpsTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    fpsTxt.classList.add("graph-panel-fps-counter");
    fpsTxt.setAttribute("x", `${100 + this.#ANIM_REPR_OFFSET + 4}%`);
    fpsTxt.setAttribute("y", "100%");
    fpsTxt.setAttribute("dx", `${this.#TXT_OFFSET}`);
    fpsTxt.setAttribute("text-anchor", "start");
    fpsTxt.textContent = "0 FPS";
    txtGroup.appendChild(fpsTxt);
    this.#fpsCounter = fpsTxt;

    this.element.appendChild(txtGroup);
  }

  #drawAnimRepresentation() {
    const animGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    animGroup.classList.add("svg-anim-representation");

    // empty line
    const emptyLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    emptyLine.classList.add("empty-line");
    emptyLine.setAttribute("x1", `${100 + this.#ANIM_REPR_OFFSET}%`);
    emptyLine.setAttribute("y1", "100%");
    emptyLine.setAttribute("x2", `${100 + this.#ANIM_REPR_OFFSET}%`);
    emptyLine.setAttribute("y2", "0");
    animGroup.appendChild(emptyLine);

    // filled line
    const filledLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    filledLine.classList.add("filled-line");
    filledLine.setAttribute("x1", `${100 + this.#ANIM_REPR_OFFSET}%`);
    filledLine.setAttribute("y1", "100%");
    filledLine.setAttribute("x2", `${100 + this.#ANIM_REPR_OFFSET}%`);
    filledLine.setAttribute("y2", "100%");
    animGroup.appendChild(filledLine);
    this.#animFilledLine = filledLine;

    // circle
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.classList.add("circle-indicator");
    circle.setAttribute("cx", `${100 + this.#ANIM_REPR_OFFSET}%`);
    circle.setAttribute("cy", "100%");
    animGroup.appendChild(circle);
    this.#animCircleIndicator = circle;

    // target lines
    const targetVerticalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    targetVerticalLine.classList.add("target-vertical-line", "hidden");
    targetVerticalLine.setAttribute("x1", "0");
    targetVerticalLine.setAttribute("y1", "500%");
    targetVerticalLine.setAttribute("x2", "0");
    targetVerticalLine.setAttribute("y2", "-500%");
    animGroup.appendChild(targetVerticalLine);
    this.#animTargetVerticalLine = targetVerticalLine;

    const targetHorizontalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    targetHorizontalLine.classList.add("target-horizontal-line", "hidden");
    targetHorizontalLine.setAttribute("x1", "-500%");
    targetHorizontalLine.setAttribute("y1", "0");
    targetHorizontalLine.setAttribute("x2", "500%");
    targetHorizontalLine.setAttribute("y2", "0");
    animGroup.appendChild(targetHorizontalLine);
    this.#animTargetHorizontalLine = targetHorizontalLine;

    this.element.appendChild(animGroup);
  }
}
