import { useState } from 'react'
import { Keyboard } from 'lucide-react'
import { Modal } from '@/components/ui'

const SHORTCUT_GROUPS: Array<{ title: string; items: Array<{ keys: string[]; desc: string }> }> = [
    {
        title: 'Selection',
        items: [
            { keys: ['Click cell'],     desc: 'Select a cell' },
            { keys: ['Click + drag'],   desc: 'Select a range of cells' },
            { keys: ['Click row #'],    desc: 'Select the whole row (drag to extend)' },
        ],
    },
    {
        title: 'Edit cells',
        items: [
            { keys: ['Type'],           desc: 'Overwrite the selected cell(s) with the typed character' },
            { keys: ['Backspace'],      desc: 'Delete last character of the pending edit' },
            { keys: ['Delete'],         desc: 'Clear the selected cell(s) (set to empty string)' },
            { keys: ['Esc'],            desc: 'Discard pending edits in the current selection' },
            { keys: ['null'],           desc: 'Typing the word "null" sets the cell to SQL NULL' },
        ],
    },
    {
        title: 'Rows',
        items: [
            { keys: ['[+ add row]'],    desc: 'Append a new empty row at the bottom' },
            { keys: ['Delete', '-'],    desc: 'On a full-row selection: toggle delete-mark for real rows, or remove pending insert rows' },
            { keys: ['Esc'],            desc: 'On a full-row selection: also clears the delete-mark' },
        ],
    },
    {
        title: 'Clipboard',
        items: [
            { keys: ['Ctrl/⌘ + C'],     desc: 'Copy the selected range as TSV (Excel/Sheets compatible)' },
            { keys: ['Ctrl/⌘ + V'],     desc: 'Paste TSV — single value fills the selection, a block spreads from the top-left' },
        ],
    },
    {
        title: 'Apply',
        items: [
            { keys: ['[apply]'],        desc: 'Preview the generated SQL and execute all pending changes in one transaction' },
        ],
    },
]

export function ShortcutsButton() {
    const [open, setOpen] = useState(false)
    return (
        <>
            <span
                className="statusbar-section"
                onClick={() => setOpen(true)}
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                title="Show keyboard shortcuts"
            >
                <Keyboard size={11} />
                <span className="v">[shortcuts]</span>
            </span>
            <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" width="min(92vw, 640px)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 12 }}>
                    {SHORTCUT_GROUPS.map(g => (
                        <div key={g.title}>
                            <div style={{
                                fontSize: 10, fontWeight: 600,
                                color: 'var(--om-fg-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                marginBottom: 8,
                            }}>{g.title}</div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {g.items.map((it, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'baseline', gap: 16,
                                        padding: '6px 0',
                                        borderBottom: i < g.items.length - 1 ? '0.5px solid var(--om-border)' : 'none',
                                    }}>
                                        <span style={{ minWidth: 200, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {it.keys.map((k, ki) => (
                                                <kbd key={ki} style={{
                                                    fontFamily: 'var(--font-mono)', fontSize: 11,
                                                    padding: '1px 6px', borderRadius: 3,
                                                    background: 'var(--om-bg)',
                                                    border: '1px solid var(--om-border)',
                                                    color: 'var(--om-fg-bright)',
                                                }}>{k}</kbd>
                                            ))}
                                        </span>
                                        <span style={{ color: 'var(--om-fg)' }}>{it.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </>
    )
}
