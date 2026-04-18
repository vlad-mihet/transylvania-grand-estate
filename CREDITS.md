# Image credits

Attribution tracking for bundled image assets under `apps/landing/public/images/` and `apps/reveria/public/images/`.

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

### Cities (800×600 hero format)

| File | Dimensions | Source | Author | License |
|---|---|---|---|---|
| `cities/brasov.jpg`       | 800×600 | TBD | TBD | TBD |
| `cities/cluj-napoca.jpg`  | 800×600 | TBD | TBD | TBD |
| `cities/oradea.jpg`       | 800×600 | TBD | TBD | TBD |
| `cities/reghin.jpg`       | 800×600 | [Reghin001.jpg](https://commons.wikimedia.org/wiki/File:Reghin001.jpg) (Wikimedia Commons) | Flavinhu | Public Domain — cropped (top two-thirds) and downscaled from the original |
| `cities/sibiu.jpg`        | 800×600 | TBD | TBD | TBD |
| `cities/targu-mures.jpg`  | 800×600 | [Palatul Culturii din Târgu Mureș 01.jpg](https://commons.wikimedia.org/wiki/File:Palatul_Culturii_din_T%C3%A2rgu_Mure%C8%99_01.jpg) (Wikimedia Commons) | Radueduard | [CC BY-SA 3.0 RO](https://creativecommons.org/licenses/by-sa/3.0/ro/deed.en) — cropped and downscaled from the original |
| `cities/sighisoara.jpg`   | 800×600 | [Panoramic Schäßburg Medieval Citadel (20903916345).jpg](https://commons.wikimedia.org/wiki/File:Panoramic_Sch%C3%A4%C3%9Fburg_Medieval_Citadel_(20903916345).jpg) (Wikimedia Commons) | Andrei-Daniel Nicolae | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) — cropped and downscaled from the original |
| `cities/tarnaveni.jpg`    | 800×600 | [Tarnaveni-PanoramicView.jpg](https://commons.wikimedia.org/wiki/File:Tarnaveni-PanoramicView.jpg) (Wikimedia Commons) | Olario | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) — cropped and downscaled from the original |
| `cities/timisoara.jpg`    | 800×600 | TBD | TBD | TBD |

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

## Reveria (`apps/reveria/public/images/**`)

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
- Reveria: 9 images (city heroes, mirroring landing)
- **Total: 43**
- Attributed: 8 (targu-mures, sighisoara, reghin, tarnaveni — each × both brands)
- TBD: 35

## License quick reference

- **CC0 / Unsplash License / Pexels License / Pixabay License**: free commercial use, no attribution required → just record Source so future maintainers can verify.
- **CC BY 4.0**: attribution required (author + license link + note any modification).
- **CC BY-SA 3.0 / 4.0** (and the Romanian CC BY-SA 3.0 RO used by some Wikimedia contributors): attribution required **and** derivative works must be share-alike.
- **Commissioned / stock license (Shutterstock, Adobe Stock, Getty, etc.)**: keep the license receipt and note the specific license terms (editorial vs commercial, redistribution, etc.).
- **Original work**: set Source to `own`, License to `own`. No further action.
