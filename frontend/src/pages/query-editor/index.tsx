import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { usePageTitle } from '@/contexts/page-title'
import { useSidebars } from '@/contexts/sidebars'
import { avatarColor } from '@/components/projects-shell'
import {
    apiGetProject, apiListTables, apiListTypes, apiListSequences, apiListRoutines,
    type Project, type TableInfo, type TypeInfo, type SequenceInfo, type RoutineInfo,
} from '@/services/database'
import { SqlEditor } from './sql-editor'
import { SchemaSidebar } from './schema-sidebar'
import type { NewTabReq } from './utils'

export default function QueryEditor() {
    const { id } = useParams<{ id: string }>()
    const { setPageTitle } = usePageTitle()
    const { leftVisible, rightVisible } = useSidebars()

    const [project,        setProject]        = useState<Project | null>(null)
    const [tables,         setTables]         = useState<TableInfo[]>([])
    const [types,          setTypes]          = useState<TypeInfo[]>([])
    const [sequences,      setSequences]      = useState<SequenceInfo[]>([])
    const [routines,       setRoutines]       = useState<RoutineInfo[]>([])
    const [sidebarLoading, setSidebarLoading] = useState(true)
    const [newTabReq,      setNewTabReq]      = useState<NewTabReq | null>(null)
    const tabReqKey = useRef(0)

    useEffect(() => {
        if (!id) return
        Promise.all([apiGetProject(id), apiListTables(id), apiListTypes(id)])
            .then(([proj, tbls, typs]) => {
                setProject(proj)
                setTables(tbls.tables)
                setTypes(typs.types)
                setPageTitle(proj.name, `${proj.host}:${proj.port}/${proj.database}`, avatarColor(proj.id))
            })
            .finally(() => setSidebarLoading(false))
        apiListSequences(id).then(r => setSequences(r.sequences)).catch(() => {})
        apiListRoutines(id).then(r => setRoutines(r.routines)).catch(() => {})
    }, [id])

    const openTableTab = (table: TableInfo) => {
        const sql = `SELECT *\nFROM "${table.schema}"."${table.name}"\nLIMIT 100;`
        setNewTabReq({ sql, label: `${table.name}.sql`, key: ++tabReqKey.current, autoRun: true, schema: table.schema, tableName: table.name })
    }

    const openTypeTab = (type: TypeInfo) => {
        const sql = type.kind === 'enum' && type.values
            ? `-- ${type.schema}.${type.name} (${type.kind})\n-- Values: ${type.values.join(', ')}\n\nSELECT * FROM pg_type WHERE typname = '${type.name}';`
            : `-- ${type.schema}.${type.name} (${type.kind})\n\nSELECT * FROM pg_type WHERE typname = '${type.name}';`
        setNewTabReq({ sql, label: `${type.name}.sql`, key: ++tabReqKey.current, autoRun: true })
    }

    const openSequenceTab = (seq: SequenceInfo) => {
        const sql = `SELECT * FROM "${seq.schema}"."${seq.name}";`
        setNewTabReq({ sql, label: `${seq.name}.sql`, key: ++tabReqKey.current, autoRun: true })
    }

    const openRoutineTab = (r: RoutineInfo) => {
        const sql = `SELECT routine_definition\nFROM information_schema.routines\nWHERE routine_schema = '${r.schema}'\n  AND routine_name = '${r.name}';`
        setNewTabReq({ sql, label: `${r.name}.sql`, key: ++tabReqKey.current, autoRun: true })
    }

    return (
        <div style={{ display: 'flex', height: '100%', background: 'var(--vsc-bg)' }}>

            {leftVisible && (
                <SchemaSidebar
                    projectId={id!}
                    project={project}
                    tables={tables}
                    types={types}
                    sequences={sequences}
                    routines={routines}
                    loading={sidebarLoading}
                    onOpenTable={openTableTab}
                    onOpenType={openTypeTab}
                    onOpenSequence={openSequenceTab}
                    onOpenRoutine={openRoutineTab}
                />
            )}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
                <SqlEditor projectId={id!} project={project} newTabReq={newTabReq} tables={tables} showInspector={rightVisible} />
            </div>
        </div>
    )
}
