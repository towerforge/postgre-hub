// Catálogo del kit (/design-system), sección de contenido: Card con sus variantes
// numeradas, ListItem con las filas de la lista de conexiones, Table con un resultado de consulta, y las piezas
// de estado (Badge, StatPill, Alert, InfoBox y Spinner).
import { Pencil, Plug } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
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
} from "@/components/ui";
import { readableOn } from "@/lib/environments";
import css from "@/css/design-system.module.css";
import { CatalogRow, CatalogSection } from "./_section";

const CARD_VARIANTS = [
  { variant: 1, name: "Elevated", use: "Shadow, no border. Floating content over the page." },
  { variant: 2, name: "Panel", use: "The standard surface: login card, side menu, list rows." },
  { variant: 3, name: "Default", use: "Layer with a border and a small radius. The default." },
  { variant: 4, name: "Filled", use: "Filled layer, no border or shadow. Groups inside a panel." },
  { variant: 5, name: "Outlined", use: "Transparent with a border. Optional or empty content." },
];

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
export const CatalogContent = () => (
  <CatalogSection
    id="content"
    title="Content"
    description="Card has five numbered variants by prominence. Alert and Badge keep named tones: they are states, not looks."
  >
    <CatalogRow label="Card variants 1 to 5">
      <div className={css.grid}>
        {CARD_VARIANTS.map(({ variant, name, use }) => (
          <Card key={variant} variant={variant}>
            <CardHeader title={`${variant}. ${name}`} />
            <CardBody>{use}</CardBody>
            <CardFooter>
              <Button variant={7}>
                <Pencil size={14} /> Edit
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </CatalogRow>

    <CatalogRow label="Card interactive (hover and press), variants 2 and 3">
      <div className={css.grid}>
        <Card variant={2} interactive tabIndex={0}>
          <CardBody>Opens the connection on click.</CardBody>
        </Card>
        <Card variant={3} interactive tabIndex={0}>
          <CardBody>Opens the saved query on click.</CardBody>
        </Card>
      </div>
    </CatalogRow>

    <CatalogRow label="ListItem: connection rows and a selected option">
      <div className={css.full}>
        <ListItemGroup>
          {CONNECTIONS.map((c) => (
            <ListItem
              key={c.id}
              className={css.connRow}
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
                  <span className={css.connTarget}>
                    {c.host}:{c.port} / {c.database}
                  </span>
                  <span className={css.connMeta}>
                    <span className={css.connLastUsed}>{c.lastUsed}</span>
                  </span>
                  <span className={css.connActions}>
                    <Button variant={7} onClick={(e) => e.stopPropagation()}>
                      <Plug size={14} /> Test
                    </Button>
                    <Button variant={7} onClick={(e) => e.stopPropagation()}>
                      <Pencil size={14} /> Edit
                    </Button>
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
    </CatalogRow>

    <CatalogRow label="Table: query result">
      <div className={css.full}>
        <Table columns={RESULT_COLUMNS} data={RESULT_ROWS} keyExtractor={(row) => row.id} />
      </div>
    </CatalogRow>

    <CatalogRow label="Badge tones: accent and neutral">
      <Badge>3</Badge>
      <Badge tone="neutral">12 tables</Badge>
      <Badge tone="neutral">4.2 MB</Badge>
    </CatalogRow>

    <CatalogRow label="StatPill">
      <StatPill label="Rows" value={128} />
      <StatPill label="Duration" value="0.04s" valueColor="var(--om-green)" />
      <StatPill label="Size" value="1.2 GB" valueColor="var(--om-fg-muted)" />
    </CatalogRow>

    <CatalogRow label="Alert tones: error, success, warning, info">
      <div className={css.stack}>
        <Alert tone="error">password authentication failed for user "postgres"</Alert>
        <Alert tone="success">Connection saved.</Alert>
        <Alert tone="warning">This connection is marked as Production.</Alert>
        <Alert tone="info">Configure SSH tunnels in SSH Tunnels.</Alert>
      </div>
    </CatalogRow>

    <CatalogRow label="InfoBox: mono and text">
      <div className={css.stack}>
        <InfoBox>postgres://postgres@localhost:5432/mydb</InfoBox>
        <InfoBox mono={false}>ubuntu@bastion.internal:22 · Private key</InfoBox>
      </div>
    </CatalogRow>

    <CatalogRow label="Spinner colours and sizes">
      <Spinner label="Loading…" />
      <Spinner color="var(--om-fg-bright)" label="Building SQL…" />
      <Spinner color="var(--om-red)" label="Cancelling…" />
      <Spinner color="var(--om-yellow)" label="Applying…" />
      <Spinner size={10} />
      <Spinner size={18} />
      <Spinner size={24} />
    </CatalogRow>
  </CatalogSection>
);
