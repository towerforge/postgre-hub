// Catálogo del kit (/design-system), sección de navegación: Tabs como en el modal de
// conexión y en el panel History / Saved, SegmentedControl, InlineSelect y el desplegable
// Button variant 7 + `pos-menu` de la barra lateral del esquema, todo en lg; al final, la
// tabla que compara lg y xl. Lleva su propio estado para que cada control se pueda probar.
import { useEffect, useRef, useState } from "react";
import { Bookmark, ChevronDown, History, Trash2 } from "lucide-react";
import {
  Button,
  InlineSelect,
  SegmentedControl,
  Tab,
  TabBar,
  TabPanel,
  Tabs,
} from "@/components/ui";
import css from "@/css/design-system.module.css";
import { CatalogRow, CatalogSection, SizeCompare } from "./_section";

const AUTH_OPTIONS = [
  { value: "password", label: "Password" },
  { value: "key", label: "Private key" },
];

const SCHEMA_OPTIONS = [
  { value: "public", label: "public" },
  { value: "auth", label: "auth" },
];

const ICON = { lg: 14, xl: 16 };

const OBJECT_TABS = [
  { id: "tables", label: "Tables" },
  { id: "views", label: "Views" },
  { id: "sequences", label: "Sequences" },
  { id: "functions", label: "Functions" },
];

/** Sección Navigation del catálogo. */
export const CatalogNavigation = () => {
  const [connTab, setConnTab] = useState("general");
  const [histTab, setHistTab] = useState("history");
  const [auth, setAuth] = useState("password");
  const [schema, setSchema] = useState("public");
  const [objectTab, setObjectTab] = useState("tables");
  const [sizeTab, setSizeTab] = useState("results");
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
    <CatalogSection
      id="navigation"
      title="Navigation"
      description="Tabs, segmented controls and inline selects follow the same scale. Every example is lg, the default for toolbars and dense rows; the table at the end puts both sizes side by side."
    >
      <CatalogRow label="Tabs in the connection modal (General, SSH Tunnel)">
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
      </CatalogRow>

      <CatalogRow label="Tabs with badge and actions, as in the History and Saved panel">
        <div className={css.frame}>
          <Tabs value={histTab} onChange={setHistTab}>
            <TabBar
              actions={
                histTab === "history" && (
                  <Button variant={7} title="Delete your history for this connection">
                    <Trash2 size={14} /> Clear
                  </Button>
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
      </CatalogRow>

      <CatalogRow label="Tab with icon, dot, badge and disabled">
        <div className={css.tabSizes}>
          <Tabs value={sizeTab} onChange={setSizeTab}>
            <TabBar>
              <Tab id="results" icon={<History size={14} />}>
                Results
              </Tab>
              <Tab id="messages" dot>
                Messages
              </Tab>
              <Tab id="saved" badge={3}>
                Saved
              </Tab>
              <Tab id="plan" disabled>
                Plan
              </Tab>
            </TabBar>
          </Tabs>
        </div>
      </CatalogRow>

      <CatalogRow label="SegmentedControl (SSH tunnel auth)">
        <SegmentedControl options={AUTH_OPTIONS} value={auth} onChange={setAuth} />
      </CatalogRow>

      <CatalogRow label="InlineSelect">
        <InlineSelect label="Schema" value={schema} options={SCHEMA_OPTIONS} onChange={setSchema} />
      </CatalogRow>

      <CatalogRow label="Dropdown menu: Button variant 7, active while open, over pos-menu">
        <div ref={menuRef} className={css.menuAnchor}>
          <Button variant={7} active={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            {currentObject.label}
            <ChevronDown size={14} />
          </Button>
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
      </CatalogRow>

      <SizeCompare
        label="Navigation controls in lg and xl, side by side"
        items={[
          {
            name: "Tab",
            render: (s) => (
              <Tabs size={s} value={sizeTab} onChange={setSizeTab}>
                <TabBar>
                  <Tab id="results" icon={<History size={ICON[s]} />}>
                    Results
                  </Tab>
                  <Tab id="saved" badge={3}>
                    Saved
                  </Tab>
                </TabBar>
              </Tabs>
            ),
          },
          {
            name: "SegmentedControl",
            render: (s) => (
              <SegmentedControl size={s} options={AUTH_OPTIONS} value={auth} onChange={setAuth} />
            ),
          },
          {
            name: "InlineSelect",
            render: (s) => (
              <InlineSelect
                size={s}
                label="Schema"
                value={schema}
                options={SCHEMA_OPTIONS}
                onChange={setSchema}
              />
            ),
          },
        ]}
      />
    </CatalogSection>
  );
};
