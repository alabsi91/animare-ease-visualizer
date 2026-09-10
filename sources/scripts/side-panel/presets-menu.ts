import { checkGraphOverlap } from "../graph/graph";
import { elements } from "../elements";
import { graphAnimation } from "../graph/graph-animation";
import { presets } from "./presets";
import { storage } from "../storage";
import { showAlert } from "../alert";

const MAX_PRESET_NAME_LENGTH = 15;

/** Fills the presets menu and wires saving and deleting the user's own presets */
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
  option.textContent = name;
  option.value = pathStr;
  return option;
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

  const val = elements.presetsMenu.value;
  if (typeof val !== "string" || !val) return;

  elements.graphEditor.setFromPathStr(val);
  graphAnimation.setCustomEase(val);
  checkGraphOverlap();
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
