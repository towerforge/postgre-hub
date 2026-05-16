import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useSpinner } from '@/components/ui'


const RULES = [
    { key: 'length',  label: 'at least 8 chars',         test: (p: string) => p.length >= 8 },
    { key: 'upper',   label: 'one uppercase letter',     test: (p: string) => /[A-Z]/.test(p) },
    { key: 'lower',   label: 'one lowercase letter',     test: (p: string) => /[a-z]/.test(p) },
    { key: 'number',  label: 'one number',               test: (p: string) => /[0-9]/.test(p) },
    { key: 'special', label: 'one special char (!@#$…)', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const

function isPasswordStrong(p: string) { return RULES.every(r => r.test(p)) }

type Step = 'username' | 'password' | 'confirm' | 'done'

interface Props { setupRequired: boolean; onAuthenticated: () => void }

export function AuthView({ setupRequired, onAuthenticated }: Props) {
    const { setup, login } = useAuth()
    const [step, setStep]         = useState<Step>('username')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm]   = useState('')
    const [error, setError]       = useState('')
    const [loading, setLoading]   = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const spinner = useSpinner(loading)

    useEffect(() => { inputRef.current?.focus() }, [step])

    const submit = async (user: string, pass: string, conf: string) => {
        setError(''); setLoading(true)
        try {
            setupRequired
                ? await setup(user.trim(), pass, conf)
                : await login(user.trim(), pass)
            setStep('done')
            onAuthenticated()
        } catch (err: any) {
            setError(err?.response?.data?.error ?? err?.message ?? 'authentication failed')
            // Reset to first step so user can retype
            setStep('username')
            setPassword('')
            setConfirm('')
        } finally {
            setLoading(false)
        }
    }

    const onKey = async (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        if (step === 'username') {
            if (!username.trim()) return
            setStep('password')
        } else if (step === 'password') {
            if (!password.length) return
            if (setupRequired) {
                if (!isPasswordStrong(password)) return
                setStep('confirm')
            } else {
                await submit(username, password, '')
            }
        } else if (step === 'confirm') {
            if (confirm.length === 0) return
            if (confirm !== password) {
                setError('passwords do not match'); setConfirm(''); return
            }
            await submit(username, password, confirm)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
            padding: '14vh 24px 24px',
            background: 'var(--om-gap)',
            fontFamily: 'var(--font-mono)',
        }}>
            <div className="ascii-box" style={{ width: 580, maxWidth: '94vw', display: 'block' }}>
                <span className="ascii-corner tl">+</span>
                <span className="ascii-corner tr">+</span>
                <span className="ascii-corner bl">+</span>
                <span className="ascii-corner br">+</span>

                <div style={{
                    padding: '22px 20px 18px',
                    borderBottom: '1px solid var(--om-border)',
                    textAlign: 'center',
                }}>
                    <h1 style={{
                        margin: 0,
                        fontFamily: '"Press Start 2P", "JetBrains Mono", monospace',
                        fontSize: 'clamp(14px, 2.5vw, 22px)',
                        color: 'var(--om-green)',
                        letterSpacing: '0.06em',
                        textShadow: '0 0 8px rgba(158,184,127,0.25)',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                    }}>
                        POSTGRE-HUB
                    </h1>
                </div>

                <div className="term-shell" onClick={() => inputRef.current?.focus()}>
                    <div className="term-line term-banner">
                        <span className="term-prompt">$</span> {setupRequired ? 'setup' : 'login'}
                    </div>

                    {step !== 'username' && (
                        <div className="term-line">
                            <span className="term-prompt">❯</span>
                            <span className="term-label">username:</span>
                            <span className="term-val">{username}</span>
                        </div>
                    )}
                    {step === 'username' && (
                        <div className="term-line">
                            <span className="term-prompt">❯</span>
                            <span className="term-label">username:</span>
                            <span className="term-val">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    onKeyDown={onKey}
                                    autoComplete="username"
                                    spellCheck={false}
                                />
                            </span>
                        </div>
                    )}

                    {step === 'confirm' && (
                        <div className="term-line">
                            <span className="term-prompt">❯</span>
                            <span className="term-label">password:</span>
                            <span className="term-val">{'•'.repeat(Math.min(password.length, 12))}</span>
                        </div>
                    )}
                    {step === 'password' && (
                        <div className="term-line">
                            <span className="term-prompt">❯</span>
                            <span className="term-label">password:</span>
                            <span className="term-val">
                                <input
                                    ref={inputRef}
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onKeyDown={onKey}
                                    autoComplete={setupRequired ? 'new-password' : 'current-password'}
                                    disabled={loading}
                                />
                            </span>
                        </div>
                    )}

                    {step === 'confirm' && (
                        <div className="term-line">
                            <span className="term-prompt">❯</span>
                            <span className="term-label">confirm:</span>
                            <span className="term-val">
                                <input
                                    ref={inputRef}
                                    type="password"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    onKeyDown={onKey}
                                    autoComplete="new-password"
                                />
                            </span>
                        </div>
                    )}

                    {setupRequired && step === 'password' && password.length > 0 && !isPasswordStrong(password) && (
                        <div className="term-block">
                            {RULES.map(r => {
                                const ok = r.test(password)
                                return (
                                    <div key={r.key} className="term-line" style={{ color: ok ? 'var(--om-green)' : 'var(--om-fg-muted)' }}>
                                        {ok ? '  ✓' : '  ·'} {r.label}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {loading && (
                        <div className="term-line" style={{ marginTop: 12 }}>
                            <span style={{ color: 'var(--om-green)' }}>{spinner}</span>
                            <span style={{ color: 'var(--om-fg-dim)' }}>authenticating…</span>
                        </div>
                    )}

                    {error && (
                        <div className="term-line term-err">[ERR] {error}</div>
                    )}

                    {!loading && step !== 'done' && (
                        <div className="term-line term-hint">
                            <span className="term-prompt-muted">␣</span> press <b>enter</b> to continue
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
