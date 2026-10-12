# Favicon Generator — plan monetyzacji

> Stan na 2026-10-12. Analiza na podstawie `lib/`, `components/`, `README.md`, `DEPLOY.md`.

## Gdzie jesteśmy

- Paczka 97 plików z jednego źródła (SVG/PNG/JPG/WebP albo litera/emoji): favicon ICO/SVG/PNG, apple-touch-icon, PWA any + maskable, pełne Android (mipmapy, adaptive, monochrome, powiadomienia, Play Store 512), **iOS 18 jasny/ciemny/tinted**, klasyczny iOS, macOS appiconset, Windows, **19 ekranów startowych iOS**, `site.webmanifest`, `browserconfig.xml`, `head.html`, README.
- Edytor z transformacją, undo/redo, osobna kompozycja dla małych rozmiarów, ciemny `favicon.svg`, makiety platform, zapis projektu (`.json`). PNG bez kanału alfa (App Store Connect).
- Wszystko w przeglądarce, koszt serwera ≈ 0 (~40 MB RAM). PL/EN. GA4 z eventami `download_package`, `download_file`, `download_project`.
- Brak kont, płatności, znaku wodnego. Licencje czyste.

## Model

**Rekomendacja: zostaje darmowy — jako magnes na ruch i leady dla brewcode.**

Uzasadnienie:
- Podstawa (favicon, apple-touch, manifest) to towar — RealFaviconGenerator i favicon.io są darmowe i dobrze pozycjonowane w Google.
- Różnicujące elementy (iOS 18 tinted, pełne Android adaptive, splash iOS, PNG bez alfy) pokrywają się z appicon.co / Icon Kitchen / MakeAppIcon — rynek, w którym trudno brać pieniądze za pojedynczą paczkę.
- Koszt utrzymania ≈ 0, więc darmowe narzędzie nic nie kosztuje, a przyciąga dokładnie naszą grupę: developerów i firmy budujące aplikacje i PWA.

Monetyzacja **pośrednia** zamiast paywalla.

## Co zrobić

### 1. Przekierować ruch na usługi brewcode (1–2 dni)

- Po pobraniu paczki (`download_package`) ekran „gotowe" z jednym, nienachalnym CTA: „Budujesz aplikację lub PWA? Zrobimy ją z Tobą → brwcd.dev" (UTM: `utm_source=favicon&utm_medium=tool`).
- Event GA4 `cta_click` → mierzyć konwersję narzędzie → zapytanie ofertowe (np. przez brewcode-brief).
- Badge brewcode (`components/BrewcodeBadge.tsx`) już jest — zostaje.

### 2. SEO (2–3 dni)

- Podstrony docelowe pod frazy z ruchem: „ikony iOS 18 dark tinted", „android adaptive icon generator", „pwa maskable icon", „apple splash screen generator" — każda z instrukcją i przyciskiem do generatora z ustawionym trybem.
- To jest właściwy „przychód" tego narzędzia: ruch organiczny dla domeny brwcd.dev.

### 3. Opcjonalnie: wspieranie / API (tylko jeśli dane pokażą popyt)

- **Wesprzyj / postaw kawę** (Buy Me a Coffee, Stripe Payment Link) — zero kodu poza linkiem, czysto zarobkowo nieistotne, ale bez ryzyka.
- **API generowania paczki** (`POST /api/v1/package` → ZIP) dla CI/CD i agencji — wymagałoby przeniesienia renderu (Canvas) na serwer (node-canvas / sharp + resvg). Sens tylko przy wyraźnym popycie; wtedy klucze API i pakiety (wspólna warstwa brewcode).
- **Paczka „brand kit"** — favicon + OG image + avatary social + logo w wariantach. To już produkt dla designerów i mógłby być płatny jednorazowo; duży nakład, odłożyć.

## Czego nie robić

- Nie dodawać znaku wodnego do ikon ani limitu pobrań — zabije polecenia i SEO, a przychód byłby minimalny.

## Metryki sukcesu

- ruch organiczny na favicon.brwcd.dev i podstronach SEO,
- liczba kliknięć CTA → brwcd.dev i zapytań ofertowych z tego źródła,
- liczba pobranych paczek miesięcznie.
