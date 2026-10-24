# Link Collector (rozszerzenie Chrome)

Zbiera na żywo wszystkie linki pasujące do wzorca (domyślnie podpisane
obrazki `images-ssl.gotestsite.com/u/...`) z każdej karty i trzyma je w
jednym JSON-ie. Jednym kliknięciem kopiujesz całość do schowka.

## Instalacja

1. Otwórz `chrome://extensions`.
2. Włącz **Tryb dewelopera** (prawy górny róg).
3. Kliknij **Załaduj rozpakowane** i wskaż ten folder (`tools/link-collector`).
4. Przypnij ikonę rozszerzenia (pinezka przy pasku adresu).

Na ikonie widać licznik zebranych linków.

## Użycie

Po prostu przeglądaj strony, a linki zbierają się same. W popupie masz:

- **Kopiuj JSON**: cały JSON do schowka,
- **Kopiuj same URL-e**: jeden link na linię,
- **Pobierz .json**: zapis do pliku,
- **Wyczyść**: usuwa zebrane linki,
- **zbieraj**: pauza / wznowienie,
- **Wzorzec (regex)**: co ma być zbierane, np. `gotestsite\.com/.*\.(webp|jpe?g|png)`.

Linki zostają po zamknięciu przeglądarki (`chrome.storage.local`).

## Skąd bierze linki

- `webRequest`: każde żądanie sieciowe (obrazki, fetch/XHR, CSS), z kodem
  HTTP i informacją, czy przyszło z cache,
- skrypt na stronie: `<img src/srcset>`, `<source srcset>` i inline
  `background-image`. To łapie obrazki z pamięci podręcznej, których nie
  widać w sieci.

Duplikaty (ten sam pełny URL) są pomijane.

## Format wpisu

```json
{
  "url": "https://images-ssl.gotestsite.com/u/.../x.webp?Policy=...&Signature=...&Key-Pair-Id=...",
  "path": "/u/.../x.webp",
  "expires": "2026-10-31T13:27:09.000Z",
  "capturedAt": "2026-10-24T15:04:23.350Z",
  "source": "network:image",
  "status": 200,
  "fromCache": false,
  "page": "https://strona-na-ktorej-to-bylo"
}
```

Pole `expires` to data wygaśnięcia odczytana z parametru `Policy` (lub
`Expires`) podpisanego linku CloudFront. Po tej dacie link zwraca 403.
