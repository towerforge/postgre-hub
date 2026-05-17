import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui'
import { ProjectsShell } from '@/components/projects-shell'
import { usePageTitle } from '@/contexts/page-title'
import { apiUpdateCredentials } from '@/services/api'

const RULES = [
    { key: 'length',  label: 'At least 8 characters',        test: (p: string) => p.length >= 8 },
    { key: 'upper',   label: 'One uppercase letter',          test: (p: string) => /[A-Z]/.test(p) },
    { key: 'lower',   label: 'One lowercase letter',          test: (p: string) => /[a-z]/.test(p) },
    { key: 'number',  label: 'One number',                    test: (p: string) => /[0-9]/.test(p) },
    { key: 'special', label: 'One special character (!@#$…)', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const

function isPasswordStrong(p: string) { return RULES.every(r => r.test(p)) }

function PasswordStrength({ password }: { password: string }) {
    if (!password.length) return <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Min. 8 characters, uppercase, lowercase, number and special character.</p>
    const passed = RULES.filter(r => r.test(password)).length
    const pct = (passed / RULES.length) * 100
    const barColor = pct === 100 ? '#22c55e' : pct <= 40 ? '#ef4444' : '#eab308'
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 4, background: 'var(--fill-2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width 0.2s' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {RULES.map(r => {
                    const ok = r.test(password)
                    return <p key={r.key} style={{ fontSize: 12, margin: 0, color: ok ? '#22c55e' : 'var(--text-3)' }}>{ok ? '✓' : '·'} {r.label}</p>
                })}
            </div>
        </div>
    )
}

function PasswordField({
    value, onChange, placeholder, autoComplete,
}: {
    value: string
    onChange: (v: string) => void
    placeholder: string
    autoComplete?: string
}) {
    const [show, setShow] = useState(false)
    return (
        <div style={{ position: 'relative' }}>
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(0,0,0,0.06)', border: 0, borderRadius: 10,
                    padding: '8px 44px 8px 12px', fontSize: 13,
                    color: 'var(--text-1)', outline: 'none',
                }}
            />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
            >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
        </div>
    )
}

const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(0,0,0,0.06)', border: 0, borderRadius: 10,
    padding: '8px 12px', fontSize: 13, color: 'var(--text-1)', outline: 'none',
}

const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, display: 'block',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={labelStyle}>{label}</span>
            {children}
        </div>
    )
}

export default function AccountPage() {
    const { setPageTitle } = usePageTitle()
    useEffect(() => { setPageTitle('Account') }, [setPageTitle])

    const [currentPassword, setCurrentPassword] = useState('')
    const [newUsername, setNewUsername]         = useState('')
    const [newPassword, setNewPassword]         = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [saving, setSaving]                   = useState(false)
    const [success, setSuccess]                 = useState('')
    const [error, setError]                     = useState('')

    const newPasswordValid = newPassword === '' || isPasswordStrong(newPassword)
    const canSave =
        currentPassword.length > 0 &&
        (newUsername.trim().length > 0 || newPassword.length > 0) &&
        (newPassword === '' || (isPasswordStrong(newPassword) && newPassword === confirmPassword))

    const handleSave = async () => {
        if (!canSave || saving) return
        setSaving(true)
        setError('')
        setSuccess('')
        try {
            await apiUpdateCredentials({
                current_password:    currentPassword,
                new_username:        newUsername.trim() || undefined,
                new_password:        newPassword       || undefined,
                confirm_new_password: confirmPassword  || undefined,
            })
            setSuccess('Credentials updated successfully.')
            setCurrentPassword('')
            setNewUsername('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err: any) {
            setError(err?.response?.data?.error ?? err?.message ?? 'Error saving changes')
        } finally {
            setSaving(false)
        }
    }

    return (
        <ProjectsShell headerLeft="Account" headerRight={null}>
            <div style={{ padding: 24 }}>
            <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Current password — always required */}
                <Field label="Current password">
                    <PasswordField
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        placeholder="Required to save changes"
                        autoComplete="current-password"
                    />
                </Field>

                <hr style={{ border: 'none', borderTop: '1px solid var(--stroke-1)', margin: 0 }} />

                <Field label="New username">
                    <input
                        type="text"
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        placeholder="Leave empty to keep current"
                        autoComplete="username"
                        style={inputStyle}
                    />
                </Field>

                <Field label="New password">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <PasswordField
                            value={newPassword}
                            onChange={setNewPassword}
                            placeholder="Leave empty to keep current"
                            autoComplete="new-password"
                        />
                        {newPassword.length > 0 && (
                            <>
                                <PasswordStrength password={newPassword} />
                                <PasswordField
                                    value={confirmPassword}
                                    onChange={setConfirmPassword}
                                    placeholder="Confirm new password"
                                    autoComplete="new-password"
                                />
                                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                                    <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>Passwords do not match</p>
                                )}
                            </>
                        )}
                    </div>
                </Field>

                {error   && <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>}
                {success && <p style={{ fontSize: 13, color: '#22c55e', margin: 0 }}>{success}</p>}

                <div>
                    <Button
                        variant={1}
                        size="sm"
                        loading={saving}
                        disabled={!canSave || !newPasswordValid}
                        onClick={handleSave}
                    >
                        Save changes
                    </Button>
                </div>
            </div>
            </div>
        </ProjectsShell>
    )
}
