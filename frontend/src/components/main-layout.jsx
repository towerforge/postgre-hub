// Marco común de la app una vez iniciada la sesión: barra superior con el
// título, barra de estado, panel inferior redimensionable y los huecos
// `#left-sidebar-slot` y `#right-sidebar-slot`, donde la pantalla de una conexión
// monta sus paneles por portal. El contenido de cada barra lo ponen las páginas a
// través de los contextos (título, barra de estado, historial, paneles), así el
// marco no depende de ninguna pantalla concreta. Fuera de una conexión, la
// derecha de la barra superior lleva solo el chip de la cuenta, con un menú para
// About y salir, y no hay barra de estado: la caja ocupa también ese hueco.
import { useState } from "react";
import { NavLink, Outlet, useMatch, useNavigate } from "react-router-dom";
import { PanelLeft, PanelRight, PanelBottom, Info, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useSidebars } from "@/contexts/sidebars-context";
import { usePageTitle } from "@/contexts/page-title-context";
import { useStatusBar } from "@/contexts/status-bar-context";
import { useToolbar } from "@/contexts/toolbar-context";
import { useHistoryBar } from "@/contexts/history-bar-context";
import { AboutModal } from "@/components/about-modal";
import { initialsOf } from "@/components/connections-shell";
import { environmentLabel, readableOn } from "@/lib/environments";
import {
  Avatar,
  BrandMark,
  Button,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Splitter,
  useResizable,
} from "@/components/ui";
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
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const history = useResizable({
    key: "history",
    initial: 180,
    min: 90,
    max: 600,
    axis: "y",
    invert: true,
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

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
          <Button
            variant={7}
            iconOnly
            active={leftVisible}
            onClick={toggleLeft}
            title={
              leftVisible ? "Ocultar barra lateral izquierda" : "Mostrar barra lateral izquierda"
            }
          >
            <PanelLeft size={16} />
          </Button>
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
            {connectionMatch ? initialsOf(title) : <BrandMark size={15} />}
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
          {/* Separa las acciones de la conexión del botón del panel derecho */}
          {connectionMatch && <span className={styles.divider} aria-hidden="true" />}
          {/* Cuenta: solo fuera de una conexión, donde la barra va despejada; dentro
              sería ruido junto a las acciones. Un único chip con menú: About (con la
              versión) y salir quedan a dos clics deliberados. */}
          {!connectionMatch && (
            <Menu
              align="end"
              label="Account"
              minWidth={232}
              trigger={(props, { open }) => (
                <Button
                  {...props}
                  variant={7}
                  active={open}
                  className={styles.accountChip}
                  title={username ? `Signed in as ${username}` : undefined}
                >
                  <Avatar name={username} className={styles.accountAvatar} />
                  <span className={styles.accountName}>{username || "—"}</span>
                  <ChevronDown size={13} />
                </Button>
              )}
            >
              <MenuLabel>
                Signed in as <span className={styles.accountWho}>{username || "—"}</span>
              </MenuLabel>
              <MenuItem
                icon={<Info />}
                meta={`v${__APP_VERSION__}`}
                onSelect={() => setAboutOpen(true)}
              >
                About Postgre Hub
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<LogOut />} tone="danger" onSelect={handleLogout}>
                Log out
              </MenuItem>
            </Menu>
          )}
          {connectionMatch && (
            <Button
              variant={7}
              iconOnly
              active={rightVisible}
              onClick={toggleRight}
              title={
                rightVisible ? "Ocultar barra lateral derecha" : "Mostrar barra lateral derecha"
              }
            >
              <PanelRight size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Sin barra de estado debajo, la caja deja abajo el mismo margen que a los lados */}
      <div className={`${styles.middle} ${connectionMatch ? "" : styles.middleFull}`}>
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

      {/* Barra de estado: solo en una conexión; fuera quedaría vacía */}
      {connectionMatch && (
        <div className="statusbar">
          {statusContent}
          <span className="sp" />
          <Button
            variant={7}
            active={bottomVisible}
            onClick={toggleBottom}
            title={bottomVisible ? "Ocultar panel inferior" : "Mostrar panel inferior"}
          >
            <PanelBottom size={14} />
            <span>History</span>
          </Button>
        </div>
      )}
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
};
