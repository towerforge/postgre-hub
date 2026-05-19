import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { Button, Select, Spinner, SearchBar, ColorPicker, Modal, useSpinner } from '@/components/ui'
import { usePageTitle } from '@/contexts/page-title'
import { ProjectsShell, avatarColor, initialsOf } from '@/components/projects-shell'
import {
    apiListProjects, apiCreateProject, apiUpdateProject,
    apiDeleteProject, apiTestConnection,
    type Project, type ProjectInput,
} from '@/services/database'
import { apiListTunnels, type SshTunnel } from '@/services/tunnels'

// ── helpers ───────────────────────────────────────────────────────────────────

const SSL_OPTIONS = [
    { value: 'disable', label: 'Disable' },
    { value: 'prefer',  label: 'Prefer' },
    { value: 'require', label: 'Require' },
]

// ── form field ────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0 12px', alignItems: 'center', minHeight: 34 }}>
            <span style={{ fontSize: 12, color: 'var(--om-fg-dim)', fontFamily: 'var(--font-family)', fontWeight: 500 }}>{label}</span>
            {children}
        </div>
    )
}

const inputStyle: React.CSSProperties = { width: '100%' }
const inputClass = 'om-input'
// ── modal ─────────────────────────────────────────────────────────────────────

type ModalTab = 'general' | 'ssh'

