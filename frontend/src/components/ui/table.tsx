import styles from "@/css/ui/table.module.css"

export interface Column<T> {
    key: string
    header: string
    align?: "left" | "right"
    shrink?: boolean
    render: (row: T) => React.ReactNode
}

interface TableProps<T> {
    columns: Column<T>[]
    data: T[]
    keyExtractor: (row: T) => string
    emptyMessage?: string
    onRowClick?: (row: T) => void
    onRowHover?: (row: T | null) => void
    rowStyle?: (row: T) => React.CSSProperties
}

export function Table<T>({
    columns,
    data,
    keyExtractor,
    emptyMessage = "No results found.",
    onRowClick,
    onRowHover,
    rowStyle,
}: TableProps<T>) {
    if (data.length === 0) {
        return (
            <div className={styles.empty}>
                {emptyMessage}
            </div>
        )
    }

    const contentCols = columns.filter(col => col.header !== "")
    const actionCol   = columns.find(col => col.header === "")

    return (
        <>
            <div className={styles.tableView}>
                <div className={styles.wrap}>
                    <table className={styles.table}>
                        <thead className={styles.thead}>
                            <tr className={styles.tr}>
                                {columns.map(col => {
                                    const cls = [
                                        styles.th,
                                        col.align === "right" ? styles.right : "",
                                        col.shrink ? styles.shrink : "",
                                    ].filter(Boolean).join(" ")
                                    return <th key={col.key} className={cls}>{col.header}</th>
                                })}
                            </tr>
                        </thead>
                        <tbody className={styles.tbody}>
                            {data.map(row => (
                                <tr
                                    key={keyExtractor(row)}
                                    className={styles.tr}
                                    style={{ cursor: onRowClick ? "pointer" : undefined, ...rowStyle?.(row) }}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                    onMouseEnter={onRowHover ? () => onRowHover(row) : undefined}
                                    onMouseLeave={onRowHover ? () => onRowHover(null) : undefined}
                                >
                                    {columns.map(col => {
                                        const cls = [
                                            styles.td,
                                            col.align === "right" ? styles.right : "",
                                            col.shrink ? styles.shrink : "",
                                        ].filter(Boolean).join(" ")
                                        return <td key={col.key} className={cls}>{col.render(row)}</td>
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={styles.cardView}>
                {data.map(row => (
                    <div
                        key={keyExtractor(row)}
                        className={styles.card}
                        style={{ cursor: onRowClick ? "pointer" : undefined, ...rowStyle?.(row) }}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                        {contentCols.map(col => (
                            <div key={col.key} className={styles.cardRow}>
                                <span className={styles.cardLabel}>{col.header}</span>
                                <span className={styles.cardValue}>{col.render(row)}</span>
                            </div>
                        ))}
                        {actionCol && (
                            <div className={styles.cardActions}>
                                {actionCol.render(row)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    )
}

export function TableCell({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <span className={styles.cell}>
            {icon && <span className={styles.icon}>{icon}</span>}
            {children}
        </span>
    )
}
