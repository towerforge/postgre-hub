// Lista de conexiones (/connections): las conexiones PostgreSQL guardadas,
// agrupadas por entorno, con buscador, prueba de conexión y acceso al editor SQL
// de cada una. El alta y
// la edición están en `_connection-modal`; esta pantalla guarda la lista y
// qué conexión se está editando.
import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Plus, CheckCircle, XCircle, Plug, Pencil, Database, Lock, Network } from "lucide-react";
import { Button, Spinner, SearchBar, ListItem, ListItemGroup, useSpinner } from "@/components/ui";
import { usePageTitle } from "@/contexts/page-title-context";
import { ConnectionsShell, avatarColor, initialsOf } from "@/components/connections-shell";
import { apiListProjects, apiDeleteProject, apiTestConnection } from "@/services/connections";
import { ENVIRONMENT_ORDER, environmentLabel, readableOn } from "@/lib/environments";
import { formatRelativeTime } from "@/lib/formatters";
import styles from "@/css/connections.module.css";
import { ConnectionModal } from "./_connection-modal";

const ProjectsHome = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  // null, "create" o la conexión que se está editando.
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState("");
  // Prueba por id de conexión: "testing" o `{ ok, message }` durante 3 s.
  const [tests, setTests] = useState({});

  const anyTesting = Object.values(tests).some((t) => t === "testing");
  const spinnerFrame = useSpinner(anyTesting);

  const navigate = useNavigate();

  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    setPageTitle("Postgre Hub");
  }, [setPageTitle]);

  const load = async () => {
    try {
      const r = await apiListProjects();
      setProjects(r.projects);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (p) => {
    await apiDeleteProject(p.id);
    setModal(null);
    load();
  };

  const handleTest = async (p) => {
    const start = Date.now();
    setTests((s) => ({ ...s, [p.id]: "testing" }));
    let result;
    try {
      const r = await apiTestConnection(p.id);
      result = { ok: r.ok, message: r.ok ? (r.version ?? "Connected") : (r.error ?? "Failed") };
    } catch (e) {
      result = { ok: false, message: e instanceof Error ? e.message : "Connection failed" };
    }
    const elapsed = Date.now() - start;
    if (elapsed < 1000) await new Promise((r) => setTimeout(r, 1000 - elapsed));
    setTests((s) => ({ ...s, [p.id]: result }));
    setTimeout(() => {
      setTests((s) => {
        const next = { ...s };
        delete next[p.id];
        return next;
      });
    }, 3000);
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.host.toLowerCase().includes(q) ||
          p.database.toLowerCase().includes(q) ||
          p.username.toLowerCase().includes(q),
      )
    : projects;

  // Grupos por entorno; si ninguna conexión tiene entorno, una sola lista sin título
  const groups = ENVIRONMENT_ORDER.map((env) => ({
    env,
    items: filtered.filter((p) => (p.environment ?? "") === env),
  })).filter((g) => g.items.length > 0);
  const showHeadings = projects.some((p) => p.environment);

  return (
    <>
      <ConnectionsShell
        maxWidth={1120}
        gutter={28}
        headerLeft={
          <>
            Connections
            <span className={styles.titleCount}>{projects.length}</span>
          </>
        }
        headerCenter={
          // El buscador sube a la línea del título; sin conexiones no hace falta
          projects.length > 0 && (
            <SearchBar
              size="xl"
              value={query}
              onChange={setQuery}
              placeholder="Filter connections…"
              style={{ width: "100%" }}
              autoFocus
            />
          )
        }
        headerRight={
          // Sin conexiones, el botón ya está en el estado vacío
          (loading || projects.length > 0) && (
            <Button variant={1} size="xl" onClick={() => setModal("create")}>
              <Plus size={14} /> New connection
            </Button>
          )
        }
      >
        {loading ? (
          <div style={{ padding: 16, display: "flex", justifyContent: "center" }}>
            <Spinner label="Loading…" />
          </div>
        ) : projects.length === 0 ? (
          <div className={styles.emptyState}>
            <Database size={28} />
            <h2>No connections yet</h2>
            <p>
              Add the PostgreSQL databases you work with. Credentials are stored on this server,
              never in the browser.
            </p>
            <Button variant={1} size="xl" onClick={() => setModal("create")}>
              <Plus size={14} /> New connection
            </Button>
          </div>
        ) : (
          <>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  color: "var(--om-fg-muted)",
                  fontSize: 13,
                }}
              >
                No matches for <span style={{ color: "var(--om-fg-bright)" }}>"{query}"</span>
              </div>
            ) : (
              groups.map((g) => (
                <section key={g.env || "none"} className={styles.envGroup}>
                  {showHeadings && (
                    <h3 className={styles.envHeading}>
                      <span className={`${styles.envDot} ${styles[g.env] ?? ""}`} />
                      {environmentLabel(g.env)}
                      <span className={styles.count}>{g.items.length}</span>
                    </h3>
                  )}
                  <ListItemGroup>
                    {g.items.map((p) => {
                      const test = tests[p.id];
                      const testing = test === "testing";
                      const testResult = test && test !== "testing" ? test : null;
                      return (
                        <ListItem
                          key={p.id}
                          className={styles.connRow}
                          onClick={() => navigate(`/connections/${p.id}`)}
                          leading={
                            testing ? (
                              <span
                                className="conn-avatar"
                                style={{
                                  background: "var(--om-bg-4)",
                                  color: "var(--om-fg-bright)",
                                  fontFamily: "var(--font-mono)",
                                  fontSize: 16,
                                }}
                              >
                                {spinnerFrame}
                              </span>
                            ) : (
                              <span
                                className="conn-avatar"
                                style={{
                                  background: avatarColor(p.id, p.color),
                                  color: readableOn(avatarColor(p.id, p.color)),
                                }}
                              >
                                {initialsOf(p.name)}
                              </span>
                            )
                          }
                          title={p.name}
                          subtitle={p.username}
                          actions={
                            // Columnas fijas: destino, datos y una ranura de acciones
                            // que solo se ve con hover o foco, sin tapar los datos
                            <>
                              <span
                                className={styles.target}
                                title={`postgres://${p.username}@${p.host}:${p.port}/${p.database}`}
                              >
                                {p.host}:{p.port} / {p.database}
                              </span>
                              <span className={styles.meta}>
                                {(p.ssh_tunnel_id || p.ssh_enabled) && (
                                  <span
                                    className={styles.chip}
                                    title="Connects through an SSH tunnel"
                                  >
                                    <Network size={11} /> SSH
                                  </span>
                                )}
                                {p.read_only && (
                                  <span
                                    className={styles.chip}
                                    title="Every transaction is READ ONLY"
                                  >
                                    <Lock size={11} /> Read-only
                                  </span>
                                )}
                                <span className={styles.lastUsed}>
                                  {p.last_used_at
                                    ? `Last query ${formatRelativeTime(p.last_used_at)}`
                                    : "Never queried"}
                                </span>
                              </span>
                              {/* Con una prueba en curso o su resultado, la ranura queda fija */}
                              <span className={`${styles.rowActions} ${test ? styles.pinned : ""}`}>
                                {!testing && (
                                  <Button
                                    variant={7}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTest(p);
                                    }}
                                    title={testResult?.message}
                                    style={{
                                      color: testResult
                                        ? testResult.ok
                                          ? "var(--color-success)"
                                          : "var(--color-danger)"
                                        : undefined,
                                    }}
                                  >
                                    {!testResult && <Plug size={13} />}
                                    {testResult?.ok && <CheckCircle size={13} />}
                                    {testResult && !testResult.ok && <XCircle size={13} />}
                                    {testResult ? (testResult.ok ? "Connected" : "Failed") : "Test"}
                                  </Button>
                                )}
                                <Button
                                  variant={7}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModal(p);
                                  }}
                                >
                                  <Pencil size={13} /> Edit
                                </Button>
                              </span>
                            </>
                          }
                        />
                      );
                    })}
                  </ListItemGroup>
                </section>
              ))
            )}
          </>
        )}
      </ConnectionsShell>

      {/* AnimatePresence: el modal se desmonta al cerrar y así le da tiempo a su salida */}
      <AnimatePresence>
        {modal && (
          <ConnectionModal
            key="connection-modal"
            project={modal === "create" ? undefined : modal}
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              load();
            }}
            onDelete={modal !== "create" ? () => handleDelete(modal) : undefined}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ProjectsHome;
