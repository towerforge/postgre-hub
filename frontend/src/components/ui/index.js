// Kit de interfaz: componentes genéricos sin conocimiento del dominio. Se
// exporta todo desde aquí para que las pantallas importen de "@/components/ui"
// y no de cada fichero. Dentro del kit los componentes se importan entre sí por
// fichero (`./input`), nunca por este barril, para no crear ciclos.
export { Button } from "./button";
export { Page } from "./page";
export { Input } from "./input";
export { Select } from "./select";
export { Card, CardHeader, CardBody, CardFooter } from "./card";
export { Grid, Col } from "./grid";
export { Text } from "./text";
export { Modal } from "./modal";
export { ThemeToggle } from "./theme-toggle";
export { Tabs, TabBar, Tab, TabPanel } from "./tabs";
export { Table, TableCell } from "./table";
export { Spinner, useSpinner } from "./spinner";
export { SearchBar } from "./search-bar";
export { SegmentedControl } from "./segmented-control";
export { StatPill } from "./stat-pill";
export { InlineSelect } from "./inline-select";
export { Switch } from "./switch";
export { Checkbox } from "./checkbox";
export { ColorPicker, CONNECTION_COLORS } from "./color-picker";
export { Splitter } from "./splitter";
export { FormRow } from "./form-row";
export { InfoBox } from "./info-box";
export { ListItem, ListItemGroup } from "./list-item";
export { IconButton } from "./icon-button";
export { ToolButton } from "./tool-button";
export { Textarea } from "./textarea";
export { PasswordInput } from "./password-input";
export { Alert } from "./alert";
export { Badge } from "./badge";
export { useResizable } from "./use-resizable";
export { useTheme } from "./use-theme";
