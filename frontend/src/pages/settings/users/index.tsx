import { useState, useEffect, useCallback } from 'react'
import { KeyRound, Plus, Trash2, User } from 'lucide-react'
import { Button, Modal, Input, PasswordInput, Table, Alert, ToolButton, IconButton } from '@/components/ui'
import type { Column } from '@/components/ui'
import { ProjectsShell } from '@/components/projects-shell'
import { usePageTitle } from '@/contexts/page-title'
import {
    apiListUsers, apiCreateUser, apiDeleteUser, apiUpdateUser, apiAuthMe,
} from '@/services/api'
import type { User as UserType } from '@/services/api'

// ── Add user modal ────────────────────────────────────────────────────────────

interface AddModalProps { open: boolean; onClose: () => void; onAdded: () => void }

function AddUserModal({ open, onClose, onAdded }: AddModalProps) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [saving, setSaving]     = useState(false)
    const [error, setError]       = useState('')

    const reset = () => { setUsername(''); setPassword(''); setError('') }
    const handleClose = () => { reset(); onClose() }

    const handleSubmit = async () => {
        if (!username.trim() || password.length < 8 || saving) return
        setSaving(true); setError('')
        try {
            await apiCreateUser({ username: username.trim(), password })
            reset(); onAdded()
        } catch (err: any) {
            setError(err?.response?.data?.error ?? err?.message ?? 'Error creating user')
        } finally { setSaving(false) }
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Add user"
            size="sm"
            footer={
                <>
                    <div style={{ flex: 1 }} />
                    <Button variant={2} onClick={handleClose} disabled={saving}>Cancel</Button>
                    <Button variant={1} loading={saving}
                        disabled={!username.trim() || password.length < 8}
                        onClick={handleSubmit}>
                        Add user
                    </Button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                    size="lg"
                    label="Username" required
                    placeholder="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />
                <PasswordInput
                    size="lg"
                    label="Password" required
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                {error && <Alert tone="error">{error}</Alert>}
            </div>
        </Modal>
    )
}

// ── Reset password modal ──────────────────────────────────────────────────────

interface ResetModalProps { open: boolean; user: UserType | null; onClose: () => void; onDone: () => void }

function ResetPasswordModal({ open, user, onClose, onDone }: ResetModalProps) {
    const [password, setPassword] = useState('')
    const [saving, setSaving]     = useState(false)
    const [error, setError]       = useState('')

    const handleClose = () => { setPassword(''); setError(''); onClose() }

    const handleSubmit = async () => {
        if (!user || password.length < 8 || saving) return
        setSaving(true); setError('')
        try {
            await apiUpdateUser(user.id, { new_password: password })
            handleClose(); onDone()
        } catch (err: any) {
            setError(err?.response?.data?.error ?? err?.message ?? 'Error')
        } finally { setSaving(false) }
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={`Reset password — ${user?.username ?? ''}`}
            size="sm"
            footer={
                <>
                    <div style={{ flex: 1 }} />
                    <Button variant={2} onClick={handleClose} disabled={saving}>Cancel</Button>
                    <Button variant={1} loading={saving} disabled={password.length < 8} onClick={handleSubmit}>
                        Reset password
                    </Button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <PasswordInput
                    size="lg"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="New password (min. 8 characters)"
                />
                {error && <Alert tone="error">{error}</Alert>}
            </div>
        </Modal>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
    const { setPageTitle } = usePageTitle()
    useEffect(() => { setPageTitle('Users') }, [setPageTitle])

    const [users, setUsers]         = useState<UserType[]>([])
    const [myId, setMyId]           = useState<string>('')
    const [addOpen, setAddOpen]     = useState(false)
    const [resetUser, setResetUser] = useState<UserType | null>(null)
    const [deleting, setDeleting]   = useState<string | null>(null)

    const load = useCallback(async () => {
        try { const [list, me] = await Promise.all([apiListUsers(), apiAuthMe()]); setUsers(list); setMyId(me.id) } catch { /* ignore */ }
    }, [])

    useEffect(() => { load() }, [load])

    const handleDelete = async (id: string) => {
        setDeleting(id)
        try { await apiDeleteUser(id); await load() }
        catch {} finally { setDeleting(null) }
    }

    const formatDate = (ts: number) =>
        new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

    const columns: Column<UserType>[] = [
        {
            key: 'username',
            header: 'Username',
            render: u => (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{u.username}</span>
                    {u.id === myId && (
                        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>(you)</span>
                    )}
                </span>
            ),
        },
        {
            key: 'created_at',
            header: 'Created',
            shrink: true,
            render: u => <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{formatDate(u.created_at)}</span>,
        },
        {
            key: 'actions',
            header: '',
            shrink: true,
            render: u => (
                <div style={{ display: 'flex', gap: 4 }}>
                    <ToolButton
                        onClick={e => { e.stopPropagation(); setResetUser(u) }}
                        title="Reset password"
                    >
                        <KeyRound size={13} /> Reset pw
                    </ToolButton>
                    {u.id !== myId && (
                        <IconButton
                            label="Delete user"
                            disabled={deleting === u.id}
                            onClick={e => { e.stopPropagation(); handleDelete(u.id) }}
                        >
                            <Trash2 size={13} />
                        </IconButton>
                    )}
                </div>
            ),
        },
    ]

    return (
        <ProjectsShell
            headerLeft={<>Users<span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: 'var(--om-fg-muted)' }}>{users.length}</span></>}
            headerRight={
                <Button variant={1} size="xl" onClick={() => setAddOpen(true)}>
                    <Plus size={14} /> New user
                </Button>
            }
        >
            <AddUserModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onAdded={() => { setAddOpen(false); load() }}
            />
            <ResetPasswordModal
                open={resetUser !== null}
                user={resetUser}
                onClose={() => setResetUser(null)}
                onDone={() => load()}
            />

            <div style={{ padding: 24 }}>
                <Table
                    columns={columns}
                    data={users}
                    keyExtractor={u => u.id}
                    emptyMessage="No users found."
                />
            </div>
        </ProjectsShell>
    )
}
