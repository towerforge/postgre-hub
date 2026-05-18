import { useState, useEffect, useCallback, useRef } from 'react'
import {
    Play, Terminal, Maximize2, Minimize2,
    X, Plus,
} from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { sql as sqlLang, PostgreSQL } from '@codemirror/lang-sql'
import { keymap } from '@codemirror/view'
import { editorTheme } from './editor-theme'
import { useSetStatusBar } from '@/contexts/status-bar'
import { useSetHistoryBar } from '@/contexts/history-bar'
import { Spinner, useSpinner } from '@/components/ui'
import { apiRunQuery, type Project, type TableInfo, type QueryResult } from '@/services/database'
import { QueryInspector } from './query-inspector'
import { QueryResultView } from './query-result-view'
import { newTabId, parseTablesFromSQL, type InspectorData, type NewTabReq, type QueryTab } from './utils'

const EDITOR_HEIGHT_DEFAULT  = 120
const EDITOR_HEIGHT_EXPANDED = 300

export function SqlEditor({
    projectId,
    project,
    newTabReq,
    tables,
    showInspector = true,
}: {
    projectId: string
    project: Project | null
    newTabReq?: NewTabReq | null
    tables: TableInfo[]
    showInspector?: boolean
}) {
    const [tabs, setTabs] = useState<QueryTab[]>(() => {
        const id = newTabId()
        return [{ id, label: 'Query 1', sql: '' }]
    })
    const [activeTabId, setActiveTabId]     = useState(() => tabs[0].id)
    const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
    const [tabResults, setTabResults]       = useState<Record<string, QueryResult | null>>({})
    const [tabErrors,  setTabErrors]        = useState<Record<string, string>>({})
    const [tabInspectors, setTabInspectors] = useState<Record<string, InspectorData | null>>({})
    const [loading,    setLoading]          = useState(false)
    const [expanded,   setExpanded]         = useState(false)
    const runSpinner = useSpinner(loading)
    const [history, setHistory] = useState<string[]>([])


    useEffect(() => {
        if (!newTabReq) return
        const id = newTabId()
        setTabs(ts => [...ts, { id, label: newTabReq.label, sql: newTabReq.sql, schema: newTabReq.schema, tableName: newTabReq.tableName }])
        setActiveTabId(id)
        if (newTabReq.autoRun) {
            setTimeout(() => runQueryRef.current?.(newTabReq.sql, id), 0)
        }
    }, [newTabReq?.key])  // eslint-disable-line react-hooks/exhaustive-deps

    const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0]
    const activeSql = activeTab?.sql ?? ''

    const setSql = useCallback((sql: string) => {
        setTabs(ts => ts.map(t => t.id === activeTabId ? { ...t, sql } : t))
    }, [activeTabId])

    const addTab = () => {
        const id = newTabId()
        const label = `Query ${tabs.length + 1}`
        setTabs(ts => [...ts, { id, label, sql: '' }])
        setActiveTabId(id)
    }

    const closeTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setTabs(ts => {
            const next = ts.filter(t => t.id !== id)
            if (next.length === 0) {
                const newId = newTabId()
                setActiveTabId(newId)
                return [{ id: newId, label: 'Query 1', sql: '' }]
            }
            if (id === activeTabId) {
                const idx = ts.findIndex(t => t.id === id)
                setActiveTabId(next[Math.max(0, idx - 1)].id)
            }
            return next
        })
    }

    const loadingRef = useRef(false)

    const runQueryRef = useRef<((sql?: string, tabId?: string) => Promise<void>) | undefined>(undefined)

    const runQuery = useCallback(async (overrideSql?: string, overrideTabId?: string) => {
        const q = (overrideSql ?? activeSql).trim()
        const tid = overrideTabId ?? activeTabId
        if (!q || loadingRef.current) return
        loadingRef.current = true
        setLoading(true)
        setTabErrors(er => ({ ...er, [tid]: '' }))
        const start = Date.now()
        try {
            const r = await apiRunQuery(projectId, q)
            setTabResults(rs => ({ ...rs, [tid]: r }))
            const duration = r.duration_ms ?? (Date.now() - start)
            setTabInspectors(ins => ({ ...ins, [tid]: {
                database: project?.database ?? '',
                duration,
                rows: r.affected !== undefined ? r.affected : r.rows.length,
                total: r.total,
                tables: parseTablesFromSQL(q),
                columns: r.columns,
            } }))
            setHistory(h => [...h.slice(-19), q])
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Query failed'
            setTabErrors(er => ({ ...er, [tid]: msg }))
            setTabResults(rs => ({ ...rs, [tid]: null }))
            setTabInspectors(ins => ({ ...ins, [tid]: null }))
        } finally {
            loadingRef.current = false
            setLoading(false)
        }
    }, [activeSql, activeTabId, projectId])

    runQueryRef.current = runQuery

    const extensions = [
        sqlLang({ dialect: PostgreSQL }),
        keymap.of([
            { key: 'Ctrl-Enter', run: () => { void runQueryRef.current?.(); return true } },
            { key: 'Mod-Enter',  run: () => { void runQueryRef.current?.(); return true } },
        ]),
    ]

    const editorH     = expanded ? EDITOR_HEIGHT_EXPANDED : EDITOR_HEIGHT_DEFAULT
    const activeResult    = tabResults[activeTabId]    ?? null
    const activeError     = tabErrors[activeTabId]     ?? ''
    const activeInspector = tabInspectors[activeTabId] ?? null

    useSetHistoryBar(
        <div className="body">
            {history.length === 0 ? (
                <div className="empty">No queries yet.</div>
            ) : history.slice().reverse().map((q, i) => {
                const isActive = q === activeSql
                return (
                    <div
                        key={i}
                        className={`item${isActive ? ' active' : ''}`}
                        title="Click to load into editor"
                        onClick={() => setSql(q)}
                    >
                        <CodeMirror
                            value={q}
                            theme={editorTheme}
                            extensions={[sqlLang({ dialect: PostgreSQL })]}
                            editable={false}
                            basicSetup={{
                                lineNumbers: true,
                                foldGutter: false,
                                highlightActiveLineGutter: false,
                                highlightActiveLine: false,
                                searchKeymap: false,
                                defaultKeymap: false,
                            }}
                            style={{ fontSize: 12 }}
                        />
                    </div>
                )
            })}
        </div>,
        [history, activeSql],
    )

    useSetStatusBar(
        <>
            {tabs.length > 0 && (
                <span className="statusbar-section">
                    <span className="k">tabs</span>
                    <span className="v">{tabs.findIndex(t => t.id === activeTabId) + 1}/{tabs.length}</span>
                </span>
            )}
            {activeError && (
                <span className="statusbar-section"><span className="v red">● error</span></span>
            )}
            {!activeError && activeResult && (
                <span className="statusbar-section">
                    <span className="k">rows</span>
                    <span className="v">{activeResult.affected ?? activeResult.rows.length}</span>
                </span>
            )}
            {loading && (
                <span className="statusbar-section"><span className="v yellow">⟳ running…</span></span>
            )}
            {!activeError && activeResult && activeResult.duration_ms !== undefined && (
                <span className="statusbar-section">
                    <span className="k">time</span>
                    <span className="v green">{(activeResult.duration_ms / 1000).toFixed(2)}s</span>
                </span>
            )}
        </>,
        [tabs, activeTabId, activeResult, activeError, loading],
    )

    const tabsBar = (
        <div className="vsc-tabs">
            {tabs.map(tab => {
                const isActive = tab.id === activeTabId
                const isRenaming = renamingTabId === tab.id
                const isDirty = !!tab.sql && !tab.tableName
                return (
                    <div
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        onAuxClick={e => { if (e.button === 1) closeTab(tab.id, e as unknown as React.MouseEvent) }}
                        className={`vsc-tab${isActive ? ' active' : ''}`}
                    >
                        <span className="ico" style={{ width: 10, display: 'inline-flex', justifyContent: 'center', color: 'var(--om-green)' }}>
                            {isActive ? '●' : ''}
                        </span>
                        {isRenaming ? (
                            <input
                                autoFocus
                                defaultValue={tab.label}
                                onBlur={e => {
                                    const v = e.target.value.trim()
                                    if (v) setTabs(ts => ts.map(t => t.id === tab.id ? { ...t, label: v } : t))
                                    setRenamingTabId(null)
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                    if (e.key === 'Escape') setRenamingTabId(null)
                                }}
                                onClick={e => e.stopPropagation()}
                                style={{ width: 100, fontSize: 13, background: 'var(--vsc-bg-input)', border: '1px solid var(--acc-blue)', borderRadius: 2, padding: '1px 4px', color: 'var(--vsc-fg-strong)', outline: 'none', fontFamily: 'var(--font-family)' }}
                            />
                        ) : (
                            <span onDoubleClick={e => { e.stopPropagation(); setActiveTabId(tab.id); setRenamingTabId(tab.id) }}>
                                {tab.label.replace(/\.sql$/i, '')}
                            </span>
                        )}
                        {!isRenaming && (
                            isDirty ? (
                                <span className="dirty" />
                            ) : (
                                <span className="x" onClick={e => closeTab(tab.id, e)}>
                                    <X size={12} />
                                </span>
                            )
                        )}
                    </div>
                )
            })}
            <button
                onClick={addTab}
                title="New tab"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 35, height: 32, border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--vsc-fg-muted)', flexShrink: 0 }}
            >
                <Plus size={14} />
            </button>
            <div style={{ flex: 1 }} />
            <button
                onClick={() => setExpanded(e => !e)}
                title={expanded ? 'Collapse editor' : 'Expand editor'}
                className="pos-btn"
                style={{ height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px' }}
            >
                {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
                onClick={() => runQuery()}
                disabled={loading}
                title="Run (⌘⏎)"
                className="pos-btn"
                style={{ height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 14px', color: 'var(--om-green)' }}
            >
                {loading
                    ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1 }}>{runSpinner}</span>
                    : <Play size={11} fill="currentColor" />}
                [run]
            </button>
        </div>
    )

    return (
        <div style={{ display: 'flex', height: '100%', minWidth: 0, gap: 8 }}>

        {/* ── Left column: tab bar + breadcrumbs + editor/results ── */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: 8 }}>

            {/* ── Editor tile ────────────────────────────── */}
            <div className="tile" style={{ flexShrink: 0 }}>
                {tabsBar}
                <div style={{ height: editorH, overflow: 'hidden' }}>
                    <CodeMirror
                        key={activeTabId}
                        value={activeSql}
                        onChange={setSql}
                        theme={editorTheme}
                        extensions={extensions}
                        height={`${editorH}px`}
                        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLineGutter: false }}
                        style={{ fontSize: 13, height: '100%' }}
                    />
                </div>

            </div>

            {/* ── Results tile ───────────────────────────── */}
            <div className="tile" style={{ flex: 1, minHeight: 0 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--vsc-bg-panel)' }}>
                    {loading ? (
                        <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
                    ) : activeError ? (
                        <div style={{ padding: '12px 16px', margin: 12, background: 'rgba(244,135,113,0.10)', border: '1px solid rgba(244,135,113,0.4)', color: 'var(--acc-red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                            {activeError}
                        </div>
                    ) : activeResult ? (
                        <QueryResultView result={activeResult} />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--vsc-fg-muted)', fontSize: 13, padding: 32 }}>
                            <Terminal size={32} style={{ opacity: 0.3 }} />
                            <span>Write a query and press Run</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {showInspector && (
            <QueryInspector data={activeInspector} project={project} tables={tables} />
        )}

        </div>
    )
}
