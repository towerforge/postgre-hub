import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

/* Editor palette */
const P = {
    bg:        '#1c1c1c',
    bg2:       '#232323',
    bg3:       '#2a2a2a',
    fg:        '#d4d4d4',
    fgDim:     '#a8a8a8',
    fgMuted:   '#6a6a6a',
    fgBright:  '#f0f0f0',
    accent:    '#8aa6c1',   // dusty blue → functions
    magenta:   '#c4a7e7',   // keywords
    cyan:      '#91b4b8',   // types
    green:     '#9eb87f',   // strings, cursor, line-num active
    yellow:    '#d8b88a',
    orange:    '#c98c6c',   // numbers
    red:       '#c47b7b',
}

const editorChrome = EditorView.theme(
    {
        '&': {
            background: P.bg,
            color: P.fg,
            height: '100%',
        },
        '.cm-scroller': {
            fontFamily: '"JetBrains Mono", "IBM Plex Mono", "Fira Code", ui-monospace, monospace',
            fontSize: '13px',
            lineHeight: '1.55',
        },
        '.cm-content': { caretColor: P.green, color: P.fg },
        '.cm-cursor, .cm-dropCursor': { borderLeftColor: P.green },
        '&.cm-focused .cm-selectionBackground, ::selection': {
            background: 'rgba(212,212,212,0.16)',
        },
        '.cm-line': { padding: '0 8px' },
        '.cm-gutters': {
            background: P.bg,
            color: P.fgMuted,
            border: 'none',
            paddingRight: '4px',
        },
        '.cm-lineNumbers .cm-gutterElement': { color: P.fgMuted, padding: '0 6px 0 8px' },
        '.cm-activeLine': { background: 'rgba(255,255,255,0.025)' },
        '.cm-activeLineGutter': {
            background: 'rgba(255,255,255,0.025)',
            color: P.green,
            fontWeight: '500',
        },
        '.cm-tooltip': {
            background: P.bg2,
            border: `1px solid ${P.fgMuted}`,
            borderRadius: '0',
            color: P.fg,
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        },
        '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
            background: P.bg3,
            color: P.fgBright,
        },
        '.cm-panels': { background: P.bg2, color: P.fg, borderColor: P.bg3 },
    },
    { dark: true },
)

const editorHighlight = HighlightStyle.define([
    { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: P.magenta },
    { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: P.accent },
    { tag: [t.string, t.special(t.string), t.regexp], color: P.green },
    { tag: [t.number, t.integer, t.float, t.bool], color: P.orange },
    { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: P.fgMuted, fontStyle: 'italic' },
    { tag: [t.typeName, t.className], color: P.cyan },
    { tag: [t.variableName, t.propertyName], color: P.fg },
    { tag: [t.operator, t.punctuation, t.bracket], color: P.fgDim },
    { tag: [t.null, t.atom], color: P.fgMuted, fontStyle: 'italic' },
    { tag: [t.invalid], color: P.red },
])

export const editorTheme = [editorChrome, syntaxHighlighting(editorHighlight)]
