// Catálogo del kit (/dev), sección de contenido: Card, ListItem con las filas
// de la lista de conexiones, Table con un resultado de consulta, y las piezas
// de estado (Badge, StatPill, Alert, InfoBox y Spinner).
import { Pencil, Plug } from "lucide-react";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CONNECTION_COLORS,
  InfoBox,
  ListItem,
  ListItemGroup,
  Spinner,
  StatPill,
  Table,
  ToolButton,
} from "@/components/ui";
import { readableOn } from "@/lib/environments";
import connStyles from "@/css/connections.module.css";
import css from "@/css/dev.module.css";
import { DevRow, DevSection } from "./_dev-section";

const CONNECTIONS = [
  {
    id: "prod",
    initials: "PR",
    name: "Production",
    host: "db.internal",
    port: 5432,
    database: "app",
    username: "app_rw",
    color: CONNECTION_COLORS[0],
    lastUsed: "Last query 5 min ago",
  },
  {
    id: "local",
    initials: "LO",
    name: "Local",
    host: "localhost",
    port: 5432,
    database: "postgres",
    username: "postgres",
    color: CONNECTION_COLORS[2],
    lastUsed: "Never queried",
  },
];

const RESULT_ROWS = [
  { id: 1, email: "ana@example.com", created_at: "2026-10-28 09:14:02+00" },
  { id: 2, email: "marc@example.com", created_at: "2026-10-29 17:40:55+00" },
  { id: 3, email: "laia@example.com", created_at: "2026-10-30 11:02:31+00" },
];

const RESULT_COLUMNS = [
  { key: "id", header: "id", shrink: true, align: "right", render: (row) => row.id },
  { key: "email", header: "email", render: (row) => row.email },
  {
    key: "created_at",
    header: "created_at",
    render: (row) => <span className={css.mutedCell}>{row.created_at}</span>,
  },
];

/** Secciones Content del catálogo. */
export const DevContent = () => (
  <DevSection title="Content">
    <DevRow label="Card · default and panel">
      <div className={css.grid}>
        <Card>
          <CardHeader title="Connection" />
          <CardBody>postgres://postgres@localhost:5432/postgres</CardBody>
          <CardFooter>
            <ToolButton>
              <Pencil size={13} /> Edit
            </ToolButton>
          </CardFooter>
        </Card>
        <Card variant="panel">
          <CardHeader title="Panel" />
          <CardBody>Login card, side menu and connection rows.</CardBody>
        </Card>
      </div>
    </DevRow>

    <DevRow label="ListItem · connection rows">
      <div className={css.full}>
        <ListItemGroup>
          {CONNECTIONS.map((c) => (
            <ListItem
              key={c.id}
              className={connStyles.row}
              onClick={() => {}}
              leading={
                <span
                  className="conn-avatar"
                  style={{ background: c.color, color: readableOn(c.color) }}
                >
                  {c.initials}
                </span>
              }
              title={c.name}
              subtitle={c.username}
              actions={
                <>
                  <span className={connStyles.target}>
                    {c.host}:{c.port} / {c.database}
                  </span>
                  <span className={connStyles.meta}>
                    <span className={connStyles.lastUsed}>{c.lastUsed}</span>
                  </span>
                  <span className={connStyles.rowActions}>
                    <ToolButton onClick={(e) => e.stopPropagation()}>
                      <Plug size={13} /> Test
                    </ToolButton>
                    <ToolButton onClick={(e) => e.stopPropagation()}>
                      <Pencil size={13} /> Edit
                    </ToolButton>
                  </span>
                </>
              }
            />
          ))}
          <ListItem
            selected
            onClick={() => {}}
            title="Selected"
            subtitle="Single choice list"
            mono={false}
          />
        </ListItemGroup>
      </div>
    </DevRow>

    <DevRow label="Table · query result">
      <div className={css.full}>
        <Table columns={RESULT_COLUMNS} data={RESULT_ROWS} keyExtractor={(row) => row.id} />
      </div>
    </DevRow>

    <DevRow label="Badge · accent and neutral">
      <Badge>3</Badge>
      <Badge tone="neutral">12 tables</Badge>
      <Badge tone="neutral">4.2 MB</Badge>
    </DevRow>

    <DevRow label="StatPill">
      <StatPill label="Rows" value={128} />
      <StatPill label="Duration" value="0.04s" valueColor="var(--om-green)" />
      <StatPill label="Size" value="1.2 GB" valueColor="var(--om-fg-muted)" />
    </DevRow>

    <DevRow label="Alert">
      <div className={css.stack}>
        <Alert tone="error">password authentication failed for user "postgres"</Alert>
        <Alert tone="success">Connection saved.</Alert>
        <Alert tone="warning">This connection is marked as Production.</Alert>
        <Alert tone="info">Configure SSH tunnels in SSH Tunnels.</Alert>
      </div>
    </DevRow>

    <DevRow label="InfoBox · mono and text">
      <div className={css.stack}>
        <InfoBox>postgres://postgres@localhost:5432/mydb</InfoBox>
        <InfoBox mono={false}>ubuntu@bastion.internal:22 · Private key</InfoBox>
      </div>
    </DevRow>

    <DevRow label="Spinner · colors and sizes">
      <Spinner label="Loading…" />
      <Spinner color="var(--om-fg-bright)" label="Building SQL…" />
      <Spinner color="var(--om-red)" label="Cancelling…" />
      <Spinner color="var(--om-yellow)" label="Applying…" />
      <Spinner size={10} />
      <Spinner size={18} />
      <Spinner size={24} />
    </DevRow>
  </DevSection>
);
