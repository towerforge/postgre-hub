// Catálogo del kit (/design-system), sección de botones: las ocho variantes numeradas en
// lg, iconOnly, los estados (disabled, loading, active), las réplicas "In context" de la
// regla de uso (las mismas que usan /connections, su modal, las barras de herramientas y
// la barra de estado; las de modal van en xl y rotuladas) y, al final, la tabla que
// compara cada variante en lg y xl.
import {
  ArrowUp,
  Download,
  FileKey,
  FileText,
  Info,
  Keyboard,
  LogOut,
  PanelBottom,
  PanelLeft,
  Pencil,
  Play,
  Plug,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui";
import css from "@/css/design-system.module.css";
import { CatalogRow, CatalogSection, SizeCompare } from "./_section";

const ICON = { lg: 14, xl: 16 };

// Cada variante con su nombre, para qué sirve y un contenido realista de ejemplo.
const VARIANTS = [
  { variant: 1, name: "Primary", use: "Main action", text: "Save", Icon: Save },
  { variant: 2, name: "Secondary", use: "Cancel, secondary", text: "Cancel" },
  { variant: 3, name: "Outline", use: "Auxiliary form action", text: "Browse…", Icon: FileKey },
  { variant: 4, name: "Subtle", use: "Low emphasis", text: "Show more" },
  { variant: 5, name: "Danger", use: "Secondary delete", text: "Delete", Icon: Trash2 },
  { variant: 6, name: "Destructive", use: "Confirm a delete", text: "Delete", Icon: Trash2 },
  { variant: 7, name: "Tool", use: "Rows, toolbars, panels", text: "Edit", Icon: Pencil },
  { variant: 8, name: "Icon", use: "Icon only, needs label", label: "Close", Icon: X },
];

/** Celda de la matriz: el botón de una variante en un tamaño. */
const MatrixButton = ({ variant, text, label, Icon, size }) => {
  if (variant === 8) {
    return (
      <Button variant={8} size={size} label={label}>
        <Icon size={ICON[size]} />
      </Button>
    );
  }
  return (
    <Button variant={variant} size={size}>
      {Icon && <Icon size={ICON[size]} />}
      {text}
    </Button>
  );
};

/** Sección Buttons del catálogo. */
export const CatalogButtons = () => {
  return (
    <CatalogSection
      id="buttons"
      title="Button"
      description="One component, eight numbered variants ordered by prominence. Variant 7 replaces ToolButton and variant 8 replaces IconButton. Examples are lg, the default, unless tagged xl; the table at the end puts both sizes side by side."
    >
      <CatalogRow label="Variants 1 to 8, by prominence">
        {VARIANTS.map((v) => (
          <MatrixButton key={v.variant} {...v} size="lg" />
        ))}
      </CatalogRow>

      <CatalogRow label="iconOnly makes any variant square">
        {VARIANTS.filter((v) => v.variant !== 8).map(({ variant, name }) => (
          <Button key={variant} variant={variant} iconOnly aria-label={name} title={name}>
            <Plus size={14} />
          </Button>
        ))}
        <Button variant={8} label="About">
          <Info size={14} />
        </Button>
        <Button variant={8} label="Log out">
          <LogOut size={14} />
        </Button>
      </CatalogRow>

      <CatalogRow label="Disabled">
        {VARIANTS.map((v) =>
          v.variant === 8 ? (
            <Button key={v.variant} variant={8} label={v.label} disabled>
              <X size={14} />
            </Button>
          ) : (
            <Button key={v.variant} variant={v.variant} disabled>
              {v.text}
            </Button>
          ),
        )}
      </CatalogRow>

      <CatalogRow label="Loading (disabled while it lasts)">
        <Button variant={1} loading>
          Apply changes
        </Button>
        <Button variant={2} loading>
          <Download size={14} /> Export
        </Button>
        <Button variant={6} loading>
          <Trash2 size={14} /> Delete
        </Button>
      </CatalogRow>

      <CatalogRow label="Active, variant 7 (toggled panels and open menus)">
        <Button variant={7}>
          <PanelBottom size={14} /> Results
        </Button>
        <Button variant={7} active>
          <PanelBottom size={14} /> Results
        </Button>
        <Button variant={7} iconOnly title="Schema">
          <PanelLeft size={14} />
        </Button>
        <Button variant={7} iconOnly active title="Schema">
          <PanelLeft size={14} />
        </Button>
      </CatalogRow>

      <CatalogRow label="In context: page header and empty state (1)" size="xl">
        <Button variant={1} size="xl">
          <Plus size={16} /> New connection
        </Button>
      </CatalogRow>

      <CatalogRow label="In context: form modal footer (Delete 5, Cancel 2, Save 1)" size="xl">
        <div className={css.frame}>
          <div className={css.modalFooter}>
            <Button variant={5} size="xl">
              <Trash2 size={16} /> Delete
            </Button>
            <div className={css.spacer} />
            <Button variant={2} size="xl">
              Cancel
            </Button>
            <Button variant={1} size="xl">
              Save changes
            </Button>
          </div>
        </div>
      </CatalogRow>

      <CatalogRow
        label="In context: destructive confirmation footer (Cancel 2, Delete 6)"
        size="xl"
      >
        <div className={css.frame}>
          <div className={css.modalFooter}>
            <Button variant={2} size="xl">
              Cancel
            </Button>
            <Button variant={6} size="xl">
              <Trash2 size={16} /> Delete
            </Button>
          </div>
        </div>
      </CatalogRow>

      <CatalogRow label="In context: auxiliary form action (3)">
        <Button variant={3}>
          <FileKey size={14} /> Browse…
        </Button>
        <Button variant={3}>
          <FileText size={14} /> Choose .sql file
        </Button>
      </CatalogRow>

      <CatalogRow label="In context: list row and toolbar (7)">
        <Button variant={7}>
          <Plug size={14} /> Test
        </Button>
        <Button variant={7}>
          <Pencil size={14} /> Edit
        </Button>
        <Button variant={7} disabled>
          <Play size={14} /> Run
        </Button>
        <Button variant={7} iconOnly title="New tab">
          <Plus size={14} />
        </Button>
      </CatalogRow>

      <CatalogRow label="In context: status bar (7)">
        <Button variant={7} title="Add a new empty row">
          <Plus size={14} /> Add row
        </Button>
        <Button variant={7} disabled title="Preview and apply pending changes">
          <ArrowUp size={14} /> Apply
        </Button>
        <Button variant={7}>
          <Trash2 size={14} /> Clear
        </Button>
        <Button variant={7} iconOnly title="Show keyboard shortcuts">
          <Keyboard size={14} />
        </Button>
      </CatalogRow>

      <SizeCompare
        label="Variants in lg and xl, side by side"
        items={VARIANTS.map((v) => ({
          key: v.variant,
          number: v.variant,
          name: v.name,
          use: v.use,
          render: (size) => <MatrixButton {...v} size={size} />,
        }))}
      />
    </CatalogSection>
  );
};
