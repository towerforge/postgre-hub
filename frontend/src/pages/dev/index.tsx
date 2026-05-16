import { useState } from "react"
import { Folder, FileText } from "lucide-react"
import { Button, Input, Select, Card, CardHeader, CardBody, CardFooter, Grid, Col, Text, Modal, Page, Tabs, TabBar, Tab, TabPanel, Table, TableCell, Spinner, SearchBar, SegmentedControl, StatPill, InlineSelect, Switch, Checkbox } from "@/components/ui"
import type { Column } from "@/components/ui"

const OPTIONS = [
    { value: "1", label: "Opción 1" },
    { value: "2", label: "Opción 2" },
    { value: "3", label: "Opción 3" },
]

type FileRow = { name: string; commit: string; ago: string; icon: typeof Folder }

const devTableData: FileRow[] = [
    { name: '.github/workflows', commit: 'Release/main v0.3.1', ago: '4 días', icon: Folder },
    { name: 'backend',           commit: 'Release/main v0.3.1', ago: '4 días', icon: Folder },
    { name: 'frontend',          commit: 'Release/main v0.3.1', ago: '4 días', icon: Folder },
    { name: 'Dockerfile',        commit: 'Release/main v0.1.10', ago: '3 semanas', icon: FileText },
    { name: 'README.md',         commit: 'Release/main v0.3.0', ago: '4 días', icon: FileText },
]

const devTableColumns: Column<FileRow>[] = [
    {
        key: 'name',
        header: 'Nombre',
        render: row => <TableCell icon={<row.icon size={16} />}>{row.name}</TableCell>,
    },
    {
        key: 'commit',
        header: 'Último commit',
        render: row => <span style={{ color: 'var(--text-2)' }}>{row.commit}</span>,
    },
    {
        key: 'ago',
        header: 'Hace',
        shrink: true,
        align: 'right',
        render: row => <span style={{ color: 'var(--text-2)' }}>{row.ago}</span>,
    },
]

const SEG_OPTIONS = [
    { value: 'all',  label: 'All'  },
    { value: 'cpu',  label: 'CPU'  },
    { value: 'ram',  label: 'RAM'  },
    { value: 'disk', label: 'Disk' },
]

const INLINE_OPTIONS = [
    { value: 'all',     label: 'All networks'  },
    { value: 'bridge',  label: 'bridge'        },
    { value: 'host',    label: 'host'          },
]

