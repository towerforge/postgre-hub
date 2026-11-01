// Catálogo del kit (/design-system), sección Brand: el monograma PH de BrandMark en
// sus tres formas (símbolo, icono de app en squircle y lockup con el nombre), a los
// tamaños en que aparece en la app, y el tile de la barra superior en contexto.
import { BrandMark } from "@/components/ui";
import css from "@/css/design-system.module.css";
import { CatalogRow, CatalogSection } from "./_section";

// Tamaños del símbolo: el de la barra superior, el del acceso y dos de muestra.
const SYMBOL_SIZES = [15, 26, 48, 96];
// Icono de app: tile de la barra, About, y los tamaños de los PNG de la PWA a escala.
const TILE_SIZES = [22, 48, 96, 192];

/** Sección Brand del catálogo. */
export const CatalogBrand = () => (
  <CatalogSection
    id="brand"
    title="Brand"
    description="The PH monogram: the bottom of the P's bowl runs on as the H's crossbar, one line joining both letters like a JOIN. It draws in currentColor; with accent the crossbar takes --om-accent."
  >
    <CatalogRow label="Symbol, one colour (currentColor)">
      <div className={css.brandWell}>
        {SYMBOL_SIZES.map((s) => (
          <span key={s} className={css.brandSample}>
            <BrandMark size={s} />
            <code>{s}</code>
          </span>
        ))}
      </div>
    </CatalogRow>

    <CatalogRow label="Symbol with accent crossbar">
      <div className={css.brandWell}>
        {SYMBOL_SIZES.map((s) => (
          <span key={s} className={css.brandSample}>
            <BrandMark size={s} accent />
            <code>{s}</code>
          </span>
        ))}
      </div>
    </CatalogRow>

    <CatalogRow label="App icon (tile): white symbol on a --om-primary squircle">
      <div className={css.brandWell}>
        {TILE_SIZES.map((s) => (
          <span key={s} className={css.brandSample}>
            <BrandMark tile size={s} />
            <code>{s}</code>
          </span>
        ))}
      </div>
    </CatalogRow>

    <CatalogRow label="Lockup (wordmark)">
      <div className={css.brandWell}>
        <BrandMark wordmark accent size={40} />
        <BrandMark wordmark accent size={24} />
        <BrandMark wordmark size={24} />
      </div>
    </CatalogRow>

    <CatalogRow label="In context: top bar tile (22px, symbol 15px)">
      <span className={`waybar ${css.brandBar}`}>
        <span className="title">
          <span className="proj-icon" style={{ background: "var(--om-primary)" }}>
            <BrandMark size={15} />
          </span>
          <span>Connections</span>
        </span>
      </span>
    </CatalogRow>
  </CatalogSection>
);
