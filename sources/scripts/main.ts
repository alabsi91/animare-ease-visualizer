import { initCssKeyframeExport, initCssLinearExport, initJsFunctionExport, initSvgCodeExport } from "./exportDialog";
import { initGraph } from "./graph";
import { initializeSidePanel } from "./sidePanel";

initializeSidePanel();

initGraph();

initCssKeyframeExport();

initCssLinearExport();

initJsFunctionExport();

initSvgCodeExport();
