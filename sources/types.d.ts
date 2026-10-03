import "@staticview/ui/types/dom/accordion";
import "@staticview/ui/types/dom/alert-stack";
import "@staticview/ui/types/dom/combobox";
import "@staticview/ui/types/dom/flyout";
import "@staticview/ui/types/dom/menu";
import "@staticview/ui/types/dom/code-editor";
import "@staticview/ui/types/dom/dialog";
import "@staticview/ui/types/dom/segmented-control";
import "@staticview/ui/types/dom/slider";
import "@staticview/ui/types/dom/toggle";
import "@staticview/ui/types/dom/toggle-checkbox";
import "@staticview/ui/types/dom/tooltip";
import "@staticview/ui/types/global/accordion";
import "@staticview/ui/types/global/alert-stack";
import "@staticview/ui/types/global/combobox";
import "@staticview/ui/types/global/flyout";
import "@staticview/ui/types/global/menu";
import "@staticview/ui/types/global/code-editor";
import "@staticview/ui/types/global/dialog";
import "@staticview/ui/types/global/segmented-control";
import "@staticview/ui/types/global/slider";
import "@staticview/ui/types/global/toggle";
import "@staticview/ui/types/global/toggle-checkbox";
import "@staticview/ui/types/global/tooltip";
import "./graph-editor/types/dom-types";
import "./graph-editor/types/global-types";

declare global {
  /** Whether the app is in production mode */
  const _production: boolean;

  /** A tool that a page offers to AI agents through WebMCP */
  interface ModelContextTool {
    name: string;
    title?: string;
    description: string;
    inputSchema?: object;
    execute: (input: never) => unknown;
    annotations?: {
      readOnlyHint?: boolean;
      untrustedContentHint?: boolean;
    };
  }

  interface ModelContext {
    registerTool(tool: ModelContextTool, options?: { signal?: AbortSignal }): Promise<void>;
  }

  interface Document {
    /** WebMCP. Missing in browsers that do not support it. */
    readonly modelContext?: ModelContext;
  }
}

export {};
