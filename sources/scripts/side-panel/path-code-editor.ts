import { elements } from "../elements";
import { onGraphPathChange } from "../graph/graph";
import { showAlert } from "../alert";

/** Keeps the SVG path box in step with the curve, and draws what the user types back into it */
export function initializePathCodeEditor() {
  updatePathCode();

  elements.pathCodeEditor.highlighter = highlightPathCode;
  elements.graphEditor.points.events.onUpdate.add(updatePathCode);
  elements.pathCodeEditor.addEventListener("copyclick", onPathCodeCopy);
  elements.pathCodeEditor.addEventListener("blur", onPathCodeChange);
  elements.pathCodeEditor.addEventListener("keydown", onPathCodeKeyDown);
}

function updatePathCode() {
  elements.pathCodeEditor.value = elements.graphEditor.points.valueStr.replace(/\s?([a-z])/gi, "\n$1").trim();
}

function highlightPathCode(code: string) {
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

function onPathCodeKeyDown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault();
    elements.pathCodeEditor.blur();
  }
}
