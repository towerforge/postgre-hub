import { get, post, put, del } from './http'

export interface SshTunnel {
    id:          string
    name:        string
    host:        string
    port:        number
    username:    string
    auth_type:   string
    private_key: string
    created_at:  number
}

export interface SshTunnelInput {
    name:        string
    host:        string
    port:        number
    username:    string
    auth_type:   'password' | 'key'
    password?:   string
    private_key?: string
}

export const apiListTunnels   = ()                                    => get<{ tunnels: SshTunnel[] }>('/api/tunnels')
export const apiCreateTunnel  = (body: SshTunnelInput)                => post<{ id: string }>('/api/tunnels', body)
export const apiUpdateTunnel  = (id: string, body: SshTunnelInput)    => put<{ ok: boolean }>(`/api/tunnels/${id}`, body)
export const apiDeleteTunnel  = (id: string)                          => del<{ ok: boolean }>(`/api/tunnels/${id}`)
export const apiTestTunnel    = (id: string)                          => post<{ ok: boolean; message?: string; error?: string }>(`/api/tunnels/${id}/test`)
