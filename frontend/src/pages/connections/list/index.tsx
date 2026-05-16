import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CheckCircle, XCircle, Loader, Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button, Select } from '@/components/ui'
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
    })

    useEffect(() => {
        apiListTunnels().then(r => setTunnels(r.tunnels)).catch(() => {})
    }, [])

    const [loading, setLoading] = useState(false)
    const [testing, setTesting] = useState(false)
    const [testRes, setTestRes] = useState<{ ok: boolean; message: string } | null>(null)
    const [error,   setError]   = useState('')

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

    const handleTest = async () => {
        if (!isEdit) { setTestRes({ ok: false, message: 'Save the connection first, then test.' }); return }
        setTesting(true); setTestRes(null)
        try {
            const r = await apiTestConnection(project!.id)
            setTestRes({ ok: r.ok, message: r.ok ? (r.version ?? 'Connected') : (r.error ?? 'Failed') })
        } catch (e: unknown) {
            setTestRes({ ok: false, message: e instanceof Error ? e.message : 'Connection failed' })
        }
        setTesting(false)
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

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

    return createPortal(
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div style={{ width: 520, maxWidth: '92vw', background: 'var(--om-bg-2)', border: '1px solid var(--om-border-focus)', overflow: 'hidden', fontFamily: 'var(--font-family)' }}>

                {/* Header */}
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--om-border)' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--om-fg-bright)' }}>
                        {isEdit ? 'Edit connection' : 'New connection'}
                    </span>
                    <button onClick={onClose} className="g-icon-btn" style={{ width: 26, height: 26 }}><X size={13} /></button>
                </div>

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

                    {testRes && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: testRes.ok ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)', fontSize: 12, color: testRes.ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {testRes.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {testRes.message}
                        </div>
                    )}
                    {error && (
                        <div style={{ fontSize: 12, color: 'var(--color-danger)' }}>{error}</div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--om-border)' }}>
                    {isEdit && onDelete && (
                        <button
                            onClick={() => { if (confirm(`Delete "${project!.name}"? This only removes the saved connection.`)) onDelete() }}
                            style={{ height: 28, padding: '0 12px', border: 0, background: 'transparent', color: 'var(--om-red)', fontSize: 12, fontFamily: 'var(--font-family)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                            <Trash2 size={12} /> Delete
                        </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button onClick={onClose} style={{ height: 28, padding: '0 14px', border: '1px solid var(--om-border)', background: 'var(--om-bg-2)', color: 'var(--om-fg)', fontSize: 12, fontFamily: 'var(--font-family)', cursor: 'pointer' }}>
                        Cancel
                    </button>
                    {isEdit && (
                        <button onClick={handleTest} disabled={testing} style={{ height: 28, padding: '0 14px', border: '1px solid var(--om-border)', background: 'var(--om-bg-2)', color: 'var(--om-fg)', fontSize: 12, fontFamily: 'var(--font-family)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {testing ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                            Test connection
                        </button>
                    )}
                    <button onClick={handleSave} disabled={loading} style={{ height: 28, padding: '0 16px', border: 0, background: 'var(--om-green)', color: 'var(--om-bg)', fontSize: 12, fontFamily: 'var(--font-family)', fontWeight: 600, cursor: 'pointer' }}>
                        {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Connect'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ProjectsHome() {
    const [projects,    setProjects]    = useState<Project[]>([])
    const [loading,     setLoading]     = useState(true)
    const [modal,       setModal]       = useState<'create' | Project | null>(null)
    const [hovered,     setHovered]     = useState<string | null>(null)

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
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--om-fg-muted)', fontSize: 12 }}>Loading…</div>
            ) : projects.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--om-fg-muted)', fontSize: 12, lineHeight: 1.6 }}>
                    No connections yet.<br />
                    Click <Plus size={11} style={{ verticalAlign: 'middle' }} /> new connection to start.
                </div>
            ) : (
                <div className="conn-list">
                    {projects.map(p => {
                        const isHovered = hovered === p.id
                        return (
                            <div
                                key={p.id}
                                className="conn-item"
                                onClick={() => navigate(`/connections/${p.id}`)}
                                onMouseEnter={() => setHovered(p.id)}
                                onMouseLeave={() => setHovered(null)}
                            >
                                <span className="conn-avatar" style={{ color: avatarColor(p.id) }}>
                                    {initialsOf(p.name)}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="conn-item-name">{p.name}</div>
                                    <div className="conn-item-uri">
                                        postgres://{p.username}@{p.host}:{p.port}/{p.database}
                                    </div>
                                </div>
                                {isHovered && (
                                    <button
                                        className="pos-btn"
                                        onClick={e => { e.stopPropagation(); setModal(p) }}
                                    >
                                        [edit]
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
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
