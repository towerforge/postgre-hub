// Pantalla de acceso a pantalla completa. Sirve para los dos casos que no tienen
// sesión: el primer arranque, en el que se crea el administrador
// (`setupRequired`), y el inicio de sesión normal. Es un componente y no una
// página porque `app.jsx` la muestra en lugar de las rutas mientras no hay
// sesión.
//
// Sigue el lenguaje del login de taskflow (columna centrada sin tarjeta, título
// grande, campos sin etiqueta, entrada en cascada y check + fundido al entrar)
// con la identidad propia: orbe azul de PostgreSQL, rejilla de puntos y la
// marca (el monograma PH de BrandMark).
import { useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { BrandMark, Button, Input, PasswordInput } from "@/components/ui";
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

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** Formulario de acceso, o de alta del primer administrador si `setupRequired`. */
export const AuthView = ({ setupRequired }) => {
  const { setup, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Coreografía del éxito: `success` dibuja el check en el botón y `leave`
  // funde la columna; el contexto espera a que acabe antes de abrir la app.
  const [success, setSuccess] = useState(false);
  const [leave, setLeave] = useState(false);

  const clearError = () => error && setError("");

  const beforeEnter = async () => {
    setSuccess(true);
    await wait(500);
    setLeave(true);
    await wait(400);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading || success || !username.trim() || !password) return;
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
        ? await setup(username.trim(), password, confirm, beforeEnter)
        : await login(username.trim(), password, beforeEnter);
    } catch (err) {
      setError(err?.response?.data?.error ?? err?.message ?? "Authentication failed");
      setPassword("");
      setConfirm("");
      setLoading(false);
    }
  };

  // El error se pinta bajo el último campo de contraseña del formulario
  const passwordError = setupRequired ? undefined : error || undefined;
  const confirmError = setupRequired ? error || undefined : undefined;

  return (
    <div className={css.root}>
      <div className={css.grid} />
      <div className={css.orb} />
      <div className={css.orbSmall} />

      <div className={leave ? `${css.column} ${css.exit}` : css.column}>
        <form onSubmit={onSubmit} noValidate>
          <div className={`${css.in} ${css.brand}`}>
            <span className={css.logo}>
              <BrandMark size={26} />
            </span>
            <span className={css.wordmark}>Postgre Hub</span>
          </div>

          <h1 className={`${css.in} ${css.delay05} ${css.title}`}>
            {setupRequired ? "Create the first admin account" : "Welcome back."}
          </h1>
          {setupRequired && (
            <p className={`${css.in} ${css.delay08} ${css.intro}`}>
              It manages users and saved connections. You can add more users later.
            </p>
          )}

          <div className={`${css.in} ${css.delay10}`}>
            <Input
              size="xl"
              placeholder="Username"
              aria-label="Username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                clearError();
              }}
              autoComplete="username"
              spellCheck={false}
              autoFocus
              disabled={loading}
            />
          </div>

          <div className={`${css.in} ${css.delay15} ${css.spaced}`}>
            <PasswordInput
              size="xl"
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              autoComplete={setupRequired ? "new-password" : "current-password"}
              disabled={loading}
              error={passwordError}
            />
          </div>

          {setupRequired && (
            <>
              <div className={`${css.in} ${css.delay16} ${css.spaced}`}>
                <PasswordInput
                  size="xl"
                  placeholder="Confirm password"
                  aria-label="Confirm password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    clearError();
                  }}
                  autoComplete="new-password"
                  disabled={loading}
                  error={confirmError}
                />
              </div>
              <ul className={`${css.in} ${css.delay20} ${css.rules}`}>
                {RULES.map((r) => {
                  const ok = r.test(password);
                  return (
                    <li key={r.key} className={ok ? css.ruleOk : undefined}>
                      <span className={css.ruleMark}>{ok ? "✓" : "·"}</span>
                      {r.label}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <div className={`${css.in} ${css.delay20} ${css.action}`}>
            <Button
              variant={1}
              size="xl"
              type="submit"
              disabled={loading}
              className={success ? css.buttonSuccess : undefined}
              style={{ width: "100%" }}
            >
              {success ? (
                <Check size={18} className={css.check} />
              ) : loading ? (
                setupRequired ? (
                  "Creating account…"
                ) : (
                  "Signing in…"
                )
              ) : setupRequired ? (
                "Create account"
              ) : (
                "Sign in"
              )}
            </Button>
          </div>

          <div className={`${css.in} ${css.delay25} ${css.footer}`}>
            <span className={css.divider} />
            {setupRequired
              ? "This screen only appears on the first run."
              : "Self-hosted PostgreSQL client"}
          </div>
        </form>
      </div>
    </div>
  );
};
