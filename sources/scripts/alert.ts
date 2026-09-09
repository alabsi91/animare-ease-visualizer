import { elements } from "./elements";

import type { Severity } from "@staticview/ui/alert-stack";

const DISMISS_DELAY = 5000;

/** FNV-1a, to turn the alert text into something usable as an element id. */
function hashText(text: string) {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

/** Show an alert that dismisses itself. Pass `withDismissButton` to add a button that closes it early. */
export function showAlert(severity: Severity, title: string, description?: string, withDismissButton = false) {
  const items = elements.alertStack.items;

  const id = `alert-${hashText(`${title.length}:${title}${description ?? ""}`)}`;

  const exists = items.some(item => item.id === id);
  if (exists) return;

  elements.alertStack.create({
    id,
    severity,
    title,
    description,
    duration: DISMISS_DELAY,
    actionButton: withDismissButton ? {} : null,
  });
}
