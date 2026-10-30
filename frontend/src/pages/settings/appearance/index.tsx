import { useEffect } from 'react'
import { Sun, Monitor, Moon, Check } from 'lucide-react'
import { ListItem, ListItemGroup } from '@/components/ui'
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
            <ListItemGroup>
                {OPTIONS.map(opt => {
                    const selected = theme === opt.value
                    return (
                        <ListItem
                            key={opt.value}
                            selected={selected}
                            onClick={() => setTheme(opt.value)}
                            leading={
                                <span className="conn-avatar" style={{ background: selected ? 'var(--om-primary)' : 'var(--om-bg-4)' }}>
                                    {opt.icon}
                                </span>
                            }
                            title={opt.label}
                            subtitle={opt.description}
                            mono={false}
                            actions={selected && <Check size={16} style={{ color: 'var(--om-accent)' }} />}
                        />
                    )
                })}
            </ListItemGroup>
        </ProjectsShell>
    )
}
