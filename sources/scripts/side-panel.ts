import { elements } from "./elements";
import { checkGraphOverlap, onGraphPathChange } from "./graph";
import { graphAnimation } from "./graph-animation";
import { presets } from "./presets";
import { storage } from "./storage";
import { showAlert } from "./alert";

export function initializeSidePanel() {
  // show/hide side panel
  elements.hideSidePanelBtn.addEventListener("click", hideLargeSidePanel);
  elements.showSidePanelBtn.addEventListener("click", hideSmallSidePanel);

  // animation controls
  elements.playBtns.forEach(e => e.addEventListener("click", playBtnHandler));
  elements.pauseBtns.forEach(e => e.addEventListener("click", pauseBtnHandler));
  elements.stopBtns.forEach(e => e.addEventListener("click", stopBtnHandler));
  elements.progressSlider.addEventListener("valuechange", event => {
    graphAnimation.seek(event.detail.value);
  });

  // export menu
  document.querySelectorAll(".export-menu-btn").forEach(el => el.addEventListener("click", () => elements.exportMenu.close()));

  // presets menu
  setupPresetsMenu();
  elements.presetsMenu.addEventListener("valueChange", onPresetChange);

  // save preset
  elements.savePresetBtn.addEventListener("click", savePresetHandler);

  // auto hide toggle
  const isAutoHidePointsEnabled = storage.autoHidePoints ?? false;
  elements.autoHidePointsToggle.checked = isAutoHidePointsEnabled;
  elements.graphEditor.settings.autoHidePoints = isAutoHidePointsEnabled;
  elements.autoHidePointsToggle.addEventListener("clicked", autoHidePointsToggleHandler);

  // grid snap toggle
  const isSnapToGridEnabled = storage.snapToGrid ?? true;
  elements.snapToGridToggle.checked = isSnapToGridEnabled;
  elements.graphEditor.settings.anchorSnapToGrid = isSnapToGridEnabled;
  elements.graphEditor.settings.ctrlSnapToGrid = isSnapToGridEnabled;
  elements.snapToGridToggle.addEventListener("clicked", snapToGridToggleHandler);

  // points snap toggle
  const isSnapToPointsEnabled = storage.snapToPoints ?? true;
  elements.snapToPointsToggle.checked = isSnapToPointsEnabled;
  elements.graphEditor.settings.anchorSnapToOtherAnchors = isSnapToPointsEnabled;
  elements.graphEditor.settings.anchorSnapToOtherCtrl = isSnapToPointsEnabled;
  elements.graphEditor.settings.ctrlSnapToOtherCtrl = isSnapToPointsEnabled;
  elements.graphEditor.settings.ctrlSnapToOtherAnchors = isSnapToPointsEnabled;
  elements.snapToPointsToggle.addEventListener("clicked", snapToPointsToggleHandler);

  // duration input
  elements.durationInput.addEventListener("blur", durationInputHandler);
  elements.durationInput.addEventListener("keydown", durationInputOnEnter);

  // path code editor
  updatePathCode();
  elements.pathCodeEditor.highlighter = pathCodeHighlighter;
  elements.graphEditor.points.events.onUpdate.add(updatePathCode);
  elements.pathCodeEditor.addEventListener("copyClick", onPathCodeCopy);
  elements.pathCodeEditor.addEventListener("blur", onPathCodeChange);
  elements.pathCodeEditor.addEventListener("keydown", pathCodeOnEnter);
}

async function hideLargeSidePanel() {
  const animOpt: KeyframeAnimationOptions = {
    duration: 200,
    easing: "ease",
    fill: "forwards",
  };

  const sidePanelWidth = getComputedStyle(elements.sidePanel).width;

  const mainAnim = elements.main.animate(
    [{ gridTemplateColumns: `${sidePanelWidth} 1fr` }, { gridTemplateColumns: "0px 1fr" }],
    animOpt
  );

  const sidePanelAnim = elements.sidePanel.animate([{}, { transform: "translateX(-100%)" }], animOpt);

  await Promise.all([mainAnim.finished, sidePanelAnim.finished]);

  elements.main.style.removeProperty("grid-template-columns");
  mainAnim.cancel();

  sidePanelAnim.commitStyles();
  sidePanelAnim.cancel();

  elements.sidePanel.style.display = "none";

  await showSmallSidePanel();
}

