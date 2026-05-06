# Image credits

Attribution tracking for bundled image assets under `apps/landing/public/images/` and `apps/revery/public/images/`.

**Status:** In-progress audit. Rows marked `TBD` need the original uploader to fill in the source URL, author, and license. Rows marked `own` are original/owned by TGE (no attribution needed). See the [license quick reference](#license-quick-reference) at the bottom.

**Why this file exists:** CodeRabbit flagged on PR #6 that bundling third-party images without attribution is a compliance risk. Images under commit `680a387` had their EXIF stripped and no source notes in the commit message, so provenance can't be recovered from the repo alone.

## How to fill in a TBD row

1. Find the original source (photographer's portfolio, Unsplash/Pexels/Pixabay/Wikimedia URL, purchased stock license, etc.).
2. Edit the row: replace `TBD` in Source / Author / License.
3. If the license requires attribution and the image has been modified (cropped/re-encoded), note that in the License column (e.g. `CC BY-SA 4.0 — cropped from original`).
4. If the asset is your own work or commissioned, set Source to `own` and License to `own`.

---

## Landing (`apps/landing/public/images/**`)

### Castles

| File | Dimensions | Source | Author | License |
|---|---|---|---|---|
| `castles/bran-castle.jpg`   | 1920×1080 | TBD | TBD | TBD |
| `castles/bran-trees.jpg`    | 1200×1200 | TBD | TBD | TBD |
| `castles/corvin-castle.jpg` | 1200×1600 | TBD | TBD | TBD |
| `castles/peles-castle.jpg`  | 1200×1600 | TBD | TBD | TBD |
| `castles/peles-park.jpg`    | 1200×1200 | TBD | TBD | TBD |

### Cities (1600×1067 hero format)

The 11 cities below were re-sourced on 2026-05-06 from Pexels / Pixabay / Unsplash (free-for-commercial-use platform licenses, no attribution required) after `scripts/scrape-images.mjs` produced byte-identical duplicates across 8 cities. Picks were verified by visual inspection. The replacement script lives at `scripts/refresh-city-images.mjs` and the as-shipped manifest at `scripts/refresh-city-images.manifest.json`.

| File | Dimensions | Source | Author | License |
|---|---|---|---|---|
| `cities/alba-iulia.jpg`            | 1600×1067 | [Gate Tower to the Coronation Cathedral, Alba Iulia](https://www.pexels.com/photo/view-of-the-gate-tower-to-the-coronation-cathedral-alba-iulia-romania-13876219/) (Pexels) | Pexels contributor | [Pexels License](https://www.pexels.com/license/) — free for commercial use, no attribution required |
| `cities/arad.jpg`                  | 1600×1067 | [The State Theater Arad](https://pixabay.com/photos/state-theatre-arad-romania-969955/) (Pixabay) | Pixabay contributor | [Pixabay Content License](https://pixabay.com/service/license-summary/) — free for commercial use, no attribution required |
| `cities/baia-mare.jpg`             | 1600×1067 | [Baia Mare Stephan Turm](https://pixabay.com/photos/baia-mare-stephan-turm-6340443/) (Pixabay) | Pixabay contributor | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `cities/bistrita.jpg`              | 800×600   | placeholder (copy of `cities/placeholder.jpg`) — no usable free-license photo of Bistrița city on Pexels / Pixabay / Unsplash; needs manual sourcing | — | — |
| `cities/brasov.jpg`                | 800×600   | TBD | TBD | TBD |
| `cities/buftea.jpg`                | 1600×1067 | [Building with staircase (Stirbei chapel)](https://unsplash.com/photos/WurHb29Wcsc) (Unsplash) | Unsplash contributor | [Unsplash License](https://unsplash.com/license) — free for commercial use, no attribution required |
| `cities/cluj-napoca.jpg`           | 800×600   | TBD | TBD | TBD |
| `cities/deva.jpg`                  | 1600×1067 | [Aerial Panorama of Deva Fortress](https://www.pexels.com/photo/aerial-panorama-of-a-fortress-on-top-of-a-hill-deva-romania-18208680/) (Pexels) | Pexels contributor (Daniel Lepădatu) | [Pexels License](https://www.pexels.com/license/) |
| `cities/drobeta-turnu-severin.jpg` | 1600×1067 | [B&W city aerial of Drobeta-Turnu Severin](https://unsplash.com/photos/02Ze1Y0fuzk) (Unsplash) | Unsplash contributor | [Unsplash License](https://unsplash.com/license) |
| `cities/oradea.jpg`                | 800×600   | TBD | TBD | TBD |
| `cities/reghin.jpg`                | 800×600   | [Reghin001.jpg](https://commons.wikimedia.org/wiki/File:Reghin001.jpg) (Wikimedia Commons) | Flavinhu | Public Domain — cropped (top two-thirds) and downscaled from the original |
| `cities/resita.jpg`                | 1600×1067 | [Reșița valley town](https://unsplash.com/photos/YIO-MCusBj4) (Unsplash) | Unsplash contributor | [Unsplash License](https://unsplash.com/license) |
| `cities/sibiu.jpg`                 | 1600×1067 | [Charming Sibiu City Square in Romania](https://www.pexels.com/photo/30621324/) (Pexels) | Pexels contributor | [Pexels License](https://www.pexels.com/license/) — free for commercial use, no attribution required |
| `cities/sighisoara.jpg`            | 800×600   | [Panoramic Schäßburg Medieval Citadel (20903916345).jpg](https://commons.wikimedia.org/wiki/File:Panoramic_Sch%C3%A4%C3%9Fburg_Medieval_Citadel_(20903916345).jpg) (Wikimedia Commons) | Andrei-Daniel Nicolae | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) — cropped and downscaled from the original |
| `cities/slatina.jpg`               | 1600×1067 | [Historic Building in Downtown Slatina, Romania](https://www.pexels.com/photo/32297104/) (Pexels) | Pexels contributor | [Pexels License](https://www.pexels.com/license/) |
| `cities/slobozia.jpg`              | 800×600   | placeholder (copy of `cities/placeholder.jpg`) — no free-license photo of Slobozia found on Pexels / Pixabay / Unsplash; needs manual sourcing | — | — |
| `cities/suceava.jpg`               | 1600×1067 | [The Fortress of Suceava Walls](https://pixabay.com/photos/the-fortress-of-suceava-2106720/) (Pixabay) | Pixabay contributor | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `cities/targu-mures.jpg`           | 1600×1067 | [Edifício de tijolos cinza (Târgu Mureș)](https://unsplash.com/photos/108876d35ce0) (Unsplash) | Unsplash contributor | [Unsplash License](https://unsplash.com/license) |
| `cities/tarnaveni.jpg`             | 800×600   | [Tarnaveni-PanoramicView.jpg](https://commons.wikimedia.org/wiki/File:Tarnaveni-PanoramicView.jpg) (Wikimedia Commons) | Olario | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) — cropped and downscaled from the original |
| `cities/timisoara.jpg`             | 800×600   | TBD | TBD | TBD |
| `cities/zalau.jpg`                 | 1600×1067 | [Zalau Transylvania The Church](https://pixabay.com/photos/zalau-transylvania-the-church-1004668/) (Pixabay) | Pixabay contributor | [Pixabay Content License](https://pixabay.com/service/license-summary/) |

### Hero

| File | Dimensions | Source | Author | License |
|---|---|---|---|---|
| `hero/transylvania-hero.jpg` | 1920×1080 | TBD | TBD | TBD |

### Interiors

| File | Dimensions | Source | Author | License |
|---|---|---|---|---|
| `interiors/carpathian-sunset.jpg` | 1920×1369 | TBD | TBD | TBD |
| `interiors/cozy-living.jpg`       | 1200×900  | TBD | TBD | TBD |
| `interiors/estate-heritage.jpg`   | 1920×1279 | TBD | TBD | TBD |
| `interiors/golden-vineyard.jpg`   | 1920×1440 | TBD | TBD | TBD |
| `interiors/heritage-hall.jpg`     | 1920×1433 | TBD | TBD | TBD |
| `interiors/luxury-living.jpg`     | 1200×1600 | TBD | TBD | TBD |
| `interiors/mansion-exterior.jpg`  | 1920×1080 | TBD | TBD | TBD |
| `interiors/modern-interior.jpg`   | 1200×900  | TBD | TBD | TBD |
| `interiors/modern-villa.jpg`      | 1920×1280 | TBD | TBD | TBD |
| `interiors/villa-exterior.jpg`    | 1200×900  | TBD | TBD | TBD |

### Nature

| File | Dimensions | Source | Author | License |
|---|---|---|---|---|
| `nature/carpathian-mountains.jpg` | 1920×1280 | TBD | TBD | TBD |
| `nature/cave-entrance.jpg`        | 1200×1200 | TBD | TBD | TBD |
| `nature/mountain-valley.jpg`      | 1920×1080 | TBD | TBD | TBD |
| `nature/river-mountains.jpg`      | 1920×1080 | TBD | TBD | TBD |
| `nature/salt-cave.jpg`            | 1200×1600 | TBD | TBD | TBD |

### Towns

| File | Dimensions | Source | Author | License |
|---|---|---|---|---|
| `towns/brasov.jpg`         | 1920×1280 | TBD | TBD | TBD |
| `towns/city-buildings.jpg` | 1920×1280 | TBD | TBD | TBD |
| `towns/sibiu-church.jpg`   | 1200×1200 | TBD | TBD | TBD |
| `towns/sighisoara.jpg`     | 1200×1600 | TBD | TBD | TBD |

## Revery (`apps/revery/public/images/**`)

These files are byte-identical copies of the matching `apps/landing/public/images/cities/*.jpg` files — the brands share the same city hero assets. Whatever Source / Author / License applies above also applies here.

| File | Mirrors |
|---|---|
| `cities/brasov.jpg`       | `apps/landing/public/images/cities/brasov.jpg` |
| `cities/cluj-napoca.jpg`  | `apps/landing/public/images/cities/cluj-napoca.jpg` |
| `cities/oradea.jpg`       | `apps/landing/public/images/cities/oradea.jpg` |
| `cities/reghin.jpg`       | `apps/landing/public/images/cities/reghin.jpg` |
| `cities/sibiu.jpg`        | `apps/landing/public/images/cities/sibiu.jpg` |
| `cities/sighisoara.jpg`   | `apps/landing/public/images/cities/sighisoara.jpg` |
| `cities/tarnaveni.jpg`    | `apps/landing/public/images/cities/tarnaveni.jpg` |
| `cities/targu-mures.jpg`  | `apps/landing/public/images/cities/targu-mures.jpg` |
| `cities/timisoara.jpg`    | `apps/landing/public/images/cities/timisoara.jpg` |

## Counts

- Landing: 34 images (5 castles · 9 cities · 1 hero · 10 interiors · 5 nature · 4 towns)
- Revery: 9 images (city heroes, mirroring landing)
- **Total: 43**
- Attributed: 8 (targu-mures, sighisoara, reghin, tarnaveni — each × both brands)
- TBD: 35

## License quick reference

- **CC0 / Unsplash License / Pexels License / Pixabay License**: free commercial use, no attribution required → just record Source so future maintainers can verify.
- **CC BY 4.0**: attribution required (author + license link + note any modification).
- **CC BY-SA 3.0 / 4.0** (and the Romanian CC BY-SA 3.0 RO used by some Wikimedia contributors): attribution required **and** derivative works must be share-alike.
- **Commissioned / stock license (Shutterstock, Adobe Stock, Getty, etc.)**: keep the license receipt and note the specific license terms (editorial vs commercial, redistribution, etc.).
- **Original work**: set Source to `own`, License to `own`. No further action.
