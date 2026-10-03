import { createAndroidInterpolatorCode } from "../export-code/android-interpolator-code";
import { createCssKeyframesCode } from "../export-code/css-keyframes-code";
import { createCssLinearCode } from "../export-code/css-linear-code";
import { createFlutterCurveCode } from "../export-code/flutter-curve-code";
import { createGsapEaseCode } from "../export-code/gsap-ease-code";
import { createIosKeyframesCode } from "../export-code/ios-keyframes-code";
import { createJetpackComposeCode } from "../export-code/jetpack-compose-code";
import { createJsFunctionCode } from "../export-code/js-function-code";
import { createSvgPathCode } from "../export-code/svg-path-code";
import { PATH_PROPERTY_SCHEMA, getCurveProblems, getPathCommandsFromInput } from "./agent-curve";

import type { CssKeyframesOptions } from "../export-code/css-keyframes-code";
import type { CssLinearOptions } from "../export-code/css-linear-code";
import type { PathCommands } from "@graph-editor/helpers/types";

type OptionSchema<Value> = {
  type: "string" | "number" | "integer" | "boolean";
  description: string;
  default: Value;
  enum?: readonly Value[];
  minimum?: number;
  exclusiveMinimum?: number;
  maximum?: number;
};

type ExportToolDefinition<Options> = {
  name: string;
  title: string;
  description: string;
  optionSchemas: { [Key in keyof Options]: OptionSchema<Options[Key]> };
  createCode: (pathCommands: PathCommands, options: Options) => string;
};

