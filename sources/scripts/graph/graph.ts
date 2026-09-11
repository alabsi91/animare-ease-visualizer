import { checkPathOverlap } from "./path-overlap";
import { elements } from "../elements";
import { graphAnimation } from "./graph-animation";
import { storage } from "../storage";
import { showAlert } from "../alert";

export function initGraph() {
  const shortestSide = Math.min(elements.graphEditor.offsetWidth, elements.graphEditor.offsetHeight);
  const size = Math.max(shortestSide * 0.8, 200);
  elements.graphEditor.settings.panelSize = size;
  elements.graphEditor.graphPanel.center();

  const lastPathDrawn = storage.lastPathDrawn;
  if (lastPathDrawn) {
    elements.graphEditor.setFromPathStr(lastPathDrawn);
    elements.graphEditor.fitToPath();
    graphAnimation.setCustomEase(lastPathDrawn);
    checkGraphOverlap();
  }

  elements.graphEditor.addEventListener("complete", graphEditorCompleteHandler);
}

export function checkGraphOverlap() {
  const isOverlapping = checkPathOverlap(elements.graphEditor.points.value);
  if (isOverlapping) {
    elements.graphEditor.style.setProperty("--clr-path", "red");
    elements.graphEditor.style.setProperty("--clr-active-path", "red");
    showAlert("warning", "Invalid graph", "Easing function cannot move backward in time");
    return;
  }

  elements.graphEditor.style.removeProperty("--clr-path");
  elements.graphEditor.style.removeProperty("--clr-active-path");
}

function graphEditorCompleteHandler() {
  onGraphPathChange(elements.graphEditor.points.valueStr);
}

/** Draws a path and records it as one undoable step */
export function setGraphPath(pathStr: string) {
  const { historyManager } = elements.graphEditor;

  historyManager.takeSnapshot();

  const success = elements.graphEditor.setFromPathStr(pathStr);
  if (!success) {
    historyManager.removeSnapshot();
    return false;
  }

  historyManager.addSnapshotToHistory();
  elements.graphEditor.dispatchComplete();

  return true;
}

export function onGraphPathChange(pathStr: string) {
  // animation
  graphAnimation.setCustomEase(pathStr);

  // presets menu
  if (elements.presetsMenu.value && elements.presetsMenu.value !== pathStr) {
    elements.presetsMenu.value = "";
  }

  // save to local storage
  storage.lastPathDrawn = pathStr;

  // check overlap
  checkGraphOverlap();
}
