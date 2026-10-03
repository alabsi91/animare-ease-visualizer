import { ExportOptionError } from "./export-option-error";

/** Letters, digits and underscores, starting with a letter or an underscore. Dart, Swift and Kotlin all accept it. */
export function getIsValidIdentifier(name: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

export function assertValidIdentifier(name: string) {
  if (!getIsValidIdentifier(name)) {
    throw new ExportOptionError("Invalid name", "Use letters, digits and underscores, starting with a letter");
  }
}
