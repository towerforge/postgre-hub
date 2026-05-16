export const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1000
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// unix seconds → "23 min ago" / "14:32" (same day) / "12 Apr" (older)
export const formatRelativeTime = (unixSec: number): string => {
    if (!unixSec) return '—'
    const date = new Date(unixSec * 1000)
    const now = new Date()
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000)

    if (diffMin < 60) return `${diffMin} min ago`

    const sameDay =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth()    === now.getMonth()    &&
        date.getDate()     === now.getDate()

    if (sameDay) {
        const h = date.getHours().toString().padStart(2, '0')
        const m = date.getMinutes().toString().padStart(2, '0')
        return `${h}:${m}`
    }

    return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export const formatTooltipTime = (timestamp: number) => {
    const now = Date.now()
    const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000))
    const date = new Date(timestamp)
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    if (diffSeconds === 0) return 'Just now'
    let ago = ''
    if (diffSeconds < 60)        ago = `${diffSeconds}s`
    else if (diffSeconds < 3600) ago = `${Math.floor(diffSeconds / 60)}m`
    else if (diffSeconds < 86400) ago = `${Math.floor(diffSeconds / 3600)}h`
    else                          ago = `${Math.floor(diffSeconds / 86400)}d`
    return `${timeStr} (${ago} ago)`
}
