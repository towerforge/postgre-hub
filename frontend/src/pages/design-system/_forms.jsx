// Catálogo del kit (/design-system), sección de campos: Input, PasswordInput, Textarea,
// Select, SearchBar y ColorPicker en lg con sus estados (pista, error, deshabilitado),
// Switch, Checkbox, un FormRow en xl que reproduce el modal New connection y, al final,
// la tabla que compara lg y xl. Cada control está conectado a su estado para que se
// pueda probar de verdad.
import { useState } from "react";
import { Server } from "lucide-react";
import {
  Checkbox,
  ColorPicker,
  CONNECTION_COLORS,
  FormRow,
  Input,
  PasswordInput,
  SearchBar,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";
import { ENVIRONMENTS } from "@/lib/environments";
import css from "@/css/design-system.module.css";
import { CatalogRow, CatalogSection, SizeCompare } from "./_section";

// Las mismas opciones que el modal de conexión
const SSL_OPTIONS = [
  { value: "disable", label: "Disable" },
  { value: "prefer", label: "Prefer" },
  { value: "require", label: "Require" },
];

const ENVIRONMENT_OPTIONS = [{ value: "", label: "None" }, ...ENVIRONMENTS];

const DATABASE_OPTIONS = [
  { value: "postgres", label: "postgres" },
  { value: "app", label: "app" },
  { value: "analytics", label: "analytics" },
  { value: "billing", label: "billing" },
];

/** Sección Inputs del catálogo. */
export const CatalogForms = () => {
  // Todas las SearchBar comparten el texto a propósito.
  const [search, setSearch] = useState("");
  const [readOnly, setReadOnly] = useState(true);
  const [includeData, setIncludeData] = useState(true);
  const [dropSchemas, setDropSchemas] = useState(false);
  const [autoColor, setAutoColor] = useState("");
  const [presetColor, setPresetColor] = useState(CONNECTION_COLORS[2]);
  const [form, setForm] = useState({
    name: "Production",
    host: "db.internal",
    port: "5432",
    ssl_mode: "require",
    environment: "production",
    color: "",
  });

  const str = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <CatalogSection
      id="inputs"
      title="Inputs"
      description="Fields take size like buttons do. Toolbars use lg, the default, and every example here is lg unless tagged xl; forms in pages and modals use xl. The table at the end puts both sizes side by side."
    >
      <CatalogRow label="Input: label, icon, hint, error, disabled">
        <div className={css.grid}>
          <Input label="Database" placeholder="mydb" />
          <Input label="Host" placeholder="localhost" iconLeft={<Server size={14} />} />
          <Input
            label="Query timeout"
            type="number"
            placeholder="0"
            hint="Seconds. 0 means no limit"
          />
          <Input label="Host" placeholder="localhost" error="Host is required" />
          <Input label="Port" defaultValue="5432" disabled />
        </div>
      </CatalogRow>

      <CatalogRow label="PasswordInput and Textarea">
        <div className={css.grid}>
          <PasswordInput label="Password" placeholder="••••••••" />
          <Textarea label="Private key" mono placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" />
        </div>
      </CatalogRow>

      <CatalogRow label="Select: plain, searchable, hint, error, disabled">
        <div className={css.grid}>
          <Select label="SSL" options={SSL_OPTIONS} defaultValue="prefer" />
          <Select
            label="Database"
            options={DATABASE_OPTIONS}
            placeholder="Search databases…"
            searchable
          />
          <Select
            label="SSL"
            options={SSL_OPTIONS}
            defaultValue="prefer"
            hint="Prefer falls back to plain text"
          />
          <Select
            label="SSL"
            options={SSL_OPTIONS}
            placeholder="Choose a mode"
            error="Choose an SSL mode"
          />
          <Select label="SSL" options={SSL_OPTIONS} defaultValue="require" disabled />
        </div>
      </CatalogRow>

      <CatalogRow label="SearchBar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search connections"
          className={css.searchBox}
        />
      </CatalogRow>

      <CatalogRow label="ColorPicker: automatic and preset">
        <div className={css.grid}>
          <ColorPicker value={autoColor} onChange={setAutoColor} />
          <ColorPicker value={presetColor} onChange={setPresetColor} />
        </div>
      </CatalogRow>

      <CatalogRow label="Switch">
        <Switch
          checked={readOnly}
          onChange={setReadOnly}
          label="Open every transaction as READ ONLY"
        />
        <Switch checked={false} onChange={() => {}} label="Disabled" disabled />
      </CatalogRow>

      <CatalogRow label="Checkbox">
        <Checkbox
          checked={includeData}
          onChange={setIncludeData}
          label="Data"
          description="INSERT statements for every row"
        />
        <Checkbox
          checked={dropSchemas}
          onChange={setDropSchemas}
          label="Drop schemas before recreating them"
        />
        <Checkbox checked onChange={() => {}} label="Disabled" disabled />
      </CatalogRow>

      <CatalogRow label="In context: FormRow as in the New connection modal" size="xl">
        <div className={css.frame}>
          <div className={css.formBody}>
            <FormRow label="Name">
              <Input size="xl" value={form.name} onChange={str("name")} placeholder="My database" />
            </FormRow>
            <FormRow label="Host">
              <div className={css.hostPort}>
                <Input size="xl" value={form.host} onChange={str("host")} placeholder="localhost" />
                <div className={css.port}>
                  <Input
                    size="xl"
                    type="number"
                    value={form.port}
                    onChange={str("port")}
                    placeholder="5432"
                  />
                </div>
              </div>
            </FormRow>
            <FormRow label="SSL">
              <Select
                size="xl"
                value={form.ssl_mode}
                options={SSL_OPTIONS}
                onChange={str("ssl_mode")}
              />
            </FormRow>
            <FormRow label="Environment">
              <Select
                size="xl"
                value={form.environment}
                options={ENVIRONMENT_OPTIONS}
                onChange={str("environment")}
                hint="Production asks before running UPDATE or DELETE without WHERE, TRUNCATE or DROP"
              />
            </FormRow>
            <FormRow label="Colour">
              <ColorPicker
                size="xl"
                value={form.color}
                onChange={(color) => setForm((f) => ({ ...f, color }))}
              />
            </FormRow>
          </div>
        </div>
      </CatalogRow>

      <SizeCompare
        label="Fields in lg and xl, side by side"
        items={[
          {
            name: "Input",
            field: true,
            render: (s) => <Input size={s} placeholder="mydb" aria-label={`Database ${s}`} />,
          },
          {
            name: "PasswordInput",
            field: true,
            render: (s) => (
              <PasswordInput size={s} placeholder="••••••••" aria-label={`Password ${s}`} />
            ),
          },
          {
            name: "Select",
            field: true,
            render: (s) => <Select size={s} options={SSL_OPTIONS} defaultValue="prefer" />,
          },
          {
            name: "SearchBar",
            field: true,
            render: (s) => (
              <SearchBar size={s} value={search} onChange={setSearch} placeholder="Search" />
            ),
          },
          {
            name: "ColorPicker",
            field: true,
            render: (s) => <ColorPicker size={s} value={autoColor} onChange={setAutoColor} />,
          },
        ]}
      />
    </CatalogSection>
  );
};
