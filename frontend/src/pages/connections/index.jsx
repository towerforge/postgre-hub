// Lista de conexiones (/connections): las conexiones PostgreSQL guardadas, con
// buscador, prueba de conexión y acceso al editor SQL de cada una. El alta y
// la edición están en `_connection-modal`; esta pantalla guarda la lista y
// qué conexión se está editando.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CheckCircle, XCircle, Plug, Pencil } from "lucide-react";
import {
  Button,
  Spinner,
  SearchBar,
  ListItem,
  ListItemGroup,
  ToolButton,
  useSpinner,
} from "@/components/ui";
import { usePageTitle } from "@/contexts/page-title-context";
import { ConnectionsShell, avatarColor, initialsOf } from "@/components/connections-shell";
import { apiListProjects, apiDeleteProject, apiTestConnection } from "@/services/connections";
import { ConnectionModal } from "./_connection-modal";

const ProjectsHome = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  // null, "create" o la conexión que se está editando.
  const [modal, setModal] = useState(null);
  const [hovered, setHovered] = useState(null);
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

  return (
    <>
      <ConnectionsShell
        headerLeft={
          <>
            Connections
            <span
              style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: "var(--om-fg-muted)" }}
            >
              {projects.length}
            </span>
          </>
        }
        headerRight={
          <Button variant={1} size="xl" onClick={() => setModal("create")}>
            <Plus size={14} /> New connection
          </Button>
        }
      >
        {loading ? (
          <div style={{ padding: 16, display: "flex", justifyContent: "center" }}>
            <Spinner label="Loading…" />
          </div>
        ) : projects.length === 0 ? (
          <div
            style={{
              padding: "40px 16px",
              textAlign: "center",
              color: "var(--om-fg-muted)",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            No connections yet.
            <br />
            Click <b>New connection</b> to start.
          </div>
        ) : (
          <>
            <div style={{ padding: "12px 16px 0" }}>
              <SearchBar
                size="lg"
                value={query}
                onChange={setQuery}
                placeholder="Filter by name, host, database, user…"
                style={{ width: "100%" }}
                autoFocus
              />
            </div>
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
              <ListItemGroup>
                {filtered.map((p) => {
                  const isHovered = hovered === p.id;
                  const test = tests[p.id];
                  const testing = test === "testing";
                  const testResult = test && test !== "testing" ? test : null;
                  const showActions = isHovered || !!test;
                  return (
                    <ListItem
                      key={p.id}
                      onClick={() => navigate(`/connections/${p.id}`)}
                      onMouseEnter={() => setHovered(p.id)}
                      onMouseLeave={() => setHovered(null)}
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
                            style={{ background: avatarColor(p.id, p.color) }}
                          >
                            {initialsOf(p.name)}
                          </span>
                        )
                      }
                      title={p.name}
                      subtitle={`postgres://${p.username}@${p.host}:${p.port}/${p.database}${p.read_only ? " · read-only" : ""}`}
                      actions={
                        showActions && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                            {!testing && (
                              <ToolButton
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
                              </ToolButton>
                            )}
                            <ToolButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setModal(p);
                              }}
                            >
                              <Pencil size={13} /> Edit
                            </ToolButton>
                          </div>
                        )
                      }
                    />
                  );
                })}
              </ListItemGroup>
            )}
          </>
        )}
      </ConnectionsShell>

      {modal && (
        <ConnectionModal
          project={modal === "create" ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
          onDelete={modal !== "create" ? () => handleDelete(modal) : undefined}
        />
      )}
    </>
  );
};

export default ProjectsHome;
