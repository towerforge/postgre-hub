// Pantalla de acceso a pantalla completa. Sirve para los dos casos que no tienen
// sesión: el primer arranque, en el que se crea el administrador
// (`setupRequired`), y el inicio de sesión normal. Es un componente y no una
// página porque `app.jsx` la muestra en lugar de las rutas mientras no hay
// sesión.
import { useState } from "react";
import { Database } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Alert, Button, Card, CardBody, Input } from "@/components/ui";
import css from "@/css/auth.module.css";

// Requisitos de contraseña del alta inicial. Se comprueban en vivo para pintar
// la lista y otra vez al enviar. Son más estrictos que el backend, que solo
// exige la longitud mínima.
const RULES = [
  { key: "length", label: "8+ characters", test: (p) => p.length >= 8 },
  { key: "upper", label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "Number", test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "Special character", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

const isPasswordStrong = (p) => RULES.every((r) => r.test(p));

/** Formulario de acceso, o de alta del primer administrador si `setupRequired`. */
export const AuthView = ({ setupRequired, onAuthenticated }) => {
  const { setup, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    if (setupRequired) {
      if (!isPasswordStrong(password)) {
        setError("Password does not meet the requirements");
        return;
      }
      if (confirm !== password) {
        setError("Passwords do not match");
        setConfirm("");
        return;
      }
    }
    setError("");
    setLoading(true);
    try {
      setupRequired
        ? await setup(username.trim(), password, confirm)
        : await login(username.trim(), password);
      onAuthenticated?.();
    } catch (err) {
      setError(err?.response?.data?.error ?? err?.message ?? "Authentication failed");
      setPassword("");
      setConfirm("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={css.root}>
      <div className={css.grid} />
      <div className={css.orb} />
      <div className={css.orbSmall} />
      <Card variant="panel" className={css.card}>
        <CardBody>
          <form onSubmit={onSubmit} className={css.form}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span className={css.logo}>
                <Database size={26} />
              </span>
              <div className={css.title}>Postgre Hub</div>
              <div style={{ color: "var(--om-fg-muted)" }}>
                {setupRequired ? "Create the first admin account" : "Sign in to continue"}
              </div>
            </div>

            <Input
              size="lg"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              spellCheck={false}
              autoFocus
            />

            <Input
              size="lg"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={setupRequired ? "new-password" : "current-password"}
              disabled={loading}
            />

            {setupRequired && (
              <>
                <Input
                  size="lg"
                  label="Confirm password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "4px 12px",
                    fontSize: 12,
                  }}
                >
                  {RULES.map((r) => {
                    const ok = r.test(password);
                    return (
                      <li
                        key={r.key}
                        style={{ color: ok ? "var(--om-green)" : "var(--om-fg-muted)" }}
                      >
                        {ok ? "✓" : "·"} {r.label}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {error && <Alert tone="error">{error}</Alert>}

            <Button variant={1} size="xl" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading
                ? setupRequired
                  ? "Creating account…"
                  : "Signing in…"
                : setupRequired
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
