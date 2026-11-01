// Catálogo del kit (/design-system), sección de superposiciones: los tres modales tipo
// (formulario, confirmación destructiva y el ancho de Apply changes), todos con
// las acciones en la prop `footer` según la regla de botones, y las superficies
// Card variant 2 (panel) que comparten el login y el menú lateral, con ThemeToggle.
import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  FormRow,
  InfoBox,
  Input,
  Modal,
  Text,
  ThemeToggle,
} from "@/components/ui";
import { SidebarMenuGroup, SidebarMenuLink } from "@/components/sidebar-shell";
import css from "@/css/design-system.module.css";
import { CatalogRow, CatalogSection } from "./_section";

const PENDING_SQL = [
  "UPDATE public.users SET email = 'ana@example.org' WHERE id = 1;",
  "DELETE FROM public.users WHERE id = 3;",
];

/** Sección Overlays del catálogo. */
export const CatalogOverlays = () => {
  // Modal abierto: "form", "confirm", "apply" o null
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);

  return (
    <CatalogSection
      id="overlays"
      title="Overlays"
      description="Modal size is a width (sm 380, md 520, lg 720), not a control height. Its close button is Button variant 8."
    >
      <CatalogRow label="Modal: open one to see its footer (actions in the footer prop, right aligned, xl)">
        <Button variant={2} onClick={() => setModal("form")}>
          Form modal
        </Button>
        <Button variant={2} onClick={() => setModal("confirm")}>
          Destructive confirmation
        </Button>
        <Button variant={2} onClick={() => setModal("apply")}>
          Apply changes
        </Button>
      </CatalogRow>

      <CatalogRow label="Panel surfaces (Card 2): login card and side menu" size="xl">
        <div className={css.grid}>
          <Card variant={2}>
            <CardBody className={css.panelBody}>
              <Input size="xl" label="Username" placeholder="admin" />
              <Input size="xl" label="Password" type="password" placeholder="••••••••" />
              <Button variant={1} size="xl">
                Sign in
              </Button>
            </CardBody>
          </Card>
          <Card as="nav" variant={2} className={css.panelNav}>
            <SidebarMenuLink to="/connections" label="Connections" end />
            <SidebarMenuLink to="/ssh-tunnels" label="SSH Tunnels" />
            <SidebarMenuGroup label="Settings" />
            <SidebarMenuLink to="/account" label="Account" />
          </Card>
        </div>
      </CatalogRow>

      <CatalogRow label="ThemeToggle">
        <ThemeToggle />
      </CatalogRow>

      <Modal
        open={modal === "form"}
        onClose={close}
        title="Edit connection"
        footer={
          <>
            <Button variant={5} size="xl" onClick={() => setModal("confirm")}>
              <Trash2 size={16} /> Delete
            </Button>
            <div className={css.spacer} />
            <Button variant={2} size="xl" onClick={close}>
              Cancel
            </Button>
            <Button variant={1} size="xl" onClick={close}>
              Save changes
            </Button>
          </>
        }
      >
        <div className={css.panelBody}>
          <FormRow label="Name">
            <Input size="xl" defaultValue="Production" placeholder="My database" />
          </FormRow>
          <FormRow label="Host">
            <Input size="xl" defaultValue="db.internal" placeholder="localhost" />
          </FormRow>
          <FormRow label="Database">
            <Input size="xl" defaultValue="app" placeholder="mydb" />
          </FormRow>
        </div>
      </Modal>

      <Modal
        open={modal === "confirm"}
        onClose={close}
        title="Delete connection"
        size="sm"
        footer={
          <>
            <Button variant={2} size="xl" onClick={close}>
              Cancel
            </Button>
            <Button variant={6} size="xl" onClick={close}>
              <Trash2 size={16} /> Delete
            </Button>
          </>
        }
      >
        <div className={css.confirmText}>
          Are you sure you want to delete <span className={css.confirmName}>"Production"</span>?
          <div className={css.confirmNote}>
            This only removes the saved connection. The database itself is not affected.
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === "apply"}
        onClose={close}
        title="Apply pending edits"
        width="80vw"
        footer={
          <>
            <Button variant={2} size="xl" onClick={close}>
              Cancel
            </Button>
            <Button variant={1} size="xl" onClick={close}>
              Apply changes
            </Button>
          </>
        }
      >
        <div className={css.panelBody}>
          <Text variant="hint">
            Review the SQL below. Each statement updates only the edited columns and matches the row
            by its primary key.
          </Text>
          {PENDING_SQL.map((stmt) => (
            <InfoBox key={stmt}>{stmt}</InfoBox>
          ))}
        </div>
      </Modal>
    </CatalogSection>
  );
};
