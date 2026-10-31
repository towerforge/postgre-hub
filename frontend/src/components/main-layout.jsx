// Marco común de la app una vez iniciada la sesión: barra superior con el
// título, barra de estado, panel inferior redimensionable y los huecos
// `#left-sidebar-slot` y `#right-sidebar-slot`, donde la pantalla de una conexión
// monta sus paneles por portal. El contenido de cada barra lo ponen las páginas a
// través de los contextos (título, barra de estado, historial, paneles), así el
// marco no depende de ninguna pantalla concreta.
import { useState } from "react";
import { NavLink, Outlet, useMatch } from "react-router-dom";
import { PanelLeft, PanelRight, PanelBottom, Info, ChevronDown, Database } from "lucide-react";
import { useSidebars } from "@/contexts/sidebars-context";
import { usePageTitle } from "@/contexts/page-title-context";
import { useStatusBar } from "@/contexts/status-bar-context";
import { useToolbar } from "@/contexts/toolbar-context";
import { useHistoryBar } from "@/contexts/history-bar-context";
import { AboutModal } from "@/components/about-modal";
import { initialsOf } from "@/components/connections-shell";
import { environmentLabel, readableOn } from "@/lib/environments";
import { Splitter, ToolButton, useResizable } from "@/components/ui";
import styles from "@/css/main-layout.module.css";

/** Marco de toda la app con sesión: barra superior, huecos laterales y de estado. */
export const MainLayout = () => {
  const connectionMatch = useMatch("/connections/:id/*");
  const { leftVisible, rightVisible, bottomVisible, toggleLeft, toggleRight, toggleBottom } =
    useSidebars();
  const { title, subtitle, accent, environment } = usePageTitle();
  const { content: statusContent } = useStatusBar();
  const { content: toolbarContent } = useToolbar();
  const { content: historyContent } = useHistoryBar();
  const [aboutOpen, setAboutOpen] = useState(false);
  const history = useResizable({
    key: "history",
    initial: 180,
    min: 90,
    max: 600,
    axis: "y",
    invert: true,
  });

  // Brillo en la esquina superior izquierda con el color de la conexión abierta.
  // Fuera de una conexión el foco es el azul de la marca y más intenso.
  const connAccent = connectionMatch && accent ? accent : "";
  const glow = connAccent
    ? {
        backgroundImage: `radial-gradient(ellipse 900px 380px at 0% 0%, color-mix(in srgb, ${connAccent} var(--om-glow), transparent), transparent 75%)`,
      }
    : !connectionMatch
      ? {
          backgroundImage:
            "radial-gradient(ellipse 1100px 560px at 0% 0%, color-mix(in srgb, var(--om-primary) 55%, transparent), transparent 72%)",
        }
      : undefined;

  return (
    <div className={styles.outerShell} style={glow}>
      <div className="waybar">
        {connectionMatch && (
          <ToolButton
            iconOnly
            active={leftVisible}
            onClick={toggleLeft}
            title={
              leftVisible ? "Ocultar barra lateral izquierda" : "Mostrar barra lateral izquierda"
            }
          >
            <PanelLeft size={16} />
          </ToolButton>
        )}

        {/* Widget de la conexión abierta: vuelve a la lista de conexiones */}
        <NavLink to="/connections" className="title" title="Ir a conexiones">
          <span
            className="proj-icon"
            style={
              connAccent
                ? { background: connAccent, color: readableOn(connAccent) }
                : { background: "var(--om-primary)" }
            }
          >
            {connectionMatch ? initialsOf(title) : <Database size={13} />}
          </span>
          <span>{title}</span>
          {subtitle && <span className="sub">{subtitle}</span>}
          <ChevronDown size={14} className="chev" />
        </NavLink>

        <span className="sp" />

        <div className="right">
          {/* Acciones de la pantalla abierta (diagrama, exportar, importar…) */}
          {connectionMatch && toolbarContent}
          {connectionMatch && environment && (
            <span className={`env-pill ${environment}`}>{environmentLabel(environment)}</span>
          )}
          {connectionMatch && (
            <ToolButton
              iconOnly
              active={rightVisible}
              onClick={toggleRight}
              title={
                rightVisible ? "Ocultar barra lateral derecha" : "Mostrar barra lateral derecha"
              }
            >
              <PanelRight size={16} />
            </ToolButton>
          )}
        </div>
      </div>

      <div className={styles.middle}>
        <div id="left-sidebar-slot" className={styles.leftSlot} />

        <div className={styles.rightColumn}>
          <div className={styles.body}>
            <main className={styles.content}>
              <Outlet />
            </main>
          </div>
          {bottomVisible && historyContent && (
            <div className={styles.bottomGap}>
              <Splitter
                orientation="horizontal"
                dragging={history.dragging}
                handleProps={history.handleProps}
              />
              <div className="tile bottombar" style={{ height: history.size, flex: "none" }}>
                {historyContent}
              </div>
            </div>
          )}
        </div>

        <div id="right-sidebar-slot" className={styles.rightSlot} />
      </div>

      <div className="statusbar">
        {statusContent}
        <span className="sp" />
        {!connectionMatch && (
          <ToolButton
            iconOnly
            size="sm"
            onClick={() => setAboutOpen(true)}
            title="About Postgre Hub"
          >
            <Info size={13} />
            <span>v{__APP_VERSION__}</span>
          </ToolButton>
        )}
        {connectionMatch && (
          <ToolButton
            iconOnly
            size="sm"
            active={bottomVisible}
            onClick={toggleBottom}
            title={bottomVisible ? "Ocultar panel inferior" : "Mostrar panel inferior"}
          >
            <PanelBottom size={14} />
            <span>History</span>
          </ToolButton>
        )}
      </div>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
};
