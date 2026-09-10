export function getElement<T extends HTMLElement>(selector: string): T {
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
  alertStack: getElement<AlertStack>("sv-alert-stack"),
  hideSidePanelBtn: getElement<HTMLButtonElement>(".hide-panel-btn"),
  showSidePanelBtn: getElement<HTMLButtonElement>(".show-side-panel"),
  playBtns: getAllElements<HTMLButtonElement>(".play-btn"),
  pauseBtns: getAllElements<HTMLButtonElement>(".pause-btn"),
  stopBtns: getAllElements<HTMLButtonElement>(".stop-btn"),
  progressSlider: getElement<Slider>(".progress-slider"),
  exportMenu: getElement<Menu>(".export-menu"),
  presetsMenu: getElement<Combobox>(".presets-menu"),
  presetsFlyout: getElement<Flyout>(".presets-menu sv-flyout"),
  deletePresetBtn: getElement<HTMLButtonElement>(".preset-delete-btn"),
  savePresetBtn: getElement<HTMLButtonElement>(".save-preset-btn"),
  savePresetNameInput: getElement<HTMLInputElement>(".save-preset-name-input"),
  easeGeneratorMenu: getElement<Combobox>(".ease-generator-menu"),
  easeGeneratorFlyout: getElement<Flyout>(".ease-generator-menu sv-flyout"),
  easeGeneratorParams: getElement<HTMLDivElement>(".ease-generator-params"),
  easeGeneratorParamTemplate: getElement<HTMLTemplateElement>(".ease-generator-param-template"),
  autoHidePointsToggle: getElement<ToggleCheckbox>("#auto-hide-toggle"),
  snapToGridToggle: getElement<ToggleCheckbox>("#snap-to-grid-toggle"),
  snapToPointsToggle: getElement<ToggleCheckbox>("#snap-to-points-toggle"),
  durationInput: getElement<HTMLInputElement>("#duration-input"),
  pathCodeEditor: getElement<CodeEditor>(".svg-path-code-editor"),
};
