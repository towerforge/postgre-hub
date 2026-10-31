// Maqueta de página con menú lateral flotante y contenido centrado, más las
// piezas del menú (entradas y rótulos de grupo). Está separada de
// `ConnectionsShell`, que la usa con el menú de la app, para que la maqueta no
// dependa de qué entradas lleva y las piezas del menú se puedan reutilizar
// (la página /dev las muestra).
import { NavLink } from "react-router-dom";
import css from "@/css/sidebar-shell.module.css";
import { Card } from "@/components/ui";

/**
 * Isla con menú lateral (tono de panel) y contenido centrado bajo un título.
 * `headerCenter` va entre el título y `headerRight` (p. ej. un buscador),
 * `maxWidth` es el ancho de cabecera y contenido, y `gutter` (opcional) da el
 * mismo margen lateral a ambos para que título y contenido arranquen en la
 * misma guía; sin él se mantienen los márgenes de siempre.
 */
export const SidebarShell = ({
  menu,
  sidebarHeader,
  headerLeft,
  headerCenter,
  headerRight,
  sidebarFooter,
  maxWidth = 860,
  gutter,
  children,
}) => {
  const headerPadding = gutter != null ? `32px ${gutter}px 4px` : "32px 36px 4px";
  const contentPadding = gutter != null ? `0 ${gutter}px 32px` : "0 16px 32px";
  return (
    <div
      className={`tile ${css.glass}`}
      style={{ flex: 1, flexDirection: "row", background: "var(--om-bg)" }}
    >
      <Card as="nav" variant="panel" className={css.floatingNav}>
        {sidebarHeader && (
          <div
            style={{
              height: 49,
              flexShrink: 0,
              borderBottom: "1px solid var(--om-border)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {sidebarHeader}
          </div>
        )}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
            padding: "16px 0",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {menu}
        </div>
        {sidebarFooter}
      </Card>

      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        <div style={{ maxWidth, margin: "0 auto", padding: headerPadding }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <h1
              style={{
                flex: 1,
                minWidth: 200,
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                lineHeight: 1,
                color: "var(--om-fg-bright)",
                display: "flex",
                alignItems: "center",
                height: 38,
              }}
            >
              {headerLeft}
            </h1>
            {headerCenter && <div style={{ flex: "0 1 360px", minWidth: 220 }}>{headerCenter}</div>}
            {headerRight}
          </div>
        </div>
        <div style={{ maxWidth, margin: "0 auto", padding: contentPadding }}>{children}</div>
      </div>
    </div>
  );
};

/** Entrada del menú lateral; se marca activa según la ruta. */
export const SidebarMenuLink = ({ to, label, icon, badge, end }) => {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `conn-menu-item${isActive ? " active" : ""}`}
    >
      {icon}
      {label}
      {badge != null && <span className="badge">{badge}</span>}
    </NavLink>
  );
};

/** Rótulo que separa grupos de entradas en el menú lateral. */
export const SidebarMenuGroup = ({ label }) => {
  return (
    <div
      style={{
        padding: "14px 20px 6px",
        fontSize: 11.5,
        fontWeight: 600,
        color: "var(--om-fg-muted)",
      }}
    >
      {label}
    </div>
  );
};
