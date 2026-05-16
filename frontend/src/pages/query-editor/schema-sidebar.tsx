import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { RefreshCw, Download, Upload } from 'lucide-react'
import { Spinner } from '@/components/ui'
import {
    apiExportDump, apiImportDump,
    type Project, type TableInfo, type TypeInfo, type SequenceInfo, type RoutineInfo,
} from '@/services/database'
import { fmtRows, fmtSize, groupBy } from './utils'

type SidebarTab = 'tables' | 'types' | 'sequences' | 'routines'

const SIDEBAR_TABS: { id: SidebarTab; label: string }[] = [
    { id: 'tables',    label: 'tables'    },
    { id: 'types',     label: 'types'     },
    { id: 'sequences', label: 'sequences' },
    { id: 'routines',  label: 'routines'  },
]

interface SchemaSidebarProps {
    projectId: string
    project: Project | null
    tables: TableInfo[]
    types: TypeInfo[]
    sequences: SequenceInfo[]
    routines: RoutineInfo[]
    loading: boolean
    onOpenTable: (t: TableInfo) => void
    onOpenType: (t: TypeInfo) => void
    onOpenSequence: (s: SequenceInfo) => void
    onOpenRoutine: (r: RoutineInfo) => void
}

export function SchemaSidebar({
    projectId, project, tables, types, sequences, routines, loading,
    onOpenTable, onOpenType, onOpenSequence, onOpenRoutine,
}: SchemaSidebarProps) {
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>('tables')
    const [search, setSearch] = useState('')
    const [exporting, setExporting] = useState(false)
    const [importing, setImporting] = useState(false)
    const [dumpMsg, setDumpMsg] = useState<{ ok: boolean; text: string } | null>(null)
    const importRef = useRef<HTMLInputElement>(null)

    const handleExport = async () => {
        if (!projectId || exporting) return
        setExporting(true); setDumpMsg(null)
        try {
            const blob = await apiExportDump(projectId)
            const db   = project?.database ?? 'dump'
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
            const url  = URL.createObjectURL(blob)
            const a    = document.createElement('a')
            a.href = url; a.download = `${db}_${date}.sql`; a.click()
            URL.revokeObjectURL(url)
            setDumpMsg({ ok: true, text: 'Export descargado' })
        } catch (e) {
            setDumpMsg({ ok: false, text: e instanceof Error ? e.message : 'Export failed' })
        } finally { setExporting(false) }
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file || !projectId) return
        setImporting(true); setDumpMsg(null)
        try {
            const r = await apiImportDump(projectId, file)
            setDumpMsg({ ok: true, text: `Import OK — ${r.statements} sentencias ejecutadas` })
        } catch (e) {
            setDumpMsg({ ok: false, text: e instanceof Error ? e.message : 'Import failed' })
        } finally { setImporting(false) }
    }

    const q = search.toLowerCase()
    const filteredTables    = tables.filter(t    => t.name.toLowerCase().includes(q) || t.schema.toLowerCase().includes(q))
    const filteredTypes     = types.filter(t     => t.name.toLowerCase().includes(q) || t.schema.toLowerCase().includes(q))
    const filteredSequences = sequences.filter(s => s.name.toLowerCase().includes(q) || s.schema.toLowerCase().includes(q))
    const filteredRoutines  = routines.filter(r  => r.name.toLowerCase().includes(q) || r.schema.toLowerCase().includes(q))

    const groupedTables    = groupBy(filteredTables)
    const groupedTypes     = groupBy(filteredTypes)
    const groupedSequences = groupBy(filteredSequences)
    const groupedRoutines  = groupBy(filteredRoutines)

    const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(() => new Set())
    const [activeKey, setActiveKey] = useState<string | null>(null)

    useEffect(() => {
        const schemas = new Set([
            ...tables.map(t => t.schema),
            ...types.map(t => t.schema),
            ...sequences.map(s => s.schema),
            ...routines.map(r => r.schema),
        ])
        setExpandedSchemas(schemas)
    }, [tables.length, types.length, sequences.length, routines.length]) // eslint-disable-line react-hooks/exhaustive-deps

    const toggleSchema = (schema: string) =>
        setExpandedSchemas(prev => {
            const next = new Set(prev)
            next.has(schema) ? next.delete(schema) : next.add(schema)
            return next
        })

    const itemRow = (
        key: string,
        name: string,
        meta?: React.ReactNode,
        onClick?: () => void,
    ) => {
        const active = activeKey === key
        return (
            <button
                key={key}
                className={`row${active ? ' sel' : ''}`}
                onClick={() => setActiveKey(key)}
                onDoubleClick={() => { setActiveKey(key); onClick?.() }}
                style={{ paddingLeft: 28 }}
            >
                <span className="glyph">·</span>
                <span className="name">{name}</span>
                {meta != null && <span className="meta">{meta}</span>}
            </button>
        )
    }

    const schemaGroup = (schema: string, count: number, children: React.ReactNode) => {
        const expanded = expandedSchemas.has(schema)
        return (
            <div key={schema}>
                <button className="row" onClick={() => toggleSchema(schema)}>
                    <span className="glyph">{expanded ? '▾' : '▸'}</span>
                    <span className="name">{schema}</span>
                    <span className="meta">{count}</span>
                </button>
                {expanded && children}
            </div>
        )
    }

    const [slot, setSlot] = useState<HTMLElement | null>(null)
    useEffect(() => { setSlot(document.getElementById('left-sidebar-slot')) }, [])

    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!menuOpen) return
        const onDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [menuOpen])

    if (!slot) return null

    const currentTab = SIDEBAR_TABS.find(t => t.id === sidebarTab)!
    const currentTotal =
        sidebarTab === 'tables'    ? filteredTables.length    :
        sidebarTab === 'types'     ? filteredTypes.length     :
        sidebarTab === 'sequences' ? filteredSequences.length :
        filteredRoutines.length

    return createPortal(
        <aside className="tile" style={{ width: 280, flexShrink: 0 }}>
            <div className="tile-head">
                <span className="name">schema</span>
                <span style={{ marginLeft: 'auto', color: 'var(--om-fg-muted)', fontSize: 10.5 }}>{currentTotal}</span>
                <div ref={menuRef} style={{ position: 'relative' }}>
                    <button
                        className={`pos-btn${menuOpen ? ' open' : ''}`}
                        onClick={() => setMenuOpen(v => !v)}
                        style={{ marginLeft: 0 }}
                    >
                        [{currentTab.label}]
                    </button>
                    {menuOpen && (
                        <div className="pos-menu">
                            {SIDEBAR_TABS.map(({ id: tid, label }) => (
                                <button
                                    key={tid}
                                    className={sidebarTab === tid ? 'active' : ''}
                                    onClick={() => { setSidebarTab(tid); setSearch(''); setMenuOpen(false) }}
                                >
                                    [{label}]
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="tree" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {loading ? (
                    <div style={{ padding: 16, textAlign: 'center' }}><Spinner /></div>
                ) : sidebarTab === 'tables' ? (
                    Object.keys(groupedTables).length === 0 ? <Empty /> :
                    Object.entries(groupedTables).map(([schema, tbls]) =>
                        schemaGroup(schema, tbls.length, tbls.map((t: TableInfo) =>
                            itemRow(
                                `t:${t.schema}.${t.name}`,
                                t.name,
                                t.type === 'VIEW' ? 'view' : (fmtSize(t.size_bytes) || fmtRows(t.row_count) || undefined),
                                () => onOpenTable(t),
                            )
                        ))
                    )
                ) : sidebarTab === 'types' ? (
                    Object.keys(groupedTypes).length === 0 ? <Empty /> :
                    Object.entries(groupedTypes).map(([schema, typs]) =>
                        schemaGroup(schema, typs.length, typs.map((t: TypeInfo) =>
                            itemRow(
                                `y:${t.schema}.${t.name}`,
                                t.name,
                                t.kind,
                                () => onOpenType(t),
                            )
                        ))
                    )
                ) : sidebarTab === 'sequences' ? (
                    Object.keys(groupedSequences).length === 0 ? <Empty /> :
                    Object.entries(groupedSequences).map(([schema, seqs]) =>
                        schemaGroup(schema, seqs.length, seqs.map((s: SequenceInfo) =>
                            itemRow(
                                `s:${s.schema}.${s.name}`,
                                s.name,
                                undefined,
                                () => onOpenSequence(s),
                            )
                        ))
                    )
                ) : (
                    Object.keys(groupedRoutines).length === 0 ? <Empty /> :
                    Object.entries(groupedRoutines).map(([schema, ruts]) =>
                        schemaGroup(schema, ruts.length, ruts.map((r: RoutineInfo) =>
                            itemRow(
                                `r:${r.schema}.${r.name}`,
                                r.name,
                                r.kind,
                                () => onOpenRoutine(r),
                            )
                        ))
                    )
                )}
            </div>

            <div style={{ flexShrink: 0, borderTop: '0.5px solid var(--stroke-1)' }}>

                <div style={{ padding: '8px 8px', display: 'flex', gap: 5 }}>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        style={{
                            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            gap: 5, height: 26, border: '0.5px solid var(--stroke-1)', borderRadius: 7,
                            background: 'transparent', cursor: exporting ? 'not-allowed' : 'pointer',
                            fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-family)',
                            opacity: exporting ? 0.5 : 1, transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (!exporting) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                        {exporting
                            ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Download size={11} />}
                        Export
                    </button>
                    <button
                        onClick={() => importRef.current?.click()}
                        disabled={importing}
                        style={{
                            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            gap: 5, height: 26, border: '0.5px solid var(--stroke-1)', borderRadius: 7,
                            background: 'transparent', cursor: importing ? 'not-allowed' : 'pointer',
                            fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-family)',
                            opacity: importing ? 0.5 : 1, transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (!importing) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                        {importing
                            ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Upload size={11} />}
                        Import
                    </button>
                    <input ref={importRef} type="file" accept=".sql" style={{ display: 'none' }} onChange={handleImport} />
                </div>

                {dumpMsg && (
                    <div style={{
                        margin: '0 8px 8px', padding: '5px 8px', borderRadius: 6, fontSize: 11,
                        background: dumpMsg.ok ? 'color-mix(in srgb, var(--color-success) 10%, transparent)' : 'color-mix(in srgb, var(--danger) 10%, transparent)',
                        color: dumpMsg.ok ? 'var(--color-success)' : 'var(--danger)',
                        border: `0.5px solid ${dumpMsg.ok ? 'color-mix(in srgb, var(--color-success) 25%, transparent)' : 'color-mix(in srgb, var(--danger) 25%, transparent)'}`,
                    }}>
                        {dumpMsg.text}
                    </div>
                )}
            </div>
        </aside>,
        slot,
    )
}

function Empty() {
    return <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>No items</div>
}
