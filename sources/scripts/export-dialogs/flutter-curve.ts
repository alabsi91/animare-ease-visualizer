import { createHighlighter } from "./highlighter";
import { getCornerProblem, getCurveSegments, getIsSingleCurve, getSingleCurveControlPoints } from "./easing-path";

import { elements, getElement } from "../elements";
import { showAlert } from "../alert";

import type { CurveSegment } from "./easing-path";

const DECIMALS = 4;

const exportElements = {
  dialog: getElement<Dialog>("#export-flutter-dialog"),
  nameInput: getElement<HTMLInputElement>("#export-flutter-name"),
  codePreview: getElement<CodeEditor>("#export-flutter-code-preview"),
  warning: getElement<HTMLDivElement>("#export-flutter-warning"),
  copyBtn: getElement<HTMLButtonElement>("#export-flutter-copy-btn"),
  downloadBtn: getElement<HTMLButtonElement>("#export-flutter-download-btn"),
};

export function initFlutterCurveExport() {
  exportElements.codePreview.highlighter = createHighlighter("dart");

  exportElements.dialog.addEventListener("opened", generateFlutterCurveCode);
  exportElements.nameInput.addEventListener("input", generateFlutterCurveCode);
  exportElements.copyBtn.addEventListener("click", copyFlutterCurveCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadDartFile);
}

function getClassName() {
  const name = exportElements.nameInput.value.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return null;

  return name;
}

function formatDouble(value: number) {
  const rounded = +value.toFixed(DECIMALS);
  return Number.isInteger(rounded) ? rounded.toFixed(1) : String(rounded);
}

function formatSegment(segment: CurveSegment) {
  return `    Cubic(${segment.controlPoints.map(formatDouble).join(", ")}),`;
}

function getFileName(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/^_+/, "");
}

function getWarning(isSingleCurve: boolean) {
  const cornerProblem = getCornerProblem();
  if (cornerProblem) return `${cornerProblem} Flutter snaps both ends without telling you.`;

  if (isSingleCurve) {
    return "A single curve needs no class. Flutter's own Cubic takes the four control points, which is what you get below.";
  }

  return null;
}

function generateFlutterCurveCode() {
  const name = getClassName();
  if (!name) {
    showAlert("error", "Invalid name", "Use letters, digits and underscores, starting with a letter");
    return;
  }

  const isSingleCurve = getIsSingleCurve();

  const warning = getWarning(isSingleCurve);
  exportElements.warning.hidden = warning === null;
  if (warning) {
    exportElements.warning.textContent = warning;
  }

  if (isSingleCurve) {
    exportElements.codePreview.value = `const Cubic(${getSingleCurveControlPoints().map(formatDouble).join(", ")})`;
    return;
  }

  const segments = getCurveSegments(elements.graphEditor.points.value);

  const times = [segments[0].startTime, ...segments.map(segment => segment.endTime)];
  const values = [segments[0].startValue, ...segments.map(segment => segment.endValue)];

  exportElements.codePreview.value = `import 'package:flutter/animation.dart';

class ${name} extends Curve {
  const ${name}();

  static const List<double> _times = [${times.map(formatDouble).join(", ")}];
  static const List<double> _values = [${values.map(formatDouble).join(", ")}];
  static const List<Cubic> _segments = [
${segments.map(formatSegment).join("\n")}
  ];

  @override
  double transformInternal(double t) {
    for (var index = 0; index < _segments.length; index += 1) {
      if (t > _times[index + 1] && index < _segments.length - 1) continue;

      final double span = _times[index + 1] - _times[index];
      final double localTime = span == 0 ? 0.0 : (t - _times[index]) / span;
      final double fraction = _segments[index].transform(localTime.clamp(0.0, 1.0));

      return _values[index] + (_values[index + 1] - _values[index]) * fraction;
    }

    return _values.last;
  }
}`;
}

function downloadDartFile() {
  const name = getClassName();
  if (!name) return;

  const blob = new Blob([exportElements.codePreview.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${getFileName(name)}.dart`;
  link.click();
  URL.revokeObjectURL(url);
}

function copyFlutterCurveCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