async function hideSmallSidePanel() {
  const animOpt: KeyframeAnimationOptions = {
    duration: 200,
    easing: "ease",
    fill: "forwards",
  };

  const sidePanelWidth = getComputedStyle(elements.smallSidePanel).width;

  const mainAnim = elements.main.animate(
    [{ gridTemplateColumns: `${sidePanelWidth} 1fr` }, { gridTemplateColumns: "0px 1fr" }],
    animOpt
  );

  const sidePanelAnim = elements.smallSidePanel.animate(
    [{ transform: "translateX(0%)" }, { transform: "translateX(-100%)" }],
    animOpt
  );

  await Promise.all([mainAnim.finished, sidePanelAnim.finished]);

  mainAnim.cancel();

  sidePanelAnim.commitStyles();
  sidePanelAnim.cancel();
  elements.smallSidePanel.style.display = "none";

  await showLargeSidePanel();
}

async function showSmallSidePanel() {
  const animOpt: KeyframeAnimationOptions = {
    duration: 200,
    easing: "ease",
    fill: "forwards",
  };

  elements.smallSidePanel.style.display = "block";
  const sidePanelWidth = getComputedStyle(elements.smallSidePanel).width;

  const mainAnim = elements.main.animate(
    [{ gridTemplateColumns: "0px 1fr" }, { gridTemplateColumns: `${sidePanelWidth} 1fr` }],
    animOpt
  );

  const sidePanelAnim = elements.smallSidePanel.animate(
    [{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }],
    animOpt
  );

  await Promise.all([mainAnim.finished, sidePanelAnim.finished]);

  sidePanelAnim.commitStyles();
  sidePanelAnim.cancel();

  mainAnim.cancel();
}

async function showLargeSidePanel() {
  elements.smallSidePanel.style.display = "none";

  const animOpt: KeyframeAnimationOptions = {
    duration: 200,
    easing: "ease",
    fill: "forwards",
  };

  elements.sidePanel.style.display = "block";
  const sidePanelWidth = getComputedStyle(elements.sidePanel).width;

  const mainAnim = elements.main.animate(
    [{ gridTemplateColumns: "0px 1fr" }, { gridTemplateColumns: `${sidePanelWidth} 1fr` }],
    animOpt
  );

  const sidePanelAnim = elements.sidePanel.animate([{}, { transform: "translateX(0)" }], animOpt);

  await Promise.all([mainAnim.finished, sidePanelAnim.finished]);

  sidePanelAnim.commitStyles();
  sidePanelAnim.cancel();

  mainAnim.cancel();
}

function durationInputOnEnter(event: KeyboardEvent) {
  if (event.key === "Enter") elements.durationInput.blur();
}

function durationInputHandler() {
  const val = elements.durationInput.valueAsNumber;

  if (!val) {
    elements.durationInput.value = graphAnimation.duration.toString();
    showAlert("error", "Invalid duration");
    return;
  }

  if (val < 0) {
    elements.durationInput.value = graphAnimation.duration.toString();
    showAlert("error", "Duration cannot be negative");
    return;
  }

  graphAnimation.duration = val;
}

function pathCodeHighlighter(code: string) {
  return code.replace(/([mz])|([cslhvqta])|(\d+)|(\.)|(-)/gi, (match, mz, cmd, digit, dot, minus) => {
    if (digit) return `<span class="hljs-point-digit">${digit}</span>`;
    if (mz) return `<span class="hljs-mz-command">${mz}</span>`;
    if (cmd) return `<span class="hljs-command">${cmd}</span>`;
    if (dot) return `<span class="hljs-point-dot">${dot}</span>`;
    if (minus) return `<span class="hljs-point-minus">${minus}</span>`;
    return match;
  });
}

