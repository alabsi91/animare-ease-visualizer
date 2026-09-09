type Language = "css" | "javascript" | "html";

let highlighterPromise: ReturnType<typeof loadHighlighter> | undefined;

async function loadHighlighter() {
  const { default: hljs } = await import("highlight.js/lib/core");
  const { default: css } = await import("highlight.js/lib/languages/css");
  const { default: javascript } = await import("highlight.js/lib/languages/javascript");
  const { default: html } = await import("highlight.js/lib/languages/xml");

  hljs.registerLanguage("css", css);
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("html", html);

  return hljs;
}

function startLoading() {
  return (highlighterPromise ??= loadHighlighter());
}

// Fetch it once the page has settled, so an export dialog opens with it already there.
if (typeof requestIdleCallback === "function") {
  requestIdleCallback(startLoading, { timeout: 5000 });
} else {
  window.addEventListener("load", startLoading, { once: true });
}

export function createHighlighter(language: Language) {
  return (code: string) => {
    if (!code) return code;
    return startLoading().then(hljs => hljs.highlight(code, { language }).value);
  };
}
