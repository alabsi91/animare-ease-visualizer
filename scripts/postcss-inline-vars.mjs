/**
 * @param {string} value
 * @returns {boolean}
 */
const isCssVar = value => value.includes("var(");

// the match is whole variable, group 1 is the name, group 2 is the fallback (could be another var)
const RE_CSS_VARS = /var\(\s*(--.+?)\s*(?:,\s*(.+))?\)/g;

/**
 * @param {string} match
 * @param {string} name
 * @param {string | undefined} fallback
 * @returns {string}
 */
function replacer(match, name, fallback) {
  const value = collectedVars.get(name);

  // Ignore fallback in this case
  if (value) return value;

  if (fallback && isCssVar(fallback)) {
    const replacedFallback = fallback.replace(RE_CSS_VARS, replacer);
    return `var(${name}, ${replacedFallback})`;
  }

  return match;
}

/** @type {Map<string, string>} */
const collectedVars = new Map();

/** @type {import("postcss").PluginCreator<{ rootSelector?: string; variableRegexp?: string[] }>} */
const inlineCssVars = (options = {}) => {
  const { rootSelector = ":root", variableRegexp = [] } = options;

  const regex = variableRegexp.map(re => new RegExp(re));
  if (regex.length === 0) regex.push(/^--./);

  const shouldInlineVar = name => {
    for (const re of regex) if (re.test(name)) return true;
    return false;
  };

  return {
    postcssPlugin: "postcss-inline-css-vars",
    Rule(rule) {
      // collect and replace vars
      if (rule.selector === rootSelector) {
        const isEmpty = rule.nodes.length === 0;
        if (isEmpty) {
          rule.remove();
          return;
        }

        for (const decl of rule.nodes) {
          if (decl.type !== "decl") continue;

          // collect vars (skip variable that refer to another var)
          if (decl.variable && !isCssVar(decl.value) && shouldInlineVar(decl.prop)) {
            collectedVars.set(decl.prop, decl.value);
            decl.remove(); // remove collected vars
            continue;
          }

          // using vars
          if (isCssVar(decl.value)) {
            decl.value = decl.value.replace(RE_CSS_VARS, replacer);
          }
        }

        return;
      }

      // replace only
      for (const decl of rule.nodes) {
        if (decl.type !== "decl") continue;

        // using vars
        if (isCssVar(decl.value)) {
          decl.value = decl.value.replace(RE_CSS_VARS, replacer);
        }
      }
    },
  };
};

inlineCssVars.postcss = true;

export default inlineCssVars;
