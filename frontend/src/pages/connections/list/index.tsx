import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CheckCircle, XCircle, Trash2, Plug, Pencil } from 'lucide-react'
import { Button, Input, Select, Spinner, SearchBar, ColorPicker, Modal, Tabs, TabBar, Tab, FormRow, InfoBox, ListItem, ListItemGroup, ToolButton, Alert, useSpinner } from '@/components/ui'
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

    const footer = (
        <>
            {isEdit && onDelete && (
                <Button variant={5} onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={13} /> Delete
                </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button variant={2} onClick={onClose}>
                Cancel
            </Button>
            <Button variant={1} onClick={handleSave} disabled={loading}>
                {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Connect'}
            </Button>
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
                <Tabs value={tab} onChange={id => { setTab(id as ModalTab); setError('') }}>
                    <TabBar>
                        <Tab id="general">General</Tab>
                        <Tab id="ssh" dot={!!form.ssh_tunnel_id}>SSH Tunnel</Tab>
                    </TabBar>
                </Tabs>

                {/* Body */}
                <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 300 }}>

                    {tab === 'general' && <>
                        <FormRow label="Name">
                            <Input size="lg" value={form.name} onChange={str('name')} placeholder="My database" autoFocus />
                        </FormRow>
                        <FormRow label="Host">
                            <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                    <Input size="lg" value={form.host} onChange={str('host')} placeholder="localhost" />
                                </div>
                                <div style={{ width: 96 }}>
                                    <Input
                                        size="lg"
                                        value={String(form.port)}
                                        onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))}
                                        type="number" placeholder="5432"
                                    />
                                </div>
                            </div>
                        </FormRow>
                        <FormRow label="Database">
                            <Input size="lg" value={form.database} onChange={str('database')} placeholder="mydb" />
                        </FormRow>
                        <FormRow label="Username">
                            <Input size="lg" value={form.username} onChange={str('username')} placeholder="postgres" />
                        </FormRow>
                        <FormRow label="Password">
                            <Input size="lg" value={form.password ?? ''} onChange={str('password')} type="password" placeholder="••••••••" />
                        </FormRow>
                        <FormRow label="SSL">
                            <Select value={form.ssl_mode} options={SSL_OPTIONS} onChange={e => setForm(f => ({ ...f, ssl_mode: e.target.value }))} />
                        </FormRow>
                        <FormRow label="Color">
                            <ColorPicker
                                value={form.color ?? ''}
                                onChange={c => setForm(f => ({ ...f, color: c }))}
                            />
                        </FormRow>
                        <InfoBox style={{ marginLeft: 132 }}>
                            {connUrl}
                        </InfoBox>
                    </>}

                    {tab === 'ssh' && <>
                        <FormRow label="SSH Tunnel">
                            <Select
                                value={form.ssh_tunnel_id ?? ''}
                                options={[
                                    { value: '', label: 'None (direct connection)' },
                                    ...tunnels.map(t => ({ value: t.id, label: t.name })),
                                ]}
                                onChange={e => setForm(f => ({ ...f, ssh_tunnel_id: e.target.value || null }))}
                            />
                        </FormRow>
                        {form.ssh_tunnel_id && (() => {
                            const t = tunnels.find(t => t.id === form.ssh_tunnel_id)
                            if (!t) return null
                            return (
                                <InfoBox style={{ marginLeft: 132 }}>
                                    {t.username}@{t.host}:{t.port} · {t.auth_type === 'key' ? 'Private key' : 'Password'}
                                </InfoBox>
                            )
                        })()}
                        <div style={{ marginLeft: 142, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
                            Configure SSH tunnels in{' '}
                            <a href="/ssh-tunnels" style={{ color: 'var(--accent)', textDecoration: 'none' }}>SSH Tunnels</a>.
                        </div>
                    </>}

                    {error && <Alert tone="error">{error}</Alert>}
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
                        <Button variant={2} onClick={() => setConfirmDelete(false)}>
                            Cancel
                        </Button>
                        <Button variant={6} onClick={() => { setConfirmDelete(false); onDelete?.() }}>
                            <Trash2 size={13} /> Delete
                        </Button>
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
            headerLeft={<>Connections<span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: 'var(--om-fg-muted)' }}>{projects.length}</span></>}
            headerRight={
                <Button variant={1} size="xl" onClick={() => setModal('create')}>
                    <Plus size={14} /> New connection
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
                    Click <b>New connection</b> to start.
                </div>
            ) : (
                <>
                <div style={{ padding: '12px 16px 0' }}>
                    <SearchBar
                        size="lg"
                        value={query}
                        onChange={setQuery}
                        placeholder="Filter by name, host, database, user…"
                        style={{ width: '100%' }}
                        autoFocus
                    />
                </div>
                {filtered.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--om-fg-muted)', fontSize: 13 }}>
                        No matches for <span style={{ color: 'var(--om-fg-bright)' }}>"{query}"</span>
                    </div>
                ) : (
                    <ListItemGroup>
                        {filtered.map(p => {
                            const isHovered = hovered === p.id
                            const test = tests[p.id]
                            const testing = test === 'testing'
                            const testResult = test && test !== 'testing' ? test : null
                            const showActions = isHovered || !!test
                            return (
                                <ListItem
                                    key={p.id}
                                    onClick={() => navigate(`/connections/${p.id}`)}
                                    onMouseEnter={() => setHovered(p.id)}
                                    onMouseLeave={() => setHovered(null)}
                                    leading={testing ? (
                                        <span
                                            className="conn-avatar"
                                            style={{
                                                background: 'var(--om-bg-4)',
                                                color: 'var(--om-fg-bright)',
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 16,
                                            }}
                                        >
                                            {spinnerFrame}
                                        </span>
                                    ) : (
                                        <span className="conn-avatar" style={{ background: avatarColor(p.id, p.color) }}>
                                            {initialsOf(p.name)}
                                        </span>
                                    )}
                                    title={p.name}
                                    subtitle={`postgres://${p.username}@${p.host}:${p.port}/${p.database}`}
                                    actions={showActions && (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                            {!testing && (
                                                <ToolButton
                                                    onClick={e => { e.stopPropagation(); handleTest(p) }}
                                                    title={testResult?.message}
                                                    style={{
                                                        color: testResult
                                                            ? (testResult.ok ? 'var(--color-success)' : 'var(--color-danger)')
                                                            : undefined,
                                                    }}
                                                >
                                                    {!testResult && <Plug size={13} />}
                                                    {testResult?.ok && <CheckCircle size={13} />}
                                                    {testResult && !testResult.ok && <XCircle size={13} />}
                                                    {testResult ? (testResult.ok ? 'Connected' : 'Failed') : 'Test'}
                                                </ToolButton>
                                            )}
                                            <ToolButton onClick={e => { e.stopPropagation(); setModal(p) }}>
                                                <Pencil size={13} /> Edit
                                            </ToolButton>
                                        </div>
                                    )}
                                />
                            )
                        })}
                    </ListItemGroup>
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
