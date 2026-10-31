// Diálogo "About": versión instalada, enlace al repositorio y aviso si en GitHub
// hay una release más nueva. Se abre desde el pie del menú y desde la barra de
// estado; existe para que quien autoaloja la app sepa cuándo le toca actualizar
// sin tener que ir a mirarlo.
import { useState, useEffect } from "react";
import { Tag, RefreshCw, ExternalLink } from "lucide-react";
import { Modal, Alert } from "@/components/ui";
import { getLatestRelease } from "@/services/releases";

const GITHUB_REPO = "towerforge/postgre-hub";
const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "var(--fill-1)",
  borderRadius: "var(--radius-1)",
  padding: "10px 14px",
  border: "1px solid var(--stroke-1)",
};

export const AboutModal = ({ open, onClose }) => {
  const [latestVersion, setLatestVersion] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getLatestRelease()
      .then((d) => setLatestVersion(d.tag_name?.replace(/^v/, "") ?? null))
      .catch(() => null)
      .finally(() => setChecking(false));
  }, []);

  // `__APP_VERSION__` lo inyecta Vite en el build a partir de package.json.
  const hasUpdate = __APP_VERSION__ && latestVersion && __APP_VERSION__ !== latestVersion;

  return (
    <Modal open={open} onClose={onClose} title="About">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <img src="/logo.svg" alt="Postgre Hub" style={{ width: 48, height: 48 }} />
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>
            Postgre Hub
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 12,
              color: "var(--text-2)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              textDecoration: "none",
              marginTop: 2,
            }}
          >
            {GITHUB_REPO} <ExternalLink size={10} />
          </a>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={rowStyle}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--text-2)",
            }}
          >
            <Tag size={13} />
            Current version
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: 13,
              color: "var(--text-1)",
            }}
          >
            {__APP_VERSION__}
          </span>
        </div>

        {!checking && hasUpdate && (
          <>
            <div style={rowStyle}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "var(--text-2)",
                }}
              >
                <RefreshCw size={13} />
                Latest release
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--text-1)",
                }}
              >
                {latestVersion}
              </span>
            </div>
            <Alert tone="warning">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 500 }}>Update available</span>
                <a
                  href={`${GITHUB_URL}/releases/latest`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    marginLeft: "auto",
                    color: "inherit",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  View release <ExternalLink size={10} />
                </a>
              </span>
            </Alert>
          </>
        )}
      </div>
    </Modal>
  );
};
