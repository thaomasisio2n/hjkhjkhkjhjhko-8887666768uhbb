import { t } from "../i18n";

const BRAND = "NovaSpin";

export function setTitle(page?: string) {
  document.title = page ? `${page} — ${BRAND}` : `${BRAND} — ${t("brand.tagline")}`;
}
