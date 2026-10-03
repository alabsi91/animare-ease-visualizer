import { easeGenerators } from "../ease-generator/generators";
import { selectEaseGenerator } from "../ease-generator/ease-generator";
import { presets } from "../side-panel/presets";
import { setGraphPath } from "../graph/graph";
import { elements } from "../elements";
import { PATH_FORMAT_DESCRIPTION, createCurveDescription, getPathCommandsFromInput } from "./agent-curve";

import { Points } from "@graph-editor/helpers/points";

import type { EaseGenerator } from "../ease-generator/generators";

type SetEasingCurveInput = {
  path?: string;
  cubicBezier?: [number, number, number, number];
};

type ApplyEasingPresetInput = {
  name: string;
};

type GenerateEasingCurveInput = {
  generator: string;
  parameters?: Record<string, number>;
};

/** Each group of generators that share their parameters, written out with ranges and defaults */
function getGeneratorParametersDescription() {
  const generatorNamesByParameters = new Map<string, string[]>();

  for (const generator of easeGenerators) {
    const parametersDescription = generator.params
      .map(param => `${param.name} from ${param.min} to ${param.max} in steps of ${param.step}, default ${param.value}`)
      .join("; ");

    const generatorNames = generatorNamesByParameters.get(parametersDescription) ?? [];
    generatorNames.push(generator.name);
    generatorNamesByParameters.set(parametersDescription, generatorNames);
  }

  return [...generatorNamesByParameters]
    .map(([parametersDescription, generatorNames]) => `${generatorNames.join(", ")}: ${parametersDescription}.`)
    .join("\n");
}

function createCubicBezierPathStr([x1, y1, x2, y2]: [number, number, number, number]) {
  const numbers = [x1, 1 - y1, x2, 1 - y2].map(value => +value.toFixed(4));
  return `M 0 1 C ${numbers.join(" ")} 1 0`;
}

function assertValidGeneratorParameters(generator: EaseGenerator, parameters: Record<string, number>) {
  for (const [parameterName, value] of Object.entries(parameters)) {
    const param = generator.params.find(param => param.name === parameterName);
    if (!param) {
      const parameterNames = generator.params.map(param => param.name).join(", ");
      throw new Error(`"${generator.name}" has no parameter "${parameterName}". It takes: ${parameterNames}.`);
    }

    const stepCount = (value - param.min) / param.step;
    const isOnStep = Math.abs(stepCount - Math.round(stepCount)) < 1e-9;

    const isInRange = Number.isFinite(value) && value >= param.min && value <= param.max;
    if (!isInRange || !isOnStep) {
      throw new Error(`"${parameterName}" has to be a number from ${param.min} to ${param.max} in steps of ${param.step}.`);
    }
  }
}

/** Zooms the editor to the curve so the user sees what the agent changed */
function fitAndDescribeEditorCurve() {
  elements.graphEditor.fitToPath();

  return createCurveDescription(elements.graphEditor.points.value);
}

const EMPTY_INPUT_SCHEMA = { type: "object", properties: {}, additionalProperties: false };

const CURVE_DESCRIPTION_NOTE =
  "Returns the curve as JSON: `path` in the editor's SVG format, `cubicBezier` with the CSS control points when the curve is one segment from corner to corner, " +
  "`samples` with the value at every tenth of the time, and `problems` that would make the exports wrong.";

const getEasingCurveTool: ModelContextTool = {
  name: "get_easing_curve",
  title: "Read the easing curve",
  description: `Reads the easing curve that is open in the editor. ${CURVE_DESCRIPTION_NOTE}`,
  inputSchema: EMPTY_INPUT_SCHEMA,
  annotations: { readOnlyHint: true },
  execute: () => JSON.stringify(createCurveDescription(elements.graphEditor.points.value)),
};

