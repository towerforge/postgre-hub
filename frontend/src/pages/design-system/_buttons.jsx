// Catálogo del kit (/dev), sección de botones: Button por variante, tamaño,
// icono y estado, las réplicas "In context" de la regla de uso (las mismas que
// usan /connections y su modal), ToolButton e IconButton. Cada fila mantiene
// un solo tamaño para que las alturas sean homogéneas.
import {
  ArrowRight,
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
import { Button, IconButton, ToolButton } from "@/components/ui";
import modalStyles from "@/css/ui/modal.module.css";
import css from "@/css/dev.module.css";
import { DevRow, DevSection } from "./_dev-section";

const VARIANTS = [
  { variant: 1, label: "Primary" },
  { variant: 2, label: "Secondary" },
  { variant: 3, label: "Outline" },
  { variant: 4, label: "Subtle" },
  { variant: 5, label: "Danger" },
  { variant: 6, label: "Destructive" },
];

const SIZES = [
  { size: "sm", label: "sm · 24px", icon: 12 },
  { size: "md", label: "md · 28px", icon: 14 },
  { size: "xl", label: "xl · 38px", icon: 14 },
];

/** Secciones Buttons, ToolButton e IconButton del catálogo. */
export const DevButtons = () => (
  <>
    <DevSection
      title="Buttons"
      description="Variants by role: 1 main action, 2 cancel or secondary, 3 auxiliary form action, 5 secondary delete, 6 confirm a destructive action."
    >
      <DevRow label="Variants · md">
        {VARIANTS.map(({ variant, label }) => (
          <Button key={variant} variant={variant}>
            {label}
          </Button>
        ))}
      </DevRow>

      {SIZES.map(({ size, label, icon }) => (
        <DevRow key={size} label={label}>
          <Button variant={1} size={size}>
            <Plus size={icon} /> New connection
          </Button>
          <Button variant={2} size={size}>
            Cancel
          </Button>
          <Button variant={3} size={size}>
            Browse…
          </Button>
        </DevRow>
      ))}

      <DevRow label="With icon · left, right and icon only">
        <Button variant={1}>
          <Play size={14} /> Run
        </Button>
        <Button variant={2}>
          <Download size={14} /> Export
        </Button>
        <Button variant={2}>
          Continue <ArrowRight size={14} />
        </Button>
        <Button variant={2} aria-label="Save">
          <Save size={14} />
        </Button>
        <Button variant={5} aria-label="Delete">
          <Trash2 size={14} />
        </Button>
      </DevRow>

      <DevRow label="States · loading and disabled">
        <Button variant={1} loading>
          Apply changes
        </Button>
        <Button variant={1} disabled>
          Connect
        </Button>
        <Button variant={2} disabled>
          Cancel
        </Button>
      </DevRow>

      <DevRow label="In context · page header and empty state (variant 1, xl)">
        <Button variant={1} size="xl">
          <Plus size={14} /> New connection
        </Button>
      </DevRow>

      <DevRow label="In context · form modal footer (Delete 5 | Cancel 2 | Save 1, xl)">
        <div className={css.frame}>
          <div className={modalStyles.footer}>
            <Button variant={5} size="xl">
              <Trash2 size={14} /> Delete
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
      </DevRow>

      <DevRow label="In context · destructive confirmation footer (Cancel 2 + Delete 6, xl)">
        <div className={css.frame}>
          <div className={modalStyles.footer}>
            <Button variant={2} size="xl">
              Cancel
            </Button>
            <Button variant={6} size="xl">
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </div>
      </DevRow>

      <DevRow label="In context · auxiliary form action (variant 3, md)">
        <Button variant={3}>
          <FileKey size={13} /> Browse…
        </Button>
        <Button variant={3}>
          <FileText size={13} /> Choose .sql file
        </Button>
      </DevRow>
    </DevSection>

    <DevSection
      title="ToolButton"
      description="Lightweight button for rows, toolbars, panel headers and the status bar."
    >
      <DevRow label="Text and icon + text">
        <ToolButton>
          <Plug size={13} /> Test
        </ToolButton>
        <ToolButton>
          <Pencil size={13} /> Edit
        </ToolButton>
        <ToolButton active>
          <PanelBottom size={13} /> Results
        </ToolButton>
        <ToolButton disabled>
          <Play size={13} /> Run
        </ToolButton>
      </DevRow>

      <DevRow label="iconOnly · icons only, with and without active">
        <ToolButton iconOnly title="Schema">
          <PanelLeft size={16} />
        </ToolButton>
        <ToolButton iconOnly active title="Schema">
          <PanelLeft size={16} />
        </ToolButton>
        <ToolButton iconOnly title="History">
          <PanelBottom size={14} />
        </ToolButton>
        <ToolButton iconOnly title="New tab">
          <Plus size={14} />
        </ToolButton>
      </DevRow>

      <DevRow label="size sm · status bar">
        <ToolButton size="sm" title="Add a new empty row">
          <Plus size={13} /> Add row
        </ToolButton>
        <ToolButton size="sm" disabled title="Preview and apply pending changes">
          <ArrowUp size={13} /> Apply
        </ToolButton>
        <ToolButton size="sm">
          <Trash2 size={12} /> Clear
        </ToolButton>
        <ToolButton iconOnly size="sm" title="Show keyboard shortcuts">
          <Keyboard size={14} />
        </ToolButton>
      </DevRow>
    </DevSection>

    <DevSection title="IconButton">
      <DevRow label="md and sm">
        <IconButton label="About">
          <Info size={15} />
        </IconButton>
        <IconButton label="Log out">
          <LogOut size={15} />
        </IconButton>
        <IconButton label="Close">
          <X size={14} />
        </IconButton>
        <IconButton label="Close" size="sm">
          <X size={12} />
        </IconButton>
      </DevRow>
    </DevSection>
  </>
);
