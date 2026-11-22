import { easeGenerators } from "./generators";
import { easeToPathStr } from "./ease-to-path";
import { elements } from "../elements";
import { onGraphPathChange } from "../graph/graph";

import type { EaseGenerator, EaseGeneratorParam } from "./generators";

let selectedGenerator: EaseGenerator | null = null;
let selectedValues: Record<string, number> = {};

export function initializeEaseGenerators() {
  for (const generator of easeGenerators) {
    const option = document.createElement("button");
    option.type = "button";
    option.textContent = generator.name;
    option.value = generator.name;
    elements.easeGeneratorMenu.append(option);
  }

  elements.easeGeneratorMenu.addEventListener("valuechange", onGeneratorMenuChange);
}

function onGeneratorMenuChange() {
  const name = elements.easeGeneratorMenu.value;
  const generator = easeGenerators.find(generator => generator.name === name) ?? null;
  if (generator === selectedGenerator) return;

  showEaseGenerator(generator, {});
}

/** Selects a generator in the menu and draws it. A parameter missing from `values` starts at its default. */
export function selectEaseGenerator(generator: EaseGenerator, values: Record<string, number>) {
  showEaseGenerator(generator, values);
  elements.easeGeneratorMenu.value = generator.name;
}

function showEaseGenerator(generator: EaseGenerator | null, values: Record<string, number>) {
  selectedGenerator = generator;

  elements.easeGeneratorParams.replaceChildren();
  selectedValues = {};

  if (!generator) return;

  for (const param of generator.params) {
    selectedValues[param.name] = values[param.name] ?? param.value;
    elements.easeGeneratorParams.append(createParamRow(param, selectedValues[param.name]));
  }

  takeHistorySnapshot();
  draw();
  addHistorySnapshot();
}

function createParamRow(param: EaseGeneratorParam, initialValue: number) {
  const row = document.importNode(elements.easeGeneratorParamTemplate.content, true);

  const label = row.querySelector<HTMLElement>(".ease-generator-param-label")!;
  label.textContent = param.label;

  const value = row.querySelector<HTMLElement>(".ease-generator-param-value")!;
  value.textContent = String(initialValue);

  const slider = row.querySelector<Slider>("sv-slider")!;
  slider.min = param.min;
  slider.max = param.max;
  slider.step = param.step;
  slider.value = initialValue;
  slider.setAttribute("aria-label", param.label);

  slider.addEventListener("adjusted", takeHistorySnapshot);
  slider.addEventListener("valuechange", () => {
    const sliderValue = slider.value as number;

    selectedValues[param.name] = sliderValue;
    value.textContent = String(sliderValue);
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
