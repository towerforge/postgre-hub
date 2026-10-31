// Catálogo del kit (/dev), sección de paneles: filas de listado, la variante
// `panel` que comparten login, menú lateral y filas, ThemeToggle y Modal.
import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Col,
  CONNECTION_COLORS,
  Grid,
  Input,
  ListItem,
  ListItemGroup,
  Modal,
  Text,
  ThemeToggle,
} from "@/components/ui";
import { SidebarMenuGroup, SidebarMenuLink } from "@/components/sidebar-shell";

/** Secciones ListItem, Panel, ThemeToggle y Modal del catálogo. */
export const DevPanels = () => {
  const [modal, setModal] = useState(false);

  return (
    <>
      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        ListItem
      </Text>
      <Grid gap={16} style={{ marginBottom: 32 }}>
        <Col span={12}>
          <ListItemGroup>
            <ListItem
              onClick={() => {}}
              leading={
                <span className="conn-avatar" style={{ background: CONNECTION_COLORS[0] }}>
                  PG
                </span>
              }
              title="Producción"
              subtitle="postgres://admin@db.example.com:5432/app"
            />
            <ListItem
              onClick={() => {}}
              leading={
                <span className="conn-avatar" style={{ background: CONNECTION_COLORS[2] }}>
                  ST
                </span>
              }
              title="Staging"
              subtitle="postgres://postgres@localhost:5432/staging"
              actions={
                <Button size="sm" variant={3}>
                  Edit
                </Button>
              }
            />
          </ListItemGroup>
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        Panel (card del login, menú lateral y filas)
      </Text>
      <Text variant="caption" style={{ marginBottom: 12, display: "block" }}>
        Los tres comparten la variante <code>Card variant="panel"</code> y el radio{" "}
        <code>--panel-radius</code>.
      </Text>
      <Grid gap={16} style={{ marginBottom: 32 }}>
        <Col span={12} md={4}>
          <Card variant="panel">
            <CardBody style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Text variant="body">Login</Text>
              <Input size="lg" label="Username" placeholder="admin" />
              <Input size="lg" label="Password" type="password" placeholder="••••••••" />
              <Button variant={1} size="xl">
                Sign in
              </Button>
            </CardBody>
          </Card>
        </Col>
        <Col span={12} md={4}>
          <Card
            as="nav"
            variant="panel"
            style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 2 }}
          >
            <SidebarMenuLink to="/connections" label="Connections" end />
            <SidebarMenuLink to="/ssh-tunnels" label="SSH Tunnels" />
            <SidebarMenuGroup label="Settings" />
            <SidebarMenuLink to="/account" label="Account" />
          </Card>
        </Col>
        <Col span={12} md={4}>
          <ListItemGroup>
            <ListItem title="Fila de listado" subtitle="postgres://postgres@localhost:5432/db" />
            <ListItem
              selected
              onClick={() => {}}
              title="Seleccionada"
              subtitle="selected + mono={false}"
              mono={false}
            />
          </ListItemGroup>
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        ThemeToggle
      </Text>
      <Grid gap={16} style={{ marginBottom: 32 }}>
        <Col span={12} style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <ThemeToggle />
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        Modal
      </Text>
      <Button variant={1} onClick={() => setModal(true)}>
        Abrir modal
      </Button>

      <Modal open={modal} onClose={() => setModal(false)} title="Ejemplo de modal">
        <Text variant="body" style={{ marginBottom: 16 }}>
          Contenido del modal. Se cierra con Escape o haciendo clic fuera.
        </Text>
        <Input label="Campo dentro del modal" placeholder="Escribe aquí..." />
        <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant={2} onClick={() => setModal(false)}>
            Cancelar
          </Button>
          <Button variant={1} onClick={() => setModal(false)}>
            Confirmar
          </Button>
        </div>
      </Modal>
    </>
  );
};
