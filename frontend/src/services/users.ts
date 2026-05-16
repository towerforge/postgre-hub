import { get, post, del, put } from './http'

export type User = { id: string; username: string; created_at: number }

export const apiListUsers  = ()                                            => get<User[]>('/users')
export const apiCreateUser = (body: { username: string; password: string }) => post<{ id: string }>('/users', body)
export const apiDeleteUser = (id: string)                                   => del<void>(`/users?id=${encodeURIComponent(id)}`)
export const apiUpdateUser = (id: string, body: { new_password: string })   =>
    put<void>(`/users/update?id=${encodeURIComponent(id)}`, body)
