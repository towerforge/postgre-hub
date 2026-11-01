// Túneles SSH (/ssh-tunnels): perfiles de bastión reutilizables que luego se
// asignan a las conexiones. Se gestionan aparte para no repetir host, usuario y
// credenciales en cada conexión que pasa por el mismo bastión.
import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "motion/react";
import { Plus, Trash2, CheckCircle, Pencil, FileKey } from "lucide-react";
import {
  Button,
  Input,
  PasswordInput,
  Textarea,
  SegmentedControl,
  Modal,
  FormRow,
  Alert,
  Text,
  Spinner,
  SearchBar,
  ListItem,
  ListItemGroup,
} from "@/components/ui";
import { usePageTitle } from "@/contexts/page-title-context";
import { ConnectionsShell, avatarColor, initialsOf } from "@/components/connections-shell";
import {
  apiListTunnels,
  apiCreateTunnel,
  apiUpdateTunnel,
  apiDeleteTunnel,
  apiTestTunnel,
} from "@/services/ssh-tunnels";

const AUTH_OPTIONS = [
  { value: "password", label: "Password" },
  { value: "key", label: "Private key" },
];

// ── Modal de alta y edición ───────────────────────────────────────────────────

const TunnelModal = ({ tunnel, onClose, onSaved, onDelete }) => {
  const isEdit = !!tunnel;
  const [form, setForm] = useState({
    name: tunnel?.name ?? "",
    host: tunnel?.host ?? "",
    port: tunnel?.port ?? 22,
    username: tunnel?.username ?? "",
    auth_type: tunnel?.auth_type ?? "password",
    password: "",
    private_key: tunnel?.private_key ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testRes, setTestRes] = useState(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef(null);

  const str = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleTest = async () => {
    if (!isEdit) return;
    setTesting(true);
    setTestRes(null);
    try {
      const r = await apiTestTunnel(tunnel.id);
      setTestRes({ ok: r.ok, msg: r.ok ? (r.message ?? "Connected") : (r.error ?? "Failed") });
    } catch (e) {
      setTestRes({ ok: false, msg: e instanceof Error ? e.message : "Failed" });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.host.trim() || !form.username.trim()) {
      setError("Name, host and username are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      isEdit ? await apiUpdateTunnel(tunnel.id, form) : await apiCreateTunnel(form);
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
        <Button variant={5} size="xl" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={14} /> Delete
        </Button>
      )}
      <div style={{ flex: 1 }} />
      <Button variant={2} size="xl" onClick={onClose}>
        Cancel
      </Button>
      {isEdit && (
        <Button variant={2} size="xl" onClick={handleTest} disabled={testing}>
          <CheckCircle size={14} /> {testing ? "Testing…" : "Test"}
        </Button>
      )}
      <Button variant={1} size="xl" onClick={handleSave} disabled={loading}>
        {loading ? "Saving…" : isEdit ? "Save changes" : "Create tunnel"}
      </Button>
    </>
  );

  // Confirmación con el Modal del kit en lugar de `window.confirm`, que el
  // webview de la app de escritorio no muestra igual en todas las plataformas.
  // Se cierra antes de borrar, como en el modal de conexión, y sin más cambios
  // de estado: re-renderizar mientras el padre retira este modal hace que las
  // salidas animadas choquen y React avise de claves duplicadas. Si el borrado
  // falla, el modal sigue abierto y el error sale en su Alert.
  const handleConfirmDelete = async () => {
    setConfirmDelete(false);
    try {
      await onDelete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={isEdit ? "Edit SSH tunnel" : "New SSH tunnel"}
        bodyFlush
        footer={footer}
      >
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <FormRow label="Name">
            <Input
              size="xl"
              value={form.name}
              onChange={str("name")}
              placeholder="Production bastion"
              autoFocus
            />
          </FormRow>
          <FormRow label="SSH host">
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Input
                  size="xl"
                  value={form.host}
                  onChange={str("host")}
                  placeholder="bastion.example.com"
                />
              </div>
              <div style={{ width: 96 }}>
                <Input
                  size="xl"
                  value={String(form.port)}
                  onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))}
                  type="number"
                  placeholder="22"
                />
              </div>
            </div>
          </FormRow>
          <FormRow label="SSH user">
            <Input
              size="xl"
              value={form.username}
              onChange={str("username")}
              placeholder="ubuntu"
            />
          </FormRow>
          <FormRow label="Auth">
            <SegmentedControl
              size="xl"
              options={AUTH_OPTIONS}
              value={form.auth_type}
              onChange={(v) => setForm((f) => ({ ...f, auth_type: v }))}
            />
          </FormRow>
          {form.auth_type === "password" ? (
            <FormRow label="Password">
              <PasswordInput
                size="xl"
                value={form.password ?? ""}
                onChange={str("password")}
                placeholder={isEdit ? "(unchanged)" : "••••••••"}
              />
            </FormRow>
          ) : (
            <>
              <FormRow label="Private key">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Textarea
                    mono
                    value={form.private_key ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, private_key: e.target.value }))}
                    placeholder={
                      isEdit
                        ? "(unchanged)"
                        : "-----BEGIN OPENSSH PRIVATE KEY-----\n…\nor a path like ~/.ssh/id_rsa"
                    }
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Button variant={3} onClick={() => fileRef.current?.click()}>
                      <FileKey size={13} /> Browse…
                    </Button>
                    <Text variant="hint">
                      Load a key file, or paste its contents, or type a path.
                    </Text>
                    {/* Input de fichero oculto; lo abre el botón Browse */}
                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const text = await file.text();
                        setForm((f) => ({ ...f, private_key: text }));
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
              </FormRow>
              <FormRow label="Passphrase">
                <PasswordInput
                  size="xl"
                  value={form.password ?? ""}
                  onChange={str("password")}
                  placeholder={isEdit ? "(unchanged)" : "optional"}
                />
              </FormRow>
            </>
          )}
          {testRes && <Alert tone={testRes.ok ? "success" : "error"}>{testRes.msg}</Alert>}
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </Modal>

      <Modal
        open={confirmDelete && isEdit && !!onDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete SSH tunnel"
        size="sm"
        zIndex={10001}
        footer={
          <>
            <Button variant={2} size="xl" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant={6} size="xl" onClick={handleConfirmDelete}>
              <Trash2 size={14} /> Delete
            </Button>
          </>
        }
      >
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--om-fg)" }}>
          Are you sure you want to delete{" "}
          <span style={{ color: "var(--om-fg-bright)", fontWeight: 600 }}>"{tunnel?.name}"</span>?
          <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--om-fg-muted)" }}>
            Connections using it will lose SSH access.
          </div>
        </div>
      </Modal>
    </>
  );
};

