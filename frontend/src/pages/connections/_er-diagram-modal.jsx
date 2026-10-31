// Diagrama entidad-relación de la conexión, en un modal a pantalla casi
// completa. Dibuja con React Flow las tablas de un esquema (o de todos) y una
// flecha por cada columna de clave foránea; dagre coloca el grafo. Doble clic
// en una tabla abre una pestaña con su consulta. Es una pieza del editor SQL
// (/connections/:id).
import { useMemo, useState } from "react";
import { KeyRound, Link2 } from "lucide-react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { Modal, Select } from "@/components/ui";
import styles from "@/css/connections.module.css";

const NODE_WIDTH = 260;
const HEADER_H = 34;
const ROW_H = 22;
const GRID_GAP = 40;
const ALL_SCHEMAS = "*";

const nodeHeight = (t) => HEADER_H + t.columns.length * ROW_H + 6;
const nodeId = (schema, name) => `${schema}.${name}`;

// Nodo de tabla: cabecera con el nombre y una fila por columna.
const TableNodeView = ({ data }) => {
  const { table, fkColumns, showSchema } = data;
  return (
    <div className={styles.node} style={{ width: NODE_WIDTH }}>
      <div className={styles.header} style={{ height: HEADER_H }}>
        {showSchema && <span className={styles.schema}>{table.schema}.</span>}
        {table.name}
      </div>
      {table.columns.map((c) => (
        <div key={c.name} className={styles.row} style={{ height: ROW_H }}>
          {/* Un par de handles por columna: las flechas salen y llegan a la fila exacta. */}
          <Handle
            type="target"
            position={Position.Left}
            id={`${c.name}:t`}
            className={styles.handle}
          />
          <span className={styles.icon}>
            {c.pk ? (
              <KeyRound size={11} className={styles.pk} />
            ) : fkColumns.has(c.name) ? (
              <Link2 size={11} className={styles.fk} />
            ) : null}
          </span>
          <span className={c.pk ? styles.colPk : styles.col}>{c.name}</span>
          <span className={styles.type}>{c.type}</span>
          <Handle
            type="source"
            position={Position.Right}
            id={`${c.name}:s`}
            className={styles.handle}
          />
        </div>
      ))}
    </div>
  );
};

const NODE_TYPES = { table: TableNodeView };

/**
 * Coloca con dagre (izquierda → derecha) las tablas que participan en alguna
 * relación; las tablas sueltas van en rejilla debajo para no alargar el grafo.
 */
const layout = (tables, edges) => {
  const connected = new Set(edges.flatMap((e) => [e.source, e.target]));
  const pos = new Map();

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 30, ranksep: 90, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const t of tables) {
    const id = nodeId(t.schema, t.name);
    if (connected.has(id)) g.setNode(id, { width: NODE_WIDTH, height: nodeHeight(t) });
  }
  for (const e of edges) if (e.source !== e.target) g.setEdge(e.source, e.target);
  dagre.layout(g);

  let bottom = 0;
  for (const id of g.nodes()) {
    const n = g.node(id);
    pos.set(id, { x: n.x - n.width / 2, y: n.y - n.height / 2 });
    bottom = Math.max(bottom, n.y + n.height / 2);
  }

  const loose = tables.filter((t) => !connected.has(nodeId(t.schema, t.name)));
  const perRow = Math.max(3, Math.ceil(Math.sqrt(loose.length)));
  let y = connected.size > 0 ? bottom + GRID_GAP * 2 : 0;
  for (let i = 0; i < loose.length; i += perRow) {
    const row = loose.slice(i, i + perRow);
    row.forEach((t, j) => pos.set(nodeId(t.schema, t.name), { x: j * (NODE_WIDTH + GRID_GAP), y }));
    y += Math.max(...row.map(nodeHeight)) + GRID_GAP;
  }
  return pos;
};

/**
 * Modal del diagrama ER. `structure` es la de `apiGetStructure` (null mientras
 * carga); `onOpenTable(schema, name)` abre la tabla en una pestaña.
 */
export const ErDiagramModal = ({ open, onClose, structure, onOpenTable }) => {
  const schemas = useMemo(
    () =>
      [
        ...new Set(
          (structure?.tables ?? []).filter((t) => t.kind === "table").map((t) => t.schema),
        ),
      ].sort(),
    [structure],
  );
  const [picked, setPicked] = useState(null);
  const schema = picked ?? (schemas.includes("public") ? "public" : (schemas[0] ?? ALL_SCHEMAS));

  const { nodes, edges } = useMemo(() => {
    if (!structure) return { nodes: [], edges: [] };
    const inScope = (s) => schema === ALL_SCHEMAS || s === schema;
    const tables = structure.tables.filter((t) => t.kind === "table" && inScope(t.schema));
    const ids = new Set(tables.map((t) => nodeId(t.schema, t.name)));

    // Una arista por par de columnas; las claves foráneas hacia tablas de
    // otro esquema se omiten.
    const edges = [];
    const fkByTable = new Map();
    for (const r of structure.relations) {
      const source = nodeId(r.from_schema, r.from_table);
      const target = nodeId(r.to_schema, r.to_table);
      if (!ids.has(source)) continue;
      if (!fkByTable.has(source)) fkByTable.set(source, new Set());
      r.from_columns.forEach((c) => fkByTable.get(source).add(c));
      if (!ids.has(target)) continue;
      r.from_columns.forEach((col, i) =>
        edges.push({
          id: `${r.from_schema}.${r.name}:${i}`,
          source,
          target,
          sourceHandle: `${col}:s`,
          targetHandle: `${r.to_columns[i]}:t`,
          type: "smoothstep",
          className: styles.edge,
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        }),
      );
    }

    const pos = layout(tables, edges);
    const nodes = tables.map((t) => {
      const id = nodeId(t.schema, t.name);
      return {
        id,
        type: "table",
        position: pos.get(id) ?? { x: 0, y: 0 },
        data: {
          table: t,
          fkColumns: fkByTable.get(id) ?? new Set(),
          showSchema: schema === ALL_SCHEMAS,
        },
      };
    });
    return { nodes, edges };
  }, [structure, schema]);

  const options = [
    ...schemas.map((s) => ({ value: s, label: s })),
    { value: ALL_SCHEMAS, label: "All schemas" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>ER diagram</span>
          <div style={{ width: 200, fontWeight: 400 }}>
            <Select value={schema} options={options} onChange={(e) => setPicked(e.target.value)} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 400, color: "var(--om-fg-muted)" }}>
            {nodes.length} tables · {edges.length} relations · double-click a table to query it
          </span>
        </div>
      }
      width="92vw"
      height="88vh"
      bodyFlush
    >
      <div className={styles.canvas}>
        {!structure ? (
          <div className={styles.empty}>Loading structure…</div>
        ) : nodes.length === 0 ? (
          <div className={styles.empty}>No tables in this schema.</div>
        ) : (
          <ReactFlow
            // No controlado para poder arrastrar tablas; se vuelve a montar
            // al cambiar de esquema o de estructura y fitView reencuadra.
            key={`${schema}:${nodes.length}:${edges.length}`}
            defaultNodes={nodes}
            defaultEdges={edges}
            nodeTypes={NODE_TYPES}
            onNodeDoubleClick={(_, n) => {
              const t = n.data.table;
              onOpenTable(t.schema, t.name);
              onClose();
            }}
            nodesConnectable={false}
            edgesFocusable={false}
            fitView
            minZoom={0.05}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className={styles.minimap} />
          </ReactFlow>
        )}
      </div>
    </Modal>
  );
};
