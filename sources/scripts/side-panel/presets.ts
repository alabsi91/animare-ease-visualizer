type Preset = {
  name: string;
  path: string;
};

export const presets: Preset[] = [
  { name: "sine in", path: "M 0 1 C 0.12 1 0.39 1 1 0" },
  { name: "sine out", path: "M 0 1 C 0.61 0 0.88 0 1 0" },
  { name: "sine in-out", path: "M 0 1 C 0.37 1 0.63 0 1 0" },

  { name: "quad in", path: "M 0 1 C 0.11 1 0.5 1 1 0" },
  { name: "quad out", path: "M 0 1 C 0.5 0 0.89 0 1 0" },
  { name: "quad in-out", path: "M 0 1 C 0.45 1 0.55 0 1 0" },

  { name: "cubic in", path: "M 0 1 C 0.32 1 0.67 1 1 0" },
  { name: "cubic out", path: "M 0 1 C 0.33 0 0.68 0 1 0" },
  { name: "cubic in-out", path: "M 0 1 C 0.65 1 0.35 0 1 0" },

  { name: "quart in", path: "M 0 1 C 0.5 1 0.75 1 1 0" },
  { name: "quart out", path: "M 0 1 C 0.25 0 0.5 0 1 0" },
  { name: "quart in-out", path: "M 0 1 C 0.76 1 0.24 0 1 0" },

  { name: "quint in", path: "M 0 1 C 0.64 1 0.78 1 1 0" },
  { name: "quint out", path: "M 0 1 C 0.22 0 0.36 0 1 0" },
  { name: "quint in-out", path: "M 0 1 C 0.83 1 0.17 0 1 0" },

  { name: "circ in", path: "M 0 1 C 0.55 1 1 0.55 1 0" },
  { name: "circ out", path: "M 0 1 C 0 0.45 0.45 0 1 0" },
  { name: "circ in-out", path: "M 0 1 C 0.85 1 0.15 0 1 0" },

  { name: "expo in", path: "M 0 1 C 0.7 1 0.84 1 1 0" },
  { name: "expo out", path: "M 0 1 C 0.16 0 0.3 0 1 0" },
  { name: "expo in-out", path: "M 0 1 C 0.87 1 0.13 0 1 0" },
];
