import { useState } from 'react'
import type { QueryResult } from '@/services/database'

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
    const [selected, setSelected] = useState<number | null>(null)
    if (result.affected !== undefined) {
        return (
            <div style={{ padding: 24, fontSize: 13, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                ✓ Query executed — <strong style={{ color: 'var(--text-1)' }}>{result.affected}</strong> rows affected.
            </div>
        )
    }
    const cols = result.columns
    return (
        <div className="dt-wrap">
            <table className="dt">
                <thead>
                    <tr>
                        <th className="row-num">#</th>
                        {cols.map((c, i) => (
                            <th key={`${c.name}-${i}`}>
                                <span className="col-name">{c.name}</span>
                                {c.type && <span className="col-type">{c.type.toUpperCase()}</span>}
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
                        const isSel = selected === ri
                        return (
                            <tr key={ri}
                                className={isSel ? 'sel' : ''}
                                onClick={() => setSelected(ri)}
                            >
                                <td className="row-num">{ri + 1}</td>
                                {(row as unknown[]).map((cell, ci) => (
                                    <td key={ci} className={cell === null ? 'null-cell' : ''}>
                                        {cell === null
                                            ? 'null'
                                            : typeof cell === 'boolean'
                                            ? <span style={{ color: '#f97316' }}>{String(cell)}</span>
                                            : typeof cell === 'number'
                                            ? <span style={{ color: 'var(--color-info)' }}>{String(cell)}</span>
                                            : String(cell)
                                        }
                                    </td>
                                ))}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
