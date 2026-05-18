import { get, post, put, del } from './http'

export interface Project {
    id:              string
    name:            string
    host:            string
    port:            number
    database:        string
    username:        string
    ssl_mode:        string
    ssl_ca:          string
    ssl_client_cert: string
    ssh_enabled:     boolean
    ssh_host:        string
    ssh_port:        number
    ssh_user:        string
    ssh_key_set:     boolean
    ssh_tunnel_id:   string | null
    created_at:      number
}

export interface ProjectInput {
    name:              string
    host:              string
    port:              number
    database:          string
    username:          string
    password?:         string
    ssl_mode:          string
    ssl_ca:            string
    ssl_client_cert:   string
    ssl_client_key?:   string
    ssh_enabled:       boolean
    ssh_host:          string
    ssh_port:          number
    ssh_user:          string
    ssh_password?:     string
    ssh_private_key?:  string
    ssh_tunnel_id?:    string | null
}

export interface TableInfo {
    schema:      string
    name:        string
    type:        string
    size_bytes?: number | null
    row_count?:  number | null
}

export interface ColumnInfo {
    name:     string
    type:     string
    nullable: boolean
    default:  string | null
}

export interface TableDataResult {
    data:   Record<string, unknown>[]
    total:  number
    limit:  number
    offset: number
}

export const apiListProjects = () =>
    get<{ projects: Project[] }>('/api/projects')

export const apiGetProject = (id: string) =>
    get<Project>(`/api/projects/${id}`)

export const apiCreateProject = (body: ProjectInput) =>
    post<{ id: string; ok: boolean }>('/api/projects', body)

export const apiUpdateProject = (id: string, body: ProjectInput) =>
    put<{ ok: boolean }>(`/api/projects/${id}`, body)

export const apiDeleteProject = (id: string) =>
    del<{ ok: boolean }>(`/api/projects/${id}`)

export const apiTestConnection = (id: string) =>
    post<{ ok: boolean; version?: string; error?: string }>(`/api/projects/${id}/test`)

export const apiListTables = (id: string) =>
    get<{ tables: TableInfo[] }>(`/api/projects/${id}/tables`)

export const apiGetTableData = (id: string, table: string, schema = 'public', limit = 100, offset = 0) =>
    get<TableDataResult>(`/api/projects/${id}/tables/${table}?schema=${schema}&limit=${limit}&offset=${offset}`)

export const apiGetTableSchema = (id: string, table: string, schema = 'public') =>
    get<{ columns: ColumnInfo[] }>(`/api/projects/${id}/tables/${table}/schema?schema=${schema}`)

export interface QueryColumn {
    name: string
    type: string
}

export interface QueryResult {
    columns:      QueryColumn[]
    rows:         unknown[][]
    total:        number
    affected?:    number
    duration_ms?: number
}

export const apiRunQuery = (id: string, sql: string) =>
    post<QueryResult>(`/api/projects/${id}/query`, { sql })

export interface SetCell    { name: string; type: string; raw: string }
export interface WhereCell  { name: string; type: string; value: string | null }
export interface InsertCell { name: string; type: string; raw: string }
export interface UpdateRow  { set: SetCell[]; where: WhereCell[] }
export interface DeleteRow  { where: WhereCell[] }
export interface InsertRow  { values: InsertCell[] }

export const apiBuildChanges = (
    id: string,
    body: { schema: string; table: string; inserts: InsertRow[]; updates: UpdateRow[]; deletes: DeleteRow[] },
) =>
    post<{ sql: string }>(`/api/projects/${id}/build-changes`, body)

export interface TypeInfo {
    schema: string
    name:   string
    kind:   'enum' | 'domain' | 'composite' | 'other'
    values: string[] | null
}

export const apiListTypes = (id: string) =>
    get<{ types: TypeInfo[] }>(`/api/projects/${id}/types`)

export interface SequenceInfo {
    schema:    string
    name:      string
    data_type: string
    start:     string
    min:       string
    max:       string
    increment: string
    cycle:     boolean
}

export const apiListSequences = (id: string) =>
    get<{ sequences: SequenceInfo[] }>(`/api/projects/${id}/sequences`)

export interface RoutineInfo {
    schema:   string
    name:     string
    kind:     string
    returns:  string | null
    language: string | null
}

export const apiListRoutines = (id: string) =>
    get<{ routines: RoutineInfo[] }>(`/api/projects/${id}/routines`)

export interface SessionInfo {
    pid:             number
    user:            string
    app:             string
    client:          string
    state:           string
    wait_event_type: string
    wait_event:      string
    query:           string
    duration_s:      number
}

export const apiGetSessions = (id: string) =>
    get<{ sessions: SessionInfo[] }>(`/api/projects/${id}/sessions`)

export const apiExplainQuery = (id: string, sql: string) =>
    post<{ plan: unknown }>(`/api/projects/${id}/query/explain`, { sql })

export async function apiExportDump(id: string): Promise<Blob> {
    const res = await fetch(`/api/projects/${id}/export`, { credentials: 'include' })
    if (!res.ok) throw new Error(await res.text())
    return res.blob()
}

export async function apiImportDump(id: string, file: File): Promise<{ ok: boolean; statements: number }> {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/projects/${id}/import`, {
        method: 'POST',
        credentials: 'include',
        body: form,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Import failed')
    return data
}
