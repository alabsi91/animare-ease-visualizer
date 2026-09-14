import animare, { Direction, Event } from "animare";
import { ease } from "animare/plugins";
import { elements } from "../elements";
import { previewProperties } from "./properties";

/** How many times the curve is read to find how far it overshoots */
const CURVE_SAMPLES = 100;

/** Room left at each edge even for a curve that never leaves its ends. The shape then never touches the frame */
const MIN_OVERSHOOT_ROOM = 0.08;

const activeProperties = new Set<string>();

let isLooping = true;
let isPlayingBackwardsOnEveryOtherLoop = true;
let isRunning = false;
let durationMs = 1000;
let lastWrittenNames = new Set<string>();

function setDuration(value: number) {
  const min = Number(elements.previewDurationInput.min);
  const max = Number(elements.previewDurationInput.max);

  durationMs = Math.min(Math.max(value || min, min), max);
  animation.updateValues({ duration: durationMs });
}

/** Every second leg runs the timeline backwards, and the progress has to read backwards with it */
function isReturningLeg() {
  return isLooping && isPlayingBackwardsOnEveryOtherLoop && animation.timelineInfo.playCount % 2 === 0;
}

function onFinished() {
  isRunning = false;
  syncElementsState();
}

const animation = animare.single({ to: 100, duration: 1000, autoPlay: false }, info => {
  drawShape(info.value);
  elements.previewProgressSlider.value = (isReturningLeg() ? 1 - info.progress : info.progress) * 100;
});

const PLAY_ICON_PATH = "M320-200v-560l440 280-440 280Z";
const STOP_ICON_PATH = "M240-240v-480h480v480H240Z";

function syncElementsState() {
  elements.previewPlayIcon.setAttribute("d", isRunning ? STOP_ICON_PATH : PLAY_ICON_PATH);
  elements.previewPlayBtn.setAttribute("aria-label", isRunning ? "Stop the preview" : "Play the preview");
  elements.previewProgressSlider.disabled = isRunning;
}

export function initializePreviewDialog() {
  for (const toggle of elements.previewProperties.querySelectorAll<Toggle>("[data-property]")) {
    wirePropertyToggle(toggle);
  }

  elements.previewProgressSlider.addEventListener("valuechange", event => {
    animation.seek(`${event.detail.value}%`);
    animation.playOneFrame();
  });

  animation.on(Event.Complete, onFinished);

  elements.previewLoopToggle.addEventListener("pressedchange", toggleLoop);
  elements.previewReverseToggle.addEventListener("pressedchange", toggleReverse);
  syncReverseToggle();
  elements.previewPlayBtn.addEventListener("click", togglePlay);
  elements.previewDurationSlider.addEventListener("valuechange", event => {
    setDuration(event.detail.value);
    elements.previewDurationInput.value = String(durationMs);
  });

  elements.previewDurationInput.addEventListener("change", () => {
    setDuration(elements.previewDurationInput.valueAsNumber);
    elements.previewDurationSlider.value = durationMs;
  });

  elements.previewDialog.addEventListener("opened", play);
  elements.previewDialog.addEventListener("dismissed", stop);

  drawShape(0);
}

function wirePropertyToggle(toggle: Toggle) {
  const name = toggle.dataset.property!;

  if (toggle.pressed) {
    activeProperties.add(name);
  }

  toggle.addEventListener("pressedchange", () => {
    activeProperties[toggle.pressed ? "add" : "delete"](name);
    if (!isRunning) {
      drawShape(animation.animationsInfo.value);
    }
  });
}

/** `easedValue` runs from 0 to 100, and past either end when the curve overshoots */
function drawShape(easedValue: number) {
  const shapeStyle = elements.previewShape.style;
  const transforms: string[] = [];
  const writtenNames = new Set<string>();

  for (const property of previewProperties) {
    if (!activeProperties.has(property.name)) continue;

    if (property.getTransform) {
      transforms.push(property.getTransform(easedValue));
    }

    if (!property.getStyle) continue;

    for (const [name, value] of Object.entries(property.getStyle(easedValue))) {
      shapeStyle.setProperty(name, value);
      writtenNames.add(name);
    }
  }

  // what a property wrote last time has to go when it is turned off
  for (const name of lastWrittenNames) {
    if (!writtenNames.has(name)) shapeStyle.removeProperty(name);
  }

  lastWrittenNames = writtenNames;

  shapeStyle.transform = transforms.join(" ");
  shapeStyle.setProperty("--progress", String(easedValue / 100));
  shapeStyle.setProperty("--move-x", activeProperties.has("moveX") ? "1" : "0");
  shapeStyle.setProperty("--move-y", activeProperties.has("moveY") ? "1" : "0");
}

function measureCurve(easing: (time: number) => number) {
  let overshoot = MIN_OVERSHOOT_ROOM;

  for (let i = 0; i <= CURVE_SAMPLES; i++) {
    const value = easing(i / CURVE_SAMPLES);
    overshoot = Math.max(overshoot, value - 1, -value);
  }

  elements.previewShape.style.setProperty("--curve-overshoot", String(overshoot));
}

function play() {
  animation.stop(0);
  isRunning = true;

  const easing = ease.custom(elements.graphEditor.points.valueStr);
  measureCurve(easing);

  animation.updateValues({
    ease: easing,
    duration: durationMs,
    playCount: isLooping ? -1 : 1,
    direction: isLooping && isPlayingBackwardsOnEveryOtherLoop ? Direction.Alternate : Direction.Forward,
  });

  animation.play();
  syncElementsState();
}

function togglePlay() {
  if (!isRunning) {
    play();
    return;
  }

  stop();
}

function stop() {
  isRunning = false;
  animation.stop(0);
  syncElementsState();
}

function toggleLoop() {
  isLooping = elements.previewLoopToggle.pressed;
  syncReverseToggle();
  play();
}

function toggleReverse() {
  isPlayingBackwardsOnEveryOtherLoop = elements.previewReverseToggle.pressed;
  play();
}

function syncReverseToggle() {
  elements.previewReverseToggle.disabled = !isLooping;
}
