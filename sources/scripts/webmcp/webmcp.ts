import { curveTools } from "./curve-tools";
import { exportTools } from "./export-tools";

/** Chrome hides the message of an error thrown by a tool. Returning the message lets the agent correct its call. */
function returnErrorsAsResult(tool: ModelContextTool): ModelContextTool {
  return {
    ...tool,
    execute: (input: never) => {
      try {
        return tool.execute(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return JSON.stringify({ error: message });
      }
    },
  };
}

/** Offers the editor to AI agents in browsers that support WebMCP */
export function registerWebMcpTools() {
  const modelContext = document.modelContext;
  if (!modelContext) return;

  for (const tool of [...curveTools, ...exportTools]) {
    modelContext
      .registerTool(returnErrorsAsResult(tool))
      .catch((error: unknown) => console.error(`WebMCP could not register ${tool.name}`, error));
  }
}
