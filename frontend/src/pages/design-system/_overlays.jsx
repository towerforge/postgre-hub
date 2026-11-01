// Catálogo del kit (/dev), sección de superposiciones: los tres modales tipo
// (formulario, confirmación destructiva y el ancho de Apply changes), todos con
// las acciones en la prop `footer` según la regla de botones, y las superficies
// `panel` que comparten el login y el menú lateral, con ThemeToggle.
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
import css from "@/css/dev.module.css";
import { DevRow, DevSection } from "./_dev-section";

const PENDING_SQL = [
  "UPDATE public.users SET email = 'ana@example.org' WHERE id = 1;",
  "DELETE FROM public.users WHERE id = 3;",
];

/** Sección Overlays del catálogo. */
export const DevOverlays = () => {
  // Modal abierto: "form", "confirm", "apply" o null
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);

  return (
    <DevSection title="Overlays">
      <DevRow label="Modal · actions always in the footer prop, xl and right aligned">
        <Button variant={2} onClick={() => setModal("form")}>
          Form modal
        </Button>
        <Button variant={2} onClick={() => setModal("confirm")}>
          Destructive confirmation
        </Button>
        <Button variant={2} onClick={() => setModal("apply")}>
          Apply changes
        </Button>
      </DevRow>

      <DevRow label="Panel surfaces · login card and side menu">
        <div className={css.grid}>
          <Card variant="panel">
            <CardBody className={css.panelBody}>
              <Input size="lg" label="Username" placeholder="admin" />
              <Input size="lg" label="Password" type="password" placeholder="••••••••" />
              <Button variant={1} size="xl">
                Sign in
              </Button>
            </CardBody>
          </Card>
          <Card as="nav" variant="panel" className={css.panelNav}>
            <SidebarMenuLink to="/connections" label="Connections" end />
            <SidebarMenuLink to="/ssh-tunnels" label="SSH Tunnels" />
            <SidebarMenuGroup label="Settings" />
            <SidebarMenuLink to="/account" label="Account" />
          </Card>
        </div>
      </DevRow>

      <DevRow label="ThemeToggle">
        <ThemeToggle />
      </DevRow>

      <Modal
        open={modal === "form"}
        onClose={close}
        title="Edit connection"
        footer={
          <>
            <Button variant={5} size="xl" onClick={() => setModal("confirm")}>
              <Trash2 size={14} /> Delete
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
            <Input size="lg" defaultValue="Production" placeholder="My database" />
          </FormRow>
          <FormRow label="Host">
            <Input size="lg" defaultValue="db.internal" placeholder="localhost" />
          </FormRow>
          <FormRow label="Database">
            <Input size="lg" defaultValue="app" placeholder="mydb" />
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
              <Trash2 size={14} /> Delete
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
    </DevSection>
  );
};
