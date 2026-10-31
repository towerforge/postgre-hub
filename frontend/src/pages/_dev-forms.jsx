// Catálogo del kit (/dev), piezas pequeñas y de formulario: Badge,
// IconButton, campos de contraseña y texto largo, Alert, FormRow e InfoBox.
import { Info, LogOut, X } from "lucide-react";
import {
  Alert,
  Badge,
  Col,
  FormRow,
  Grid,
  IconButton,
  InfoBox,
  Input,
  PasswordInput,
  Select,
  Text,
  Textarea,
  ToolButton,
} from "@/components/ui";
import { OPTIONS } from "./_dev-content";

/** Secciones de Badge a InfoBox del catálogo. */
export const DevForms = () => (
  <>
    <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
      Badge
    </Text>
    <Grid gap={16} style={{ marginBottom: 32 }}>
      <Col span={12} style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Badge>3</Badge>
        <Badge tone="neutral">12</Badge>
        <ToolButton style={{ color: "var(--om-accent)", fontWeight: 600 }}>
          Apply <Badge>1</Badge>
        </ToolButton>
      </Col>
    </Grid>

    <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
      IconButton
    </Text>
    <Grid gap={16} style={{ marginBottom: 32 }}>
      <Col span={12} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <IconButton label="Info">
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
      </Col>
    </Grid>

    <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
      PasswordInput y Textarea
    </Text>
    <Grid gap={16} style={{ marginBottom: 32 }}>
      <Col span={12} md={6}>
        <PasswordInput size="lg" label="Password" placeholder="••••••••" />
      </Col>
      <Col span={12} md={6}>
        <Textarea label="Private key" mono placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" />
      </Col>
    </Grid>

    <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
      Alert
    </Text>
    <Grid gap={16} style={{ marginBottom: 32 }}>
      <Col span={12} md={6} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Alert tone="error">Authentication failed</Alert>
        <Alert tone="success">Credentials updated successfully.</Alert>
        <Alert tone="warning">Update available</Alert>
        <Alert tone="info">Configure SSH tunnels in SSH Tunnels.</Alert>
      </Col>
    </Grid>

    <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
      FormRow
    </Text>
    <Grid gap={16} style={{ marginBottom: 32 }}>
      <Col span={12} md={6} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <FormRow label="Name">
          <Input size="lg" placeholder="My database" />
        </FormRow>
        <FormRow label="Host">
          <Input size="lg" placeholder="localhost" />
        </FormRow>
        <FormRow label="SSL">
          <Select value="1" options={OPTIONS} onChange={() => {}} />
        </FormRow>
      </Col>
    </Grid>

    <Text variant="body" as="h2" style={{ marginBottom: 12 }}>
      InfoBox
    </Text>
    <Grid gap={16} style={{ marginBottom: 32 }}>
      <Col span={12} md={6} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <InfoBox>postgres://postgres@localhost:5432/mydb</InfoBox>
        <InfoBox mono={false}>Texto informativo sin monoespaciada</InfoBox>
      </Col>
    </Grid>
  </>
);
