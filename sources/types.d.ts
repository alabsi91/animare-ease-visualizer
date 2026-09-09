import "@staticview/ui/types/dom/toggle-checkbox";
import "@staticview/ui/types/global/toggle-checkbox";

import type { import_as_string as ImportAsString } from "@staticbolt/core/plugins";

declare global {
  /** Whether the app is in production mode */
  const _production: boolean;

  /** Import a file and inline it as a string at build time. */
  const import_as_string: ImportAsString;
}

export {};
