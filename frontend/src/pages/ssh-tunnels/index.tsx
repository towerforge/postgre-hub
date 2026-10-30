import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, CheckCircle, Pencil, FileKey } from 'lucide-react'
import {
    Button, Input, PasswordInput, Textarea, SegmentedControl, Modal, FormRow, Alert, Text,
    Spinner, ListItem, ListItemGroup, ToolButton,
} from '@/components/ui'
import { usePageTitle } from '@/contexts/page-title'
import { ProjectsShell, avatarColor, initialsOf } from '@/components/projects-shell'
import {
    apiListTunnels, apiCreateTunnel, apiUpdateTunnel, apiDeleteTunnel, apiTestTunnel,
    type SshTunnel, type SshTunnelInput,
} from '@/services/tunnels'

type AuthType = 'password' | 'key'

const AUTH_OPTIONS: { value: AuthType; label: string }[] = [
    { value: 'password', label: 'Password' },
    { value: 'key',      label: 'Private key' },
]

// ── tunnel modal ──────────────────────────────────────────────────────────────

function TunnelModal({
    tunnel,
    onClose,
    onSaved,
    onDelete,
}: {
    tunnel?: SshTunnel
    onClose: () => void
    onSaved: () => void
    onDelete?: () => void
}) {
    const isEdit = !!tunnel
    const [form, setForm] = useState<SshTunnelInput>({
        name:        tunnel?.name        ?? '',
        host:        tunnel?.host        ?? '',
        port:        tunnel?.port        ?? 22,
        username:    tunnel?.username    ?? '',
        auth_type:   (tunnel?.auth_type as AuthType) ?? 'password',
        password:    '',
        private_key: tunnel?.private_key ?? '',
    })
    const [loading,  setLoading]  = useState(false)
    const [testing,  setTesting]  = useState(false)
    const [testRes,  setTestRes]  = useState<{ ok: boolean; msg: string } | null>(null)
    const [error,    setError]    = useState('')
    const fileRef = useRef<HTMLInputElement>(null)

    const str = (k: keyof SshTunnelInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }))

    const handleTest = async () => {
        if (!isEdit) return
        setTesting(true); setTestRes(null)
        try {
            const r = await apiTestTunnel(tunnel!.id)
            setTestRes({ ok: r.ok, msg: r.ok ? (r.message ?? 'Connected') : (r.error ?? 'Failed') })
        } catch (e: unknown) {
            setTestRes({ ok: false, msg: e instanceof Error ? e.message : 'Failed' })
        }
        setTesting(false)
    }

    const handleSave = async () => {
        if (!form.name.trim() || !form.host.trim() || !form.username.trim()) {
            setError('Name, host and username are required.')
            return
        }
        setLoading(true); setError('')
        try {
            isEdit ? await apiUpdateTunnel(tunnel!.id, form) : await apiCreateTunnel(form)
            onSaved()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to save.')
        } finally { setLoading(false) }
    }

    const footer = (
        <>
            {isEdit && onDelete && (
                <Button
                    variant={5}
                    onClick={() => { if (confirm(`Delete tunnel "${tunnel!.name}"? Connections using it will lose SSH access.`)) onDelete() }}
                >
                    <Trash2 size={13} /> Delete
                </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button variant={2} onClick={onClose}>
                Cancel
            </Button>
            {isEdit && (
                <Button variant={2} onClick={handleTest} disabled={testing}>
                    <CheckCircle size={13} /> {testing ? 'Testing…' : 'Test'}
                </Button>
            )}
            <Button variant={1} onClick={handleSave} disabled={loading}>
                {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create tunnel'}
            </Button>
        </>
    )

    return (
        <Modal
            open
            onClose={onClose}
            title={isEdit ? 'Edit SSH tunnel' : 'New SSH tunnel'}
            bodyFlush
            footer={footer}
        >
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <FormRow label="Name">
                    <Input size="lg" value={form.name} onChange={str('name')} placeholder="Production bastion" autoFocus />
                </FormRow>
                <FormRow label="SSH host">
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <Input size="lg" value={form.host} onChange={str('host')} placeholder="bastion.example.com" />
                        </div>
                        <div style={{ width: 96 }}>
                            <Input
                                size="lg"
                                value={String(form.port)}
                                onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))}
                                type="number" placeholder="22"
                            />
                        </div>
                    </div>
                </FormRow>
                <FormRow label="SSH user">
                    <Input size="lg" value={form.username} onChange={str('username')} placeholder="ubuntu" />
                </FormRow>
                <FormRow label="Auth">
                    <SegmentedControl
                        options={AUTH_OPTIONS}
                        value={form.auth_type as AuthType}
                        onChange={v => setForm(f => ({ ...f, auth_type: v }))}
                    />
                </FormRow>
                {form.auth_type === 'password' ? (
                    <FormRow label="Password">
                        <PasswordInput size="lg" value={form.password ?? ''} onChange={str('password')} placeholder={isEdit ? '(unchanged)' : '••••••••'} />
                    </FormRow>
                ) : (
                    <>
                    <FormRow label="Private key">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <Textarea
                                mono
                                value={form.private_key ?? ''}
                                onChange={e => setForm(f => ({ ...f, private_key: e.target.value }))}
                                placeholder={isEdit ? '(unchanged)' : '-----BEGIN OPENSSH PRIVATE KEY-----\n…\nor a path like ~/.ssh/id_rsa'}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Button variant={3} size="sm" onClick={() => fileRef.current?.click()}>
                                    <FileKey size={12} /> Browse…
                                </Button>
                                <Text variant="hint">Load a key file, or paste its contents, or type a path.</Text>
                                {/* Input de fichero oculto; lo abre el botón Browse */}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    hidden
                                    onChange={async e => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        const text = await file.text()
                                        setForm(f => ({ ...f, private_key: text }))
                                        e.target.value = ''
                                    }}
                                />
                            </div>
                        </div>
                    </FormRow>
                    <FormRow label="Passphrase">
                        <PasswordInput size="lg" value={form.password ?? ''} onChange={str('password')} placeholder={isEdit ? '(unchanged)' : 'optional'} />
                    </FormRow>
                    </>
                )}
                {testRes && <Alert tone={testRes.ok ? 'success' : 'error'}>{testRes.msg}</Alert>}
                {error && <Alert tone="error">{error}</Alert>}
            </div>
        </Modal>
    )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function SshTunnelsPage() {
    const [tunnels, setTunnels] = useState<SshTunnel[]>([])
    const [loading,     setLoading]     = useState(true)
    const [modal,       setModal]       = useState<'create' | SshTunnel | null>(null)
    const [hovered,     setHovered]     = useState<string | null>(null)

    const { setPageTitle } = usePageTitle()
    useEffect(() => { setPageTitle('SSH Tunnels') }, [setPageTitle])

    const load = async () => {
        try { const r = await apiListTunnels(); setTunnels(r.tunnels) }
        finally { setLoading(false) }
    }
    useEffect(() => { load() }, [])

    const handleDelete = async (t: SshTunnel) => {
        await apiDeleteTunnel(t.id)
        setModal(null)
        load()
    }

    return (
        <>
        <ProjectsShell
            headerLeft={<>SSH Tunnels<span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: 'var(--om-fg-muted)' }}>{tunnels.length}</span></>}
            headerRight={
                <Button variant={1} size="xl" onClick={() => setModal('create')}>
                    <Plus size={14} /> New tunnel
                </Button>
            }
        >
            {loading ? (
                <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
                    <Spinner label="Loading…" />
                </div>
            ) : tunnels.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--om-fg-muted)', fontSize: 12, lineHeight: 1.6 }}>
                    No SSH tunnels yet.<br />
                    Click <b>New tunnel</b> to start.
                </div>
            ) : (
                <ListItemGroup>
                    {tunnels.map(t => (
                        <ListItem
                            key={t.id}
                            onClick={() => setModal(t)}
                            onMouseEnter={() => setHovered(t.id)}
                            onMouseLeave={() => setHovered(null)}
                            leading={
                                <span className="conn-avatar" style={{ background: avatarColor(t.id) }}>
                                    {initialsOf(t.name)}
                                </span>
                            }
                            title={t.name}
                            subtitle={`${t.username}@${t.host}:${t.port} · ${t.auth_type === 'key' ? 'key' : 'password'}`}
                            actions={hovered === t.id && (
                                <ToolButton onClick={e => { e.stopPropagation(); setModal(t) }}>
                                    <Pencil size={13} /> Edit
                                </ToolButton>
                            )}
                        />
                    ))}
                </ListItemGroup>
            )}
        </ProjectsShell>

        {modal && (
            <TunnelModal
                tunnel={modal === 'create' ? undefined : modal}
                onClose={() => setModal(null)}
                onSaved={() => { setModal(null); load() }}
                onDelete={modal !== 'create' ? () => handleDelete(modal) : undefined}
            />
        )}
        </>
    )
}
