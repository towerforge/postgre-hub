// Catálogo del kit (/design-system), sección Tokens: la paleta --om-* agrupada por
// función, con el valor que tiene en el tema activo, y la escala --control-* de alturas,
// letra, relleno, icono y radio. Todos los valores se leen de index.css en vivo.
import { Table } from "@/components/ui";
import css from "@/css/design-system.module.css";
import { CatalogRow, CatalogSection, SIZES, useCssVars } from "./_section";

const COLOR_GROUPS = [
  {
    label: "Surfaces, from the canvas to the pressed state",
    tokens: ["--om-gap", "--om-bg", "--om-bg-2", "--om-bg-3", "--om-bg-4"],
  },
  {
    label: "Text, from the strongest to the quietest",
    tokens: ["--om-fg-bright", "--om-fg", "--om-fg-dim", "--om-fg-muted"],
  },
  {
    label: "Actions and focus",
    tokens: ["--om-primary", "--om-primary-hover", "--om-on-primary", "--om-accent"],
  },
  {
    label: "Status and syntax accents",
    tokens: ["--om-green", "--om-yellow", "--om-orange", "--om-red", "--om-magenta", "--om-cyan"],
  },
  {
    label: "Lines and selection",
    tokens: [
      "--om-border",
      "--om-border-focus",
      "--om-selection",
      "--om-tab-active",
      "--om-tab-active-border",
    ],
  },
];

const ALL_COLORS = COLOR_GROUPS.flatMap((g) => g.tokens);

const SCALE_PARTS = ["h", "fs", "px", "icon", "radius"];
const SCALE_TOKENS = SIZES.flatMap((s) => [
  ...SCALE_PARTS.map((p) => `--control-${p}-${s}`),
  `--button-px-${s}`,
]);

/** Muestra de un color: la pastilla pintada con el token y su valor actual. */
const Swatch = ({ token, value }) => (
  <div className={css.swatch}>
    <span className={css.swatchChip} style={{ background: `var(${token})` }} />
    <code className={css.swatchName}>{token}</code>
    <span className={css.swatchValue}>{value}</span>
  </div>
);

/** Sección Tokens del catálogo. */
export const CatalogTokens = () => {
  const colors = useCssVars(ALL_COLORS);
  const scale = useCssVars(SCALE_TOKENS);
  const v = (part, size) => scale[`--control-${part}-${size}`];

  const columns = [
    {
      key: "size",
      header: "size",
      shrink: true,
      render: (s) => <code className={css.scaleName}>{s}</code>,
    },
    {
      key: "sample",
      header: "height",
      render: (s) => (
        <span className={css.scaleSample}>
          <span
            className={css.scaleBar}
            style={{ height: `var(--control-h-${s})`, borderRadius: `var(--control-radius-${s})` }}
          />
          {v("h", s)}
        </span>
      ),
    },
    { key: "fs", header: "font", render: (s) => v("fs", s) },
    { key: "px", header: "field padding", render: (s) => v("px", s) },
    { key: "bpx", header: "button padding", render: (s) => scale[`--button-px-${s}`] },
    { key: "icon", header: "icon", render: (s) => v("icon", s) },
    { key: "radius", header: "radius", render: (s) => v("radius", s) },
  ];

  return (
    <CatalogSection
      id="tokens"
      title="Tokens"
      description="Colours change with the theme; the control scale does not. Values are read from index.css as you look at them."
    >
      {COLOR_GROUPS.map((g) => (
        <CatalogRow key={g.label} label={g.label}>
          <div className={css.swatches}>
            {g.tokens.map((t) => (
              <Swatch key={t} token={t} value={colors[t]} />
            ))}
          </div>
        </CatalogRow>
      ))}

      <CatalogRow label="Control scale (--control-* and --button-px-*)">
        <div className={css.full}>
          <Table columns={columns} data={SIZES} keyExtractor={(s) => s} />
        </div>
      </CatalogRow>
    </CatalogSection>
  );
};
