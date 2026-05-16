import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

interface SidebarShellProps {
    menu: ReactNode
    sidebarHeader?: ReactNode
    headerLeft?: ReactNode
    headerRight?: ReactNode
    sidebarFooter?: ReactNode
    children: ReactNode
}

export function SidebarShell({ menu, sidebarHeader, headerLeft, headerRight, sidebarFooter, children }: SidebarShellProps) {
    return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', background: 'var(--om-bg)' }}>
            <div style={{ width: '100%', maxWidth: 1100, display: 'flex', flexDirection: 'row', minHeight: 0 }}>
                <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--om-border)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: 49, flexShrink: 0, borderBottom: sidebarHeader ? '1px solid var(--om-border)' : 'none', display: 'flex', alignItems: 'center' }}>
                        {sidebarHeader}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 0 8px', marginTop: -1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {menu}
                    </div>
                    {sidebarFooter}
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: 49, flexShrink: 0, padding: '0 22px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--om-border)' }}>
                        <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--om-fg-muted)' }}>{headerLeft}</span>
                        {headerRight}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>{children}</div>
                </div>
            </div>
        </div>
    )
}

export function SidebarMenuLink({ to, label, end }: { to: string; label: string; end?: boolean }) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) => `conn-menu-item${isActive ? ' active' : ''}`}
        >
            {label}
        </NavLink>
    )
}

export function SidebarMenuGroup({ label }: { label: string }) {
    return (
        <div style={{
            padding: '12px 22px 4px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--om-fg-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
        }}>
            {label}
        </div>
    )
}
