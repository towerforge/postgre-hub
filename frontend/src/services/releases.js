// Llamadas a las releases públicas del repositorio en GitHub, para avisar en
// "About" de que hay una versión nueva. Es la única llamada que no va a la
// API propia.
import { externalGet } from "./http";

const GITHUB_REPO = "towerforge/postgre-hub";

/** Última release publicada: `{ tag_name, html_url, … }`. */
export const getLatestRelease = () =>
  externalGet(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
