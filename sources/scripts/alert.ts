import { elements } from "./elements";

import type { Severity } from "@staticview/ui/toaster";

const DISMISS_DELAY = 5000;

/** Show an alert that dismisses itself. Pass `withDismissButton` to add a button that closes it early. */
export function showAlert(severity: Severity, title: string, description?: string, withDismissButton = false) {
  elements.toaster.create({
    severity,
    title,
    description,
    duration: DISMISS_DELAY,
    closeButton: withDismissButton,
  });
}
