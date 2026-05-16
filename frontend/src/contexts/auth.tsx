import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiAuthStatus, apiAuthSetup, apiAuthLogin, apiAuthLogout, apiAuthMe } from '@/services/api'

export interface AuthStatus {
    setup_required: boolean
    authenticated:  boolean
}

interface AuthCtx {
    status:   AuthStatus | null
    username: string
    loading:  boolean
    setup:   (username: string, password: string, confirmPassword: string) => Promise<void>
    login:   (username: string, password: string) => Promise<void>
    logout:  () => Promise<void>
    refresh: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [status, setStatus]     = useState<AuthStatus | null>(null)
    const [username, setUsername] = useState<string>('')
    const [loading, setLoading]   = useState(true)

    const refresh = async () => {
        try {
            const data = await apiAuthStatus()
            setStatus(data)
            if (data.authenticated) {
                apiAuthMe().then(me => setUsername(me.username)).catch(() => {})
            }
        } catch {
            setStatus({ setup_required: true, authenticated: false })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { refresh() }, [])

    const setup = async (u: string, password: string, confirmPassword: string) => {
        await apiAuthSetup(u, password, confirmPassword)
        setStatus({ setup_required: false, authenticated: true })
        apiAuthMe().then(me => setUsername(me.username)).catch(() => {})
    }

    const login = async (u: string, password: string) => {
        await apiAuthLogin(u, password)
        setStatus({ setup_required: false, authenticated: true })
        apiAuthMe().then(me => setUsername(me.username)).catch(() => {})
    }

    const logout = async () => {
        await apiAuthLogout()
        setStatus({ setup_required: false, authenticated: false })
        setUsername('')
    }

    return (
        <Ctx.Provider value={{ status, username, loading, setup, login, logout, refresh }}>
            {children}
        </Ctx.Provider>
    )
}

export function useAuth(): AuthCtx {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
    return ctx
}
