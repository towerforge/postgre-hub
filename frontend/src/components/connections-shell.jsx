// Marco de las pantallas que no están dentro de una conexión: el listado de
// conexiones, los túneles SSH y los ajustes. Monta el `SidebarShell` con el menú
// de la app, para que cada una de esas páginas solo ponga su título y su contenido. Exporta también los helpers del avatar de una
// conexión (color e iniciales), que comparten el listado, la barra superior y la
// pantalla de la conexión. La API sigue llamando "projects" a las conexiones.
import { Database, Server, User, Users, Palette, Blocks } from "lucide-react";
import { CONNECTION_COLORS } from "@/components/ui";
import { SidebarShell, SidebarMenuLink, SidebarMenuGroup } from "@/components/sidebar-shell";

/** Color del avatar: el elegido (`override`) o uno estable derivado del id. */
export const avatarColor = (id, override) => {
  if (override) return override;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CONNECTION_COLORS[h % CONNECTION_COLORS.length];
};

/** Dos iniciales en mayúscula para el avatar ("my_db" → "MD"). */
export const initialsOf = (name) => {
  const parts = name.split(/[\s_\-.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const ICON = 15;

/** Marco de las pantallas generales: menú lateral fijo y contenido. La cuenta
 * (usuario y salir) vive en la barra superior de `MainLayout`. */
export const ConnectionsShell = ({
  headerLeft,
  headerCenter,
  headerRight,
  maxWidth,
  gutter,
  children,
}) => {
  return (
    <SidebarShell
      headerLeft={headerLeft}
      headerCenter={headerCenter}
      headerRight={headerRight}
      maxWidth={maxWidth}
      gutter={gutter}
      menu={
        <>
          <SidebarMenuLink
            to="/connections"
            label="Connections"
            icon={<Database size={ICON} />}
            end
          />
          <SidebarMenuLink to="/ssh-tunnels" label="SSH Tunnels" icon={<Server size={ICON} />} />
          <SidebarMenuGroup label="Settings" />
          <SidebarMenuLink to="/account" label="Account" icon={<User size={ICON} />} />
          <SidebarMenuLink to="/users" label="Users" icon={<Users size={ICON} />} />
          <SidebarMenuLink to="/appearance" label="Appearance" icon={<Palette size={ICON} />} />
          {import.meta.env.DEV && (
            <>
              <SidebarMenuGroup label="Development" />
              <SidebarMenuLink
                to="/design-system"
                label="Design system"
                icon={<Blocks size={ICON} />}
              />
            </>
          )}
        </>
      }
    >
      {children}
    </SidebarShell>
  );
};
