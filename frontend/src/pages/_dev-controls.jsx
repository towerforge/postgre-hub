// Catálogo del kit (/dev), sección de controles: búsqueda, selectores en
// línea, interruptores, spinners, selector de color y los tamaños grandes. Cada
// control está conectado a su estado para que se pueda probar de verdad.
import { useState } from "react";
import {
  Button,
  Checkbox,
  Col,
  ColorPicker,
  CONNECTION_COLORS,
  Grid,
  InlineSelect,
  Input,
  SearchBar,
  SegmentedControl,
  Spinner,
  StatPill,
  Switch,
  Text,
} from "@/components/ui";

const SEG_OPTIONS = [
  { value: "all", label: "All" },
  { value: "cpu", label: "CPU" },
  { value: "ram", label: "RAM" },
  { value: "disk", label: "Disk" },
];

const INLINE_OPTIONS = [
  { value: "all", label: "All networks" },
  { value: "bridge", label: "bridge" },
  { value: "host", label: "host" },
];

/** Secciones de SearchBar a los tamaños grandes del catálogo. */
export const DevControls = () => {
  // Las dos SearchBar (normal y lg) comparten el texto a propósito.
  const [search, setSearch] = useState("");
  const [seg, setSeg] = useState("all");
  const [inline, setInline] = useState("all");
  const [sw1, setSw1] = useState(true);
  const [sw2, setSw2] = useState(false);
  const [cb1, setCb1] = useState(true);
  const [cb2, setCb2] = useState(false);
  const [color1, setColor1] = useState("");
  const [color2, setColor2] = useState(CONNECTION_COLORS[2]);

  return (
    <>
      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        SearchBar
      </Text>
      <Grid gap={16} style={{ marginBottom: 32 }}>
        <Col span={12} md={6}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search containers…" />
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        SegmentedControl
      </Text>
      <Grid gap={16} style={{ marginBottom: 32 }}>
        <Col span={12}>
          <SegmentedControl options={SEG_OPTIONS} value={seg} onChange={setSeg} />
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        InlineSelect
      </Text>
      <Grid gap={16} style={{ marginBottom: 32 }}>
        <Col span={12}>
          <InlineSelect
            label="Network"
            value={inline}
            options={INLINE_OPTIONS}
            onChange={setInline}
          />
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        StatPill
      </Text>
      <Grid gap={16} style={{ marginBottom: 32 }}>
        <Col span={12} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatPill label="Total" value={42} />
          <StatPill label="Running" value={38} valueColor="#10b981" />
          <StatPill label="Stopped" value={4} valueColor="var(--text-3)" />
          <StatPill label="Size" value="1.2 GB" />
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        Switch
      </Text>
      <Grid gap={16} style={{ marginBottom: 32 }}>
        <Col span={12} style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Switch checked={sw1} onChange={setSw1} label="Enabled" />
          <Switch checked={sw2} onChange={setSw2} label="Disabled (off)" />
          <Switch checked={true} onChange={() => {}} label="Disabled prop" disabled />
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        Checkbox
      </Text>
      <Grid gap={16} style={{ marginBottom: 32 }}>
        <Col span={12} style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Checkbox checked={cb1} onChange={setCb1} label="Checked" />
          <Checkbox checked={cb2} onChange={setCb2} label="Unchecked" />
          <Checkbox checked={true} onChange={() => {}} label="Disabled" disabled />
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        Spinner
      </Text>
      <Grid gap={16} style={{ marginBottom: 32 }}>
        <Col span={12} style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <Spinner />
          <Spinner label="Cargando…" />
          <Spinner color="var(--om-bg)" label="Negro" />
          <Spinner color="var(--om-fg-bright)" label="Bright" />
          <Spinner color="var(--om-red)" label="Red" />
          <Spinner color="var(--om-yellow)" label="Yellow" />
        </Col>
        <Col
          span={12}
          style={{
            display: "flex",
            gap: 24,
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: 8,
          }}
        >
          <Text
            variant="caption"
            style={{ width: "100%", marginBottom: 4, color: "var(--om-fg-muted)" }}
          >
            Tamaños
          </Text>
          <Spinner size={10} />
          <Spinner size={13} />
          <Spinner size={18} />
          <Spinner size={24} />
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        ColorPicker
      </Text>
      <Grid gap={16} style={{ marginBottom: 32 }}>
        <Col span={12} md={6}>
          <Text variant="caption" style={{ marginBottom: 6, display: "block" }}>
            Auto (sin color)
          </Text>
          <ColorPicker value={color1} onChange={setColor1} />
        </Col>
        <Col span={12} md={6}>
          <Text variant="caption" style={{ marginBottom: 6, display: "block" }}>
            Con color preseleccionado
          </Text>
          <ColorPicker value={color2} onChange={setColor2} />
        </Col>
      </Grid>

      <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
        Tamaños grandes (Button xl, Input lg, SearchBar lg)
      </Text>
      <Grid gap={16} style={{ marginBottom: 32 }}>
        <Col span={12} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Button variant={1} size="xl">
            Botón xl
          </Button>
          <Button variant={2} size="xl">
            Secundario xl
          </Button>
          <div style={{ width: 220 }}>
            <Input size="lg" placeholder="Input lg" />
          </div>
          <SearchBar size="lg" value={search} onChange={setSearch} placeholder="Buscar lg…" />
        </Col>
      </Grid>
    </>
  );
};
