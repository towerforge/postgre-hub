// Modal de alta y edición de una conexión PostgreSQL, con dos pestañas: los
// datos de conexión y el túnel SSH (elegido de los que hay en /ssh-tunnels).
// Incluye la confirmación de borrado. Es una pieza de la lista de conexiones
// (/connections), que decide cuándo se abre y recarga al guardar.
import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import {
  Alert,
  Button,
  ColorPicker,
  FormRow,
  InfoBox,
  Input,
  Modal,
  Select,
  Switch,
  Tab,
  TabBar,
  Tabs,
} from "@/components/ui";
import { apiCreateProject, apiUpdateProject } from "@/services/connections";
import { apiListTunnels } from "@/services/ssh-tunnels";

const SSL_OPTIONS = [
  { value: "disable", label: "Disable" },
  { value: "prefer", label: "Prefer" },
  { value: "require", label: "Require" },
];

/**
 * Alta o edición de una conexión: con `project` edita, sin él crea. `onDelete`
 * es opcional y solo aparece el botón de borrar si se pasa.
 */
export const ConnectionModal = ({ project, onClose, onSaved, onDelete }) => {
  const isEdit = !!project;

  const [tab, setTab] = useState("general");
  const [tunnels, setTunnels] = useState([]);

  const [form, setForm] = useState({
    name: project?.name ?? "",
    host: project?.host ?? "localhost",
    port: project?.port ?? 5432,
    database: project?.database ?? "",
    username: project?.username ?? "postgres",
    password: "",
    ssl_mode: project?.ssl_mode ?? "prefer",
    ssl_ca: "",
    ssl_client_cert: "",
    ssl_client_key: "",
    ssh_enabled: false,
    ssh_host: "",
    ssh_port: 22,
    ssh_user: "",
    ssh_password: "",
    ssh_private_key: "",
    ssh_tunnel_id: project?.ssh_tunnel_id ?? null,
    color: project?.color ?? "",
    read_only: project?.read_only ?? false,
    query_timeout: project?.query_timeout ?? 0,
  });

  useEffect(() => {
    apiListTunnels()
      .then((r) => setTunnels(r.tunnels))
      .catch(() => {});
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const str = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const connUrl = `postgres://${form.username || "user"}${form.password ? ":•••" : ""}@${form.host || "host"}:${form.port || 5432}/${form.database || "db"}${form.ssl_mode === "require" ? "?sslmode=require" : ""}`;

  const handleSave = async () => {
    if (!form.name.trim() || !form.host.trim() || !form.database.trim() || !form.username.trim()) {
      setError("Name, host, database and username are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      isEdit ? await apiUpdateProject(project.id, form) : await apiCreateProject(form);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      {isEdit && onDelete && (
        <Button variant={5} onClick={() => setConfirmDelete(true)}>
          <Trash2 size={13} /> Delete
        </Button>
      )}
      <div style={{ flex: 1 }} />
      <Button variant={2} onClick={onClose}>
        Cancel
      </Button>
      <Button variant={1} onClick={handleSave} disabled={loading}>
        {loading ? "Saving…" : isEdit ? "Save changes" : "Connect"}
      </Button>
    </>
  );

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={isEdit ? "Edit connection" : "New connection"}
        bodyFlush
        footer={footer}
      >
        <Tabs
          value={tab}
          onChange={(id) => {
            setTab(id);
            setError("");
          }}
        >
          <TabBar>
            <Tab id="general">General</Tab>
            <Tab id="ssh" dot={!!form.ssh_tunnel_id}>
              SSH Tunnel
            </Tab>
          </TabBar>
        </Tabs>

        <div
          style={{
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 300,
          }}
        >
          {tab === "general" && (
            <>
              <FormRow label="Name">
                <Input
                  size="lg"
                  value={form.name}
                  onChange={str("name")}
                  placeholder="My database"
                  autoFocus
                />
              </FormRow>
              <FormRow label="Host">
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      size="lg"
                      value={form.host}
                      onChange={str("host")}
                      placeholder="localhost"
                    />
                  </div>
                  <div style={{ width: 96 }}>
                    <Input
                      size="lg"
                      value={String(form.port)}
                      onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))}
                      type="number"
                      placeholder="5432"
                    />
                  </div>
                </div>
              </FormRow>
              <FormRow label="Database">
                <Input
                  size="lg"
                  value={form.database}
                  onChange={str("database")}
                  placeholder="mydb"
                />
              </FormRow>
              <FormRow label="Username">
                <Input
                  size="lg"
                  value={form.username}
                  onChange={str("username")}
                  placeholder="postgres"
                />
              </FormRow>
              <FormRow label="Password">
                <Input
                  size="lg"
                  value={form.password ?? ""}
                  onChange={str("password")}
                  type="password"
                  placeholder="••••••••"
                />
              </FormRow>
              <FormRow label="SSL">
                <Select
                  value={form.ssl_mode}
                  options={SSL_OPTIONS}
                  onChange={(e) => setForm((f) => ({ ...f, ssl_mode: e.target.value }))}
                />
              </FormRow>
              <FormRow label="Read-only">
                <Switch
                  checked={form.read_only ?? false}
                  onChange={(v) => setForm((f) => ({ ...f, read_only: v }))}
                  label="Open every transaction as READ ONLY"
                />
              </FormRow>
              <FormRow label="Query timeout">
                <Input
                  size="lg"
                  type="number"
                  min={0}
                  value={String(form.query_timeout ?? 0)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      query_timeout: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                    }))
                  }
                  hint="Seconds. 0 means no limit"
                />
              </FormRow>
              <FormRow label="Color">
                <ColorPicker
                  value={form.color ?? ""}
                  onChange={(c) => setForm((f) => ({ ...f, color: c }))}
                />
              </FormRow>
              <InfoBox style={{ marginLeft: 132 }}>{connUrl}</InfoBox>
            </>
          )}

          {tab === "ssh" && (
            <>
              <FormRow label="SSH Tunnel">
                <Select
                  value={form.ssh_tunnel_id ?? ""}
                  options={[
                    { value: "", label: "None (direct connection)" },
                    ...tunnels.map((t) => ({ value: t.id, label: t.name })),
                  ]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ssh_tunnel_id: e.target.value || null }))
                  }
                />
              </FormRow>
              {form.ssh_tunnel_id &&
                (() => {
                  const t = tunnels.find((t) => t.id === form.ssh_tunnel_id);
                  if (!t) return null;
                  return (
                    <InfoBox style={{ marginLeft: 132 }}>
                      {t.username}@{t.host}:{t.port} ·{" "}
                      {t.auth_type === "key" ? "Private key" : "Password"}
                    </InfoBox>
                  );
                })()}
              <div
                style={{ marginLeft: 142, fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}
              >
                Configure SSH tunnels in{" "}
                <a href="/ssh-tunnels" style={{ color: "var(--accent)", textDecoration: "none" }}>
                  SSH Tunnels
                </a>
                .
              </div>
            </>
          )}

          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </Modal>

      <Modal
        open={confirmDelete && isEdit && !!onDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete connection"
        size="sm"
        zIndex={10001}
        footer={
          <>
            <div style={{ flex: 1 }} />
            <Button variant={2} onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant={6}
              onClick={() => {
                setConfirmDelete(false);
                onDelete?.();
              }}
            >
              <Trash2 size={13} /> Delete
            </Button>
          </>
        }
      >
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--om-fg)" }}>
          Are you sure you want to delete{" "}
          <span style={{ color: "var(--om-fg-bright)", fontWeight: 600 }}>"{project?.name}"</span>?
          <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--om-fg-muted)" }}>
            This only removes the saved connection. The database itself is not affected.
          </div>
        </div>
      </Modal>
    </>
  );
};
