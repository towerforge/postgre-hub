// Catálogo del kit (/design-system), sección Sizes: una fila por tamaño de la escala
// (lg y xl) con todos los controles que tienen alto puestos lado a lado entre
// dos guías horizontales. Si un control no mide su token, asoma por encima o por debajo
// de las guías. El alto del rótulo se lee del token, no está escrito a mano.
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  Button,
  ColorPicker,
  InlineSelect,
  Input,
  PasswordInput,
  SearchBar,
  SegmentedControl,
  Select,
  Tab,
  Tabs,
} from "@/components/ui";
import css from "@/css/design-system.module.css";
import { CatalogSection, SIZES, SizeProbe, useCssVars } from "./_section";

const MODE_OPTIONS = [
  { value: "grid", label: "Grid" },
  { value: "json", label: "JSON" },
];

const SCHEMA_OPTIONS = [
  { value: "public", label: "public" },
  { value: "auth", label: "auth" },
];

const SSL_OPTIONS = [
  { value: "prefer", label: "Prefer" },
  { value: "require", label: "Require" },
];

const ICON_SIZE = { lg: 14, xl: 16 };

const TOKENS = SIZES.map((s) => `--control-h-${s}`);

/** Una fila de la escala: rótulo con el token y la pista con los controles. */
const SizeRail = ({ size, height }) => {
  const [mode, setMode] = useState("grid");
  const [schema, setSchema] = useState("public");
  const [color, setColor] = useState("");
  const [query, setQuery] = useState("");
  const icon = ICON_SIZE[size];

  return (
    <div className={css.sizeRow}>
      <div className={css.sizeLabel}>
        <span className={css.sizeName}>{size}</span>
        <span className={css.sizePx}>{height}</span>
        <code className={css.sizeToken}>--control-h-{size}</code>
      </div>
      <div className={css.railScroll}>
        <div className={`${css.rail} ${css[`rail_${size}`]}`}>
          <SizeProbe size={size} name="Button">
            <Button variant={1} size={size}>
              <Plus size={icon} /> Run
            </Button>
          </SizeProbe>
          <SizeProbe size={size} name="Button iconOnly">
            <Button variant={2} size={size} iconOnly aria-label="Add">
              <Plus size={icon} />
            </Button>
          </SizeProbe>
          <SizeProbe size={size} name="Input" field>
            <Input size={size} placeholder="Host" aria-label="Host" />
          </SizeProbe>
          <SizeProbe size={size} name="PasswordInput" field>
            <PasswordInput size={size} placeholder="Password" aria-label="Password" />
          </SizeProbe>
          <SizeProbe size={size} name="Select" field>
            <Select size={size} options={SSL_OPTIONS} defaultValue="prefer" />
          </SizeProbe>
          <SizeProbe size={size} name="SearchBar" field>
            <SearchBar size={size} value={query} onChange={setQuery} placeholder="Search" />
          </SizeProbe>
          <SizeProbe size={size} name="SegmentedControl">
            <SegmentedControl size={size} options={MODE_OPTIONS} value={mode} onChange={setMode} />
          </SizeProbe>
          <SizeProbe size={size} name="InlineSelect">
            <InlineSelect
              size={size}
              label="Schema"
              value={schema}
              options={SCHEMA_OPTIONS}
              onChange={setSchema}
            />
          </SizeProbe>
          <SizeProbe size={size} name="ColorPicker">
            <ColorPicker size={size} value={color} onChange={setColor} />
          </SizeProbe>
          <SizeProbe size={size} name="Tab">
            <Tabs size={size} value="results">
              <Tab id="results" icon={<Search size={icon} />} className={css.flushTab}>
                Results
              </Tab>
            </Tabs>
          </SizeProbe>
        </div>
      </div>
    </div>
  );
};

/** Sección Sizes del catálogo. */
export const CatalogSizes = () => {
  const heights = useCssVars(TOKENS);
  return (
    <CatalogSection
      id="sizes"
      title="Sizes"
      description="Every control with a height takes it from the same two tokens: lg (the default) and xl. The two guides of each row mark the token's height: nothing may cross them."
    >
      <div className={css.sizeTable}>
        {SIZES.map((s) => (
          <SizeRail key={s} size={s} height={heights[`--control-h-${s}`]} />
        ))}
      </div>
    </CatalogSection>
  );
};
