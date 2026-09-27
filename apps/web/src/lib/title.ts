const BRAND = "NovaSpin";

export function setTitle(page?: string) {
  document.title = page ? `${page} — ${BRAND}` : `${BRAND} — Demo Casino Lobby`;
}