function onPathCodeCopy() {
  showAlert("info", "SVG path copied to clipboard");
}

function onPathCodeChange() {
  const newCode = elements.pathCodeEditor.value.replace(/\n|\s{2,}/g, " ");
  const success = elements.graphEditor.setFromPathStr(newCode);
  if (success) {
    onGraphPathChange(newCode);
    return;
  }

  updatePathCode(); // revert
  showAlert(
    "error",
    "Invalid path",
    "Must follow schema 'M x y C cx1 cy1 cx2 cy2 x y' with proper spacing, uppercase commands, and no extra or missing spaces",
    true
  );
}

function pathCodeOnEnter(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault();
    elements.pathCodeEditor.blur();
  }
}

function updatePathCode() {
  elements.pathCodeEditor.value = elements.graphEditor.points.valueStr.replace(/\s?([a-z])/gi, "\n$1").trim();
}

function setupPresetsMenu() {
  const presetOptions: (SelectOption | HTMLDivElement)[] = [];
  for (const { name, path } of presets) {
    // divider
    if (name === "divider" && path === null) {
      const divider = document.createElement("div");
      divider.classList.add("menu-divider");
      presetOptions.push(divider);
      continue;
    }

    // option
    const option = document.createElement("select-option");
    option.label = name;
    option.textContent = name;
    option.value = path || "none";
    presetOptions.push(option);
  }

  elements.presetsMenu.append(...presetOptions);

  const storagePresets = storage.savedGraphs;

  for (const { name, path } of storagePresets) {
    addCustomPresetToMenu(name, path);
  }

  elements.presetsMenu.refresh();
  elements.presetsMenu.value = "none";
}

function addCustomPresetToMenu(name: string, pathStr: string) {
  const option = document.createElement("select-option");
  option.label = name;
  option.value = pathStr;
  option.textContent = name;

  const svgIcon = /*html*/ `
  <svg class="preset-delete-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/>
  </svg>`;

  const deleteBtn = document.createElement("button");
  deleteBtn.classList.add("preset-delete-btn");
  deleteBtn.ariaLabel = "Delete preset";
  deleteBtn.innerHTML = svgIcon;

  deleteBtn.addEventListener("click", e => {
    e.stopImmediatePropagation();
    storage.deleteGraph(name);
    option.remove();
    elements.presetsMenu.refresh();
    showAlert("info", `Preset "${name}" was deleted`);
  });

  option.appendChild(deleteBtn);

  elements.presetsMenu.append(option);
}

function onPresetChange() {
  const val = elements.presetsMenu.value;
  if (val === "none") return;
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

  if (presetName.length > 15) {
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
  elements.presetsMenu.refresh();
  elements.presetsMenu.value = pathStr;

  showAlert("success", "Preset saved to the local storage");
}

function autoHidePointsToggleHandler() {
  const checked = elements.autoHidePointsToggle.checked;
  elements.graphEditor.settings.autoHidePoints = checked;
  storage.autoHidePoints = checked;
}

function snapToGridToggleHandler() {
  const checked = elements.snapToGridToggle.checked;
  elements.graphEditor.settings.anchorSnapToGrid = checked;
  elements.graphEditor.settings.ctrlSnapToGrid = checked;
  storage.snapToGrid = checked;
}

function snapToPointsToggleHandler() {
  const checked = elements.snapToPointsToggle.checked;
  elements.graphEditor.settings.anchorSnapToOtherAnchors = checked;
  elements.graphEditor.settings.anchorSnapToOtherCtrl = checked;
  elements.graphEditor.settings.ctrlSnapToOtherCtrl = checked;
  elements.graphEditor.settings.ctrlSnapToOtherAnchors = checked;
  storage.snapToPoints = checked;
}

function playBtnHandler() {
  graphAnimation.play();
}

function pauseBtnHandler() {
  graphAnimation.pause();
}

function stopBtnHandler() {
  graphAnimation.stop();
}
