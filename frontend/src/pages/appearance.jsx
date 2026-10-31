// Apariencia (/appearance): elegir el tema claro, oscuro o el del sistema. La
// aplicación y el recuerdo de la elección los hace `useTheme` del kit; esta
// pantalla solo ofrece las tres opciones con su descripción.
import { useEffect } from "react";
import { Sun, Monitor, Moon, Check } from "lucide-react";
import { ListItem, ListItemGroup, useTheme } from "@/components/ui";
import { ConnectionsShell } from "@/components/connections-shell";
import { usePageTitle } from "@/contexts/page-title-context";

const OPTIONS = [
  {
    value: "system",
    label: "System",
    description: "Follow the operating system preference.",
    icon: <Monitor size={16} />,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Application dark theme.",
    icon: <Moon size={16} />,
  },
  {
    value: "light",
    label: "Light",
    description: "Application light theme.",
    icon: <Sun size={16} />,
  },
];

const AppearancePage = () => {
  const { theme, setTheme } = useTheme();
  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    setPageTitle("Appearance");
  }, [setPageTitle]);

  return (
    <ConnectionsShell headerLeft="Appearance" headerRight={null}>
      <ListItemGroup>
        {OPTIONS.map((opt) => {
          const selected = theme === opt.value;
          return (
            <ListItem
              key={opt.value}
              selected={selected}
              onClick={() => setTheme(opt.value)}
              leading={
                <span
                  className="conn-avatar"
                  style={{ background: selected ? "var(--om-primary)" : "var(--om-bg-4)" }}
                >
                  {opt.icon}
                </span>
              }
              title={opt.label}
              subtitle={opt.description}
              mono={false}
              actions={selected && <Check size={16} style={{ color: "var(--om-accent)" }} />}
            />
          );
        })}
      </ListItemGroup>
    </ConnectionsShell>
  );
};

export default AppearancePage;
