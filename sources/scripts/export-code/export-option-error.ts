/** Thrown when an export option is invalid. A dialog shows it as an alert, and an agent gets the message back. */
export class ExportOptionError extends Error {
  constructor(
    readonly title: string,
    readonly hint: string
  ) {
    super(`${title}. ${hint}`);
  }
}
