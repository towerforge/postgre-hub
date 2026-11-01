// Catálogo del kit (/design-system), sección Menu: el menú desplegable con todos los
// tipos de opción (icono, dato a la derecha, destructiva, deshabilitada), el rótulo no
// clicable y el separador, alineado al principio y al final del disparador; y Avatar
// en sus dos tamaños, cada fila en uno solo según la regla del catálogo.
import { useState } from "react";
import { ChevronDown, Copy, Info, LogOut, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar, Button, Menu, MenuItem, MenuLabel, MenuSeparator, Text } from "@/components/ui";
import { CatalogRow, CatalogSection } from "./_section";

const NAMES = ["jordi", "ana", "postgres", "Marta"];

/** Sección Menu del catálogo. */
export const CatalogMenu = () => {
  // Última opción elegida, para ver que onSelect llega y que el menú se cierra
  const [picked, setPicked] = useState("");
  const pick = (what) => () => setPicked(what);

  return (
    <CatalogSection
      id="menu"
      title="Menu and Avatar"
      description="Menu opens from any trigger (render prop) and handles outside click, Escape (focus back to the trigger) and the arrow keys itself. Options are lg (32px)."
    >
      <CatalogRow label="Menu, align start: icon, meta, disabled, label, separator and danger">
        <Menu
          label="Table actions"
          trigger={(props, { open }) => (
            <Button {...props} variant={7} active={open}>
              <span>Actions</span>
              <ChevronDown size={13} />
            </Button>
          )}
        >
          <MenuLabel>public.users</MenuLabel>
          <MenuItem icon={<Pencil />} meta="F2" onSelect={pick("Rename")}>
            Rename
          </MenuItem>
          <MenuItem icon={<Copy />} onSelect={pick("Duplicate")}>
            Duplicate
          </MenuItem>
          <MenuItem icon={<Info />} disabled>
            Properties
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Trash2 />} tone="danger" onSelect={pick("Drop table")}>
            Drop table
          </MenuItem>
        </Menu>
        <Text variant="hint">{picked ? `Picked: ${picked}` : "Pick an option"}</Text>
      </CatalogRow>

      <CatalogRow label="Menu, align end: the account chip of the top bar">
        <Menu
          align="end"
          label="Account"
          minWidth={232}
          trigger={(props, { open }) => (
            <Button {...props} variant={7} active={open}>
              <Avatar name="jordi" />
              <span>jordi</span>
              <ChevronDown size={13} />
            </Button>
          )}
        >
          <MenuLabel>Signed in as jordi</MenuLabel>
          <MenuItem icon={<Info />} meta={`v${__APP_VERSION__}`} onSelect={pick("About")}>
            About Postgre Hub
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<LogOut />} tone="danger" onSelect={pick("Log out")}>
            Log out
          </MenuItem>
        </Menu>
        <Menu
          align="end"
          label="More"
          trigger={(props) => (
            <Button {...props} variant={8} label="More">
              <MoreHorizontal size={15} />
            </Button>
          )}
        >
          <MenuItem onSelect={pick("Refresh")}>Refresh</MenuItem>
          <MenuItem onSelect={pick("Export")}>Export</MenuItem>
        </Menu>
      </CatalogRow>

      <CatalogRow label="Avatar">
        {NAMES.map((n) => (
          <Avatar key={n} name={n} />
        ))}
      </CatalogRow>

      <CatalogRow label="Avatar" size="xl">
        {NAMES.map((n) => (
          <Avatar key={n} name={n} size="xl" />
        ))}
      </CatalogRow>
    </CatalogSection>
  );
};
