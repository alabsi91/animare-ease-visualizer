import { easeGenerators } from "./generators";
import { easeToPathStr } from "./ease-to-path";
import { elements } from "../elements";
import { onGraphPathChange } from "../graph/graph";

type EaseGenerator = (typeof easeGenerators)[number];

let selectedGenerator: EaseGenerator | null = null;
let selectedValues: Record<string, number> = {};

export function initializeEaseGenerators() {
  for (const generator of easeGenerators) {
    const option = document.createElement("button");
    option.type = "button";
    option.textContent = generator.name;
    option.value = generator.name;
    elements.easeGeneratorFlyout.append(option);
  }

  elements.easeGeneratorMenu.addEventListener("valuechange", selectGenerator);
}

function selectGenerator() {
  const name = elements.easeGeneratorMenu.value;
  selectedGenerator = easeGenerators.find(generator => generator.name === name) ?? null;

  elements.easeGeneratorParams.replaceChildren();
  selectedValues = {};

  if (!selectedGenerator) return;

  for (const param of selectedGenerator.params) {
    selectedValues[param.name] = param.value;
    elements.easeGeneratorParams.append(createParamRow(param));
  }

  takeHistorySnapshot();
  draw();
  addHistorySnapshot();
}

function createParamRow(param: EaseGenerator["params"][number]) {
  const row = document.importNode(elements.easeGeneratorParamTemplate.content, true);

  const label = row.querySelector<HTMLElement>(".ease-generator-param-label")!;
  label.textContent = param.label;

  const value = row.querySelector<HTMLElement>(".ease-generator-param-value")!;
  value.textContent = String(param.value);

  const slider = row.querySelector<Slider>("sv-slider")!;
  slider.min = param.min;
  slider.max = param.max;
  slider.step = param.step;
  slider.value = param.value;
  slider.setAttribute("aria-label", param.label);

  slider.addEventListener("beforechange", takeHistorySnapshot);
  slider.addEventListener("valuechange", event => {
    selectedValues[param.name] = event.detail.value;
    value.textContent = String(event.detail.value);
    draw();
  });
  slider.addEventListener("pointerup", addHistorySnapshot);
  slider.addEventListener("keyup", addHistorySnapshot);
  slider.addEventListener("blur", addHistorySnapshot);

  return row;
}

let hasHistorySnapshot = false;

function takeHistorySnapshot() {
  if (hasHistorySnapshot) return;

  elements.graphEditor.historyManager.takeSnapshot();
  hasHistorySnapshot = true;
}

function addHistorySnapshot() {
  if (!hasHistorySnapshot) return;

  elements.graphEditor.historyManager.addSnapshotToHistory();
  hasHistorySnapshot = false;

  elements.graphEditor.dispatchComplete();
}

function draw() {
  if (!selectedGenerator) return;

  const pathStr = easeToPathStr(selectedGenerator.createEase(selectedValues));

  elements.graphEditor.setFromPathStr(pathStr);
  onGraphPathChange(pathStr);
}
