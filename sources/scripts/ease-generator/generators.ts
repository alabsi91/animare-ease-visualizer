import { ease } from "animare/plugins";

type EaseFn = (time: number) => number;

type GeneratorParam = {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
};

type EaseGenerator = {
  name: string;
  params: GeneratorParam[];
  createEase: (values: Record<string, number>) => EaseFn;
};

function springParams(): GeneratorParam[] {
  return [
    { name: "mass", label: "Mass", min: 0.1, max: 100, step: 0.1, value: 1 },
    { name: "stiffness", label: "Stiffness", min: 20, max: 1000, step: 5, value: 100 },
    { name: "damping", label: "Damping", min: 0, max: 100, step: 1, value: 10 },
    { name: "velocity", label: "Velocity", min: 0, max: 100, step: 0.1, value: 1 },
    { name: "duration", label: "Duration", min: 100, max: 10000, step: 50, value: 1000 },
  ];
}

/** The easing functions that take parameters, along with the range each parameter is worth dragging through */
export const easeGenerators: EaseGenerator[] = [
  {
    name: "Spring in",
    params: springParams(),
    createEase: ({ mass, stiffness, damping, velocity, duration }) =>
      ease.in.spring({ mass, stiffness, damping, velocity, duration }),
  },
  {
    name: "Spring out",
    params: springParams(),
    createEase: ({ mass, stiffness, damping, velocity, duration }) =>
      ease.out.spring({ mass, stiffness, damping, velocity, duration }),
  },
  {
    name: "Spring in out",
    params: springParams(),
    createEase: ({ mass, stiffness, damping, velocity, duration }) =>
      ease.inOut.spring({ mass, stiffness, damping, velocity, duration }),
  },
  {
    name: "Wobble in",
    params: [{ name: "bounciness", label: "Bounciness", min: 0.5, max: 20, step: 0.5, value: 1 }],
    createEase: ({ bounciness }) => ease.in.wobble(bounciness),
  },
  {
    name: "Wobble out",
    params: [{ name: "bounciness", label: "Bounciness", min: 0.5, max: 20, step: 0.5, value: 1 }],
    createEase: ({ bounciness }) => ease.out.wobble(bounciness),
  },
  {
    name: "Wobble in out",
    params: [{ name: "bounciness", label: "Bounciness", min: 0.5, max: 20, step: 0.5, value: 1 }],
    createEase: ({ bounciness }) => ease.inOut.wobble(bounciness),
  },
  {
    name: "Bounce in",
    params: [
      { name: "bounces", label: "Bounces", min: 1, max: 10, step: 1, value: 3 },
      { name: "bounciness", label: "Bounciness", min: 0.05, max: 0.9, step: 0.05, value: 0.5 },
    ],
    createEase: ({ bounces, bounciness }) => ease.in.bounce(bounces, bounciness),
  },
  {
    name: "Bounce out",
    params: [
      { name: "bounces", label: "Bounces", min: 1, max: 10, step: 1, value: 3 },
      { name: "bounciness", label: "Bounciness", min: 0.05, max: 0.9, step: 0.05, value: 0.5 },
    ],
    createEase: ({ bounces, bounciness }) => ease.out.bounce(bounces, bounciness),
  },
  {
    name: "Bounce in out",
    params: [
      { name: "bounces", label: "Bounces", min: 1, max: 10, step: 1, value: 3 },
      { name: "bounciness", label: "Bounciness", min: 0.05, max: 0.9, step: 0.05, value: 0.5 },
    ],
    createEase: ({ bounces, bounciness }) => ease.inOut.bounce(bounces, bounciness),
  },
  {
    name: "Elastic in",
    params: [
      { name: "amplitude", label: "Amplitude", min: 1, max: 5, step: 0.1, value: 1 },
      { name: "period", label: "Period", min: 0.05, max: 1, step: 0.05, value: 0.3 },
    ],
    createEase: ({ amplitude, period }) => ease.in.elastic(amplitude, period),
  },
  {
    name: "Elastic out",
    params: [
      { name: "amplitude", label: "Amplitude", min: 1, max: 5, step: 0.1, value: 1 },
      { name: "period", label: "Period", min: 0.05, max: 1, step: 0.05, value: 0.3 },
    ],
    createEase: ({ amplitude, period }) => ease.out.elastic(amplitude, period),
  },
  {
    name: "Elastic in out",
    params: [
      { name: "amplitude", label: "Amplitude", min: 1, max: 5, step: 0.1, value: 1 },
      { name: "period", label: "Period", min: 0.05, max: 1, step: 0.05, value: 0.45 },
    ],
    createEase: ({ amplitude, period }) => ease.inOut.elastic(amplitude, period),
  },
  {
    name: "Back in",
    params: [{ name: "overshoot", label: "Overshoot", min: 0, max: 10, step: 0.1, value: 1.7 }],
    createEase: ({ overshoot }) => ease.in.back(overshoot),
  },
  {
    name: "Back out",
    params: [{ name: "overshoot", label: "Overshoot", min: 0, max: 10, step: 0.1, value: 1.7 }],
    createEase: ({ overshoot }) => ease.out.back(overshoot),
  },
  {
    name: "Back in out",
    params: [{ name: "overshoot", label: "Overshoot", min: 0, max: 10, step: 0.1, value: 1.7 }],
    createEase: ({ overshoot }) => ease.inOut.back(overshoot),
  },
  {
    name: "Poly in",
    params: [{ name: "power", label: "Power", min: 1, max: 10, step: 0.5, value: 3 }],
    createEase: ({ power }) => ease.in.poly(power),
  },
  {
    name: "Poly out",
    params: [{ name: "power", label: "Power", min: 1, max: 10, step: 0.5, value: 3 }],
    createEase: ({ power }) => ease.out.poly(power),
  },
  {
    name: "Poly in out",
    params: [{ name: "power", label: "Power", min: 1, max: 10, step: 0.5, value: 3 }],
    createEase: ({ power }) => ease.inOut.poly(power),
  },
];
