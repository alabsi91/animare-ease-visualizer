import { createHighlighter } from "./highlighter";
import { getCornerProblem, getSingleCurveControlPoints, getUprightPoints } from "./easing-path";

import { getElement } from "../elements";
import { showAlert } from "../alert";

const exportElements = {
  dialog: getElement<Dialog>("#export-compose-dialog"),
  nameInput: getElement<HTMLInputElement>("#export-compose-name"),
  codePreview: getElement<CodeEditor>("#export-compose-code-preview"),
  warning: getElement<HTMLDivElement>("#export-compose-warning"),
  copyBtn: getElement<HTMLButtonElement>("#export-compose-copy-btn"),
  downloadBtn: getElement<HTMLButtonElement>("#export-compose-download-btn"),
};

export function initJetpackComposeExport() {
  exportElements.codePreview.highlighter = createHighlighter("kotlin");

  exportElements.dialog.addEventListener("opened", generateJetpackComposeCode);
  exportElements.nameInput.addEventListener("input", generateJetpackComposeCode);
  exportElements.copyBtn.addEventListener("click", copyJetpackComposeCodeHandler);
  exportElements.downloadBtn.addEventListener("click", downloadKotlinFile);
}

function getValueName() {
  const name = exportElements.nameInput.value.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return null;

  return name;
}

function getWarning(isSingleCurve: boolean) {
  const cornerProblem = getCornerProblem();
  if (cornerProblem) return cornerProblem;

  if (isSingleCurve) {
    return "A single curve needs no path. CubicBezierEasing takes the four control points, which is what you get below.";
  }

  return null;
}

function formatFloat(value: number) {
  return `${value}f`;
}

function generateJetpackComposeCode() {
  const name = getValueName();
  if (!name) {
    showAlert("error", "Invalid name", "Use letters, digits and underscores, starting with a letter");
    return;
  }

  const uprightPoints = getUprightPoints();
  const isSingleCurve = uprightPoints.length === 2;

  const warning = getWarning(isSingleCurve);
  exportElements.warning.hidden = warning === null;
  if (warning) {
    exportElements.warning.textContent = warning;
  }

  if (isSingleCurve) {
    exportElements.codePreview.value = `import androidx.compose.animation.core.CubicBezierEasing

val ${name} = CubicBezierEasing(${getSingleCurveControlPoints().map(formatFloat).join(", ")})`;
    return;
  }

  const [movePoint] = uprightPoints[0];

  const pathCalls = [`        moveTo(${formatFloat(movePoint.x)}, ${formatFloat(movePoint.y)})`];
  for (const points of uprightPoints.slice(1)) {
    const coordinates = points.flatMap(point => [point.x, point.y]).map(formatFloat);
    pathCalls.push(`        cubicTo(${coordinates.join(", ")})`);
  }

  exportElements.codePreview.value = `import androidx.compose.animation.core.PathEasing
import androidx.compose.ui.graphics.Path

val ${name} = PathEasing(
    Path().apply {
${pathCalls.join("\n")}
    }
)`;
}

function downloadKotlinFile() {
  const name = getValueName();
  if (!name) return;

  const blob = new Blob([exportElements.codePreview.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${name}.kt`;
  link.click();
  URL.revokeObjectURL(url);
}

function copyJetpackComposeCodeHandler() {
  const code = exportElements.codePreview.value;
  navigator.clipboard
    .writeText(code)
    .then(() => showAlert("success", "Copied to clipboard"))
    .catch(() => showAlert("error", "Failed to copy to clipboard"));
}
