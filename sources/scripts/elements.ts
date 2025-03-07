function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Element ${selector} not found`);
  return element;
}

function getAllElements<T extends HTMLElement>(selector: string): T[] {
  const elements = document.querySelectorAll<T>(selector);
  if (!elements.length) throw new Error(`Elements ${selector} not found`);
  return Array.from(elements);
}

export const elements = {
  main: getElement<HTMLElement>("main"),
  graphEditor: getElement<GraphEditor>("graph-editor"),
  alert: getElement<AlertComponent>("alert-component"),
  sidePanel: getElement<HTMLDivElement>(".side-panel"),
  smallSidePanel: getElement<HTMLDivElement>(".small-side-panel"),
  hideSidePanelBtn: getElement<HTMLButtonElement>(".hide-panel-btn"),
  showSidePanelBtn: getElement<HTMLButtonElement>(".show-side-panel"),
  playBtns: getAllElements<HTMLButtonElement>(".play-btn"),
  pauseBtns: getAllElements<HTMLButtonElement>(".pause-btn"),
  stopBtns: getAllElements<HTMLButtonElement>(".stop-btn"),
  progressSlider: getElement<SliderComponent>(".progress-slider"),
  exportMenu: getElement<MenuComponent>(".export-menu"),
  presetsMenu: getElement<MenuComponent>(".presets-menu"),
  savePresetBtn: getElement<HTMLButtonElement>(".save-preset-btn"),
  savePresetNameInput: getElement<HTMLInputElement>(".save-preset-name-input"),
  autoHidePointsToggle: getElement<ToggleCheckbox>("#auto-hide-toggle"),
  snapToGridToggle: getElement<ToggleCheckbox>("#snap-to-grid-toggle"),
  snapToPointsToggle: getElement<ToggleCheckbox>("#snap-to-points-toggle"),
  durationInput: getElement<HTMLInputElement>("#duration-input"),
  pathCodeEditor: getElement<CodeEditor>(".svg-path-code-editor"),
};
