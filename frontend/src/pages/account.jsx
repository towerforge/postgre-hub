// Cuenta del usuario con sesión (/account): cambiar el nombre de usuario o la
// contraseña. Cualquier cambio pide la contraseña actual, y la nueva se valida
// aquí, con un medidor, para que no se pueda guardar una contraseña débil.
import { useEffect, useState } from "react";
import { Button, Input, PasswordInput, Card, CardBody, Alert, Text } from "@/components/ui";
import { ConnectionsShell } from "@/components/connections-shell";
import { usePageTitle } from "@/contexts/page-title-context";
import { apiUpdateCredentials } from "@/services/account";

const RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "One special character (!@#$…)", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

const isPasswordStrong = (p) => RULES.every((r) => r.test(p));

const PasswordStrength = ({ password }) => {
  if (!password.length)
    return (
      <Text variant="hint">
        Min. 8 characters, uppercase, lowercase, number and special character.
      </Text>
    );
  const passed = RULES.filter((r) => r.test(password)).length;
  const pct = (passed / RULES.length) * 100;
  const barColor =
    pct === 100 ? "var(--om-green)" : pct <= 40 ? "var(--om-red)" : "var(--om-yellow)";
  // Medidor propio: el kit no tiene barra de progreso.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ height: 4, background: "var(--fill-2)", borderRadius: 99, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: barColor,
            borderRadius: 99,
            transition: "width 0.2s",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <Text
              key={r.key}
              variant="hint"
              as="p"
              style={ok ? { color: "var(--om-green)" } : undefined}
            >
              {ok ? "✓" : "·"} {r.label}
            </Text>
          );
        })}
      </div>
    </div>
  );
};

const AccountPage = () => {
  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    setPageTitle("Account");
  }, [setPageTitle]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const newPasswordValid = newPassword === "" || isPasswordStrong(newPassword);
  const canSave =
    currentPassword.length > 0 &&
    (newUsername.trim().length > 0 || newPassword.length > 0) &&
    (newPassword === "" || (isPasswordStrong(newPassword) && newPassword === confirmPassword));

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiUpdateCredentials({
        current_password: currentPassword,
        new_username: newUsername.trim() || undefined,
        new_password: newPassword || undefined,
        confirm_new_password: confirmPassword || undefined,
      });
      setSuccess("Credentials updated successfully.");
      setCurrentPassword("");
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message ?? "Error saving changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConnectionsShell headerLeft="Account" headerRight={null}>
      <div style={{ padding: 24 }}>
        <Card variant={2} style={{ maxWidth: 480 }}>
          <CardBody style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* La contraseña actual se pide siempre */}
            <PasswordInput
              size="xl"
              label="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Required to save changes"
              autoComplete="current-password"
            />

            <hr style={{ border: "none", borderTop: "1px solid var(--om-border)", margin: 0 }} />

            <Input
              size="xl"
              label="New username"
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Leave empty to keep current"
              autoComplete="username"
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <PasswordInput
                size="xl"
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave empty to keep current"
                autoComplete="new-password"
              />
              {newPassword.length > 0 && (
                <>
                  <PasswordStrength password={newPassword} />
                  <PasswordInput
                    size="xl"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    error={
                      confirmPassword.length > 0 && newPassword !== confirmPassword
                        ? "Passwords do not match"
                        : undefined
                    }
                  />
                </>
              )}
            </div>

            {error && <Alert tone="error">{error}</Alert>}
            {success && <Alert tone="success">{success}</Alert>}

            <div>
              <Button
                variant={1}
                size="xl"
                loading={saving}
                disabled={!canSave || !newPasswordValid}
                onClick={handleSave}
              >
                Save changes
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </ConnectionsShell>
  );
};

export default AccountPage;
