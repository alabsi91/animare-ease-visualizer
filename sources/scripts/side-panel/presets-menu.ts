import { elements } from "../elements";
import { presets } from "./presets";
import { setGraphPath } from "../graph/graph";
import { storage } from "../storage";
import { showAlert } from "../alert";

const MAX_PRESET_NAME_LENGTH = 15;
const CURVE_ICON_PADDING = 0.08;

export function initializePresetsMenu() {
  const presetOptions = presets.map(({ name, path }) => createPresetOption(name, path));
  elements.presetsFlyout.append(...presetOptions);

  for (const { name, path } of storage.savedGraphs) {
    addCustomPresetToMenu(name, path);
  }

  syncDeletePresetButton();

  elements.presetsMenu.addEventListener("valuechange", onPresetChange);
  elements.savePresetNameInput.addEventListener("input", syncSavePresetButton);
  elements.savePresetBtn.addEventListener("click", savePresetHandler);
  elements.deletePresetBtn.addEventListener("click", deletePresetHandler);
}

function createPresetOption(name: string, pathStr: string) {
  const option = document.createElement("button");
  option.type = "button";
  option.className = "preset-option";
  option.value = pathStr;

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "preset-curve-icon");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("viewBox", getCurveViewBox(pathStr));
  icon.setAttribute("preserveAspectRatio", "none");

  const curve = document.createElementNS("http://www.w3.org/2000/svg", "path");
  curve.setAttribute("d", pathStr);
  curve.setAttribute("vector-effect", "non-scaling-stroke");
  icon.append(curve);

  option.append(icon, name);
  return option;
}

function getCurveViewBox(pathStr: string) {
  const numbers = pathStr.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const verticalValues = numbers.filter((_, index) => index % 2 === 1);

  const top = Math.min(0, ...verticalValues) - CURVE_ICON_PADDING;
  const bottom = Math.max(1, ...verticalValues) + CURVE_ICON_PADDING;

  return `0 ${top} 1 ${bottom - top}`;
}

function addCustomPresetToMenu(name: string, pathStr: string) {
  const option = createPresetOption(name, pathStr);
  option.dataset.customPreset = name;
  elements.presetsFlyout.append(option);
}

function syncSavePresetButton() {
  elements.savePresetBtn.disabled = elements.savePresetNameInput.value.trim() === "";
}

function syncDeletePresetButton() {
  elements.deletePresetBtn.hidden = getSelectedCustomPreset() === null;
}

function getSelectedCustomPreset() {
  const value = elements.presetsMenu.value;
  if (typeof value !== "string" || !value) return null;

  const options = elements.presetsFlyout.querySelectorAll<HTMLButtonElement>("[data-custom-preset]");
  for (const option of options) {
    if (option.value === value) return option;
  }

  return null;
}

function onPresetChange() {
  syncDeletePresetButton();

  const pathStr = elements.presetsMenu.value;
  if (typeof pathStr !== "string" || !pathStr) return;

  setGraphPath(pathStr);
  elements.graphEditor.fitToPath();
}

function savePresetHandler() {
  const presetName = elements.savePresetNameInput.value;
  if (!presetName) {
    showAlert("error", "Please enter the preset name first");
    return;
  }

  if (presetName.length > MAX_PRESET_NAME_LENGTH) {
    showAlert("error", "The preset name is too long");
    return;
  }

  const exists = storage.savedGraphs.find(e => e.name === presetName);
  if (exists) {
    showAlert("error", "A preset with this name already exists");
    return;
  }

  const pathStr = elements.graphEditor.points.valueStr;

  storage.saveGraph(presetName, pathStr);
  addCustomPresetToMenu(presetName, pathStr);
  elements.presetsMenu.value = pathStr;
  syncDeletePresetButton();

  showAlert("success", "Preset saved to the local storage");
}

function deletePresetHandler() {
  const option = getSelectedCustomPreset();
  if (!option) return;

  const name = option.dataset.customPreset!;

  storage.deleteGraph(name);
  option.remove();
  elements.presetsMenu.value = "";
  syncDeletePresetButton();

  showAlert("info", `Preset "${name}" was deleted`);
}
