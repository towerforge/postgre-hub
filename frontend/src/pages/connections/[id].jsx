// Editor SQL de una conexión (/connections/:id): a la izquierda el árbol del
// esquema, en el centro las pestañas de consulta y, encima, los modales de
// exportar, importar y diagrama ER. Esta pantalla carga lo que comparten todas
// las piezas (la conexión, sus tablas, tipos, secuencias, rutinas y estructura)
// y traduce los clics del árbol en peticiones de pestaña nueva para el editor.
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { usePageTitle } from "@/contexts/page-title-context";
import { useSidebars } from "@/contexts/sidebars-context";
import { useSetToolbar } from "@/contexts/toolbar-context";
import { Network, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui";
import { avatarColor } from "@/components/connections-shell";
import {
  apiGetProject,
  apiListTables,
  apiListTypes,
  apiListSequences,
  apiListRoutines,
  apiGetStructure,
} from "@/services/connections";
import { SqlEditor } from "./_sql-editor";
import { SchemaSidebar } from "./_schema-sidebar";
import { ExportModal, ImportModal } from "./_sql-transfer-modals";
import { ErDiagramModal } from "./_er-diagram-modal";

const QueryEditor = () => {
  const { id } = useParams();
  const { setPageTitle } = usePageTitle();
  const { leftVisible, rightVisible } = useSidebars();

  const [project, setProject] = useState(null);
  const [tables, setTables] = useState([]);
  const [types, setTypes] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [newTabReq, setNewTabReq] = useState(null);
  const [transfer, setTransfer] = useState(null);
  const [structure, setStructure] = useState(null);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const tabReqKey = useRef(0);

  // Recarga el árbol de esquemas (también después de importar).
  const loadSchema = () => {
    if (!id) return;
    apiListTables(id)
      .then((r) => setTables(r.tables))
      .catch(() => {});
    apiListTypes(id)
      .then((r) => setTypes(r.types))
      .catch(() => {});
    apiListSequences(id)
      .then((r) => setSequences(r.sequences))
      .catch(() => {});
    apiListRoutines(id)
      .then((r) => setRoutines(r.routines))
      .catch(() => {});
    apiGetStructure(id)
      .then(setStructure)
      .catch(() => {});
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([apiGetProject(id), apiListTables(id), apiListTypes(id)])
      .then(([proj, tbls, typs]) => {
        setProject(proj);
        setTables(tbls.tables);
        setTypes(typs.types);
        setPageTitle(
          proj.name,
          `${proj.host}:${proj.port}/${proj.database}`,
          avatarColor(proj.id, proj.color),
          proj.environment,
        );
      })
      .finally(() => setSidebarLoading(false));
    apiListSequences(id)
      .then((r) => setSequences(r.sequences))
      .catch(() => {});
    apiListRoutines(id)
      .then((r) => setRoutines(r.routines))
      .catch(() => {});
    // Columnas y claves foráneas para el autocompletado y el diagrama ER.
    apiGetStructure(id)
      .then(setStructure)
      .catch(() => {});
  }, [id, setPageTitle]);

  // Acciones de toda la conexión en la barra superior: siguen a mano aunque el
  // panel izquierdo esté oculto. Importar escribe, así que no va en solo lectura.
  const readOnly = project?.read_only ?? false;
  useSetToolbar(
    <>
      <Button variant={7} onClick={() => setDiagramOpen(true)} title="Entity-relationship diagram">
        <Network size={14} /> Diagram
      </Button>
      <Button variant={7} onClick={() => setTransfer("export")} title="Export schemas as SQL">
        <Download size={14} /> Export
      </Button>
      <Button
        variant={7}
        onClick={() => setTransfer("import")}
        disabled={readOnly}
        title={readOnly ? "Read-only connection" : "Import a .sql file"}
      >
        <Upload size={14} /> Import
      </Button>
    </>,
    [readOnly],
  );

  const openTableTab = (table) => {
    const sql = `SELECT *\nFROM "${table.schema}"."${table.name}"\nLIMIT 100;`;
    setNewTabReq({
      sql,
      label: `${table.name}.sql`,
      key: ++tabReqKey.current,
      autoRun: true,
      schema: table.schema,
      tableName: table.name,
    });
  };

  const openTypeTab = (type) => {
    const sql =
      type.kind === "enum" && type.values
        ? `-- ${type.schema}.${type.name} (${type.kind})\n-- Values: ${type.values.join(", ")}\n\nSELECT * FROM pg_type WHERE typname = '${type.name}';`
        : `-- ${type.schema}.${type.name} (${type.kind})\n\nSELECT * FROM pg_type WHERE typname = '${type.name}';`;
    setNewTabReq({ sql, label: `${type.name}.sql`, key: ++tabReqKey.current, autoRun: true });
  };

  const openSequenceTab = (seq) => {
    const sql = `SELECT * FROM "${seq.schema}"."${seq.name}";`;
    setNewTabReq({ sql, label: `${seq.name}.sql`, key: ++tabReqKey.current, autoRun: true });
  };

  const openRoutineTab = (r) => {
    const sql = `SELECT routine_definition\nFROM information_schema.routines\nWHERE routine_schema = '${r.schema}'\n  AND routine_name = '${r.name}';`;
    setNewTabReq({ sql, label: `${r.name}.sql`, key: ++tabReqKey.current, autoRun: true });
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {leftVisible && (
        <SchemaSidebar
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

      {id && (
        <>
          <ExportModal
            projectId={id}
            open={transfer === "export"}
            onClose={() => setTransfer(null)}
          />
          <ImportModal
            projectId={id}
            database={project?.database ?? ""}
            open={transfer === "import"}
            onClose={() => setTransfer(null)}
            onImported={loadSchema}
          />
          <ErDiagramModal
            open={diagramOpen}
            onClose={() => setDiagramOpen(false)}
            structure={structure}
            onOpenTable={(schema, name) => openTableTab({ schema, name, type: "BASE TABLE" })}
          />
        </>
      )}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <SqlEditor
          projectId={id}
          project={project}
          newTabReq={newTabReq}
          tables={tables}
          structure={structure}
          showInspector={rightVisible}
        />
      </div>
    </div>
  );
};

export default QueryEditor;
