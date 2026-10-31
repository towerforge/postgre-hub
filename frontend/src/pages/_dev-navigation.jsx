// Catálogo del kit (/dev), sección de navegación: Tabs como en el modal de
// conexión y en el panel History / Saved, SegmentedControl, InlineSelect y el
// desplegable ToolButton + `pos-menu` de la barra lateral del esquema. Lleva
// su propio estado para que cada control se pueda probar.
import { useEffect, useRef, useState } from "react";
import { Bookmark, ChevronDown, History, Trash2 } from "lucide-react";
import {
  InlineSelect,
  SegmentedControl,
  Tab,
  TabBar,
  TabPanel,
  Tabs,
  ToolButton,
} from "@/components/ui";
import css from "@/css/dev.module.css";
import { DevRow, DevSection } from "./_dev-section";

const AUTH_OPTIONS = [
  { value: "password", label: "Password" },
  { value: "key", label: "Private key" },
];

const SCHEMA_OPTIONS = [
  { value: "public", label: "public" },
  { value: "auth", label: "auth" },
];

const OBJECT_TABS = [
  { id: "tables", label: "Tables" },
  { id: "views", label: "Views" },
  { id: "sequences", label: "Sequences" },
  { id: "functions", label: "Functions" },
];

/** Sección Navigation del catálogo. */
export const DevNavigation = () => {
  const [connTab, setConnTab] = useState("general");
  const [histTab, setHistTab] = useState("history");
  const [auth, setAuth] = useState("password");
  const [schema, setSchema] = useState("public");
  const [objectTab, setObjectTab] = useState("tables");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // El desplegable de ejemplo se cierra al pulsar fuera de él.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const currentObject = OBJECT_TABS.find((t) => t.id === objectTab);

  return (
    <DevSection title="Navigation">
      <DevRow label="Tabs · connection modal (General / SSH Tunnel)">
        <div className={css.frame}>
          <Tabs value={connTab} onChange={setConnTab}>
            <TabBar>
              <Tab id="general">General</Tab>
              <Tab id="ssh" dot>
                SSH Tunnel
              </Tab>
            </TabBar>
            <TabPanel id="general" className={css.tabPanel}>
              Name, host, database, credentials and SSL.
            </TabPanel>
            <TabPanel id="ssh" className={css.tabPanel}>
              SSH tunnel chosen from the ones in SSH Tunnels.
            </TabPanel>
          </Tabs>
        </div>
      </DevRow>

      <DevRow label="Tabs with badge and actions · History / Saved panel">
        <div className={css.frame}>
          <Tabs value={histTab} onChange={setHistTab}>
            <TabBar
              actions={
                histTab === "history" && (
                  <ToolButton size="sm" title="Delete your history for this connection">
                    <Trash2 size={12} /> Clear
                  </ToolButton>
                )
              }
            >
              <Tab id="history" icon={<History size={14} />} badge={24}>
                History
              </Tab>
              <Tab id="saved" icon={<Bookmark size={14} />} badge={3}>
                Saved
              </Tab>
            </TabBar>
            <TabPanel id="history" className={css.tabPanel}>
              SELECT * FROM users WHERE created_at &gt; now() - interval &apos;7 days&apos;;
            </TabPanel>
            <TabPanel id="saved" className={css.tabPanel}>
              Active users by plan
            </TabPanel>
          </Tabs>
        </div>
      </DevRow>

      <DevRow label="SegmentedControl · SSH tunnel auth">
        <SegmentedControl options={AUTH_OPTIONS} value={auth} onChange={setAuth} />
      </DevRow>

      <DevRow label="InlineSelect">
        <InlineSelect label="Schema" value={schema} options={SCHEMA_OPTIONS} onChange={setSchema} />
      </DevRow>

      <DevRow label="Dropdown menu · ToolButton active + pos-menu">
        <div ref={menuRef} className={css.menuAnchor}>
          <ToolButton active={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            {currentObject.label}
            <ChevronDown size={13} />
          </ToolButton>
          {menuOpen && (
            <div className="pos-menu">
              {OBJECT_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  className={objectTab === id ? "active" : ""}
                  onClick={() => {
                    setObjectTab(id);
                    setMenuOpen(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </DevRow>
    </DevSection>
  );
};
