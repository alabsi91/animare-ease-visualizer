type ColorScheme = "light" | "dark";

function getColorScheme(): ColorScheme {
  const chosen = document.documentElement.style.colorScheme;
  if (chosen === "dark" || chosen === "light") return chosen;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function followColorScheme(editors: CodeEditor[]) {
  const applyScheme = (scheme: ColorScheme) => {
    for (const editor of editors) {
      editor.codeStylesheet = `.hljs-${scheme}`;
    }
  };

  applyScheme(getColorScheme());

  document.addEventListener("color-scheme-changed", event => {
    applyScheme((event as CustomEvent<ColorScheme>).detail);
  });
}
