import { ExportOptionError } from "../export-code/export-option-error";
import { showAlert } from "../alert";

/** Shows an invalid export option as an alert. Any other error is thrown again. */
export function showExportOptionError(error: unknown) {
  if (!(error instanceof ExportOptionError)) throw error;

  showAlert("error", error.title, error.hint);
}
