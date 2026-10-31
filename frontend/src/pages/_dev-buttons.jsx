// Catálogo del kit (/dev), sección de botones: Button con sus variantes,
// tamaños e iconos, y ToolButton, el botón ligero de barras y filas. Lleva su
// propio estado para la demo de desplegables con `pos-menu`.
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Download,
  Keyboard,
  PanelBottom,
  PanelLeft,
  Play,
  Plus,
  Save,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button, Col, Grid, Text, ToolButton } from "@/components/ui";

/** Secciones Botones, Botones con icono y ToolButton del catálogo. */
export const DevButtons = () => {
  const [infoTab, setInfoTab] = useState("info");
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef(null);
  const [tableTab, setTableTab] = useState("tables");
  const [tableOpen, setTableOpen] = useState(false);
  const tableRef = useRef(null);

  // Los desplegables de ejemplo se cierran al pulsar fuera de ellos.
  useEffect(() => {
    if (!infoOpen && !tableOpen) return;
    const onDown = (e) => {
      const t = e.target;
      if (infoOpen && infoRef.current && !infoRef.current.contains(t)) setInfoOpen(false);
      if (tableOpen && tableRef.current && !tableRef.current.contains(t)) setTableOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [infoOpen, tableOpen]);

  return (
    <>
      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        Botones
      </Text>
      <Grid gap={8} align="center" style={{ marginBottom: 32 }}>
        <Col span={12} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant={1}>Primary</Button>
          <Button variant={2}>Secondary</Button>
          <Button variant={3}>Outline</Button>
          <Button variant={4}>Subtle</Button>
          <Button variant={5}>Danger</Button>
          <Button variant={1} loading>
            Loading
          </Button>
          <Button variant={2} size="sm">
            Small
          </Button>
          <Button variant={2} size="lg">
            Large
          </Button>
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        Botones con icono
      </Text>
      <Grid gap={8} style={{ marginBottom: 32 }}>
        <Col span={12} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Text
            variant="caption"
            style={{ width: "100%", marginBottom: 4, color: "var(--om-fg-muted)" }}
          >
            Icono a la izquierda
          </Text>
          <Button variant={1}>
            <Plus size={14} /> New
          </Button>
          <Button variant={2}>
            <Download size={14} /> Export
          </Button>
          <Button variant={3}>
            <Search size={14} /> Search
          </Button>
          <Button variant={4}>
            <Save size={14} /> Save
          </Button>
          <Button variant={5}>
            <Trash2 size={14} /> Delete
          </Button>
        </Col>
        <Col
          span={12}
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text
            variant="caption"
            style={{ width: "100%", marginBottom: 4, color: "var(--om-fg-muted)" }}
          >
            Icono a la derecha
          </Text>
          <Button variant={1}>
            Continue <ArrowRight size={14} />
          </Button>
          <Button variant={2}>
            Next step <ArrowRight size={14} />
          </Button>
          <Button variant={3}>
            Download <Download size={14} />
          </Button>
        </Col>
        <Col
          span={12}
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text
            variant="caption"
            style={{ width: "100%", marginBottom: 4, color: "var(--om-fg-muted)" }}
          >
            Solo icono
          </Text>
          <Button variant={1} aria-label="Add">
            <Plus size={14} />
          </Button>
          <Button variant={2} aria-label="Save">
            <Save size={14} />
          </Button>
          <Button variant={3} aria-label="Delete">
            <Trash2 size={14} />
          </Button>
        </Col>
        <Col
          span={12}
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text
            variant="caption"
            style={{ width: "100%", marginBottom: 4, color: "var(--om-fg-muted)" }}
          >
            Tamaños con icono
          </Text>
          <Button variant={1} size="sm">
            <Plus size={12} /> Small
          </Button>
          <Button variant={1}>
            <Plus size={14} /> Medium
          </Button>
          <Button variant={1} size="lg">
            <Plus size={16} /> Large
          </Button>
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        ToolButton
      </Text>
      <Text
        variant="caption"
        style={{ display: "block", marginBottom: 8, color: "var(--om-fg-muted)" }}
      >
        Botón ligero de barras de herramientas, cabeceras y filas de listado. Sustituye a{" "}
        <code>pos-btn</code>.
      </Text>
      <Grid gap={8} style={{ marginBottom: 32 }}>
        <Col span={12} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Text
            variant="caption"
            style={{ width: "100%", marginBottom: 4, color: "var(--om-fg-muted)" }}
          >
            Texto e icono + texto
          </Text>
          <ToolButton>Edit</ToolButton>
          <ToolButton>
            <Play size={11} fill="currentColor" /> Run
          </ToolButton>
          <ToolButton disabled>Disabled</ToolButton>
        </Col>
        <Col
          span={12}
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text
            variant="caption"
            style={{ width: "100%", marginBottom: 4, color: "var(--om-fg-muted)" }}
          >
            <code>iconOnly</code> y <code>active</code> (waybar / statusbar)
          </Text>
          <ToolButton iconOnly title="Schema">
            <PanelLeft size={16} />
          </ToolButton>
          <ToolButton iconOnly active title="Schema">
            <PanelLeft size={16} />
          </ToolButton>
          <ToolButton iconOnly>
            <PanelBottom size={14} /> History
          </ToolButton>
          <ToolButton iconOnly active>
            <PanelBottom size={14} /> History
          </ToolButton>
          <ToolButton iconOnly title="Shortcuts">
            <Keyboard size={14} />
          </ToolButton>
        </Col>
        <Col
          span={12}
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text
            variant="caption"
            style={{ width: "100%", marginBottom: 4, color: "var(--om-fg-muted)" }}
          >
            Estados de color
          </Text>
          <ToolButton style={{ color: "var(--om-green)" }}>
            <CheckCircle size={13} /> Connected
          </ToolButton>
          <ToolButton style={{ color: "var(--om-red)" }}>
            <XCircle size={13} /> Failed
          </ToolButton>
        </Col>
        <Col
          span={12}
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text
            variant="caption"
            style={{ width: "100%", marginBottom: 4, color: "var(--om-fg-muted)" }}
          >
            Dropdown: <code>ToolButton active</code> + <code>pos-menu</code>
          </Text>
          <div ref={infoRef} style={{ position: "relative" }}>
            <ToolButton active={infoOpen} onClick={() => setInfoOpen((v) => !v)}>
              [{infoTab}]
            </ToolButton>
            {infoOpen && (
              <div className="pos-menu">
                {["info", "columns", "types"].map((t) => (
                  <button
                    key={t}
                    className={infoTab === t ? "active" : ""}
                    onClick={() => {
                      setInfoTab(t);
                      setInfoOpen(false);
                    }}
                  >
                    [{t}]
                  </button>
                ))}
              </div>
            )}
          </div>
          <div ref={tableRef} style={{ position: "relative" }}>
            <ToolButton active={tableOpen} onClick={() => setTableOpen((v) => !v)}>
              [{tableTab}]
            </ToolButton>
            {tableOpen && (
              <div className="pos-menu">
                {["tables", "types", "sequences", "routines"].map((t) => (
                  <button
                    key={t}
                    className={tableTab === t ? "active" : ""}
                    onClick={() => {
                      setTableTab(t);
                      setTableOpen(false);
                    }}
                  >
                    [{t}]
                  </button>
                ))}
              </div>
            )}
          </div>
        </Col>
      </Grid>
    </>
  );
};
