# UI components

The frontend builds every screen from a small kit in `frontend/src/components/ui`, imported from one barrel:

```tsx
import { Button, Input, Modal, ListItem } from '@/components/ui'
```

Every component has a live example at **`/_dev`**, which is only available when running in development. Check there first, before writing markup.

## Rules

1. **No hand-rolled controls in pages.** If a page needs a button, input, message, row or dialog, it uses a kit component. If none fits, add or extend one (see [Adding a component](#adding-a-component)). Do not style a raw `<button>` or `<input>` inline.
2. **No hardcoded colours.** Use the `--om-*` tokens from `index.css`, which already switch between light and dark themes. Hex and `rgba()` values belong in `index.css`, never in a page.
3. **The old global classes are gone.** `pos-btn` became `ToolButton` and `g-icon-btn` became `IconButton`. Do not bring them back.

## Surfaces and tokens

| Token | Value | Used by |
|---|---|---|
| `--panel-radius` | `var(--r-window)` (20px) | `Card variant="panel"`, `Modal`, `ListItem`, the floating sidebar menu |
| `--om-bg-2` | panel background | the same surfaces |
| `--om-border` | panel border | the same surfaces |
| `--om-accent` | blue | focus, selection, active state |

Panels use `corner-shape: squircle`. Chromium draws it; other browsers fall back to a normal `border-radius`. A squircle looks less rounded than a plain radius of the same size, so compare against `/_dev` rather than eyeballing the number.

## Sizing

| Context | Component and size | Height |
|---|---|---|
| Page header action ("New connection") | `Button size="xl"` | 38px |
| Form fields in pages and modals | `Input` / `PasswordInput` / `SearchBar` `size="lg"` | 38px |
| Modal footer buttons | `Button` (default `md`) | 28px |
| Toolbars, list-row actions | `ToolButton` | 28px |
| Status bar | `ToolButton size="sm"` | 24px |
| Icon-only actions (close, info, log out) | `IconButton` | 28px |

## Catalog

**Actions**

| Component | Purpose |
|---|---|
| `Button` | `variant`: 1 primary, 2 secondary, 3 outline, 4 subtle, 5 danger (ghost), 6 destructive (solid red, for confirming a delete). `size`: `sm` `md` `lg` `xl` |
| `ToolButton` | Light button for toolbars and rows. `iconOnly`, `active`, `size="sm"` |
| `IconButton` | Square icon button. `label` is required and becomes the tooltip and `aria-label` |

**Fields**

| Component | Purpose |
|---|---|
| `Input` | `label`, `hint`, `error`, `iconLeft`, `iconRight`, `size` |
| `PasswordInput` | `Input` with a show/hide toggle |
| `Textarea` | Multi-line field; `mono` for keys and SQL |
| `Select`, `InlineSelect`, `SegmentedControl` | Choosing one option. Use `SegmentedControl` for two or three short options |
| `Checkbox` | `label` and optional `description` shown below it |
| `Switch`, `ColorPicker`, `SearchBar` | |
| `FormRow` | Label on the left, control on the right (`labelWidth`, default 120). Used for modal forms |

**Layout and content**

| Component | Purpose |
|---|---|
| `Card` | `variant="panel"` is the standard surface. `as="nav"` / `"section"` changes the element |
| `ListItem`, `ListItemGroup` | Rows for list pages: `leading`, `title`, `subtitle`, `actions`. With `onClick`, a row is keyboard-accessible. `selected` marks the chosen option, and `mono={false}` renders the subtitle in the UI font |
| `Modal` | `title`, `footer`, `size` (`sm` 380, `md` 520, `lg` 720, `xl`), `bodyFlush` |
| `Tabs`, `TabBar`, `Tab`, `TabPanel` | `Tab` supports `badge` and `dot` |
| `Alert` | Status messages. `tone`: `error`, `success`, `warning`, `info` |
| `InfoBox` | Muted box for URLs, paths and file previews (`mono`, default on) |
| `Badge` | Count pill. `tone`: `accent`, `neutral` |
| `Text`, `Page`, `Grid`/`Col`, `Spinner`, `StatPill`, `Table`, `Splitter` | |

## Page patterns

- **List page** (Connections, SSH Tunnels, Appearance): `ProjectsShell` with the title and an `xl` primary button, an optional `SearchBar size="lg"`, then `ListItemGroup` > `ListItem`.
- **Form in a modal** (new connection, new tunnel): `Modal` with a `footer` laid out as Delete (`variant={5}`, edit only), spacer, Cancel (2), Save (1). Optional `Tabs` go at the top. Each field is a `FormRow` with a `lg` field. Errors and results are shown in an `Alert`.
- **Settings form** (Account): `Card variant="panel"` > `CardBody`, `lg` fields with `label`, an `Alert` for feedback, and an `xl` submit button.
- **Confirm delete**: `Modal size="sm"` with Cancel (2) and `Button variant={6}`.

`ProjectsShell` always renders the floating sidebar menu and the translucent content panel. The blue page glow comes from `layouts/main-layout`. It is shown on every screen except an open connection, which glows in the connection's own colour.

## Still custom

A few pieces have no kit equivalent yet and are allowed to stay as they are:

- popup menu items inside `.pos-menu`
- rows of the schema tree (`.tree .row`)
- the inline tab-rename input in the SQL editor
- the password-strength meter in Account
- the data-grid cell states, which are defined as `--cell-*` tokens on `.dt` in `index.css`

If you touch one of these and it starts to repeat, turn it into a component.

## Adding a component

1. Put the component in `components/ui/<name>.tsx` and its styles in `css/ui/<name>.module.css`. File names are kebab-case and identifiers are in English.
2. Use `--om-*` tokens only, and `--panel-radius` for panel-like surfaces.
3. Export it from `components/ui/index.ts`.
4. Add an example to `pages/dev/index.tsx`.
5. Type-check with:

   ```bash
   cd frontend && npx tsc --noEmit -p tsconfig.app.json
   ```

   Plain `tsc -p .` checks nothing, because `tsconfig.json` only holds project references. `make check` also runs eslint, which currently fails on older issues that have nothing to do with the kit.
