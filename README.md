# Arkiv

Digitalt arkiv over monumenter, gravsteiner, skrift og skulpturer av historisk verdi.

Statisk nettside (HTML, CSS og JavaScript) uten byggesteg – publiseres direkte med GitHub Pages.

## Filer

| Fil | Innhold |
| --- | --- |
| `index.html` | Sidens oppsett |
| `styles.css` | Utseende |
| `app.js` | Søk, filtre, visninger, detaljpanel og avspilling |
| `data/objekter.json` | Alle objektene i arkivet |
| `bilder/` | Foto av objektene |

## Legge til eller endre objekter

Hvert objekt i `data/objekter.json` ser slik ut:

```json
{
  "id": "M-0001",
  "kategori": "Monument",
  "tittel": "Bauta ved tingstedet",
  "aar": 1914,
  "datering": "1914",
  "materiale": "Granitt",
  "sted": "Innlandet",
  "skaper": "[Steinhugger]",
  "maal": "H 310 cm",
  "inskripsjon": "«1814 – 1914»",
  "tilstand": "God",
  "vernestatus": "Listeført",
  "skannet": true,
  "beskrivelse": "Kort beskrivelse av objektet.",
  "bilde": "bilder/M-0001.jpg"
}
```

- `kategori` er en av: `Monument`, `Gravstein`, `Skrift`, `Skulptur`.
- `aar` er et tall og brukes til sortering og datofilteret; `datering` er teksten som vises (f.eks. «ca. 1250»).
- For skrift brukes feltene slik: `materiale` = klassifikasjon, `skaper` = designer, `sted` = opphav, `maal` = snitt, `inskripsjon` = bruk, `tilstand` = format.
- `bilde` kan stå tomt (`""`) – da vises en strektegning for kategorien.

Et objekt kan lenkes direkte med katalognummeret: `…/#M-0001`.

## Se siden lokalt

Siden henter data med `fetch`, så den må åpnes via en webserver:

```
python3 -m http.server
```

og gå til http://localhost:8000.

> Alle poster er foreløpig eksempeldata.
