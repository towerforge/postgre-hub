import styles from "./SidebarLayout.module.css"

interface Props {
    children: React.ReactNode
    sidebar: React.ReactNode
}

export function SidebarLayout({ children, sidebar }: Props) {
    return (
        <div className={styles.root}>
            <div className={styles.content}>{children}</div>
            <aside className={styles.sidebar}>{sidebar}</aside>
        </div>
    )
}
