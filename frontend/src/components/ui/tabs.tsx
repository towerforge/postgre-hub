import { createContext, useContext, useState } from "react"
import styles from "@/css/ui/tabs.module.css"

/* ── Context ──────────────────────────────────────────── */
interface TabsCtx {
    active: string
    setActive: (id: string) => void
}

const Ctx = createContext<TabsCtx | null>(null)

const useTabsCtx = () => {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error("Tabs subcomponents must be used inside <Tabs>")
    return ctx
}

/* ── Root ─────────────────────────────────────────────── */
interface TabsProps {
    defaultTab?: string
    value?: string
    onChange?: (id: string) => void
    className?: string
    children: React.ReactNode
}

export function Tabs({ defaultTab = "", value, onChange, className = "", children }: TabsProps) {
    const [internal, setInternal] = useState(defaultTab)
    const active = value !== undefined ? value : internal
    const setActive = (id: string) => {
        if (value === undefined) setInternal(id)
        onChange?.(id)
    }

    return (
        <Ctx.Provider value={{ active, setActive }}>
            <div className={`${styles.root} ${className}`}>{children}</div>
        </Ctx.Provider>
    )
}

/* ── Tab bar ──────────────────────────────────────────── */
interface TabBarProps {
    actions?: React.ReactNode
    className?: string
    children: React.ReactNode
}

export function TabBar({ actions, className = "", children }: TabBarProps) {
    return (
        <div className={`${styles.bar} ${className}`}>
            {children}
            {actions && <div className={styles.actions}>{actions}</div>}
        </div>
    )
}

/* ── Individual tab trigger ───────────────────────────── */
interface TabProps {
    id: string
    icon?: React.ReactNode
    badge?: string | number
    disabled?: boolean
    className?: string
    children: React.ReactNode
}

export function Tab({ id, icon, badge, disabled = false, className = "", children }: TabProps) {
    const { active, setActive } = useTabsCtx()
    const isActive = active === id

    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => !disabled && setActive(id)}
            className={`${styles.tab} ${isActive ? styles.active : ""} ${className}`}
        >
            {icon}
            {children}
            {badge !== undefined && <span className={styles.badge}>{badge}</span>}
        </button>
    )
}

/* ── Content panel ────────────────────────────────────── */
interface TabPanelProps {
    id: string
    className?: string
    children: React.ReactNode
}

export function TabPanel({ id, className = "", children }: TabPanelProps) {
    const { active } = useTabsCtx()
    if (active !== id) return null
    return (
        <div role="tabpanel" className={`${styles.panel} ${className}`}>
            {children}
        </div>
    )
}
