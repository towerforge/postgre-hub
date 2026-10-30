import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Server, User, Users, Palette, Blocks, Info, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { CONNECTION_COLORS, IconButton } from '@/components/ui'
import { AboutModal } from '@/components/about-modal'
import { SidebarShell, SidebarMenuLink, SidebarMenuGroup } from './sidebar-shell'

export function avatarColor(id: string, override?: string | null): string {
    if (override) return override
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
    return CONNECTION_COLORS[h % CONNECTION_COLORS.length]
}

export function initialsOf(name: string): string {
    const parts = name.split(/[\s_\-.]+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
}

interface Props {
    headerLeft: ReactNode
    headerRight: ReactNode
    children: ReactNode
}

const ICON = 15

export function ProjectsShell({ headerLeft, headerRight, children }: Props) {
    const { username, logout } = useAuth()
    const navigate = useNavigate()
    const [aboutOpen, setAboutOpen] = useState(false)

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    // Pie del menú: usuario, acerca de y salir
    const footer = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 8px', padding: '8px 4px 8px 12px', borderTop: '1px solid var(--om-border)' }}>
            <span style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'var(--om-bg-4)', color: 'var(--om-fg-bright)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600,
            }}>
                {(username || '?').slice(0, 1).toUpperCase()}
            </span>
            <span style={{ flex: 1, minWidth: 0, color: 'var(--om-fg-bright)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {username || '—'}
            </span>
            <IconButton label="About Postgre Hub" onClick={() => setAboutOpen(true)}>
                <Info size={ICON} />
            </IconButton>
            <IconButton label="Log out" onClick={handleLogout}>
                <LogOut size={ICON} />
            </IconButton>
            <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
        </div>
    )

    return (
        <SidebarShell
            headerLeft={headerLeft}
            headerRight={headerRight}
            menu={<>
                <SidebarMenuLink to="/connections" label="Connections" icon={<Database size={ICON} />} end />
                <SidebarMenuLink to="/ssh-tunnels" label="SSH Tunnels" icon={<Server size={ICON} />} />
                <SidebarMenuGroup label="Settings" />
                <SidebarMenuLink to="/account"    label="Account"    icon={<User size={ICON} />} />
                <SidebarMenuLink to="/users"      label="Users"      icon={<Users size={ICON} />} />
                <SidebarMenuLink to="/appearance" label="Appearance" icon={<Palette size={ICON} />} />
                {import.meta.env.DEV && <>
                    <SidebarMenuGroup label="Development" />
                    <SidebarMenuLink to="/_dev" label="UI components" icon={<Blocks size={ICON} />} />
                </>}
            </>}
            sidebarFooter={footer}
        >
            {children}
        </SidebarShell>
    )
}
