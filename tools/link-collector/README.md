# Link Collector (rozszerzenie Chrome)

Zbiera na żywo wszystkie linki pasujące do wzorca (domyślnie podpisane
obrazki `images-ssl.gotest.com/u/...` i `images-ssl.gotestsite.com/u/...`)
z każdej karty i grupuje je per user (ID usera to pierwszy segment ścieżki
po `/u/`). Jednym kliknięciem kopiujesz całość do schowka.

## Instalacja

1. Otwórz `chrome://extensions`.
2. Włącz **Tryb dewelopera** (prawy górny róg).
3. Kliknij **Załaduj rozpakowane** i wskaż ten folder (`tools/link-collector`).
4. Przypnij ikonę rozszerzenia (pinezka przy pasku adresu).

Na ikonie widać licznik zebranych linków.

## Użycie

Po prostu przeglądaj strony, a linki zbierają się same. W popupie masz:

- **Kopiuj JSON (per user)**: cały JSON pogrupowany po userach,
- **kliknięcie w ID usera na liście**: JSON tylko tego usera,
- **Kopiuj płaski JSON**: zwykła lista, każdy wpis z polem `user`,
- **Kopiuj same URL-e**: jeden link na linię,
- **Pobierz .json**: zapis do pliku (pogrupowany per user),
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

## Format JSON (per user)

```json
{
  "aWYy9yopNb9mvqkufn3KoG": {
    "count": 2,
    "firstSeen": "2026-10-24T15:08:36.346Z",
    "lastSeen": "2026-10-24T15:08:36.385Z",
    "images": [
      {
        "file": "vaRj1QgxCzegmjdXinskCT.webp",
        "url": "https://images-ssl.gotest.com/u/aWYy9yopNb9mvqkufn3KoG/vaRj1QgxCzegmjdXinskCT.webp?Policy=...&Signature=...&Key-Pair-Id=...",
        "expires": "2026-10-31T14:32:23.000Z",
        "capturedAt": "2026-10-24T15:08:36.346Z",
        "source": "network:image",
        "status": 200,
        "fromCache": false,
        "page": "https://gotest.com"
      }
    ]
  }
}
```

Linki, w których ścieżce nie ma `/u/<id>/`, trafiają do grupy `(bez usera)`.
Sposób wyciągania ID usera ustawia `USER_RE` w `popup.js`.

Pole `expires` to data wygaśnięcia odczytana z parametru `Policy` (lub
`Expires`) podpisanego linku CloudFront. Po tej dacie link zwraca 403.