function ConnectionModal({
    project,
    onClose,
    onSaved,
    onDelete,
}: {
    project?: Project
    onClose: () => void
    onSaved: () => void
    onDelete?: () => void
}) {
    const isEdit = !!project

    const [tab,     setTab]     = useState<ModalTab>('general')
    const [tunnels, setTunnels] = useState<SshTunnel[]>([])

    const [form, setForm] = useState<ProjectInput>({
        name:            project?.name           ?? '',
        host:            project?.host           ?? 'localhost',
        port:            project?.port           ?? 5432,
        database:        project?.database       ?? '',
        username:        project?.username       ?? 'postgres',
        password:        '',
        ssl_mode:        project?.ssl_mode       ?? 'prefer',
        ssl_ca:          '',
        ssl_client_cert: '',
        ssl_client_key:  '',
        ssh_enabled:     false,
        ssh_host:        '',
        ssh_port:        22,
        ssh_user:        '',
        ssh_password:    '',
        ssh_private_key: '',
        ssh_tunnel_id:   project?.ssh_tunnel_id  ?? null,
        color:           project?.color          ?? '',
    })

    useEffect(() => {
        apiListTunnels().then(r => setTunnels(r.tunnels)).catch(() => {})
    }, [])

    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState('')
    const [confirmDelete, setConfirmDelete] = useState(false)

    const str = (k: keyof ProjectInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }))

    const connUrl = `postgres://${form.username || 'user'}${form.password ? ':•••' : ''}@${form.host || 'host'}:${form.port || 5432}/${form.database || 'db'}${form.ssl_mode === 'require' ? '?sslmode=require' : ''}`

    const handleSave = async () => {
        if (!form.name.trim() || !form.host.trim() || !form.database.trim() || !form.username.trim()) {
            setError('Name, host, database and username are required.')
            return
        }
        setLoading(true); setError('')
        try {
            isEdit ? await apiUpdateProject(project!.id, form) : await apiCreateProject(form)
            onSaved()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to save.')
        } finally { setLoading(false) }
    }

    const tabBtn = (id: ModalTab, label: string) => {
        const active = tab === id
        return (
            <button
                onClick={() => { setTab(id); setError('') }}
                style={{
                    height: 36, padding: '0 14px', border: 'none', cursor: 'pointer',
                    fontSize: 12.5, fontFamily: 'var(--font-family)', fontWeight: active ? 600 : 400,
                    background: 'transparent',
                    color: active ? 'var(--om-fg-bright)' : 'var(--om-fg-muted)',
                    borderBottom: active ? '2px solid var(--om-green)' : '2px solid transparent',
                    marginBottom: -1,
                }}
            >
                {label}
                {id === 'ssh' && !!form.ssh_tunnel_id && (
                    <span style={{ marginLeft: 6, width: 6, height: 6, background: 'var(--om-green)', display: 'inline-block', verticalAlign: 'middle' }} />
                )}
            </button>
        )
    }

    const footer = (
        <>
            {isEdit && onDelete && (
                <button
                    onClick={() => setConfirmDelete(true)}
                    style={{ height: 28, padding: '0 12px', border: 0, background: 'transparent', color: 'var(--om-red)', fontSize: 12, fontFamily: 'var(--font-family)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                    <Trash2 size={12} /> Delete
                </button>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={onClose} style={{ height: 28, padding: '0 14px', border: '1px solid var(--om-border)', background: 'var(--om-bg-2)', color: 'var(--om-fg)', fontSize: 12, fontFamily: 'var(--font-family)', cursor: 'pointer' }}>
                Cancel
            </button>
            <button onClick={handleSave} disabled={loading} style={{ height: 28, padding: '0 16px', border: 0, background: 'var(--om-green)', color: 'var(--om-bg)', fontSize: 12, fontFamily: 'var(--font-family)', fontWeight: 600, cursor: 'pointer' }}>
                {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Connect'}
            </button>
        </>
    )

    return (
        <>
            <Modal
                open
                onClose={onClose}
                title={isEdit ? 'Edit connection' : 'New connection'}
                bodyFlush
                footer={footer}
            >
                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--om-border)', background: 'var(--om-bg-2)', padding: '0 8px' }}>
                    {tabBtn('general', 'General')}
                    {tabBtn('ssh', 'SSH Tunnel')}
                </div>

                {/* Body */}
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 280 }}>

                    {tab === 'general' && <>
                        <Field label="Name">
                            <input className={inputClass} style={inputStyle} value={form.name} onChange={str('name')} placeholder="My database" autoFocus />
                        </Field>
                        <Field label="Host">
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className={inputClass} style={{ flex: 1 }} value={form.host} onChange={str('host')} placeholder="localhost" />
                                <input
                                    className={inputClass} style={{ width: 80 }}
                                    value={String(form.port)}
                                    onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))}
                                    type="number" placeholder="5432"
                                />
                            </div>
                        </Field>
                        <Field label="Database">
                            <input className={inputClass} style={inputStyle} value={form.database} onChange={str('database')} placeholder="mydb" />
                        </Field>
                        <Field label="Username">
                            <input className={inputClass} style={inputStyle} value={form.username} onChange={str('username')} placeholder="postgres" />
                        </Field>
                        <Field label="Password">
                            <input className={inputClass} style={inputStyle} value={form.password ?? ''} onChange={str('password')} type="password" placeholder="••••••••" />
                        </Field>
                        <Field label="SSL">
                            <Select value={form.ssl_mode} options={SSL_OPTIONS} onChange={e => setForm(f => ({ ...f, ssl_mode: e.target.value }))} />
                        </Field>
                        <Field label="Color">
                            <ColorPicker
                                value={form.color ?? ''}
                                onChange={c => setForm(f => ({ ...f, color: c }))}
                            />
                        </Field>
                        <div style={{ marginLeft: 142, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', padding: '7px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 8, wordBreak: 'break-all' }}>
                            {connUrl}
                        </div>
                    </>}

                    {tab === 'ssh' && <>
                        <Field label="SSH Tunnel">
                            <Select
                                value={form.ssh_tunnel_id ?? ''}
                                options={[
                                    { value: '', label: 'None (direct connection)' },
                                    ...tunnels.map(t => ({ value: t.id, label: t.name })),
                                ]}
                                onChange={e => setForm(f => ({ ...f, ssh_tunnel_id: e.target.value || null }))}
                            />
                        </Field>
                        {form.ssh_tunnel_id && (() => {
                            const t = tunnels.find(t => t.id === form.ssh_tunnel_id)
                            if (!t) return null
                            return (
                                <div style={{ marginLeft: 142, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', padding: '7px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
                                    {t.username}@{t.host}:{t.port} · {t.auth_type === 'key' ? 'Private key' : 'Password'}
                                </div>
                            )
                        })()}
                        <div style={{ marginLeft: 142, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
                            Configure SSH tunnels in{' '}
                            <a href="/ssh-tunnels" style={{ color: 'var(--accent)', textDecoration: 'none' }}>SSH Tunnels</a>.
                        </div>
                    </>}

                    {error && (
                        <div style={{ fontSize: 12, color: 'var(--color-danger)' }}>{error}</div>
                    )}
                </div>

            </Modal>

            <Modal
                open={confirmDelete && isEdit && !!onDelete}
                onClose={() => setConfirmDelete(false)}
                title="Delete connection"
                size="sm"
                zIndex={10001}
                footer={
                    <>
                        <div style={{ flex: 1 }} />
                        <button
                            onClick={() => setConfirmDelete(false)}
                            style={{ height: 28, padding: '0 14px', border: '1px solid var(--om-border)', background: 'var(--om-bg-2)', color: 'var(--om-fg)', fontSize: 12, fontFamily: 'var(--font-family)', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { setConfirmDelete(false); onDelete?.() }}
                            style={{ height: 28, padding: '0 14px', border: 0, background: 'var(--om-red)', color: 'var(--om-bg)', fontSize: 12, fontFamily: 'var(--font-family)', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                            <Trash2 size={12} /> Delete
                        </button>
                    </>
                }
            >
                <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--om-fg)' }}>
                    Are you sure you want to delete{' '}
                    <span style={{ color: 'var(--om-fg-bright)', fontWeight: 600 }}>"{project?.name}"</span>?
                    <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--om-fg-muted)' }}>
                        This only removes the saved connection. The database itself is not affected.
                    </div>
                </div>
            </Modal>
        </>
    )
}

// ── main page ─────────────────────────────────────────────────────────────────

type TestState = 'testing' | { ok: boolean; message: string }

export default function ProjectsHome() {
    const [projects,    setProjects]    = useState<Project[]>([])
    const [loading,     setLoading]     = useState(true)
    const [modal,       setModal]       = useState<'create' | Project | null>(null)
    const [hovered,     setHovered]     = useState<string | null>(null)
    const [query,       setQuery]       = useState('')
    const [tests,       setTests]       = useState<Record<string, TestState>>({})

    const anyTesting = Object.values(tests).some(t => t === 'testing')
    const spinnerFrame = useSpinner(anyTesting)

    const navigate = useNavigate()

    const { setPageTitle } = usePageTitle()
    useEffect(() => { setPageTitle('Postgre Hub') }, [])

    const load = async () => {
        try { const r = await apiListProjects(); setProjects(r.projects) }
        finally { setLoading(false) }
    }
    useEffect(() => { load() }, [])

    const handleDelete = async (p: Project) => {
        await apiDeleteProject(p.id)
        setModal(null)
        load()
    }

    const handleTest = async (p: Project) => {
        const start = Date.now()
        setTests(s => ({ ...s, [p.id]: 'testing' }))
        let result: { ok: boolean; message: string }
        try {
            const r = await apiTestConnection(p.id)
            result = { ok: r.ok, message: r.ok ? (r.version ?? 'Connected') : (r.error ?? 'Failed') }
        } catch (e: unknown) {
            result = { ok: false, message: e instanceof Error ? e.message : 'Connection failed' }
        }
        const elapsed = Date.now() - start
        if (elapsed < 1000) await new Promise(r => setTimeout(r, 1000 - elapsed))
        setTests(s => ({ ...s, [p.id]: result }))
        setTimeout(() => {
            setTests(s => {
                const next = { ...s }
                delete next[p.id]
                return next
            })
        }, 3000)
    }

    const q = query.trim().toLowerCase()
    const filtered = q
        ? projects.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.host.toLowerCase().includes(q) ||
            p.database.toLowerCase().includes(q) ||
            p.username.toLowerCase().includes(q))
        : projects

    return (
        <>
        <ProjectsShell
            headerLeft={`${projects.length} connection${projects.length !== 1 ? 's' : ''}`}
            headerRight={
                <Button variant={1} size="sm" onClick={() => setModal('create')}>
                    <Plus size={12} /> new connection
                </Button>
            }
        >
            {loading ? (
                <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
                    <Spinner label="Loading…" />
                </div>
            ) : projects.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--om-fg-muted)', fontSize: 12, lineHeight: 1.6 }}>
                    No connections yet.<br />
                    Click <Plus size={11} style={{ verticalAlign: 'middle' }} /> new connection to start.
                </div>
            ) : (
                <>
                <div style={{ padding: '12px 16px 0' }}>
                    <SearchBar
                        value={query}
                        onChange={setQuery}
                        placeholder="filter by name, host, database, user…"
                        style={{ width: '100%' }}
                        autoFocus
                    />
                </div>
                {filtered.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--om-fg-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        no matches for <span style={{ color: 'var(--om-fg-bright)' }}>"{query}"</span>
                    </div>
                ) : (
                    <div className="conn-list">
                        {filtered.map(p => {
                            const isHovered = hovered === p.id
                            const test = tests[p.id]
                            const testing = test === 'testing'
                            const testResult = test && test !== 'testing' ? test : null
                            const showActions = isHovered || !!test
                            return (
                                <div
                                    key={p.id}
                                    className="conn-item"
                                    onClick={() => navigate(`/connections/${p.id}`)}
                                    onMouseEnter={() => setHovered(p.id)}
                                    onMouseLeave={() => setHovered(null)}
                                >
                                    {testing ? (
                                        <span
                                            style={{
                                                width: 96,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontFamily: '"Press Start 2P", "JetBrains Mono", monospace',
                                                fontSize: 16,
                                                lineHeight: 1,
                                                color: 'var(--om-green)',
                                                flexShrink: 0,
                                                transform: 'translateY(-3px)',
                                            }}
                                        >
                                            {spinnerFrame}
                                        </span>
                                    ) : (
                                        <span className="conn-avatar" style={{ color: avatarColor(p.id, p.color) }}>
                                            {initialsOf(p.name)}
                                        </span>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="conn-item-name">{p.name}</div>
                                        <div className="conn-item-uri">
                                            postgres://{p.username}@{p.host}:{p.port}/{p.database}
                                        </div>
                                    </div>
                                    {showActions && (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            {!testing && (
                                                <button
                                                    className="pos-btn"
                                                    onClick={e => { e.stopPropagation(); handleTest(p) }}
                                                    title={testResult?.message}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        color: testResult
                                                            ? (testResult.ok ? 'var(--color-success)' : 'var(--color-danger)')
                                                            : undefined,
                                                    }}
                                                >
                                                    {testResult?.ok && <CheckCircle size={10} />}
                                                    {testResult && !testResult.ok && <XCircle size={10} />}
                                                    {testResult ? (testResult.ok ? '[ok]' : '[fail]') : '[test]'}
                                                </button>
                                            )}
                                            <button
                                                className="pos-btn"
                                                onClick={e => { e.stopPropagation(); setModal(p) }}
                                            >
                                                [edit]
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
                </>
            )}
        </ProjectsShell>

        {modal && (
            <ConnectionModal
                project={modal === 'create' ? undefined : modal}
                onClose={() => setModal(null)}
                onSaved={() => { setModal(null); load() }}
                onDelete={modal !== 'create' ? () => handleDelete(modal) : undefined}
            />
        )}
        </>
    )
}
