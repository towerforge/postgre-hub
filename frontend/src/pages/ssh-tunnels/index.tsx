import { useState, useEffect } from 'react'
import { Plus, Trash2, X, CheckCircle, XCircle, Loader } from 'lucide-react'
import { createPortal } from 'react-dom'
import { usePageTitle } from '@/contexts/page-title'
import { ProjectsShell, avatarColor, initialsOf } from '@/components/projects-shell'
import {
    apiListTunnels, apiCreateTunnel, apiUpdateTunnel, apiDeleteTunnel, apiTestTunnel,
    type SshTunnel, type SshTunnelInput,
} from '@/services/tunnels'

// ── shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = { width: '100%' }
const inputClass = 'om-input'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0 12px', alignItems: 'center', minHeight: 34 }}>
            <span style={{ fontSize: 12, color: 'var(--om-fg-dim)', fontFamily: 'var(--font-family)', fontWeight: 500 }}>{label}</span>
            {children}
        </div>
    )
}

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
        auth_type:   (tunnel?.auth_type as 'password' | 'key') ?? 'password',
        password:    '',
        private_key: tunnel?.private_key ?? '',
    })
    const [loading,  setLoading]  = useState(false)
    const [testing,  setTesting]  = useState(false)
    const [testRes,  setTestRes]  = useState<{ ok: boolean; msg: string } | null>(null)
    const [error,    setError]    = useState('')

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

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    const segBtn = (val: 'password' | 'key', label: string) => {
        const active = form.auth_type === val
        return (
            <button onClick={() => setForm(f => ({ ...f, auth_type: val }))} style={{
                flex: 1, height: 26, border: 'none', borderRadius: 6, cursor: 'pointer',
                fontSize: 12, fontFamily: 'var(--font-family)',
                background: active ? 'var(--content-0)' : 'transparent',
                color: active ? 'var(--text-1)' : 'var(--text-3)',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px var(--stroke-1)' : 'none',
                transition: 'background 0.1s',
            }}>{label}</button>
        )
    }

    return createPortal(
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div style={{ width: 520, maxWidth: '92vw', background: 'var(--om-bg-2)', border: '1px solid var(--om-border-focus)', overflow: 'hidden', fontFamily: 'var(--font-family)' }}>
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--om-border)' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--om-fg-bright)' }}>
                        {isEdit ? 'Edit SSH tunnel' : 'New SSH tunnel'}
                    </span>
                    <button onClick={onClose} className="g-icon-btn" style={{ width: 26, height: 26 }}><X size={13} /></button>
                </div>
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Field label="Name">
                        <input className={inputClass} style={inputStyle} value={form.name} onChange={str('name')} placeholder="Production bastion" autoFocus />
                    </Field>
                    <Field label="SSH host">
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input className={inputClass} style={{ flex: 1 }} value={form.host} onChange={str('host')} placeholder="bastion.example.com" />
                            <input className={inputClass} style={{ width: 70 }} value={String(form.port)} onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))} type="number" placeholder="22" />
                        </div>
                    </Field>
                    <Field label="SSH user">
                        <input className={inputClass} style={inputStyle} value={form.username} onChange={str('username')} placeholder="ubuntu" />
                    </Field>
                    <Field label="Auth">
                        <div style={{ display: 'flex', gap: 2, padding: 3, background: 'rgba(0,0,0,0.05)', borderRadius: 9 }}>
                            {segBtn('password', 'Password')}
                            {segBtn('key', 'Private key')}
                        </div>
                    </Field>
                    {form.auth_type === 'password' ? (
                        <Field label="Password">
                            <input className={inputClass} style={inputStyle} value={form.password ?? ''} onChange={str('password')} type="password" placeholder={isEdit ? '(unchanged)' : '••••••••'} />
                        </Field>
                    ) : (
                        <>
                        <Field label="Private key">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <textarea
                                    className={inputClass} style={{ width: '100%', height: 'auto', minHeight: 72, padding: '6px 10px', resize: 'vertical', lineHeight: 1.35 }}
                                    value={form.private_key ?? ''}
                                    onChange={e => setForm(f => ({ ...f, private_key: e.target.value }))}
                                    placeholder={isEdit ? '(unchanged)' : '-----BEGIN OPENSSH PRIVATE KEY-----\n…\nor a path like ~/.ssh/id_rsa'}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', borderRadius: 999, background: 'rgba(0,0,0,0.06)', color: 'var(--text-1)', fontSize: 11.5, cursor: 'pointer' }}>
                                        Browse…
                                        <input
                                            type="file"
                                            style={{ display: 'none' }}
                                            onChange={async e => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                const text = await file.text()
                                                setForm(f => ({ ...f, private_key: text }))
                                                e.target.value = ''
                                            }}
                                        />
                                    </label>
                                    <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                                        Load a key file, or paste its contents, or type a path.
                                    </span>
                                </div>
                            </div>
                        </Field>
                        <Field label="Passphrase">
                            <input className={inputClass} style={inputStyle} value={form.password ?? ''} onChange={str('password')} type="password" placeholder={isEdit ? '(unchanged)' : 'optional'} />
                        </Field>
                        </>
                    )}
                    {testRes && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: testRes.ok ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)', fontSize: 12, color: testRes.ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {testRes.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {testRes.msg}
                        </div>
                    )}
                    {error && <div style={{ fontSize: 12, color: 'var(--color-danger)' }}>{error}</div>}
                </div>
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--om-border)' }}>
                    {isEdit && onDelete && (
                        <button
                            onClick={() => { if (confirm(`Delete tunnel "${tunnel!.name}"? Connections using it will lose SSH access.`)) onDelete() }}
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
                            {testing ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={11} />}
                            Test
                        </button>
                    )}
                    <button onClick={handleSave} disabled={loading} style={{ height: 28, padding: '0 16px', border: 0, background: 'var(--om-green)', color: 'var(--om-bg)', fontSize: 12, fontFamily: 'var(--font-family)', fontWeight: 600, cursor: 'pointer' }}>
                        {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create tunnel'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
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
            headerLeft={`${tunnels.length} tunnel${tunnels.length !== 1 ? 's' : ''}`}
            headerRight={
                <button className="conn-new-btn" onClick={() => setModal('create')}>
                    <Plus size={13} /> new tunnel
                </button>
            }
        >
            {loading ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--om-fg-muted)', fontSize: 12 }}>Loading…</div>
            ) : tunnels.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--om-fg-muted)', fontSize: 12, lineHeight: 1.6 }}>
                    No SSH tunnels yet.<br />
                    Click <Plus size={11} style={{ verticalAlign: 'middle' }} /> new tunnel to start.
                </div>
            ) : (
                <div className="conn-list">
                    {tunnels.map(t => {
                        const isH = hovered === t.id
                        return (
                            <div
                                key={t.id}
                                className="conn-item"
                                onClick={() => setModal(t)}
                                onMouseEnter={() => setHovered(t.id)}
                                onMouseLeave={() => setHovered(null)}
                            >
                                <span className="conn-avatar" style={{ color: avatarColor(t.id) }}>
                                    {initialsOf(t.name)}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="conn-item-name">{t.name}</div>
                                    <div className="conn-item-uri">
                                        {t.username}@{t.host}:{t.port} · {t.auth_type === 'key' ? 'key' : 'password'}
                                    </div>
                                </div>
                                {isH && (
                                    <button
                                        className="pos-btn"
                                        onClick={e => { e.stopPropagation(); setModal(t) }}
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
