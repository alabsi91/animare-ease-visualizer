import { elements } from "../elements";
import { graphAnimation } from "../graph/graph-animation";
import { storage } from "../storage";
import { showAlert } from "../alert";

/** Wires the panel's own controls: showing and hiding it, the playback buttons, the toggles and the duration */
export function initializeSidePanel() {
  elements.hideSidePanelBtn.addEventListener("click", () => setSidePanelExpanded(false));
  elements.showSidePanelBtn.addEventListener("click", () => setSidePanelExpanded(true));

  elements.playBtns.forEach(e => e.addEventListener("click", () => graphAnimation.play()));
  elements.pauseBtns.forEach(e => e.addEventListener("click", () => graphAnimation.pause()));
  elements.stopBtns.forEach(e => e.addEventListener("click", () => graphAnimation.stop()));
  elements.progressSlider.addEventListener("valuechange", event => graphAnimation.seek(event.detail.value));

  document.querySelectorAll(".export-menu-btn").forEach(el => el.addEventListener("click", () => elements.exportMenu.close()));

  setupAutoHidePointsToggle();
  setupSnapToGridToggle();
  setupSnapToPointsToggle();

  elements.durationInput.addEventListener("blur", onDurationChange);
  elements.durationInput.addEventListener("keydown", onDurationKeyDown);
}

function setSidePanelExpanded(isExpanded: boolean) {
  elements.main.classList.toggle("side-panel-expanded", isExpanded);
  elements.main.classList.toggle("side-panel-collapsed", !isExpanded);

  const buttonToFocus = isExpanded ? elements.hideSidePanelBtn : elements.showSidePanelBtn;
  buttonToFocus.focus();
}

function setupAutoHidePointsToggle() {
  const isEnabled = storage.autoHidePoints ?? false;

  elements.autoHidePointsToggle.checked = isEnabled;
  elements.graphEditor.settings.autoHidePoints = isEnabled;
  elements.autoHidePointsToggle.addEventListener("clicked", onAutoHidePointsToggle);
}

function onAutoHidePointsToggle() {
  const checked = elements.autoHidePointsToggle.checked;

  elements.graphEditor.settings.autoHidePoints = checked;
  storage.autoHidePoints = checked;
}

function setupSnapToGridToggle() {
  const isEnabled = storage.snapToGrid ?? true;

  elements.snapToGridToggle.checked = isEnabled;
  elements.graphEditor.settings.anchorSnapToGrid = isEnabled;
  elements.graphEditor.settings.ctrlSnapToGrid = isEnabled;
  elements.snapToGridToggle.addEventListener("clicked", onSnapToGridToggle);
}

function onSnapToGridToggle() {
  const checked = elements.snapToGridToggle.checked;

  elements.graphEditor.settings.anchorSnapToGrid = checked;
  elements.graphEditor.settings.ctrlSnapToGrid = checked;
  storage.snapToGrid = checked;
}

function setupSnapToPointsToggle() {
  const isEnabled = storage.snapToPoints ?? true;

  elements.snapToPointsToggle.checked = isEnabled;
  setSnapToPoints(isEnabled);
  elements.snapToPointsToggle.addEventListener("clicked", onSnapToPointsToggle);
}

function onSnapToPointsToggle() {
  const checked = elements.snapToPointsToggle.checked;

  setSnapToPoints(checked);
  storage.snapToPoints = checked;
}

function setSnapToPoints(isEnabled: boolean) {
  elements.graphEditor.settings.anchorSnapToOtherAnchors = isEnabled;
  elements.graphEditor.settings.anchorSnapToOtherCtrl = isEnabled;
  elements.graphEditor.settings.ctrlSnapToOtherCtrl = isEnabled;
  elements.graphEditor.settings.ctrlSnapToOtherAnchors = isEnabled;
}

function onDurationKeyDown(event: KeyboardEvent) {
  if (event.key === "Enter") elements.durationInput.blur();
}

function onDurationChange() {
  const duration = elements.durationInput.valueAsNumber;

  if (!duration) {
    elements.durationInput.value = graphAnimation.duration.toString();
    showAlert("error", "Invalid duration");
    return;
  }

  if (duration < 0) {
    elements.durationInput.value = graphAnimation.duration.toString();
    showAlert("error", "Duration cannot be negative");
    return;
  }

  graphAnimation.duration = duration;
}