// ── Pantalla ──────────────────────────────────────────────────────────────────

const SshTunnelsPage = () => {
  const [tunnels, setTunnels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [query, setQuery] = useState("");

  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    setPageTitle("SSH Tunnels");
  }, [setPageTitle]);

  const load = async () => {
    try {
      const r = await apiListTunnels();
      setTunnels(r.tunnels);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (t) => {
    await apiDeleteTunnel(t.id);
    setModal(null);
    load();
  };

  // Filtro por nombre, host o usuario, igual que el buscador de conexiones
  const q = query.trim().toLowerCase();
  const filtered = q
    ? tunnels.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.host.toLowerCase().includes(q) ||
          t.username.toLowerCase().includes(q),
      )
    : tunnels;

  return (
    <>
      <ConnectionsShell
        headerLeft={
          <>
            SSH Tunnels
            <span
              style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: "var(--om-fg-muted)" }}
            >
              {tunnels.length}
            </span>
          </>
        }
        headerCenter={
          // El buscador sube a la línea del título; sin túneles no hace falta
          tunnels.length > 0 && (
            <SearchBar
              size="xl"
              value={query}
              onChange={setQuery}
              placeholder="Filter tunnels…"
              style={{ width: "100%" }}
              autoFocus
            />
          )
        }
        headerRight={
          <Button variant={1} size="xl" onClick={() => setModal("create")}>
            <Plus size={14} /> New tunnel
          </Button>
        }
      >
        {loading ? (
          <div style={{ padding: 16, display: "flex", justifyContent: "center" }}>
            <Spinner label="Loading…" />
          </div>
        ) : tunnels.length === 0 ? (
          <div
            style={{
              padding: "40px 16px",
              textAlign: "center",
              color: "var(--om-fg-muted)",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            No SSH tunnels yet.
            <br />
            Click <b>New tunnel</b> to start.
          </div>
        ) : filtered.length === 0 ? (
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
            {filtered.map((t) => (
              <ListItem
                key={t.id}
                onClick={() => setModal(t)}
                onMouseEnter={() => setHovered(t.id)}
                onMouseLeave={() => setHovered(null)}
                leading={
                  <span className="conn-avatar" style={{ background: avatarColor(t.id) }}>
                    {initialsOf(t.name)}
                  </span>
                }
                title={t.name}
                subtitle={`${t.username}@${t.host}:${t.port} · ${t.auth_type === "key" ? "key" : "password"}`}
                actions={
                  hovered === t.id && (
                    <Button
                      variant={7}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal(t);
                      }}
                    >
                      <Pencil size={13} /> Edit
                    </Button>
                  )
                }
              />
            ))}
          </ListItemGroup>
        )}
      </ConnectionsShell>

      {/* AnimatePresence: el modal se desmonta al cerrar y así le da tiempo a su salida */}
      <AnimatePresence>
        {modal && (
          <TunnelModal
            key="tunnel-modal"
            tunnel={modal === "create" ? undefined : modal}
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

export default SshTunnelsPage;