/** An export tool takes an optional path and uses its schema defaults. It returns the code and any curve problems. */
function createExportTool<Options extends object>(definition: ExportToolDefinition<Options>): ModelContextTool {
  const optionSchemas: Record<string, OptionSchema<unknown>> = definition.optionSchemas;

  const defaultOptions = Object.fromEntries(Object.entries(optionSchemas).map(([name, schema]) => [name, schema.default]));

  return {
    name: definition.name,
    title: definition.title,
    description: `${definition.description} Returns JSON with the \`code\` and a list of curve \`problems\` that make the code wrong.`,
    inputSchema: {
      type: "object",
      properties: { path: PATH_PROPERTY_SCHEMA, ...optionSchemas },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: ({ path, ...optionInput }: { path?: string } & Partial<Options>) => {
      const pathCommands = getPathCommandsFromInput(path);
      const options = { ...defaultOptions, ...optionInput } as Options;

      const code = definition.createCode(pathCommands, options);

      return JSON.stringify({ code, problems: getCurveProblems(pathCommands) });
    },
  };
}

const IDENTIFIER_DESCRIPTION = "Letters, digits and underscores, starting with a letter.";

export const exportTools = [
  createExportTool<CssLinearOptions>({
    name: "export_css_linear",
    title: "Export as CSS linear()",
    description:
      "Exports the curve as a CSS easing function, ready for `transition-timing-function` or `animation-timing-function`. " +
      "A single curve becomes `cubic-bezier()`. Any other curve becomes `linear()` with the fewest stops that follow it.",
    optionSchemas: {
      maxStops: {
        type: "integer",
        description: "The most stops linear() may use. More stops follow the curve closer.",
        default: 75,
        minimum: 2,
        maximum: 500,
      },
      format: {
        type: "string",
        description: "`css` for the plain function, `tailwind` for an arbitrary value class like `ease-[linear(...)]`.",
        default: "css",
        enum: ["css", "tailwind"],
      },
    },
    createCode: (pathCommands, options) => createCssLinearCode(pathCommands, options).code,
  }),

  createExportTool<CssKeyframesOptions>({
    name: "export_css_keyframes",
    title: "Export as CSS keyframes",
    description:
      "Exports the curve as a CSS @keyframes rule that animates a property from one number to another. " +
      "A single curve becomes a `cubic-bezier()` transition instead.",
    optionSchemas: {
      property: {
        type: "string",
        description: "The declaration in each keyframe. `{value}` is replaced by the animated number.",
        default: "transform: translateX({value}%);",
      },
      maxKeyframes: {
        type: "integer",
        description: "The most keyframes to write. More keyframes follow the curve closer.",
        default: 75,
        minimum: 2,
        maximum: 500,
      },
      from: { type: "number", description: "The number at the start of the animation.", default: 0 },
      to: { type: "number", description: "The number at the end of the animation.", default: 100 },
    },
    createCode: (pathCommands, options) => createCssKeyframesCode(pathCommands, options).code,
  }),

  createExportTool({
    name: "export_svg",
    title: "Export as SVG",
    description: "Exports the curve as an SVG image that draws it with `currentColor`.",
    optionSchemas: {
      scale: { type: "number", description: "The size in pixels of the 0 to 1 box.", default: 100, exclusiveMinimum: 0 },
      isFittedToCurve: {
        type: "boolean",
        description: "Fit the view box to the curve, so overshoot is not cut off. Otherwise the view box is the 0 to 1 box.",
        default: true,
      },
    },
    createCode: createSvgPathCode,
  }),

  createExportTool({
    name: "export_gsap_custom_ease",
    title: "Export as GSAP CustomEase",
    description: "Exports the curve as a GSAP CustomEase, with a tween that uses it.",
    optionSchemas: {
      easeName: { type: "string", description: "The name that the ease is registered under.", default: "customEase" },
    },
    createCode: createGsapEaseCode,
  }),

  createExportTool({
    name: "export_android_interpolator",
    title: "Export as Android interpolator",
    description:
      "Exports the curve as an Android `pathInterpolator` XML resource for `res/anim` or `res/interpolator`. " +
      "A single curve uses the four control points instead of a path.",
    optionSchemas: {},
    createCode: createAndroidInterpolatorCode,
  }),

  createExportTool({
    name: "export_jetpack_compose_easing",
    title: "Export as Jetpack Compose easing",
    description: "Exports the curve as a Jetpack Compose `PathEasing`, or a `CubicBezierEasing` for a single curve.",
    optionSchemas: {
      valueName: {
        type: "string",
        description: `The name of the Kotlin value. ${IDENTIFIER_DESCRIPTION}`,
        default: "customEasing",
      },
    },
    createCode: createJetpackComposeCode,
  }),

  createExportTool({
    name: "export_flutter_curve",
    title: "Export as Flutter curve",
    description: "Exports the curve as a Flutter `Curve` subclass, or Flutter's own `Cubic` for a single curve.",
    optionSchemas: {
      className: {
        type: "string",
        description: `The name of the Dart class. ${IDENTIFIER_DESCRIPTION}`,
        default: "CustomEasing",
      },
    },
    createCode: createFlutterCurveCode,
  }),

  createExportTool({
    name: "export_ios_keyframes",
    title: "Export as iOS keyframes",
    description:
      "Exports the curve as a Swift function that builds a `CAKeyframeAnimation`, or one `CAMediaTimingFunction` for a single curve.",
    optionSchemas: {
      functionName: {
        type: "string",
        description: `The name of the Swift function. ${IDENTIFIER_DESCRIPTION}`,
        default: "customEase",
      },
    },
    createCode: createIosKeyframesCode,
  }),

  createExportTool({
    name: "export_javascript_function",
    title: "Export as JavaScript function",
    description: "Exports the curve as a JavaScript easing function backed by a lookup table, or as an After Effects expression.",
    optionSchemas: {
      functionName: {
        type: "string",
        description: "The name of the function. A valid JavaScript identifier.",
        default: "customEasing",
      },
      samples: {
        type: "integer",
        description: "How many values the lookup table holds. More values follow the curve closer.",
        default: 100,
        minimum: 2,
        maximum: 1000,
      },
      target: {
        type: "string",
        description: "`javascript` for an ES module, `after-effects` for an expression to paste into a property.",
        default: "javascript",
        enum: ["javascript", "after-effects"],
      },
    },
    createCode: createJsFunctionCode,
  }),
];
