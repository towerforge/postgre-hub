import { useEffect, useRef, useState } from 'react'
import type { QueryResult } from '@/services/database'

type Sel = { ar: number; ac: number; r0: number; c0: number; r1: number; c1: number }

function selBorder(top: boolean, right: boolean, bottom: boolean, left: boolean): string | undefined {
    const parts: string[] = []
    if (top)    parts.push('inset 0 1px 0 0 var(--om-green)')
    if (right)  parts.push('inset -1px 0 0 0 var(--om-green)')
    if (bottom) parts.push('inset 0 -1px 0 0 var(--om-green)')
    if (left)   parts.push('inset 1px 0 0 0 var(--om-green)')
    return parts.length ? parts.join(', ') : undefined
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

    useEffect(() => {
        const stop = () => { draggingRef.current = false }
        window.addEventListener('mouseup', stop)
        return () => window.removeEventListener('mouseup', stop)
    }, [])

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

    return (
        <div className="dt-wrap">
            <table className="dt" style={{ userSelect: sel ? 'none' : undefined }}>
                <thead>
                    <tr>
                        <th className="row-num">#</th>
                        {cols.map((c, i) => (
                            <th key={`${c.name}-${i}`}>
                                <span className="col-name">{c.name}</span>
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
                                    const anchor = !!sel && sel.ar === ri && sel.ac === ci
                                    const style: React.CSSProperties = {}
                                    if (inSel && sel) {
                                        style.boxShadow = selBorder(ri === sel.r0, ci === sel.c1, ri === sel.r1, ci === sel.c0)
                                        if (!anchor) style.background = 'rgba(158,184,127,0.12)'
                                    }
                                    return (
                                        <td
                                            key={ci}
                                            className={cell === null ? 'null-cell' : ''}
                                            style={style}
                                            onMouseDown={e => { e.preventDefault(); startCell(ri, ci) }}
                                            onMouseEnter={() => extendCell(ri, ci)}
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
    )
}
