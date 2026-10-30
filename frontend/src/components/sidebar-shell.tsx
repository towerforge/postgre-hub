import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import css from '@/css/sidebar-shell.module.css'
import { Card } from '@/components/ui'

interface SidebarShellProps {
    menu: ReactNode
    sidebarHeader?: ReactNode
    headerLeft?: ReactNode
    headerRight?: ReactNode
    sidebarFooter?: ReactNode
    children: ReactNode
}

// Isla con menú lateral (tono de panel) y contenido centrado
export function SidebarShell({ menu, sidebarHeader, headerLeft, headerRight, sidebarFooter, children }: SidebarShellProps) {
    return (
        <div className={`tile ${css.glass}`} style={{ flex: 1, flexDirection: 'row', background: 'var(--om-bg)' }}>
            <Card as="nav" variant="panel" className={css.floatingNav}>
                {sidebarHeader && (
                    <div style={{ height: 49, flexShrink: 0, borderBottom: '1px solid var(--om-border)', display: 'flex', alignItems: 'center' }}>
                        {sidebarHeader}
                    </div>
                )}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {menu}
                </div>
                {sidebarFooter}
            </Card>

            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
                <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 36px 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                        <h1 style={{ flex: 1, minWidth: 200, margin: 0, fontSize: 20, fontWeight: 600, lineHeight: 1, color: 'var(--om-fg-bright)', display: 'flex', alignItems: 'center', height: 38 }}>{headerLeft}</h1>
                        {headerRight}
                    </div>
                </div>
                <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 16px 32px' }}>{children}</div>
            </div>
        </div>
    )
}

export function SidebarMenuLink({ to, label, icon, badge, end }: { to: string; label: string; icon?: ReactNode; badge?: ReactNode; end?: boolean }) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) => `conn-menu-item${isActive ? ' active' : ''}`}
        >
            {icon}
            {label}
            {badge != null && <span className="badge">{badge}</span>}
        </NavLink>
    )
}

export function SidebarMenuGroup({ label }: { label: string }) {
    return (
        <div style={{
            padding: '14px 20px 6px',
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--om-fg-muted)',
        }}>
            {label}
        </div>
    )
}
