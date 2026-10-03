import { ease } from "animare/plugins";
import { ExportOptionError } from "./export-option-error";

import { Points } from "@graph-editor/helpers/points";

import type { PathCommands } from "@graph-editor/helpers/types";

export type JsFunctionTarget = "javascript" | "after-effects";

export type JsFunctionOptions = {
  functionName: string;
  samples: number;
  target: JsFunctionTarget;
};

/** A reserved word like `class` passes the pattern. Declaring a variable with it throws. */
function getIsValidJsIdentifier(name: string) {
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) return false;

  try {
    new Function(`var ${name}`);
    return true;
  } catch {
    return false;
  }
}

function buildJavaScriptFunction(name: string, valuesLiteral: string) {
  return [
    `const values = ${valuesLiteral};`,
    "const lastIdx = values.length - 1;",
    `const ${name} = t => values[Math.floor(t * lastIdx)] ?? values[lastIdx];`,
    `export default ${name};`,
  ].join("\n");
}

function buildAfterEffectsExpression(name: string, valuesLiteral: string) {
  return [
    `var values = ${valuesLiteral};`,
    "var lastIdx = values.length - 1;",
    "",
    `function ${name}(t) {`,
    "  var index = Math.floor(t * lastIdx);",
    "  if (index < 0) index = 0;",
    "  if (index > lastIdx) index = lastIdx;",
    "  return values[index];",
    "}",
    "",
    "var duration = 2;",
    "var from = 0;",
    "var to = 500;",
    "",
    "var progress = clamp((time - inPoint) / duration, 0, 1);",
    `from + (to - from) * ${name}(progress);`,
  ].join("\n");
}

export function createJsFunctionCode(pathCommands: PathCommands, { functionName, samples, target }: JsFunctionOptions) {
  if (!getIsValidJsIdentifier(functionName)) {
    throw new ExportOptionError("Invalid JavaScript variable name", "Use letters, digits, underscores and dollar signs");
  }

  if (!Number.isInteger(samples) || samples < 2 || samples > 1000) {
    throw new ExportOptionError("Invalid samples", "Enter a whole number between 2 and 1000");
  }

  const easingFunction = ease.custom(Points.constructPathStr(pathCommands));

  const values = [];
  for (let index = 0; index < samples; index++) {
    const time = index / (samples - 1);
    values[index] = +easingFunction(time).toFixed(3);
  }

  const valuesLiteral = JSON.stringify(values);

  if (target === "after-effects") {
    return buildAfterEffectsExpression(functionName, valuesLiteral);
  }

  return buildJavaScriptFunction(functionName, valuesLiteral);
}
