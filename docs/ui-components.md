# UI components

The frontend builds every screen from a small kit in `frontend/src/components/ui`, imported from one barrel:

```jsx
import { Button, Input, Modal, ListItem } from "@/components/ui";
```

Outside the kit, always import from that barrel, never from a single file (`@/components/ui/button`). The kit also exports two generic hooks, `useResizable` and `useTheme`.

Every component has a live example at **`/design-system`**, which is only available when running in development. Check there first, before writing markup.

## Rules

1. **No hand-rolled controls in pages.** If a page needs a button, input, message, row or dialog, it uses a kit component. If none fits, add or extend one (see [Adding a component](#adding-a-component)). Do not style a raw `<button>` or `<input>` inline.
2. **No hardcoded colours.** Use the `--om-*` tokens from `index.css`, which already switch between light and dark themes. Hex and `rgba()` values belong in `index.css`, never in a page.
3. **The old global classes are gone.** `pos-btn` and `g-icon-btn` became `Button` variants 7 and 8. Do not bring them back.
4. **Visual types are numbered variants inside the component.** When one control comes in several looks (buttons, cards), it is one component with `variant={1…n}` ordered by prominence, not separate components. `ToolButton` and `IconButton` were folded into `Button` this way. Roles and states keep their names: `Text variant`, `Alert tone` and `Badge tone` are semantic, not visual types.
5. **Every control takes its height from the scale.** No control sets a height in px; it reads the `--control-*` tokens through `size`.

## Surfaces and tokens

| Token | Value | Used by |
|---|---|---|
| `--panel-radius` | `var(--r-window)` (20px) | `Card variant={2}` (panel), `Modal`, `ListItem`, the floating sidebar menu |
| `--om-bg-2` | panel background | the same surfaces |
| `--om-border` | panel border | the same surfaces |
| `--om-accent` | blue | focus, selection, active state |

Panels use `corner-shape: squircle`. Chromium draws it; other browsers fall back to a normal `border-radius`. A squircle looks less rounded than a plain radius of the same size, so compare against `/design-system` rather than eyeballing the number.

## Sizing

Every control with a height (`Button`, `Input`, `PasswordInput`, `Select` and its search field, `SearchBar`, `SegmentedControl`, `InlineSelect`, `ColorPicker`, `Tab`) accepts `size` `lg` | `xl`, defaults to `lg`, and measures exactly its token, border included. An `Input` and a `Button` of the same size line up to the pixel. There are no smaller sizes: `sm` and `md` were removed, and an unknown value falls back to `lg`. The show/hide button inside `PasswordInput` is not on the scale: it is a square affix 8px shorter than its field (24px in `lg`, 30px in `xl`).

| Size | Height | Font | Field / tool padding | Button padding | Inner icon | Radius |
|---|---|---|---|---|---|---|
| `lg` (default) | `--control-h-lg` 32px | 13px | 10px | 14px | 14px | 8px |
| `xl` | `--control-h-xl` 38px | 13.5px | 12px | 16px | 16px | 12px |

The tokens live in `:root` in `index.css` and do not depend on the theme: `--control-h-*`, `--control-fs-*`, `--control-px-*` (fields and tool buttons), `--button-px-*` (text buttons), `--control-icon-*` and `--control-radius-*`.

| Context | Component and size | Height |
|---|---|---|
| Page header action ("New connection") | `Button variant={1} size="xl"` | 38px |
| Form fields in pages and modals | `Input` / `PasswordInput` / `Select` / `SearchBar` / `ColorPicker` `size="xl"` | 38px |
| Modal footer buttons | `Button size="xl"` | 38px |
| Toolbars, list-row actions, compact footers | `Button variant={7}` | 32px |
| Status bar | `Button variant={7}` | 32px |
| Icon-only actions (close, info, log out) | `Button variant={8} label="…"` | 32px |
| Tabs, toggles inside toolbars | `Tab`, `SegmentedControl`, `InlineSelect` (default `lg`) | 32px |

In one row every control shares the same size. Bars that hold `lg` controls leave at least 4px above and below them: the status bar and the results footer are 40px, the editor tabs, the History/Saved tabs and the panel headers are 48px.

`Modal size` is a width (`sm` 380, `md` 520, `lg` 720, `xl`), not a control height.

## Catalog

**Actions**

| Component | Purpose |
|---|---|
| `Button` | `variant`, by prominence: 1 primary, 2 secondary (default), 3 outline, 4 subtle, 5 danger (ghost), 6 destructive (solid red, for confirming a delete), 7 tool (light button for toolbars and rows; supports `active`), 8 icon (square, icon only; `label` is required and becomes the tooltip and `aria-label`). `iconOnly` makes any variant square (width = height). `size`: `lg` (default) `xl`. Variants 7 and 8 default to `type="button"` |

`ToolButton` and `IconButton` no longer exist as components: use `Button variant={7}` and `Button variant={8}`.

**Fields**

| Component | Purpose |
|---|---|
| `Input` | `label`, `hint`, `error`, `iconLeft`, `iconRight`, `size` (`lg` default, `xl`) |
| `PasswordInput` | `Input` with a show/hide toggle |
| `Textarea` | Multi-line field; `mono` for keys and SQL |
| `Select`, `InlineSelect`, `SegmentedControl` | Choosing one option. Use `SegmentedControl` for two or three short options |
| `Checkbox` | `label` and optional `description` shown below it |
| `Switch`, `ColorPicker`, `SearchBar` | |
| `FormRow` | Label on the left, control on the right (`labelWidth`, default 120). Used for modal forms |

**Layout and content**

| Component | Purpose |
|---|---|
| `Card` | `variant`, by prominence: 1 elevated (shadow, no border), 2 panel (the standard surface: `--panel-radius`, squircle), 3 default (layer with border, small radius; the default), 4 filled, 5 outlined. `interactive` adds hover. `as="nav"` / `"section"` changes the element |
| `ListItem`, `ListItemGroup` | Rows for list pages: `leading`, `title`, `subtitle`, `actions`. With `onClick`, a row is keyboard-accessible. `selected` marks the chosen option, and `mono={false}` renders the subtitle in the UI font |
| `Modal` | `title`, `footer`, `size` (`sm` 380, `md` 520, `lg` 720, `xl`), `bodyFlush` |
| `Tabs`, `TabBar`, `Tab`, `TabPanel` | `Tab` supports `badge` and `dot`. `size` on `Tabs` (or on one `Tab`) sets the tab height |
| `Alert` | Status messages. `tone`: `error`, `success`, `warning`, `info` |
| `InfoBox` | Muted box for URLs, paths and file previews (`mono`, default on) |
| `Badge` | Count pill. `tone`: `accent`, `neutral` |
| `Text`, `Page`, `Grid`/`Col`, `Spinner`, `StatPill`, `Table`, `Splitter` | |

**Menus and identity**

| Component | Purpose |
|---|---|
| `Menu` | Dropdown anchored to a trigger. `trigger(props, { open })` is a render prop: spread `props` (ref, onClick, onKeyDown, `aria-haspopup`, `aria-expanded`, `aria-controls`) on the trigger, usually a `Button variant={7}` with `active={open}`. `align` `start` (default) or `end`, `label` (accessible name), `minWidth` (default 200). The surface is a panel (`--panel-radius`, squircle, `--om-bg-2`) and enters and leaves with motion. Outside click, Escape (focus back to the trigger), arrows, Home/End and Tab are handled inside |
| `MenuItem` | One option, `lg` height (32px). `onSelect` runs after the menu closes. `icon`, `meta` (muted text on the right: version, shortcut), `tone="danger"` (red, for log out or drop), `disabled` |
| `MenuLabel`, `MenuSeparator` | Non-clickable text (who is signed in, a group title) and a horizontal rule between groups |
| `Avatar` | Circle with the initial of `name`, decorative (`aria-hidden`): the name is always written next to it. `size` `lg` (20px, sits inside a 32px control, default) or `xl` (24px, inside a 38px control) |
| `BrandMark` | The Postgre Hub PH monogram (48 grid, one 5-unit stroke, square ends): the bottom of the P's bowl runs on as the H's crossbar. Draws in `currentColor`. `size` (px, default 24), `accent` (`false` one colour, `true` crossbar in `--om-accent`, or any CSS colour), `tile` (app icon: white symbol on a `--om-primary` squircle; `size` is then the tile), `wordmark` (adds "Postgre Hub" at 0.7 of the symbol size), `label` (accessible name; without it the mark is `aria-hidden`). Examples in the Brand section of `/design-system` |

Use `Menu` for any list of actions that opens from a button (the account chip in the top bar, a "more" button in a row); do not build another absolute-positioned popup by hand. Use `align="end"` when the trigger sits at the right edge so the menu does not leave the window. Put destructive options last, after a `MenuSeparator`, with `tone="danger"`. `Avatar` is not a control: it has no height token, it only takes the size of the control it sits in.

Use `BrandMark` wherever the product is identified (top bar tile at 15px inside the 22px `.proj-icon`, login, About); never a generic icon such as lucide's `Database`. The static files in `frontend/public` (`favicon.svg`, `favicon.ico`, `logo.svg` and the PWA PNGs) carry the same geometry; `favicon.svg` is a 16px cut with a thicker stroke and a narrower H.

## Page patterns

- **List page** (Connections, SSH Tunnels, Appearance): `ConnectionsShell` with the title and an `xl` primary button, an optional `SearchBar size="xl"`, then `ListItemGroup` > `ListItem`.
- **Form in a modal** (new connection, new tunnel): `Modal` with a `footer` laid out as Delete (`variant={5}`, edit only), spacer, Cancel (2), Save (1). Optional `Tabs` go at the top. Each field is a `FormRow` with an `xl` field. Errors and results are shown in an `Alert`.
- **Settings form** (Account): `Card variant={2}` > `CardBody`, `xl` fields with `label`, an `Alert` for feedback, and an `xl` submit button.
- **Confirm delete**: `Modal size="sm"` with Cancel (2) and `Button variant={6}`.

`ConnectionsShell` (`components/connections-shell.jsx`) always renders the floating sidebar menu and the translucent content panel. The blue page glow comes from `components/main-layout.jsx`. It is shown on every screen except an open connection, which glows in the connection's own colour.

## Still custom

A few pieces have no kit equivalent yet and are allowed to stay as they are:

- popup menu items inside `.pos-menu` (older menus; new ones use `Menu`)
- rows of the schema tree (`.tree .row`)
- the inline tab-rename input in the SQL editor
- the password-strength meter in Account
- the data-grid cell states, which are defined as `--cell-*` tokens on `.dt` in `index.css`

If you touch one of these and it starts to repeat, turn it into a component.

## Adding a component

1. Put the component in `components/ui/<name>.jsx` and its styles in `css/ui/<name>.module.css`. File names are kebab-case and identifiers are in English; comments are in Spanish and every file starts with a header comment.
2. Use `--om-*` tokens only, and `--panel-radius` for panel-like surfaces.
3. Export it from `components/ui/index.js`. Inside the kit, import other kit components by relative file (`./button`), never through the barrel.
4. Add an example to `pages/design-system/index.jsx` (or one of its `pages/design-system/_*.jsx` sections). If the control has a height, give it `size` and read the `--control-*` tokens; if it comes in several looks, add a numbered `variant`.
5. Check it with:

   ```bash
   make check   # or, inside frontend/: pnpm check
   ```

   The frontend is plain JavaScript (no TypeScript), so `check` runs ESLint only.
