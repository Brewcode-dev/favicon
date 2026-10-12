# Paczka ikon — brewcode-favicon

## Strona WWW
Pliki z katalogu głównego paczki skopiuj do katalogu publicznego strony (np. `public/`),
a zawartość `head.html` wklej do sekcji `<head>`.

## Android
Zawartość `android/res` skopiuj do `app/src/main/res`. `mipmap-anydpi-v26` definiuje adaptive icon
(tło, pierwszy plan i warstwę monochromatyczną dla ikon tematycznych Androida 13+).
`drawable-*/ic_stat_notification.png` to ikona powiadomień (biała sylwetka) — ustaw ją
w `NotificationCompat.Builder.setSmallIcon(R.drawable.ic_stat_notification)`.
`android/play-store-512.png` wgraj w Google Play Console.

## iOS
Wybierz JEDEN z dwóch katalogów i podmień nim `AppIcon.appiconset` w `Assets.xcassets`:

- `ios-18/AppIcon.appiconset` — format Xcode 16+: jeden rozmiar 1024 w wersji jasnej,
  ciemnej i tinted (iOS 18). Zalecany dla nowych projektów.
- `ios/AppIcon.appiconset` — klasyczny komplet 20–1024 px dla starszych wersji Xcode.

Ikony jasne są bez kanału alfa, więc przechodzą walidację App Store Connect.

## macOS
Katalog `macos/AppIcon.appiconset` podmień w `Assets.xcassets` projektu macOS.

## Ponowne wygenerowanie
`brewcode-favicon.json` zawiera wszystkie ustawienia i plik źródłowy. Wczytaj go w generatorze
(„Wczytaj” w sekcji Projekt albo przeciągnij plik na okno), popraw i pobierz paczkę od nowa.

## Ikony ogólne
`icons/` — PNG 16–1024 px i wektorowy `icon.svg`.
