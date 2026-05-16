export async function get<T>(url: string): Promise<T> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
}

export async function del<T>(url: string): Promise<T> {
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body != null ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw Object.assign(new Error(data?.error ?? res.statusText), { response: { data } })
    }
    return res.json().catch(() => ({}) as T)
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
    const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: body != null ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw Object.assign(new Error((data as any)?.error ?? res.statusText), { response: { data } })
    }
    return res.json().catch(() => ({}) as T)
}