const setEasingCurveTool: ModelContextTool = {
  name: "set_easing_curve",
  title: "Draw an easing curve",
  description:
    "Replaces the curve in the editor, as one step the user can undo. Pass either `path` for any curve, or `cubicBezier` for a single curve. " +
    CURVE_DESCRIPTION_NOTE,
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: PATH_FORMAT_DESCRIPTION },
      cubicBezier: {
        type: "array",
        items: { type: "number" },
        minItems: 4,
        maxItems: 4,
        description:
          "The four numbers of a CSS cubic-bezier(x1, y1, x2, y2), in the usual upright coordinates where y is the value.",
      },
    },
    additionalProperties: false,
  },
  execute: ({ path, cubicBezier }: SetEasingCurveInput) => {
    if (path !== undefined && cubicBezier !== undefined) {
      throw new Error("Pass either `path` or `cubicBezier`, not both.");
    }

    const pathStr = cubicBezier ? createCubicBezierPathStr(cubicBezier) : path;
    if (pathStr === undefined) {
      throw new Error("Pass either `path` or `cubicBezier`.");
    }

    const pathCommands = getPathCommandsFromInput(pathStr);

    const isDrawn = setGraphPath(Points.constructPathStr(pathCommands));
    if (!isDrawn) {
      throw new Error(`The editor could not draw this path. ${PATH_FORMAT_DESCRIPTION}`);
    }

    return JSON.stringify(fitAndDescribeEditorCurve());
  },
};

const applyEasingPresetTool: ModelContextTool = {
  name: "apply_easing_preset",
  title: "Pick a preset easing",
  description: `Draws one of the built-in easing curves in the editor, as one step the user can undo. ${CURVE_DESCRIPTION_NOTE}`,
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", enum: presets.map(preset => preset.name), description: "The preset to draw." },
    },
    required: ["name"],
    additionalProperties: false,
  },
  execute: ({ name }: ApplyEasingPresetInput) => {
    const preset = presets.find(preset => preset.name === name);
    if (!preset) {
      throw new Error(`Unknown preset "${name}". Use one of: ${presets.map(preset => preset.name).join(", ")}.`);
    }

    elements.presetsMenu.value = preset.path;

    return JSON.stringify(fitAndDescribeEditorCurve());
  },
};

const generateEasingCurveTool: ModelContextTool = {
  name: "generate_easing_curve",
  title: "Generate an easing curve",
  description:
    "Draws a physics or math based easing in the editor from parameters, as one step the user can undo. " +
    "The generator and its sliders show up in the side panel for the user to tweak. " +
    `${CURVE_DESCRIPTION_NOTE}\n\nParameters by generator:\n${getGeneratorParametersDescription()}`,
  inputSchema: {
    type: "object",
    properties: {
      generator: { type: "string", enum: easeGenerators.map(generator => generator.name), description: "The generator to use." },
      parameters: {
        type: "object",
        additionalProperties: { type: "number" },
        description: "Values for the generator's parameters, by name. A parameter left out keeps its default.",
      },
    },
    required: ["generator"],
    additionalProperties: false,
  },
  execute: ({ generator: generatorName, parameters = {} }: GenerateEasingCurveInput) => {
    const generator = easeGenerators.find(generator => generator.name === generatorName);
    if (!generator) {
      const generatorNames = easeGenerators.map(generator => generator.name).join(", ");
      throw new Error(`Unknown generator "${generatorName}". Use one of: ${generatorNames}.`);
    }

    assertValidGeneratorParameters(generator, parameters);
    selectEaseGenerator(generator, parameters);

    return JSON.stringify(fitAndDescribeEditorCurve());
  },
};

const GRAPH_SELECTOR = "graph-editor";

const showEasingCurveTool: ModelContextTool = {
  name: "show_easing_curve",
  title: "Show the easing curve",
  description:
    "Zooms the editor so the whole curve is in view, then tells you which element to screenshot to see it. " +
    "Use it to check the shape and the overshoot with your own eyes.",
  inputSchema: EMPTY_INPUT_SCHEMA,
  annotations: { readOnlyHint: true },
  execute: () =>
    JSON.stringify({
      selector: GRAPH_SELECTOR,
      instruction:
        `Take a screenshot of the \`${GRAPH_SELECTOR}\` element to see the curve. ` +
        "The shaded square is the 0 to 1 box: time runs left to right and the value runs bottom to top. " +
        "The curve starts at the bottom left corner and ends at the top right one. " +
        "Any part of the curve above or below the square is overshoot.",
      ...fitAndDescribeEditorCurve(),
    }),
};

export const curveTools = [
  getEasingCurveTool,
  setEasingCurveTool,
  applyEasingPresetTool,
  generateEasingCurveTool,
  showEasingCurveTool,
];
