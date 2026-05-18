export function parseTablesFromSQL(sql: string): string[] {
    const tables: string[] = []
    const re = /(?:FROM|JOIN)\s+(?:"(\w+)"\."(\w+)"|(\w+)\.(\w+)|"(\w+)"|([a-z_]\w*))/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(sql)) !== null) {
        const t = m[1] && m[2] ? `${m[1]}.${m[2]}`
            : m[3] && m[4] ? `${m[3]}.${m[4]}`
            : (m[5] ?? m[6] ?? null)
        if (t) tables.push(t)
    }
    return [...new Set(tables)]
}

export function groupBy<T extends { schema: string }>(items: T[]): Record<string, T[]> {
    return items.reduce<Record<string, T[]>>((acc, t) => {
        if (!acc[t.schema]) acc[t.schema] = []
        acc[t.schema].push(t)
        return acc
    }, {})
}

export function fmtSize(bytes: number | null | undefined): string {
    if (bytes == null) return ''
    if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`
    if (bytes >= 1_048_576)     return `${(bytes / 1_048_576).toFixed(2)} MB`
    if (bytes >= 1_024)         return `${Math.round(bytes / 1_024)} KB`
    return bytes > 0 ? `${bytes} B` : ''
}

export function fmtRows(n: number | null | undefined): string {
    if (n == null || n < 0) return ''
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
    if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000)         return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
    return String(n)
}

export interface InspectorData {
    database: string
    duration: number
    rows: number
    total?: number
    tables: string[]
    columns?: { name: string; type: string }[]
}

export type QueryTab = { id: string; label: string; sql: string; schema?: string; tableName?: string }

export interface NewTabReq { sql: string; label: string; key: number; autoRun?: boolean; schema?: string; tableName?: string }

let _tabCtr = 0
export const newTabId = () => `tab_${++_tabCtr}`

/** Excel-style column label: 0 → A, 25 → Z, 26 → AA, … */
export function excelCol(n: number): string {
    let s = ''
    let k = n + 1
    while (k > 0) {
        k--
        s = String.fromCharCode(65 + (k % 26)) + s
        k = Math.floor(k / 26)
    }
    return s
}
