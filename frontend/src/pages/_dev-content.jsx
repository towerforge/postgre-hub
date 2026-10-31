// Catálogo del kit (/dev), sección de contenido: campos de texto y selectores,
// las variantes de Card, Tabs y Table con datos de ejemplo.
import { FileText, Folder } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Col,
  Grid,
  Input,
  Select,
  Tab,
  TabBar,
  TabPanel,
  Table,
  TableCell,
  Tabs,
  Text,
} from "@/components/ui";

// También las usa el FormRow de `_dev-forms.jsx`.
export const OPTIONS = [
  { value: "1", label: "Opción 1" },
  { value: "2", label: "Opción 2" },
  { value: "3", label: "Opción 3" },
];

const TABLE_DATA = [
  { name: ".github/workflows", commit: "Release/main v0.3.1", ago: "4 días", icon: Folder },
  { name: "backend", commit: "Release/main v0.3.1", ago: "4 días", icon: Folder },
  { name: "frontend", commit: "Release/main v0.3.1", ago: "4 días", icon: Folder },
  { name: "Dockerfile", commit: "Release/main v0.1.10", ago: "3 semanas", icon: FileText },
  { name: "README.md", commit: "Release/main v0.3.0", ago: "4 días", icon: FileText },
];

const TABLE_COLUMNS = [
  {
    key: "name",
    header: "Nombre",
    render: (row) => <TableCell icon={<row.icon size={16} />}>{row.name}</TableCell>,
  },
  {
    key: "commit",
    header: "Último commit",
    render: (row) => <span style={{ color: "var(--text-2)" }}>{row.commit}</span>,
  },
  {
    key: "ago",
    header: "Hace",
    shrink: true,
    align: "right",
    render: (row) => <span style={{ color: "var(--text-2)" }}>{row.ago}</span>,
  },
];

/** Secciones Inputs, Cards, Tabs y Table del catálogo. */
export const DevContent = () => (
  <>
    <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
      Inputs
    </Text>
    <Grid gap={16} style={{ marginBottom: 32 }}>
      <Col span={12} md={4}>
        <Input label="Nombre" placeholder="Escribe algo..." />
      </Col>
      <Col span={12} md={4}>
        <Input label="Con error" placeholder="Campo erróneo" error="Este campo es obligatorio" />
      </Col>
      <Col span={12} md={4}>
        <Input label="Con hint" placeholder="Sugerencia" hint="Máximo 50 caracteres" />
      </Col>
      <Col span={12} md={6}>
        <Select label="Selector" options={OPTIONS} placeholder="Elige una opción" />
      </Col>
      <Col span={12} md={6}>
        <Select label="Buscable" options={OPTIONS} placeholder="Busca..." searchable />
      </Col>
    </Grid>

    <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
      Cards
    </Text>
    <Grid gap={16} style={{ marginBottom: 32 }}>
      <Col span={12} md={4}>
        <Card>
          <CardHeader title="Default" />
          <CardBody>
            <Text variant="caption">Contenido de la card</Text>
          </CardBody>
          <CardFooter>
            <Button variant={2} size="sm">
              Acción
            </Button>
          </CardFooter>
        </Card>
      </Col>
      <Col span={12} md={4}>
        <Card variant="elevated">
          <CardHeader title="Elevated" />
          <CardBody>
            <Text variant="caption">Sin borde, con sombra</Text>
          </CardBody>
        </Card>
      </Col>
      <Col span={12} md={4}>
        <Card variant="panel">
          <CardHeader title="Panel" />
          <CardBody>
            <Text variant="caption">Como las filas de Connections</Text>
          </CardBody>
        </Card>
      </Col>
      <Col span={12} md={4}>
        <Card variant="outlined">
          <CardHeader title="Outlined" />
          <CardBody>
            <Text variant="caption">Solo borde</Text>
          </CardBody>
        </Card>
      </Col>
    </Grid>

    <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
      Tabs
    </Text>
    <Grid gap={16} style={{ marginBottom: 32 }}>
      <Col span={12}>
        <Tabs defaultTab="planning">
          <TabBar
            actions={
              <Button size="sm" variant={3}>
                + New view
              </Button>
            }
          >
            <Tab id="planning" badge={3}>
              Feature planning
            </Tab>
            <Tab id="area">By area</Tab>
            <Tab id="sprint" dot>
              Current sprint
            </Tab>
          </TabBar>
          <TabPanel id="planning">
            <Card style={{ margin: "16px 0" }}>
              <CardBody>
                <Text variant="caption">Contenido de Feature planning</Text>
              </CardBody>
            </Card>
          </TabPanel>
          <TabPanel id="area">
            <Card style={{ margin: "16px 0" }}>
              <CardBody>
                <Text variant="caption">Contenido de By area</Text>
              </CardBody>
            </Card>
          </TabPanel>
          <TabPanel id="sprint">
            <Card style={{ margin: "16px 0" }}>
              <CardBody>
                <Text variant="caption">Contenido de Current sprint</Text>
              </CardBody>
            </Card>
          </TabPanel>
        </Tabs>
      </Col>
    </Grid>

    <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
      Table
    </Text>
    <Grid gap={16} style={{ marginBottom: 32 }}>
      <Col span={12}>
        <Table columns={TABLE_COLUMNS} data={TABLE_DATA} keyExtractor={(row) => row.name} />
      </Col>
    </Grid>
  </>
);
