// Catálogo del kit (/dev), sección de campos: Input, PasswordInput, Textarea,
// Select, SearchBar, Switch, Checkbox, ColorPicker y un FormRow que reproduce
// el modal New connection. Cada control está conectado a su estado para que se
// pueda probar de verdad.
import { useState } from "react";
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
import css from "@/css/dev.module.css";
import { DevRow, DevSection } from "./_dev-section";

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
export const DevForms = () => {
  // Las dos SearchBar (md y lg) comparten el texto a propósito.
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
  });

  const str = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <DevSection title="Inputs">
      <DevRow label="Input · md, with error and with hint">
        <div className={css.grid}>
          <Input label="Database" placeholder="mydb" />
          <Input label="Host" placeholder="localhost" error="Host is required" />
          <Input
            label="Query timeout"
            type="number"
            placeholder="0"
            hint="Seconds. 0 means no limit"
          />
        </div>
      </DevRow>

      <DevRow label="Input lg, PasswordInput and Textarea">
        <div className={css.grid}>
          <Input size="lg" label="Username" placeholder="postgres" />
          <PasswordInput size="lg" label="Password" placeholder="••••••••" />
          <Textarea label="Private key" mono placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" />
        </div>
      </DevRow>

      <DevRow label="Select and searchable Select">
        <div className={css.grid}>
          <Select label="SSL" options={SSL_OPTIONS} defaultValue="prefer" />
          <Select
            label="Database"
            options={DATABASE_OPTIONS}
            placeholder="Search databases…"
            searchable
          />
        </div>
      </DevRow>

      <DevRow label="SearchBar · md and lg">
        <SearchBar value={search} onChange={setSearch} placeholder="Search connections…" />
        <SearchBar
          size="lg"
          value={search}
          onChange={setSearch}
          placeholder="Search connections…"
          className={css.searchBox}
        />
      </DevRow>

      <DevRow label="Switch">
        <Switch
          checked={readOnly}
          onChange={setReadOnly}
          label="Open every transaction as READ ONLY"
        />
        <Switch checked={false} onChange={() => {}} label="Disabled" disabled />
      </DevRow>

      <DevRow label="Checkbox">
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
      </DevRow>

      <DevRow label="ColorPicker · auto and preset">
        <ColorPicker value={autoColor} onChange={setAutoColor} />
        <ColorPicker value={presetColor} onChange={setPresetColor} />
      </DevRow>

      <DevRow label="In context · FormRow as in the New connection modal">
        <div className={css.frame}>
          <div className={css.formBody}>
            <FormRow label="Name">
              <Input size="lg" value={form.name} onChange={str("name")} placeholder="My database" />
            </FormRow>
            <FormRow label="Host">
              <div className={css.hostPort}>
                <Input size="lg" value={form.host} onChange={str("host")} placeholder="localhost" />
                <div className={css.port}>
                  <Input
                    size="lg"
                    type="number"
                    value={form.port}
                    onChange={str("port")}
                    placeholder="5432"
                  />
                </div>
              </div>
            </FormRow>
            <FormRow label="SSL">
              <Select value={form.ssl_mode} options={SSL_OPTIONS} onChange={str("ssl_mode")} />
            </FormRow>
            <FormRow label="Environment">
              <Select
                value={form.environment}
                options={ENVIRONMENT_OPTIONS}
                onChange={str("environment")}
                hint="Production asks before running UPDATE or DELETE without WHERE, TRUNCATE or DROP"
              />
            </FormRow>
          </div>
        </div>
      </DevRow>
    </DevSection>
  );
};