export default function Dev() {
    const [modal,    setModal]    = useState(false)
    const [search,   setSearch]   = useState('')
    const [seg,      setSeg]      = useState('all')
    const [inline,   setInline]   = useState('all')
    const [sw1,      setSw1]      = useState(true)
    const [sw2,      setSw2]      = useState(false)
    const [cb1,      setCb1]      = useState(true)
    const [cb2,      setCb2]      = useState(false)

    return (
        <Page>
            <Text variant="title">Componentes UI</Text>
            <Text variant="subtitle">Ejemplo de la librería base</Text>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Botones</Text>
            <Grid gap={8} align="center" style={{ marginBottom: 32 }}>
                <Col span={12} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button variant={1}>Primary</Button>
                    <Button variant={2}>Secondary</Button>
                    <Button variant={3}>Outline</Button>
                    <Button variant={4}>Subtle</Button>
                    <Button variant={5}>Danger</Button>
                    <Button variant={1} loading>Loading</Button>
                    <Button variant={2} size="sm">Small</Button>
                    <Button variant={2} size="lg">Large</Button>
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Inputs</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12} md={4}>
                    <Input label="Nombre" placeholder="Escribe algo..." />
                </Col>
                <Col span={12} md={4}>
                    <Input label="Con error" placeholder="Campo erróneo" error="Este campo es obligatorio" />
                </Col>
                <Col span={12} md={4}>
                    <Input label="Con hint" placeholder="Sugerencia" hint="Máximo 50 caracteres" />
                </Col>
                <Col span={12} md={6}>
                    <Select label="Selector" options={OPTIONS} placeholder="Elige una opción" />
                </Col>
                <Col span={12} md={6}>
                    <Select label="Buscable" options={OPTIONS} placeholder="Busca..." searchable />
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Cards</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12} md={4}>
                    <Card>
                        <CardHeader title="Default" />
                        <CardBody><Text variant="caption">Contenido de la card</Text></CardBody>
                        <CardFooter><Button variant={2} size="sm">Acción</Button></CardFooter>
                    </Card>
                </Col>
                <Col span={12} md={4}>
                    <Card variant="elevated">
                        <CardHeader title="Elevated" />
                        <CardBody><Text variant="caption">Sin borde, con sombra</Text></CardBody>
                    </Card>
                </Col>
                <Col span={12} md={4}>
                    <Card variant="outlined">
                        <CardHeader title="Outlined" />
                        <CardBody><Text variant="caption">Solo borde</Text></CardBody>
                    </Card>
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Tabs</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12}>
                    <Tabs defaultTab="planning">
                        <TabBar actions={<Button size="sm" variant={3}>+ New view</Button>}>
                            <Tab id="planning" badge={3}>Feature planning</Tab>
                            <Tab id="area">By area</Tab>
                            <Tab id="sprint">Current sprint</Tab>
                        </TabBar>
                        <TabPanel id="planning">
                            <Card style={{ margin: "16px 0" }}>
                                <CardBody><Text variant="caption">Contenido de Feature planning</Text></CardBody>
                            </Card>
                        </TabPanel>
                        <TabPanel id="area">
                            <Card style={{ margin: "16px 0" }}>
                                <CardBody><Text variant="caption">Contenido de By area</Text></CardBody>
                            </Card>
                        </TabPanel>
                        <TabPanel id="sprint">
                            <Card style={{ margin: "16px 0" }}>
                                <CardBody><Text variant="caption">Contenido de Current sprint</Text></CardBody>
                            </Card>
                        </TabPanel>
                    </Tabs>
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Table</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12}>
                    <Table
                        columns={devTableColumns}
                        data={devTableData}
                        keyExtractor={row => row.name}
                    />
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>SearchBar</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12} md={6}>
                    <SearchBar value={search} onChange={setSearch} placeholder="Search containers…" />
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>SegmentedControl</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12}>
                    <SegmentedControl options={SEG_OPTIONS} value={seg} onChange={setSeg} />
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>InlineSelect</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12}>
                    <InlineSelect label="Network" value={inline} options={INLINE_OPTIONS} onChange={setInline} />
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>StatPill</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <StatPill label="Total" value={42} />
                    <StatPill label="Running" value={38} valueColor="#10b981" />
                    <StatPill label="Stopped" value={4} valueColor="var(--text-3)" />
                    <StatPill label="Size" value="1.2 GB" />
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Switch</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12} style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <Switch checked={sw1} onChange={setSw1} label="Enabled" />
                    <Switch checked={sw2} onChange={setSw2} label="Disabled (off)" />
                    <Switch checked={true} onChange={() => {}} label="Disabled prop" disabled />
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Checkbox</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12} style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <Checkbox checked={cb1} onChange={setCb1} label="Checked" />
                    <Checkbox checked={cb2} onChange={setCb2} label="Unchecked" />
                    <Checkbox checked={true} onChange={() => {}} label="Disabled" disabled />
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Spinner</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12} style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <Spinner />
                    <Spinner label="Cargando…" />
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Modal</Text>
            <Button variant={1} onClick={() => setModal(true)}>Abrir modal</Button>

            <Modal open={modal} onClose={() => setModal(false)} title="Ejemplo de modal">
                <Text variant="body" style={{ marginBottom: 16 }}>
                    Contenido del modal. Se cierra con Escape o haciendo clic fuera.
                </Text>
                <Input label="Campo dentro del modal" placeholder="Escribe aquí..." />
                <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Button variant={2} onClick={() => setModal(false)}>Cancelar</Button>
                    <Button variant={1} onClick={() => setModal(false)}>Confirmar</Button>
                </div>
            </Modal>
        </Page>
    )
}
