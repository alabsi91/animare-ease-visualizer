import { printers as estreePrinters } from "prettier/plugins/estree";
import { doc } from "prettier";

/**
 * @import {AstPath, Doc, Plugin} from "prettier"
 * @import {Node, MethodDefinition} from "estree"
 */

/**
 * Checks if a BlockStatement node (like a method body) is a one-liner in the original source.
 *
 * @param {object} blockStatementNode - The AST node for the BlockStatement (e.g., node.body).
 * @returns {boolean} True if the block statement is a one-liner.
 */
function isBlockStatementOneLiner(blockStatementNode) {
  if (!blockStatementNode || blockStatementNode.type !== "BlockStatement" || !blockStatementNode.loc) {
    return false;
  }
  // Check if the block statement's opening and closing braces are on the same line.
  return blockStatementNode.loc.start.line === blockStatementNode.loc.end.line;
}

/**
 * Custom print function for one-liner getter/setter methods in classes.
 *
 * @param {AstPath<MethodDefinition>} path - The path to the current AST node.
 * @param {object} _options - Prettier options.
 * @param {(...args: any) => any} printCallback - The print function to recursively print child nodes.
 * @returns {Doc} The Prettier Doc for the formatted getter/setter.
 */
function printOneLinerClassMethod(path, _options, printCallback) {
  const node = path.node;
  const { group, join } = doc.builders;

  let parts = [];
  if (node.static) parts.push("static ");
  if (node.value.async) parts.push("async ");
  if (node.value.generator) parts.push("*");
  if (node.kind === "get" || node.kind === "set") parts.push(node.kind + " ");
  parts.push(path.call(printCallback, "key")); // Method name (key)

  // Parameters
  parts.push("(");
  if (Array.isArray(node.value.params)) {
    for (let i = 0; i < node.value.params.length; i++) {
      parts.push(path.call(printCallback, "value", "params", i));
      if (i < node.value.params.length - 1) parts.push(", ");
    }
  }
  parts.push(")");

  // return type
  if (node.value.returnType) {
    parts.push(path.call(printCallback, "value", "returnType"));
  }

  parts.push(" "); // Space before the body

  // Method body: { [statements] }
  const bodyNode = node.value.body;
  let bodyDocParts = [];

  if (bodyNode.body.length === 0) {
    bodyDocParts.push("{", "}");
  } else {
    const statementDocs = bodyNode.body.map((_, i) => path.call(printCallback, "value", "body", "body", i));
    bodyDocParts.push("{ ", join(" ", statementDocs), " }");
  }
  parts.push(bodyDocParts);

  return group(parts);
}

const originalEstreePrinter = estreePrinters.estree;

/** @type {Plugin["printers"]} */
export const printers = {
  estree: {
    ...originalEstreePrinter,

    /**
     * @param {AstPath<Node>} path
     * @param {any} options
     * @param {any} printCallback
     * @returns
     */
    print(path, options, printCallback) {
      const node = path.node;

      if (node.type === "MethodDefinition" && node.value.body && isBlockStatementOneLiner(node.value.body)) {
        return printOneLinerClassMethod(path, options, printCallback);
      }

      return originalEstreePrinter.print(path, options, printCallback);
    },
  },
};
