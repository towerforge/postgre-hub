import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronRight, Table2, Eye, Shapes, ListOrdered, SquareFunction, Download, Upload } from 'lucide-react'
import { Spinner, Splitter, ToolButton } from '@/components/ui'
import { useResizable } from '@/hooks/use-resizable'
import {
    type TableInfo, type TypeInfo, type SequenceInfo, type RoutineInfo,
} from '@/services/database'
import { fmtRows, fmtSize, groupBy } from './utils'

type SidebarTab = 'tables' | 'types' | 'sequences' | 'routines'

// Color del icono de cada tipo de objeto en el árbol
const ROW_ICON_COLOR: Record<SidebarTab, string> = {
    tables:    'var(--om-accent)',
    types:     'var(--om-magenta)',
    sequences: 'var(--om-cyan)',
    routines:  'var(--om-orange)',
}

function rowIcon(tab: SidebarTab, meta?: React.ReactNode) {
    if (tab === 'tables')    return meta === 'view' ? <Eye size={13} /> : <Table2 size={13} />
    if (tab === 'types')     return <Shapes size={13} />
    if (tab === 'sequences') return <ListOrdered size={13} />
    return <SquareFunction size={13} />
}

const SIDEBAR_TABS: { id: SidebarTab; label: string }[] = [
    { id: 'tables',    label: 'tables'    },
    { id: 'types',     label: 'types'     },
    { id: 'sequences', label: 'sequences' },
    { id: 'routines',  label: 'routines'  },
]

interface SchemaSidebarProps {
    tables: TableInfo[]
    types: TypeInfo[]
    sequences: SequenceInfo[]
    routines: RoutineInfo[]
    loading: boolean
    onOpenTable: (t: TableInfo) => void
    onOpenType: (t: TypeInfo) => void
    onOpenSequence: (s: SequenceInfo) => void
    onOpenRoutine: (r: RoutineInfo) => void
    onExport: () => void
    onImport: () => void
}

export function SchemaSidebar({
    tables, types, sequences, routines, loading,
    onOpenTable, onOpenType, onOpenSequence, onOpenRoutine, onExport, onImport,
}: SchemaSidebarProps) {
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>('tables')
    const panel = useResizable({ key: 'schema', initial: 280, min: 200, max: 600, axis: 'x' })
    const [search, setSearch] = useState('')
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
                <span className="glyph" style={{ color: ROW_ICON_COLOR[sidebarTab] }}>{rowIcon(sidebarTab, meta)}</span>
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
                    <span className="glyph">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
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
        <>
        <aside className="tile" style={{ width: panel.size, flexShrink: 0 }}>
            <div className="tile-head">
                <span className="name">Database</span>
                <span className="badge">{currentTotal}</span>
                <span style={{ marginLeft: 'auto' }} />
                <div ref={menuRef} style={{ position: 'relative' }}>
                    <ToolButton active={menuOpen} onClick={() => setMenuOpen(v => !v)}>
                        {currentTab.label}
                        <ChevronDown size={13} />
                    </ToolButton>
                    {menuOpen && (
                        <div className="pos-menu">
                            {SIDEBAR_TABS.map(({ id: tid, label }) => (
                                <button
                                    key={tid}
                                    className={sidebarTab === tid ? 'active' : ''}
                                    onClick={() => { setSidebarTab(tid); setSearch(''); setMenuOpen(false) }}
                                >
                                    {label}
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
            <div style={{ flexShrink: 0, display: 'flex', gap: 4, padding: 8, borderTop: '1px solid var(--om-border)' }}>
                <ToolButton onClick={onExport} title="Export schemas as SQL" style={{ flex: 1 }}>
                    <Download size={13} /> Export
                </ToolButton>
                <ToolButton onClick={onImport} title="Import a .sql file" style={{ flex: 1 }}>
                    <Upload size={13} /> Import
                </ToolButton>
            </div>
        </aside>
        <Splitter orientation="vertical" dragging={panel.dragging} handleProps={panel.handleProps} style={{ marginRight: -10 }} />
        </>,
        slot,
    )
}

function Empty() {
    return <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>No items</div>
}
