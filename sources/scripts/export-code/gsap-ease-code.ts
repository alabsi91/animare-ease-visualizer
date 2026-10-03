import { ExportOptionError } from "./export-option-error";
import { getUprightPathStr } from "./easing-path";

import type { PathCommands } from "@graph-editor/helpers/types";

export type GsapEaseOptions = {
  easeName: string;
};

export function createGsapEaseCode(pathCommands: PathCommands, { easeName }: GsapEaseOptions) {
  if (!easeName) {
    throw new ExportOptionError("Invalid name", "Enter a name for the ease");
  }

  const pathStr = getUprightPathStr(pathCommands);
  const quotedName = JSON.stringify(easeName);

  return `import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

CustomEase.create(${quotedName}, "${pathStr}");

gsap.to(".box", { x: 300, duration: 0.6, ease: ${quotedName} });`;
}
