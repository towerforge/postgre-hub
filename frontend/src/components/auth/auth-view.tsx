import { useState } from 'react'
import { Database } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Alert, Button, Card, CardBody, Input } from '@/components/ui'
import css from '@/css/auth-view.module.css'

const RULES = [
    { key: 'length',  label: '8+ characters',     test: (p: string) => p.length >= 8 },
    { key: 'upper',   label: 'Uppercase letter',  test: (p: string) => /[A-Z]/.test(p) },
    { key: 'lower',   label: 'Lowercase letter',  test: (p: string) => /[a-z]/.test(p) },
    { key: 'number',  label: 'Number',            test: (p: string) => /[0-9]/.test(p) },
    { key: 'special', label: 'Special character', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const

function isPasswordStrong(p: string) { return RULES.every(r => r.test(p)) }

interface Props { setupRequired: boolean; onAuthenticated: () => void }

export function AuthView({ setupRequired, onAuthenticated }: Props) {
    const { setup, login } = useAuth()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm]   = useState('')
    const [error, setError]       = useState('')
    const [loading, setLoading]   = useState(false)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username.trim() || !password) return
        if (setupRequired) {
            if (!isPasswordStrong(password)) { setError('Password does not meet the requirements'); return }
            if (confirm !== password) { setError('Passwords do not match'); setConfirm(''); return }
        }
        setError(''); setLoading(true)
        try {
            setupRequired
                ? await setup(username.trim(), password, confirm)
                : await login(username.trim(), password)
            onAuthenticated()
        } catch (err: any) {
            setError(err?.response?.data?.error ?? err?.message ?? 'Authentication failed')
            setPassword('')
            setConfirm('')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={css.root}>
            <div className={css.grid} />
            <div className={css.orb} />
            <div className={css.orbSmall} />
            <Card variant="panel" className={css.card}>
            <CardBody>
            <form onSubmit={onSubmit} className={css.form}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span className={css.logo}>
                        <Database size={26} />
                    </span>
                    <div className={css.title}>Postgre Hub</div>
                    <div style={{ color: 'var(--om-fg-muted)' }}>
                        {setupRequired ? 'Create the first admin account' : 'Sign in to continue'}
                    </div>
                </div>

                <Input
                    size="lg"
                    label="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                    spellCheck={false}
                    autoFocus
                />

                <Input
                    size="lg"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete={setupRequired ? 'new-password' : 'current-password'}
                    disabled={loading}
                />

                {setupRequired && <>
                    <Input
                        size="lg"
                        label="Confirm password"
                        type="password"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        autoComplete="new-password"
                        disabled={loading}
                    />
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12 }}>
                        {RULES.map(r => {
                            const ok = r.test(password)
                            return (
                                <li key={r.key} style={{ color: ok ? 'var(--om-green)' : 'var(--om-fg-muted)' }}>
                                    {ok ? '✓' : '·'} {r.label}
                                </li>
                            )
                        })}
                    </ul>
                </>}

                {error && <Alert tone="error">{error}</Alert>}

                <Button variant={1} size="xl" type="submit" disabled={loading} style={{ marginTop: 4 }}>
                    {loading
                        ? (setupRequired ? 'Creating account…' : 'Signing in…')
                        : (setupRequired ? 'Create account' : 'Sign in')}
                </Button>
            </form>
            </CardBody>
            </Card>
        </div>
    )
}
