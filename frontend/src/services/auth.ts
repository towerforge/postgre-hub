import { get, post } from './http'

// ── Session ───────────────────────────────────────────────────────────────────

export const apiAuthStatus = () => get<{ setup_required: boolean; authenticated: boolean }>('/api/auth/status')
export const apiAuthSetup  = (username: string, password: string, confirm_password: string) =>
    post<void>('/api/auth/setup', { username, password, confirm_password })
export const apiAuthLogin  = (username: string, password: string) => post<void>('/api/auth/login', { username, password })
export const apiAuthLogout = () => post<void>('/api/auth/logout')
export const apiAuthMe     = () => get<{ id: string; username: string }>('/api/auth/me')
export const apiUpdateCredentials = (body: {
    current_password: string
    new_username?: string
    new_password?: string
    confirm_new_password?: string
}) => post<void>('/api/auth/credentials', body)
