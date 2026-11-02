# TrebleEye

Dartapp för 301/501/701 med poängräkning, utgångsförslag, uppropare och kameraigenkänning.

**Öppna:** https://tomdooley93-max.github.io/TrebleEye/
**Installera på iPhone:** öppna länken i Safari → Dela → Lägg till på hemskärmen.

## Funktioner
- Manuell inmatning (klickbar tavla eller knappar) och kameraförslag med automatisk kalibrering.
- Proffsutgångar för dubbel ut, animationer för 100+, 180, bust och game shot.
- Förinspelade uppropare (röster i `audio/<id>/`, listan styrs av `voices.json`).
- Delad session mellan enheter med QR-kod och livebild från kameran (PeerJS/WebRTC).
- Spelarprofiler med namn och bild (sparas på enheten).
- Turneringsläge (Turnering på startskärmen): en enhet är storskärm (Visa på storskärm = helskärm som skalar till skärmen) och håller i utslagsträdet. Varje bana har en egen QR-kod med en fast klubbkod, så utskrivna koder vid banorna fungerar varje vecka; telefonen som skannar blir den banan. 6 banor som standard, justerbart. Seedning efter spelarnas snitt (statistiken samlas in från banornas telefoner när de ansluter). Varje match i kön tilldelas en bana direkt. Spelledaren trycker på en match för att flytta bana, ändra spelare, rätta poäng/legs, starta om eller sätta resultat. Publiken skannar Följ live-koden och följer matcherna, trädet och statistiken i mobilen. Valfri sudden death efter 30 pilar per spelare (högst poäng på 3 pilar). Statistik per spelare med QR-kod till spelarens egen telefon, delning och CSV-export.

## Admin
- Adminläge: tryck 7 gånger på versionsnumret i appen.
- Röster skapas med GitHub-jobbet **Röst (OpenAI)** (`.github/workflows/voice.yml`, kräver hemligheten `OPENAI_API_KEY`), eller direkt från appens adminpanel med en GitHub-nyckel (Contents + Actions på detta repo).
- `voices.json`: `status` är `public` (alla), `preview` eller `hidden` (bara admin).

## Utveckling
- Koden ligger i `src/app.html` (sidan) och `src/head.html` (PWA-huvud). Kör `./build.sh` för att bygga `index.html`.
- Vid ny version: höj `VERSION` i `sw.js` och `appVer` i `src/app.html`, så får installerade appar uppdateringen.
- `node tools/calib-bench.js src/app.html` testar autokalibreringen på syntetiska tavelbilder (vinklar, ljus).
- Bibliotek i `lib/`: PeerJS, qrcode-generator och jsQR (MIT/Apache-2.0).
