import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, Plus } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { sql as sqlLang, PostgreSQL } from '@codemirror/lang-sql'
import { EditorView } from '@codemirror/view'
import { editorTheme } from './editor-theme'
import { Modal, Button, Spinner } from '@/components/ui'
import { apiRunQuery, apiBuildChanges, type QueryResult, type UpdateRow, type DeleteRow, type InsertRow } from '@/services/database'
import { excelCol } from './utils'

type Sel = { ar: number; ac: number; r0: number; c0: number; r1: number; c1: number }

export function ResultTabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                height: 22, padding: '0 8px', border: 'none', borderRadius: 6,
                cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap',
                background: active ? 'var(--content-0)' : 'transparent',
                color: active ? 'var(--text-1)' : 'var(--text-3)',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08), 0 0 0 0.5px var(--stroke-1)' : 'none',
                transition: 'background 0.12s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-2)' }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-3)' }}
        >
            {children}
        </button>
    )
}

export function QueryResultView({
    result, projectId, schema, tableName, onApplied,
}: {
    result: QueryResult
    projectId?: string
    schema?: string
    tableName?: string
    onApplied?: () => void
}) {
    const editable = !!(projectId && schema && tableName)
    const [sel, setSel] = useState<Sel | null>(null)
    const draggingRef = useRef(false)
    const [widths, setWidths] = useState<number[] | null>(null)
    const thRefs = useRef<(HTMLTableCellElement | null)[]>([])
    const resizingRef = useRef<{ ci: number; startX: number; startW: number } | null>(null)
    const [expand, setExpand] = useState<{ text: string; top: number; left: number; minWidth: number } | null>(null)
    const [edits, setEdits] = useState<Map<string, string>>(new Map())
    const [deletes, setDeletes] = useState<Set<number>>(new Set())
    const [inserts, setInserts] = useState<Array<Map<number, string>>>([])
    const [modalOpen, setModalOpen] = useState(false)
    const [applying, setApplying] = useState(false)
    const [applyError, setApplyError] = useState<string | null>(null)
    const [builtSQL, setBuiltSQL] = useState<string | null>(null)
    const typingSelRef = useRef<string | null>(null)
    const wrapRef = useRef<HTMLDivElement>(null)

    useEffect(() => { setEdits(new Map()); setDeletes(new Set()); setInserts([]); typingSelRef.current = null }, [result])

    useEffect(() => {
        if (!editable || !sel) return
        const nReal = result.rows.length
        const writeCells = (
            cells: Array<{ ri: number; ci: number; k: string }>,
            fn: (prev: string | undefined) => string,
        ) => {
            const realCells    = cells.filter(c => c.ri < nReal)
            const phantomCells = cells.filter(c => c.ri >= nReal)
            if (realCells.length) {
                setEdits(m => {
                    const n = new Map(m)
                    realCells.forEach(c => n.set(c.k, fn(n.get(c.k))))
                    return n
                })
            }
            if (phantomCells.length) {
                setInserts(arr => {
                    const next = arr.slice()
                    phantomCells.forEach(c => {
                        const idx = c.ri - nReal
                        if (idx < 0 || idx >= next.length) return
                        const map = new Map(next[idx])
                        map.set(c.ci, fn(map.get(c.ci)))
                        next[idx] = map
                    })
                    return next
                })
            }
        }
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null
            if (t && t.tagName !== 'BODY' && !wrapRef.current?.contains(t)) return

            const cells: Array<{ k: string; ri: number; ci: number }> = []
            for (let r = sel.r0; r <= sel.r1; r++)
                for (let c = sel.c0; c <= sel.c1; c++)
                    cells.push({ k: `${r}:${c}`, ri: r, ci: c })
            const selKey = `${sel.r0}:${sel.c0}:${sel.r1}:${sel.c1}`
            const isFullRowSel = sel.c0 === 0 && sel.c1 === result.columns.length - 1
            const allPhantom = sel.r0 >= nReal
            const allReal    = sel.r1 < nReal

            if (e.key === 'Escape') {
                setEdits(m => {
                    const n = new Map(m)
                    cells.filter(c => c.ri < nReal).forEach(c => n.delete(c.k))
                    return n
                })
                setInserts(arr => {
                    const next = arr.slice()
                    cells.filter(c => c.ri >= nReal).forEach(c => {
                        const idx = c.ri - nReal
                        if (idx < 0 || idx >= next.length) return
                        const map = new Map(next[idx])
                        map.delete(c.ci)
                        next[idx] = map
                    })
                    return next
                })
                if (isFullRowSel && allReal) {
                    setDeletes(s => {
                        const n = new Set(s)
                        for (let r = sel.r0; r <= sel.r1; r++) n.delete(r)
                        return n
                    })
                }
                typingSelRef.current = null
                e.preventDefault()
                return
            }
            // Suprimir/`-` on a full-row selection: mark real rows for delete, drop phantom rows.
            if ((e.key === 'Delete' || e.key === '-') && isFullRowSel) {
                if (allPhantom) {
                    const phantomIdxs: number[] = []
                    for (let r = sel.r0; r <= sel.r1; r++) phantomIdxs.push(r - nReal)
                    setInserts(arr => arr.filter((_, i) => !phantomIdxs.includes(i)))
                    setSel(null)
                    typingSelRef.current = null
                    e.preventDefault()
                    return
                }
                if (allReal) {
                    const rowRange: number[] = []
                    for (let r = sel.r0; r <= sel.r1; r++) rowRange.push(r)
                    const allMarked = rowRange.every(r => deletes.has(r))
                    setDeletes(s => {
                        const n = new Set(s)
                        if (allMarked) rowRange.forEach(r => n.delete(r))
                        else           rowRange.forEach(r => n.add(r))
                        return n
                    })
                    if (!allMarked) {
                        setEdits(m => {
                            const n = new Map(m)
                            for (const k of Array.from(n.keys())) {
                                const r = Number(k.split(':')[0])
                                if (r >= sel.r0 && r <= sel.r1) n.delete(k)
                            }
                            return n
                        })
                        typingSelRef.current = null
                    }
                    e.preventDefault()
                    return
                }
                // Mixed selection: ignore.
                return
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
                writeCells(cells, prev => e.key === 'Delete' ? '' : (prev ?? '').slice(0, -1))
                typingSelRef.current = selKey
                e.preventDefault()
                return
            }
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const fresh = typingSelRef.current !== selKey
                typingSelRef.current = selKey
                writeCells(cells, prev => fresh ? e.key : (prev ?? '') + e.key)
                e.preventDefault()
            }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [editable, sel, deletes, inserts, result])

    // Copy current selection to clipboard as TSV (works for any result, editable or not).
    useEffect(() => {
        if (!sel) return
        const nReal = result.rows.length
        const onCopy = (e: ClipboardEvent) => {
            const t = e.target as HTMLElement | null
            if (t && t.tagName !== 'BODY' && !wrapRef.current?.contains(t)) return
            const lines: string[] = []
            for (let r = sel.r0; r <= sel.r1; r++) {
                const cells: string[] = []
                for (let c = sel.c0; c <= sel.c1; c++) {
                    let raw: unknown
                    if (r < nReal) {
                        const editVal = edits.get(`${r}:${c}`)
                        raw = editVal !== undefined
                            ? (editVal.toLowerCase() === 'null' ? null : editVal)
                            : (result.rows[r] as unknown[])[c]
                    } else {
                        const v = inserts[r - nReal]?.get(c)
                        raw = v === undefined
                            ? ''
                            : (v.toLowerCase() === 'null' ? null : v)
                    }
                    cells.push(raw === null || raw === undefined ? '' : String(raw))
                }
                lines.push(cells.join('\t'))
            }
            e.clipboardData?.setData('text/plain', lines.join('\n'))
            e.preventDefault()
        }
        document.addEventListener('copy', onCopy)
        return () => document.removeEventListener('copy', onCopy)
    }, [sel, edits, inserts, result])

    // Paste TSV into the selection — single value fills the selection, a block
    // is spread starting at the top-left cell of the selection.
    useEffect(() => {
        if (!editable || !sel) return
        const nReal = result.rows.length
        const totalRows = nReal + inserts.length
        const onPaste = (e: ClipboardEvent) => {
            const t = e.target as HTMLElement | null
            if (t && t.tagName !== 'BODY' && !wrapRef.current?.contains(t)) return
            const text = e.clipboardData?.getData('text/plain') ?? ''
            if (!text) return
            e.preventDefault()

            const grid = text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').map(l => l.split('\t'))
            const pr = grid.length
            const pc = grid[0]?.length ?? 0
            if (pr === 0 || pc === 0) return
            const fill = pr === 1 && pc === 1
            const maxCols = result.columns.length

            const writes: Array<{ ri: number; ci: number; v: string }> = []
            if (fill) {
                const v = grid[0][0]
                for (let r = sel.r0; r <= sel.r1; r++)
                    for (let c = sel.c0; c <= sel.c1; c++)
                        writes.push({ ri: r, ci: c, v })
            } else {
                for (let r = 0; r < pr; r++) {
                    const tr = sel.r0 + r
                    if (tr >= totalRows) break
                    for (let c = 0; c < pc; c++) {
                        const tc = sel.c0 + c
                        if (tc >= maxCols) break
                        writes.push({ ri: tr, ci: tc, v: grid[r][c] })
                    }
                }
            }

            const realWrites    = writes.filter(w => w.ri < nReal)
            const phantomWrites = writes.filter(w => w.ri >= nReal)
            if (realWrites.length) {
                setEdits(m => {
                    const n = new Map(m)
                    realWrites.forEach(w => n.set(`${w.ri}:${w.ci}`, w.v))
                    return n
                })
            }
            if (phantomWrites.length) {
                setInserts(arr => {
                    const next = arr.slice()
                    phantomWrites.forEach(w => {
                        const idx = w.ri - nReal
                        if (idx < 0 || idx >= next.length) return
                        const map = new Map(next[idx])
                        map.set(w.ci, w.v)
                        next[idx] = map
                    })
                    return next
                })
            }
            typingSelRef.current = null
        }
        document.addEventListener('paste', onPaste)
        return () => document.removeEventListener('paste', onPaste)
    }, [editable, sel, inserts, result])

    useEffect(() => {
        if (!expand) return
        const close = () => setExpand(null)
        document.addEventListener('scroll', close, true)
        window.addEventListener('resize', close)
        return () => {
            document.removeEventListener('scroll', close, true)
            window.removeEventListener('resize', close)
        }
    }, [expand])

    useEffect(() => {
        const stop = () => { draggingRef.current = false; resizingRef.current = null }
        const move = (e: MouseEvent) => {
            const r = resizingRef.current
            if (!r) return
            const newW = Math.max(40, r.startW + (e.clientX - r.startX))
            setWidths(ws => ws ? ws.map((w, i) => i === r.ci ? newW : w) : ws)
        }
        window.addEventListener('mouseup', stop)
        window.addEventListener('mousemove', move)
        return () => {
            window.removeEventListener('mouseup', stop)
            window.removeEventListener('mousemove', move)
        }
    }, [])

    useEffect(() => { setWidths(null) }, [result])

    if (result.affected !== undefined) {
        return (
            <div style={{ padding: 24, fontSize: 13, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                ✓ Query executed — <strong style={{ color: 'var(--text-1)' }}>{result.affected}</strong> rows affected.
            </div>
        )
    }
    const cols = result.columns
    const lastCol = cols.length - 1

    const startCell = (r: number, c: number) => {
        draggingRef.current = true
        wrapRef.current?.focus()
        setSel({ ar: r, ac: c, r0: r, c0: c, r1: r, c1: c })
    }
    const extendCell = (r: number, c: number) => {
        if (!draggingRef.current) return
        setSel(s => s && {
            ar: s.ar, ac: s.ac,
            r0: Math.min(s.ar, r), c0: Math.min(s.ac, c),
            r1: Math.max(s.ar, r), c1: Math.max(s.ac, c),
        })
    }
    const startRow = (r: number) => {
        draggingRef.current = true
        wrapRef.current?.focus()
        setSel({ ar: r, ac: 0, r0: r, c0: 0, r1: r, c1: lastCol })
    }
    const extendRow = (r: number) => {
        if (!draggingRef.current) return
        setSel(s => s && {
            ar: s.ar, ac: s.ac,
            r0: Math.min(s.ar, r), c0: 0,
            r1: Math.max(s.ar, r), c1: lastCol,
        })
    }

    const startResize = (ci: number, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const current = widths ?? cols.map((_, i) => thRefs.current[i]?.offsetWidth ?? 120)
        if (!widths) setWidths(current)
        resizingRef.current = { ci, startX: e.clientX, startW: current[ci] }
    }

    const selLabel = sel
        ? (sel.r0 === sel.r1 && sel.c0 === sel.c1
            ? `${excelCol(sel.c0)}${sel.r0 + 1}`
            : `${excelCol(sel.c0)}${sel.r0 + 1}:${excelCol(sel.c1)}${sel.r1 + 1}`)
        : ''
    const isRange = !!sel && (sel.r0 !== sel.r1 || sel.c0 !== sel.c1)

    const rowWhereCells = (ri: number) =>
        (result.rows[ri] as unknown[]).map((val, ci) => ({
            name: cols[ci].name,
            type: cols[ci].type,
            value: val === null || val === undefined ? null : String(val),
        }))

    const buildPendingPayload = (): { inserts: InsertRow[]; updates: UpdateRow[]; deletes: DeleteRow[] } => {
        const byRow = new Map<number, Array<{ ci: number; raw: string }>>()
        for (const [k, raw] of edits) {
            const [r, c] = k.split(':').map(Number)
            if (deletes.has(r)) continue
            const list = byRow.get(r) ?? []
            list.push({ ci: c, raw })
            byRow.set(r, list)
        }
        const updates: UpdateRow[] = [...byRow.keys()].sort((a, b) => a - b).map(ri => ({
            set: byRow.get(ri)!.map(({ ci, raw }) => ({
                name: cols[ci].name,
                type: cols[ci].type,
                raw,
            })),
            where: rowWhereCells(ri),
        }))
        const deleteRows: DeleteRow[] = [...deletes].sort((a, b) => a - b).map(ri => ({
            where: rowWhereCells(ri),
        }))
        const insertRows: InsertRow[] = inserts.map(map => ({
            values: [...map.entries()].sort(([a], [b]) => a - b).map(([ci, raw]) => ({
                name: cols[ci].name,
                type: cols[ci].type,
                raw,
            })),
        }))
        return { inserts: insertRows, updates, deletes: deleteRows }
    }

    const pendingCount = edits.size + deletes.size + inserts.length

    const addInsertRow = () => {
        const newIdx = result.rows.length + inserts.length
        setInserts(arr => [...arr, new Map()])
        setSel({ ar: newIdx, ac: 0, r0: newIdx, c0: 0, r1: newIdx, c1: 0 })
        wrapRef.current?.focus()
    }

    const openApplyModal = async () => {
        if (!projectId || !schema || !tableName) return
        setApplyError(null)
        setBuiltSQL(null)
        setModalOpen(true)
        try {
            const { sql } = await apiBuildChanges(projectId, {
                schema, table: tableName, ...buildPendingPayload(),
            })
            setBuiltSQL(sql)
        } catch (e: unknown) {
            setApplyError(e instanceof Error ? e.message : 'Failed to build SQL')
        }
    }

    const handleExecute = async () => {
        if (!projectId || !builtSQL) return
        setApplying(true)
        setApplyError(null)
        try {
            await apiRunQuery(projectId, builtSQL)
            setEdits(new Map())
            setDeletes(new Set())
            setInserts([])
            setModalOpen(false)
            onApplied?.()
        } catch (e: unknown) {
            setApplyError(e instanceof Error ? e.message : 'Apply failed')
        } finally {
            setApplying(false)
        }
    }

    return (
        <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, outline: 'none' }} tabIndex={-1}>
        <div className="dt-wrap">
            <table
                className="dt"
                style={{
                    userSelect: sel ? 'none' : undefined,
                    tableLayout: widths ? 'fixed' : undefined,
                }}
            >
                {widths && (
                    <colgroup>
                        <col style={{ width: 38 }} />
                        {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
                    </colgroup>
                )}
                <thead>
                    <tr>
                        <th className="row-num">#</th>
                        {cols.map((c, i) => (
                            <th
                                key={`${c.name}-${i}`}
                                ref={el => { thRefs.current[i] = el }}
                                style={{ position: 'sticky' }}
                            >
                                <span className="col-name">{c.name}</span>
                                <span style={{ color: 'var(--om-fg-muted)', fontWeight: 400, marginLeft: 6 }}>{excelCol(i)}</span>
                                <div
                                    onMouseDown={e => startResize(i, e)}
                                    onDoubleClick={e => { e.stopPropagation(); setWidths(null) }}
                                    title="Drag to resize · double-click to reset"
                                    style={{
                                        position: 'absolute', top: 0, right: 0, bottom: 0,
                                        width: 6, cursor: 'col-resize', userSelect: 'none', zIndex: 3,
                                    }}
                                />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {result.rows.length === 0 && inserts.length === 0 && (
                        <tr>
                            <td className="row-num" />
                            <td colSpan={cols.length} style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, padding: '24px 0' }}>
                                No rows returned.
                            </td>
                        </tr>
                    )}
                    {result.rows.map((row, ri) => {
                        const inRow = !!sel && ri >= sel.r0 && ri <= sel.r1
                        const isDeleted = deletes.has(ri)
                        return (
                            <tr key={`r${ri}`}>
                                <td
                                    className={`row-num${inRow ? ' sel' : ''}`}
                                    onMouseDown={e => { e.preventDefault(); startRow(ri) }}
                                    onMouseEnter={() => extendRow(ri)}
                                    style={isDeleted ? { color: 'var(--acc-red)', background: 'rgba(244,135,113,0.18)' } : undefined}
                                >{ri + 1}</td>
                                {(row as unknown[]).map((cell, ci) => {
                                    const inSel  = !!sel && ri >= sel.r0 && ri <= sel.r1 && ci >= sel.c0 && ci <= sel.c1
                                    const editKey = `${ri}:${ci}`
                                    const editVal = edits.get(editKey)
                                    const isEdited = editVal !== undefined
                                    const display: unknown = isEdited
                                        ? (editVal!.toLowerCase() === 'null' ? null : editVal)
                                        : cell
                                    const style: React.CSSProperties = {}
                                    if (isDeleted) {
                                        style.background = inSel
                                            ? 'rgba(244,135,113,0.36)'
                                            : 'rgba(244,135,113,0.18)'
                                    } else if (isEdited && inSel) {
                                        style.background = 'rgba(158,184,127,0.36)'
                                    } else if (isEdited || inSel) {
                                        style.background = 'rgba(158,184,127,0.18)'
                                    }
                                    return (
                                        <td
                                            key={ci}
                                            className={display === null ? 'null-cell' : ''}
                                            style={style}
                                            onMouseDown={e => { e.preventDefault(); startCell(ri, ci) }}
                                            onMouseEnter={() => extendCell(ri, ci)}
                                            onClick={e => {
                                                const el = e.currentTarget
                                                if (display === null || el.scrollWidth <= el.clientWidth + 1) {
                                                    setExpand(null)
                                                    return
                                                }
                                                const r = el.getBoundingClientRect()
                                                setExpand({ text: String(display), top: r.top, left: r.left, minWidth: r.width })
                                            }}
                                        >
                                            {display === null
                                                ? 'null'
                                                : typeof display === 'boolean'
                                                ? <span style={{ color: '#f97316' }}>{String(display)}</span>
                                                : typeof display === 'number'
                                                ? <span style={{ color: 'var(--color-info)' }}>{String(display)}</span>
                                                : String(display)
                                            }
                                        </td>
                                    )
                                })}
                            </tr>
                        )
                    })}
                    {inserts.map((entry, ii) => {
                        const ri = result.rows.length + ii
                        const inRow = !!sel && ri >= sel.r0 && ri <= sel.r1
                        return (
                            <tr key={`+${ii}`}>
                                <td
                                    className={`row-num${inRow ? ' sel' : ''}`}
                                    onMouseDown={e => { e.preventDefault(); startRow(ri) }}
                                    onMouseEnter={() => extendRow(ri)}
                                    style={{ color: 'var(--om-green)', background: 'rgba(158,184,127,0.10)' }}
                                    title="New row (pending insert)"
                                >+{ii + 1}</td>
                                {cols.map((_, ci) => {
                                    const inSel = !!sel && ri >= sel.r0 && ri <= sel.r1 && ci >= sel.c0 && ci <= sel.c1
                                    const v = entry.get(ci)
                                    const isSet = v !== undefined
                                    const display: unknown = isSet
                                        ? (v!.toLowerCase() === 'null' ? null : v)
                                        : null
                                    const style: React.CSSProperties = {
                                        background: inSel ? 'rgba(158,184,127,0.36)' : 'rgba(158,184,127,0.10)',
                                    }
                                    return (
                                        <td
                                            key={ci}
                                            className={!isSet ? 'null-cell' : (display === null ? 'null-cell' : '')}
                                            style={style}
                                            onMouseDown={e => { e.preventDefault(); startCell(ri, ci) }}
                                            onMouseEnter={() => extendCell(ri, ci)}
                                        >
                                            {!isSet
                                                ? <span style={{ opacity: 0.5 }}>default</span>
                                                : display === null
                                                ? 'null'
                                                : typeof display === 'number'
                                                ? <span style={{ color: 'var(--color-info)' }}>{String(display)}</span>
                                                : String(display)
                                            }
                                        </td>
                                    )
                                })}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
        <div style={{
            height: 32, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 20,
            padding: '0 16px',
            borderTop: '1px solid var(--om-border)',
            background: 'var(--om-bg-2)',
            fontFamily: 'var(--font-mono)', fontSize: 11,
        }}>
            <span style={{ color: 'var(--om-fg-muted)' }}>
                <span style={{ opacity: 0.7 }}>rows </span>
                <span style={{ color: 'var(--om-fg)' }}>{result.total ?? result.rows.length}</span>
            </span>
            {result.duration_ms !== undefined && (
                <span style={{ color: 'var(--om-fg-muted)' }}>
                    <span style={{ opacity: 0.7 }}>time </span>
                    <span style={{ color: 'var(--om-green)' }}>{(result.duration_ms / 1000).toFixed(2)}s</span>
                </span>
            )}
            <span style={{ color: sel ? 'var(--om-green)' : 'var(--om-fg-muted)' }}>
                {selLabel || '—'}
            </span>
            {isRange && sel && (
                <span style={{ color: 'var(--om-fg-muted)' }}>
                    {sel.r1 - sel.r0 + 1}R × {sel.c1 - sel.c0 + 1}C
                </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
                {pendingCount > 0 && (
                    <span style={{ color: 'var(--om-fg-muted)' }}>
                        {[
                            inserts.length > 0 && `${inserts.length} insert${inserts.length === 1 ? '' : 's'}`,
                            edits.size    > 0 && `${edits.size} edit${edits.size === 1 ? '' : 's'}`,
                            deletes.size  > 0 && `${deletes.size} delete${deletes.size === 1 ? '' : 's'}`,
                        ].filter(Boolean).join(' · ')}
                    </span>
                )}
                {editable && (
                    <button
                        className="pos-btn"
                        onClick={addInsertRow}
                        style={{
                            height: 22, padding: '0 10px',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            color: 'var(--om-green)',
                            cursor: 'pointer',
                        }}
                        title="Add a new empty row"
                    >
                        <Plus size={11} />
                        [add row]
                    </button>
                )}
                <button
                    className="pos-btn"
                    disabled={pendingCount === 0}
                    onClick={openApplyModal}
                    style={{
                        height: 22, padding: '0 10px',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        color: pendingCount > 0 ? 'var(--om-green)' : 'var(--om-fg-muted)',
                        opacity: pendingCount > 0 ? 1 : 0.5,
                        cursor: pendingCount > 0 ? 'pointer' : 'default',
                    }}
                    title={!editable ? 'Editing requires opening a table from the sidebar' : 'Preview and apply pending changes'}
                >
                    <ArrowUp size={11} />
                    [apply]
                </button>
            </div>
        </div>
        {expand && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: expand.top,
                        left: expand.left,
                        minWidth: expand.minWidth,
                        maxWidth: 600,
                        maxHeight: 240,
                        overflow: 'auto',
                        padding: '4px 12px',
                        background: 'var(--om-bg-2)',
                        border: '1px solid var(--om-green)',
                        color: 'var(--om-fg-bright)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                        zIndex: 100,
                        pointerEvents: 'none',
                    }}
                >{expand.text}</div>,
                document.body,
            )}
            <Modal
                open={modalOpen}
                onClose={() => !applying && setModalOpen(false)}
                title="Apply pending edits"
                width="80vw"
                height="80vh"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--om-fg-muted)' }}>
                        Review the SQL below. Each statement updates only the edited columns and
                        matches the row by its primary key.
                    </div>
                    {builtSQL === null && !applyError ? (
                        <div style={{
                            flex: 1,
                            minHeight: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--om-bg)',
                            border: '1px solid var(--om-border)',
                        }}>
                            <Spinner label="Building SQL…" />
                        </div>
                    ) : (
                        <div style={{ flex: 1, minHeight: 0, border: '1px solid var(--om-border)', overflow: 'hidden' }}>
                            <CodeMirror
                                value={builtSQL ?? ''}
                                theme={editorTheme}
                                extensions={[sqlLang({ dialect: PostgreSQL }), EditorView.editable.of(false)]}
                                height="100%"
                                basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLineGutter: false }}
                                style={{ fontSize: 13, height: '100%' }}
                            />
                        </div>
                    )}
                    {applyError && (
                        <div style={{
                            padding: '8px 12px',
                            background: 'rgba(244,135,113,0.10)',
                            border: '1px solid rgba(244,135,113,0.4)',
                            color: 'var(--acc-red)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                        }}>{applyError}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button variant={3} size="sm" onClick={() => setModalOpen(false)} disabled={applying}>cancel</Button>
                        <Button variant={1} size="sm" onClick={handleExecute} loading={applying} disabled={!builtSQL}>execute</Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
