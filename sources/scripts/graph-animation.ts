import type { OnUpdateCallback, TimelineGlobalOptions } from "animare";
import animare, { createAnimations, Timing } from "animare";
import { elements } from "./elements";
import { ease } from "animare/plugins";

function prepareAnimation() {
  const graphEditor = elements.graphEditor;

  graphEditor.graphPanel.showAnimTargetLines();
  graphEditor.graph.hidePoints = true;
  graphEditor.graphPanel.animTargetLinesHorizontal = 0;
  graphEditor.graphPanel.animTargetLinesVertical = 0;
  graphEditor.graphPanel.animLine = 0;
  graphEditor.graphPanel.fps = 0;
  graphEditor.graph.path.animFilledPath = 0;
  elements.progressSlider.disabled = false;
}

function endAnimation() {
  const graphEditor = elements.graphEditor;

  graphEditor.graphPanel.hideAnimTargetLines();
  graphEditor.graph.hidePoints = false;
  elements.progressSlider.disabled = true;

  animare.single({ from: 100, to: 0, duration: 150 }, info => {
    graphEditor.graphPanel.animLine = info.value;
    graphEditor.graph.path.animFilledPath = info.value;
    graphEditor.graphPanel.fps = info.value;
  });
}

function createAnimation() {
  const graphEditor = elements.graphEditor;

  const tlAnimations = createAnimations([
    { name: "linear", to: 100 },
    { name: "ease", to: 100, timing: Timing.FromStart },
  ]);

  const timelineOptions: TimelineGlobalOptions = {
    timelinePlayCount: 1,
    duration: 2000,
    autoPlay: false,
  };

  const onUpdate: OnUpdateCallback<typeof tlAnimations> = (info, tl) => {
    if (tl.isFirstFrame) {
      prepareAnimation();
    }

    graphEditor.graphPanel.animTargetLinesHorizontal = info.ease.value;
    graphEditor.graphPanel.animLine = info.ease.value;
    graphEditor.graphPanel.animTargetLinesVertical = info.linear.value;
    graphEditor.graph.path.animFilledPath = info.linear.value;
    graphEditor.graphPanel.fps = tl.fps;
    elements.progressSlider.value = info.linear.value;

    if (tl.isFinished) {
      endAnimation();
    }
  };

  const anim = animare.timeline(tlAnimations, onUpdate, timelineOptions);

  return {
    setCustomEase: (pathStr: string) => {
      anim.updateValues([{ name: "ease", ease: ease.custom(pathStr) }]);
      if (anim.timelineInfo.isFinished || anim.timelineInfo.isFirstFrame) return;
      anim.seek(anim.timelineInfo.elapsedTime);
      anim.playOneFrame();
    },
    play: () => {
      // reset
      if (anim.timelineInfo.isPlaying || anim.timelineInfo.isFinished) {
        anim.play();
        return;
      }
      // resume
      const progress = elements.progressSlider.value as number;
      anim.play(`${progress}%`);
    },
    pause: () => {
      if (anim.timelineInfo.isPlaying) {
        anim.pause();
      }
    },
    stop: () => {
      if (anim.timelineInfo.isFinished) return;
      anim.stop();
    },
    seek: (value: number) => {
      anim.seek(`${value}%`);
      anim.playOneFrame();
    },
    get duration() {
      return anim.timelineInfo.duration;
    },
    set duration(value) {
      anim.updateValues([
        { name: "linear", duration: value },
        { name: "ease", duration: value },
      ]);
    },
  };
}

export const graphAnimation = createAnimation();
