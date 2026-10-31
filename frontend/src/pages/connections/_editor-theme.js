// Tema de CodeMirror para el editor SQL. Los colores no están fijos: salen de
// las variables CSS de index.css, así el editor cambia con el tema claro u
// oscuro sin volver a crearse.
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Paleta del editor: variables CSS de index.css para seguir el tema claro u oscuro.
const P = {
  bg: "var(--om-bg)",
  bg2: "var(--om-bg-2)",
  fg: "var(--tok-var)",
  fgMuted: "var(--om-fg-muted)",
  fgBright: "var(--om-fg-bright)",
  accent: "var(--om-accent)",
  line: "var(--tok-line)",
  sel: "var(--tok-sel)",
  kw: "var(--tok-kw)",
  fn: "var(--tok-fn)",
  str: "var(--tok-str)",
  num: "var(--tok-num)",
  com: "var(--tok-com)",
  type: "var(--tok-type)",
  op: "var(--tok-op)",
  red: "var(--om-red)",
};

const editorChrome = EditorView.theme({
  "&": {
    background: P.bg,
    color: P.fg,
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily: '"JetBrains Mono", "IBM Plex Mono", "Fira Code", ui-monospace, monospace',
    fontSize: "13px",
    lineHeight: "1.7",
  },
  ".cm-content": { caretColor: P.fgBright, color: P.fg },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: P.fgBright, borderLeftWidth: "2px" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    background: `${P.sel} !important`,
  },
  ".cm-line": { padding: "0 12px" },
  ".cm-gutters": {
    background: P.bg,
    color: P.fgMuted,
    border: "none",
    paddingRight: "8px",
  },
  ".cm-lineNumbers .cm-gutterElement": { color: P.fgMuted, padding: "0 6px 0 12px" },
  ".cm-activeLine": { background: P.line },
  ".cm-activeLineGutter": { background: "transparent", color: P.fgBright },
  ".cm-matchingBracket": {
    background: "color-mix(in srgb, var(--om-accent) 25%, transparent)",
    outline: "none",
  },
  ".cm-panels": { background: P.bg2, color: P.fg, borderColor: "var(--om-border)" },
});

const editorHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: P.kw },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: P.fn },
  { tag: [t.string, t.special(t.string), t.regexp], color: P.str },
  { tag: [t.number, t.integer, t.float, t.bool], color: P.num },
  {
    tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
    color: P.com,
    fontStyle: "italic",
  },
  { tag: [t.typeName, t.className], color: P.type },
  { tag: [t.variableName, t.propertyName], color: P.fg },
  { tag: [t.operator, t.punctuation, t.bracket], color: P.op },
  { tag: [t.null, t.atom], color: P.kw },
  { tag: [t.invalid], color: P.red },
]);

/** Extensiones de CodeMirror: aspecto del editor y resaltado de sintaxis. */
export const editorTheme = [editorChrome, syntaxHighlighting(editorHighlight)];
