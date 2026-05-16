import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { SidebarShell, SidebarMenuLink } from './sidebar-shell'

function MenuDivider() {
    return (
        <div
            aria-hidden
            style={{
                margin: '6px 22px',
                borderTop: '1px dashed var(--om-border)',
            }}
        />
    )
}

const AVATAR_PALETTE = ['#8aa6c1', '#c4a7e7', '#91b4b8', '#9eb87f', '#d8b88a', '#c98c6c', '#c47b7b']

export function avatarColor(id: string): string {
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
    return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
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

export function ProjectsShell({ headerLeft, headerRight, children }: Props) {
    const { username, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    const footer = (
        <div style={{
            borderTop: '1px dashed var(--om-border)',
            padding: '14px 22px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            lineHeight: 1.7,
        }}>
            <div>
                <span style={{ color: 'var(--om-green)' }}>❯</span>{' '}
                <span style={{ color: 'var(--om-fg-muted)' }}>user:</span>{' '}
                <span style={{ color: 'var(--om-fg-bright)' }}>{username || '—'}</span>
            </div>
            <div style={{
                color: 'var(--om-border)',
                letterSpacing: '-1px',
                userSelect: 'none',
                lineHeight: 1,
                padding: '6px 0',
            }}>
                ─────────────
            </div>
            <button
                onClick={handleLogout}
                style={{
                    background: 'transparent',
                    border: 0,
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
            >
                <span style={{ color: 'var(--om-green)' }}>❯</span>{' '}
                <span style={{ color: 'var(--om-red)' }}>[ exit ]</span>
            </button>
        </div>
    )

    return (
        <SidebarShell
            headerLeft={headerLeft}
            headerRight={headerRight}
            menu={<>
                <SidebarMenuLink to="/connections" label="Connections" end />
                <SidebarMenuLink to="/ssh-tunnels" label="SSH Tunnels" />
                <MenuDivider />
                <SidebarMenuLink to="/account" label="Account" />
                <SidebarMenuLink to="/users"   label="Users" />
            </>}
            sidebarFooter={footer}
        >
            {children}
        </SidebarShell>
    )
}
