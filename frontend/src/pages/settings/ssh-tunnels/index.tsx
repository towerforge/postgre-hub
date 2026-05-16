import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, X, Server } from 'lucide-react'
import { createPortal } from 'react-dom'
import {
    apiListTunnels, apiCreateTunnel, apiUpdateTunnel, apiDeleteTunnel,
    type SshTunnel, type SshTunnelInput,
} from '@/services/tunnels'

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
    height: 30, border: 0, borderRadius: 8,
    background: 'rgba(0,0,0,0.06)', padding: '0 10px',
    fontFamily: 'var(--font-mono)', fontSize: 12.5,
    color: 'var(--text-1)', outline: 'none',
    width: '100%', boxSizing: 'border-box',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0 12px', alignItems: 'center', minHeight: 32 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-2)', textAlign: 'right' }}>{label}</span>
            {children}
        </div>
    )
}

// ── Tunnel modal ──────────────────────────────────────────────────────────────

function TunnelModal({
    tunnel,
    onClose,
    onSaved,
}: {
    tunnel?: SshTunnel
    onClose: () => void
    onSaved: () => void
}) {
    const isEdit = !!tunnel
    const [form, setForm] = useState<SshTunnelInput>({
        name:        tunnel?.name     ?? '',
        host:        tunnel?.host     ?? '',
        port:        tunnel?.port     ?? 22,
        username:    tunnel?.username ?? '',
        auth_type:   (tunnel?.auth_type as 'password' | 'key') ?? 'password',
        password:    '',
        private_key: '',
    })
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState('')

    const str = (k: keyof SshTunnelInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }))

    const handleSave = async () => {
        if (!form.name.trim() || !form.host.trim() || !form.username.trim()) {
            setError('Name, host and username are required.')
            return
        }
        setLoading(true); setError('')
        try {
            isEdit
                ? await apiUpdateTunnel(tunnel!.id, form)
                : await apiCreateTunnel(form)
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
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div style={{ width: 460, background: 'var(--content-0)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: 18, boxShadow: '0 30px 80px rgba(0,0,0,0.25), 0 0 0 0.5px var(--stroke-1)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--stroke-1)' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                        {isEdit ? 'Edit SSH tunnel' : 'New SSH tunnel'}
                    </span>
                    <button onClick={onClose} className="g-icon-btn" style={{ width: 26, height: 26 }}><X size={13} /></button>
                </div>

                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Field label="Name">
                        <input style={inputStyle} value={form.name} onChange={str('name')} placeholder="Production bastion" autoFocus />
                    </Field>
                    <Field label="SSH host">
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input style={{ ...inputStyle, flex: 1 }} value={form.host} onChange={str('host')} placeholder="bastion.example.com" />
                            <input style={{ ...inputStyle, width: 70 }} value={String(form.port)} onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))} type="number" placeholder="22" />
                        </div>
                    </Field>
                    <Field label="SSH user">
                        <input style={inputStyle} value={form.username} onChange={str('username')} placeholder="ubuntu" />
                    </Field>
                    <Field label="Auth">
                        <div style={{ display: 'flex', gap: 2, padding: 3, background: 'rgba(0,0,0,0.05)', borderRadius: 9 }}>
                            {segBtn('password', 'Password')}
                            {segBtn('key', 'Private key')}
                        </div>
                    </Field>
                    {form.auth_type === 'password' ? (
                        <Field label="Password">
                            <input style={inputStyle} value={form.password ?? ''} onChange={str('password')} type="password" placeholder={isEdit ? '(unchanged)' : '••••••••'} />
                        </Field>
                    ) : (
                        <Field label="Private key">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <textarea
                                    style={{ ...inputStyle, height: 'auto', minHeight: 72, padding: '6px 10px', resize: 'vertical', lineHeight: 1.35 }}
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
                    )}
                    {error && <div style={{ fontSize: 12, color: 'var(--color-danger)' }}>{error}</div>}
                </div>

                <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '0.5px solid var(--stroke-1)' }}>
                    <button onClick={onClose} style={{ height: 30, padding: '0 14px', border: 0, borderRadius: 999, background: 'rgba(0,0,0,0.06)', color: 'var(--text-1)', fontSize: 12.5, fontFamily: 'var(--font-family)', cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={loading} style={{ height: 30, padding: '0 14px', border: 0, borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontFamily: 'var(--font-family)', fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 6px rgba(10,132,255,0.35)' }}>
                        {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create tunnel'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SshTunnelsPage() {
    const [tunnels, setTunnels] = useState<SshTunnel[]>([])
    const [loading, setLoading] = useState(true)
    const [modal,   setModal]   = useState<'create' | SshTunnel | null>(null)
    const [hovered, setHovered] = useState<string | null>(null)

    const load = async () => {
        try { const r = await apiListTunnels(); setTunnels(r.tunnels) }
        finally { setLoading(false) }
    }
    useEffect(() => { load() }, [])

    const handleDelete = async (t: SshTunnel) => {
        if (!confirm(`Delete tunnel "${t.name}"? Any connections using it will lose SSH access.`)) return
        await apiDeleteTunnel(t.id)
        load()
    }

    return (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--stroke-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    SSH Tunnels
                </span>
                <button
                    onClick={() => setModal('create')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 12px', border: 0, borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 12, fontFamily: 'var(--font-family)', fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 6px rgba(10,132,255,0.3)' }}
                >
                    <Plus size={12} /> New tunnel
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
                ) : tunnels.length === 0 ? (
                    <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--text-3)', fontSize: 13 }}>
                        <Server size={32} style={{ opacity: 0.2 }} />
                        <span>No SSH tunnels yet. Create one to reuse across connections.</span>
                    </div>
                ) : tunnels.map((t, i) => {
                    const isHovered = hovered === t.id
                    return (
                        <div
                            key={t.id}
                            onMouseEnter={() => setHovered(t.id)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: i < tunnels.length - 1 ? '0.5px solid var(--stroke-1)' : 'none', background: isHovered ? 'rgba(0,0,0,0.025)' : 'transparent', transition: 'background .12s' }}
                        >
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Server size={15} style={{ color: 'var(--text-3)' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)' }}>{t.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                                    {t.username}@{t.host}:{t.port} · {t.auth_type === 'key' ? 'Private key' : 'Password'}
                                </div>
                            </div>
                            {isHovered && (
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    <button className="g-icon-btn" title="Edit" onClick={() => setModal(t)}><Edit size={13} /></button>
                                    <button className="g-icon-btn" title="Delete" onClick={() => handleDelete(t)}><Trash2 size={13} /></button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {modal && (
                <TunnelModal
                    tunnel={modal === 'create' ? undefined : modal}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load() }}
                />
            )}
        </div>
    )
}
