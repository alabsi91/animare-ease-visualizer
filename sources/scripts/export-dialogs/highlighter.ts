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

if (typeof requestIdleCallback === "function") {
  requestIdleCallback(startLoading, { timeout: 5000 });
} else {
  window.addEventListener("load", startLoading, { once: true });
}

function escapeHtml(code: string) {
  return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function createTailwindClassHighlighter() {
  return (code: string) => {
    if (!code) return code;

    return escapeHtml(code)
      .replace(/^([a-z-]+?)-\[/, '<span class="hljs-attribute">$1</span>-[')
      .replace(/([a-z-]+)\(/g, '<span class="hljs-title">$1</span>(')
      .replace(/\d+(\.\d+)?%?/g, '<span class="hljs-number">$&</span>');
  };
}

export function createHighlighter(language: Language) {
  return (code: string) => {
    if (!code) return code;
    return startLoading().then(hljs => hljs.highlight(code, { language }).value);
  };
}
