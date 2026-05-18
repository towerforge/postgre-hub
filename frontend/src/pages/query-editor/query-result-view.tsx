import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { QueryResult } from '@/services/database'

type Sel = { ar: number; ac: number; r0: number; c0: number; r1: number; c1: number }

function excelCol(n: number): string {
    let s = ''
    let k = n + 1
    while (k > 0) {
        k--
        s = String.fromCharCode(65 + (k % 26)) + s
        k = Math.floor(k / 26)
    }
    return s
}

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

export function QueryResultView({ result }: { result: QueryResult }) {
    const [sel, setSel] = useState<Sel | null>(null)
    const draggingRef = useRef(false)
    const [widths, setWidths] = useState<number[] | null>(null)
    const thRefs = useRef<(HTMLTableCellElement | null)[]>([])
    const resizingRef = useRef<{ ci: number; startX: number; startW: number } | null>(null)
    const [expand, setExpand] = useState<{ text: string; top: number; left: number; minWidth: number } | null>(null)

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
                    {result.rows.length === 0 ? (
                        <tr>
                            <td className="row-num" />
                            <td colSpan={cols.length} style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, padding: '24px 0' }}>
                                No rows returned.
                            </td>
                        </tr>
                    ) : result.rows.map((row, ri) => {
                        const inRow = !!sel && ri >= sel.r0 && ri <= sel.r1
                        return (
                            <tr key={ri}>
                                <td
                                    className={`row-num${inRow ? ' sel' : ''}`}
                                    onMouseDown={e => { e.preventDefault(); startRow(ri) }}
                                    onMouseEnter={() => extendRow(ri)}
                                >{ri + 1}</td>
                                {(row as unknown[]).map((cell, ci) => {
                                    const inSel  = !!sel && ri >= sel.r0 && ri <= sel.r1 && ci >= sel.c0 && ci <= sel.c1
                                    const style: React.CSSProperties = {}
                                    if (inSel) style.background = 'rgba(158,184,127,0.18)'
                                    return (
                                        <td
                                            key={ci}
                                            className={cell === null ? 'null-cell' : ''}
                                            style={style}
                                            onMouseDown={e => { e.preventDefault(); startCell(ri, ci) }}
                                            onMouseEnter={() => extendCell(ri, ci)}
                                            onClick={e => {
                                                const el = e.currentTarget
                                                if (cell === null || el.scrollWidth <= el.clientWidth + 1) {
                                                    setExpand(null)
                                                    return
                                                }
                                                const r = el.getBoundingClientRect()
                                                setExpand({ text: String(cell), top: r.top, left: r.left, minWidth: r.width })
                                            }}
                                        >
                                            {cell === null
                                                ? 'null'
                                                : typeof cell === 'boolean'
                                                ? <span style={{ color: '#f97316' }}>{String(cell)}</span>
                                                : typeof cell === 'number'
                                                ? <span style={{ color: 'var(--color-info)' }}>{String(cell)}</span>
                                                : String(cell)
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
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '0 12px',
            borderTop: '1px solid var(--om-border)',
            background: 'var(--om-bg-2)',
            fontFamily: 'var(--font-mono)', fontSize: 11,
        }}>
            <span style={{ color: sel ? 'var(--om-green)' : 'var(--om-fg-muted)' }}>
                {selLabel || '—'}
            </span>
            {isRange && sel && (
                <span style={{ color: 'var(--om-fg-muted)' }}>
                    {sel.r1 - sel.r0 + 1}R × {sel.c1 - sel.c0 + 1}C
                </span>
            )}
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
        </div>
    )
}
