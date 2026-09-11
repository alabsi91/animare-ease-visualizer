interface PreviewProperty {
  name: string;
  label: string;
  getTransform?: (progress: number) => string;
  getStyle?: (progress: number) => Record<string, string>;
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * (progress / 100);
}

export const previewProperties: PreviewProperty[] = [
  {
    name: "scale",
    label: "Scale",
    getTransform: progress => `scale(${lerp(0.4, 1.4, progress)})`,
  },
  {
    name: "scaleX",
    label: "Scale X",
    getTransform: progress => `scaleX(${lerp(0.4, 1.4, progress)})`,
  },
  {
    name: "scaleY",
    label: "Scale Y",
    getTransform: progress => `scaleY(${lerp(0.4, 1.4, progress)})`,
  },
  {
    name: "rotate",
    label: "Rotate",
    getTransform: progress => `rotate(${lerp(0, 180, progress)}deg)`,
  },
  {
    name: "rotateX",
    label: "Flip X",
    getTransform: progress => `rotateX(${lerp(0, 360, progress)}deg)`,
  },
  {
    name: "rotateY",
    label: "Flip Y",
    getTransform: progress => `rotateY(${lerp(0, 360, progress)}deg)`,
  },
  {
    name: "skew",
    label: "Skew",
    getTransform: progress => `skewX(${lerp(-30, 30, progress)}deg)`,
  },
  {
    name: "width",
    label: "Width",
    getStyle: progress => ({ "inline-size": `${lerp(24, 140, progress)}px` }),
  },
  {
    name: "height",
    label: "Height",
    getStyle: progress => ({ "block-size": `${lerp(24, 140, progress)}px` }),
  },
  {
    name: "opacity",
    label: "Fade",
    getStyle: progress => ({ opacity: String(lerp(0.15, 1, progress)) }),
  },
  {
    name: "radius",
    label: "Round",
    // a negative radius is invalid and would drop the declaration, which an undershooting curve would reach
    getStyle: progress => ({ "border-radius": `${Math.max(lerp(0, 50, progress), 0)}%` }),
  },
  {
    name: "color",
    label: "Color",
    getStyle: progress => {
      const mix = Math.min(Math.max(lerp(0, 100, progress), 0), 100);
      return { "background-color": `color-mix(in oklab, var(--sb-color-accent), var(--sb-color-secondary) ${mix}%)` };
    },
  },
];
