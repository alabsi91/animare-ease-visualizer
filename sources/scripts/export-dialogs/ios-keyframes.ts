import { createHighlighter } from "./highlighter";
import { getCurveSegments, getIsSingleCurve, getSingleCurveControlPoints } from "./easing-path";

import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

import type { CurveSegment } from "./easing-path";

const DECIMALS = 4;

const exportElements = {
  dialog: getElement<Dialog>("#export-ios-dialog"),
  nameInput: getElement<HTMLInputElement>("#export-ios-name"),
  codePreview: getElement<CodeEditor>("#export-ios-code-preview"),
  warning: getElement<HTMLDivElement>("#export-ios-warning"),
  copyBtn: getElement<HTMLButtonElement>("#export-ios-copy-btn"),
  downloadBtn: getElement<HTMLButtonElement>("#export-ios-download-btn"),
};

export function initIosKeyframesExport() {
  exportElements.codePreview.highlighter = createHighlighter("swift");

  exportElements.dialog.addEventListener("opened", generateIosKeyframesCode);
  exportElements.nameInput.addEventListener("input", generateIosKeyframesCode);
  exportElements.copyBtn.addEventListener("click", copyIosKeyframesCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadSwiftFile);
}

function getFunctionName() {
  const name = exportElements.nameInput.value.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return null;

  return name;
}

function round(value: number) {
  return +value.toFixed(DECIMALS);
}

function formatTimingFunction(segment: CurveSegment) {
  const [x1, y1, x2, y2] = segment.controlPoints.map(round);
  return `    CAMediaTimingFunction(controlPoints: ${x1}, ${y1}, ${x2}, ${y2}),`;
}

function generateIosKeyframesCode() {
  const name = getFunctionName();
  if (!name) {
    showAlert("error", "Invalid name", "Use letters, digits and underscores, starting with a letter");
    return;
  }

  const isSingleCurve = getIsSingleCurve();

  exportElements.warning.hidden = !isSingleCurve;
  if (isSingleCurve) {
    exportElements.warning.textContent =
      "A single curve needs no keyframes. One timing function covers it, which is what you get below.";

    const controlPoints = getSingleCurveControlPoints().map(round);
    exportElements.codePreview.value = `\nCAMediaTimingFunction(controlPoints: ${controlPoints.join(", ")})\n`;
    return;
  }

  const segments = getCurveSegments(elements.graphEditor.points.value);

  const keyTimes = [segments[0].startTime, ...segments.map(segment => segment.endTime)];
  const progress = [segments[0].startValue, ...segments.map(segment => segment.endValue)];

  exportElements.codePreview.value = `import UIKit

func ${name}(keyPath: String, from: Double, to: Double, duration: CFTimeInterval) -> CAKeyframeAnimation {
  let progress: [Double] = [${progress.map(round).join(", ")}]
  let keyTimes: [Double] = [${keyTimes.map(round).join(", ")}]

  let animation = CAKeyframeAnimation(keyPath: keyPath)
  animation.values = progress.map { from + (to - from) * $0 }
  animation.keyTimes = keyTimes.map { NSNumber(value: $0) }
  animation.timingFunctions = [
${segments.map(formatTimingFunction).join("\n")}
  ]
  animation.duration = duration
  animation.fillMode = .forwards
  animation.isRemovedOnCompletion = false

  return animation
}

let animation = ${name}(keyPath: "transform.translation.x", from: 0, to: 300, duration: 0.6)
view.layer.add(animation, forKey: "${name}")`;
}

function downloadSwiftFile() {
  const name = getFunctionName();
  if (!name) return;

  const blob = new Blob([exportElements.codePreview.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${name}.swift`;
  link.click();
  URL.revokeObjectURL(url);
}

function copyIosKeyframesCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
