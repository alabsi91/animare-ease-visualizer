import { initExportDialogs } from "./export-dialogs/export-dialogs";
import { initGraph } from "./graph/graph";
import { initializeEaseGenerators } from "./ease-generator/ease-generator";
import { initializePathCodeEditor } from "./side-panel/path-code-editor";
import { initializePresetsMenu } from "./side-panel/presets-menu";
import { initializeSidePanel } from "./side-panel/side-panel";

initializeSidePanel();

initializePresetsMenu();

initializePathCodeEditor();

initializeEaseGenerators();

initGraph();

initExportDialogs();
