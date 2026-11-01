// Usuarios (/users): alta, cambio de contraseña y baja de las cuentas que
// pueden entrar en la aplicación. El usuario con sesión se marca como «(you)» y
// no puede borrarse a sí mismo.
import { useState, useEffect, useCallback } from "react";
import { KeyRound, Plus, Trash2, User } from "lucide-react";
import { Button, Modal, Input, PasswordInput, Table, Alert } from "@/components/ui";
import { ConnectionsShell } from "@/components/connections-shell";
import { usePageTitle } from "@/contexts/page-title-context";
import { apiListUsers, apiCreateUser, apiDeleteUser, apiUpdateUser } from "@/services/users";
import { apiAuthMe } from "@/services/auth";

// ── Modal de alta ─────────────────────────────────────────────────────────────

const AddUserModal = ({ open, onClose, onAdded }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setUsername("");
    setPassword("");
    setError("");
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!username.trim() || password.length < 8 || saving) return;
    setSaving(true);
    setError("");
    try {
      await apiCreateUser({ username: username.trim(), password });
      reset();
      onAdded();
    } catch (err) {
      setError(err.message ?? "Error creating user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add user"
      size="sm"
      footer={
        <>
          <Button variant={2} size="xl" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant={1}
            size="xl"
            loading={saving}
            disabled={!username.trim() || password.length < 8}
            onClick={handleSubmit}
          >
            Add user
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input
          size="xl"
          label="Username"
          required
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <PasswordInput
          size="xl"
          label="Password"
          required
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Modal>
  );
};

// ── Modal de cambio de contraseña ─────────────────────────────────────────────

const ResetPasswordModal = ({ open, user, onClose, onDone }) => {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setPassword("");
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!user || password.length < 8 || saving) return;
    setSaving(true);
    setError("");
    try {
      await apiUpdateUser(user.id, { new_password: password });
      handleClose();
      onDone();
    } catch (err) {
      setError(err.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Reset password — ${user?.username ?? ""}`}
      size="sm"
      footer={
        <>
          <Button variant={2} size="xl" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant={1}
            size="xl"
            loading={saving}
            disabled={password.length < 8}
            onClick={handleSubmit}
          >
            Reset password
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <PasswordInput
          size="xl"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (min. 8 characters)"
        />
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Modal>
  );
};

// ── Pantalla ──────────────────────────────────────────────────────────────────

const UsersPage = () => {
  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    setPageTitle("Users");
  }, [setPageTitle]);

  const [users, setUsers] = useState([]);
  const [myId, setMyId] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      const [list, me] = await Promise.all([apiListUsers(), apiAuthMe()]);
      setUsers(list);
      setMyId(me.id);
    } catch {
      // Sin lista no hay nada que mostrar; la tabla se queda como estaba.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await apiDeleteUser(id);
      await load();
    } catch {
      // Si la baja falla, el usuario sigue en la tabla y se puede reintentar.
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (ts) =>
    new Date(ts * 1000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const columns = [
    {
      key: "username",
      header: "Username",
      render: (u) => (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <User size={14} style={{ color: "var(--text-3)", flexShrink: 0 }} />
          <span style={{ fontWeight: 500, color: "var(--text-1)" }}>{u.username}</span>
          {u.id === myId && (
            <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500 }}>(you)</span>
          )}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      shrink: true,
      render: (u) => (
        <span style={{ color: "var(--text-3)", fontSize: 12 }}>{formatDate(u.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      shrink: true,
      render: (u) => (
        <div style={{ display: "flex", gap: 4 }}>
          <Button
            variant={7}
            onClick={(e) => {
              e.stopPropagation();
              setResetUser(u);
            }}
            title="Reset password"
          >
            <KeyRound size={13} /> Reset pw
          </Button>
          {u.id !== myId && (
            <Button
              variant={8}
              label="Delete user"
              disabled={deleting === u.id}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(u.id);
              }}
            >
              <Trash2 size={13} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ConnectionsShell
      headerLeft={
        <>
          Users
          <span
            style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: "var(--om-fg-muted)" }}
          >
            {users.length}
          </span>
        </>
      }
      headerRight={
        <Button variant={1} size="xl" onClick={() => setAddOpen(true)}>
          <Plus size={14} /> New user
        </Button>
      }
    >
      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setAddOpen(false);
          load();
        }}
      />
      <ResetPasswordModal
        open={resetUser !== null}
        user={resetUser}
        onClose={() => setResetUser(null)}
        onDone={() => load()}
      />

      <div style={{ padding: 24 }}>
        <Table
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          emptyMessage="No users found."
        />
      </div>
    </ConnectionsShell>
  );
};

export default UsersPage;
