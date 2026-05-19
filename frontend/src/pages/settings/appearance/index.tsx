import { useEffect } from 'react'
import { Sun, Monitor, Moon } from 'lucide-react'
import { ProjectsShell } from '@/components/projects-shell'
import { usePageTitle } from '@/contexts/page-title'
import { useTheme, type Theme } from '@/hooks/use-theme'

const OPTIONS: { value: Theme; label: string; description: string; icon: React.ReactNode }[] = [
    { value: 'system', label: 'System', description: 'Follow the operating system preference.', icon: <Monitor size={16} /> },
    { value: 'dark',   label: 'Dark',   description: 'Application dark theme.',                 icon: <Moon size={16} /> },
    { value: 'light',  label: 'Light',  description: 'Application light theme.',                icon: <Sun size={16} /> },
]

export default function AppearancePage() {
    const { theme, setTheme } = useTheme()
    const { setPageTitle } = usePageTitle()
    useEffect(() => { setPageTitle('Appearance') }, [])

    return (
        <ProjectsShell headerLeft="Appearance" headerRight={null}>
            <div style={{ padding: 24 }}>
                <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 13, color: 'var(--om-fg)', marginBottom: 4 }}>
                        Theme
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--om-fg-muted)', marginBottom: 12 }}>
                        Choose how the app looks. The preference is stored locally in this browser.
                    </div>
                    {OPTIONS.map(opt => {
                        const selected = theme === opt.value
                        return (
                            <button
                                key={opt.value}
                                onClick={() => setTheme(opt.value)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 14px',
                                    background: selected ? 'var(--om-bg-3)' : 'var(--om-bg-2)',
                                    border: `1px solid ${selected ? 'var(--om-green)' : 'var(--om-border)'}`,
                                    color: 'var(--om-fg)',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-family)',
                                    fontSize: 13,
                                    textAlign: 'left',
                                    transition: 'border-color 0.12s, background 0.12s',
                                }}
                            >
                                <span style={{ color: selected ? 'var(--om-green)' : 'var(--om-fg-muted)', display: 'inline-flex' }}>
                                    {opt.icon}
                                </span>
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                                    <span style={{ color: 'var(--om-fg-bright)', fontWeight: 500 }}>{opt.label}</span>
                                    <span style={{ color: 'var(--om-fg-muted)', fontSize: 11.5 }}>{opt.description}</span>
                                </span>
                                {selected && <span style={{ color: 'var(--om-green)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>[active]</span>}
                            </button>
                        )
                    })}
                </div>
            </div>
        </ProjectsShell>
    )
}
