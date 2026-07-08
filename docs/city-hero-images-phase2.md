# City hero images — Phase 2 checklist (licensed finals)

Status after Phase 1 (PR #30, 2026-07-06): every city renders a hero on both
brands via `CityBrand.image` overrides seeded from
`packages/data/src/cities.ts`. The live files are **Claudiu's low-res WhatsApp
copies** — first-pass only. This document tracks the swap to licensed,
high-res finals. Source of truth for the mapping:
`orase-images-manifest.json` in the Cowork handoff folder
(`Documents/Claude/Projects/Transylvania Grand/orase-mapping/`).

## ⚠️ Licensing caveat (communicate to Claudiu)

Per the manifest's provenance research, many WhatsApp originals are
copyrighted (Shutterstock/Adobe/Dreamstime stock, romaniatourism promos, a
ProTV news photo, a hotel-listing photo). They are live as a stopgap by
explicit decision (2026-07-06) — Phase 2 should follow promptly.

## How to swap a final in

1. Download/purchase the asset per the tables below.
2. Downscale to ≤ 2560 px long edge, re-encode JPEG (≤ 5 MB, ideally ≤ 1 MB).
3. Overwrite `packages/assets/public/images/cities/{tge|revery}/<slug>.jpg`
   (same filename → **no DB/seed change needed**; images ship with the next
   frontend build/deploy).
4. Record attribution (section below) when the license requires it.

## Buy-stock slots (Vlad purchases, ~9 slots)

| City | Brand | Link |
|---|---|---|
| Cluj-Napoca | tge | shutterstock.com/image-photo/clujnapoca-romania-october-13-2018-city-1320062051 (premium alt: stock.adobe.com/images/aerial-view-of-cluj-napoca-romania/142178162) |
| Bistrița | tge | shutterstock.com/image-photo/drone-view-bistrita-city-nasaud-county-1180051111 — **no fallback WhatsApp file; base curated image is live** |
| Târgu Mureș | tge | shutterstock.com/image-photo/drone-view-medieval-fortress-targu-mures-1248518092 |
| Constanța | tge | stock.adobe.com/images/beautiful-summer-landscape-with-old-casino-symbol-of-the-constanta-city-romanian-coastal-destination-at-the-black-sea/112474362 |
| Craiova | tge | stock.adobe.com/images/craiova-romania-aerial-view/209326173 |
| Sighișoara | tge | shutterstock.com/image-photo/panoramic-view-over-cityscape-roof-architecture-428692021 |
| Brăila | revery | stock.adobe.com/search?k=braila (pick a cityscape) |
| Craiova | revery | shutterstock.com/search/craiova (pick a cityscape) |
| Giurgiu | revery | dreamstime.com/photos-images/giurgiu.html (free alt: Wikimedia "Turnul cu Ceas") |

## Free finals to download (~24 slots)

`use_free_original` (Claudiu's own source is free): oradea (tge+revery, Pixabay),
arad (tge+revery, Pixabay), sibiu (tge+revery, Pixabay),
drobeta-turnu-severin (revery, Wikimedia CC BY-SA).

`use_curated_free` (vetted replacement): cluj-napoca (revery, Unsplash),
bistrita (revery, Wikimedia), timisoara (revery, Unsplash), iasi (revery,
Unsplash), targu-mures (revery, Wikimedia), alba-iulia (revery, Pexels),
brasov (revery, Unsplash), deva (revery, Wikimedia), galati (revery,
Wikimedia — verify ≥1920px), miercurea-ciuc (revery, Wikimedia), suceava
(revery, Wikimedia), tulcea (revery, Wikimedia), sighisoara (revery, Pexels),
buftea (revery, Wikimedia — Știrbei Palace, NOT the Bucharest one), buzau
(revery, Wikimedia), calarasi (revery, Wikimedia), slatina (revery,
Wikimedia), slobozia (revery, Wikimedia — verify res, else buy), sebes
(revery, Wikimedia).

Exact URLs per slot: see `final_asset_url` in `orase-images-manifest.json`.

## Attribution TODO (required for Wikimedia CC BY-SA)

When a Wikimedia asset goes live, add author + license to **both**:
- `CREDITS.md` (repo root, per-file tables)
- `apps/revery/public/image-credits.txt` (footer-linked, user-facing)

Pixabay/Pexels/Unsplash need no attribution but note the source in
`CREDITS.md` anyway (existing convention).

## Known discrepancies (flag to Claudiu)

- **Constanța**: his mapping is TGE-only, but the DB tags it for both brands —
  it stays visible on Adorys with the base curated image. De-tagging would be
  a destructive data change; decide separately.
- **Adorys Cluj-Napoca** WhatsApp copy is portrait (720×1280) and
  **Drobeta-Turnu Severin** is 330×246 — the two ugliest stopgaps; prioritize
  their finals.
- **Iași**: Claudiu's original showed Roznovanu Palace; the curated free final
  is the Palace of Culture.

## Round-2 demo placeholders — BUY + SWAP after the demo

Shipped 2026-07-08 (branch `feat/orase-round2-demo-heroes`). Claudiu's Round-2
staged copies were applied **as a demo stopgap by explicit decision** to get the
correct subject live now. **These 6 are copyright-gray stock previews — not
cleared for reuse.** Buy the exact original (or a clean alt) and overwrite the
same base file (`packages/assets/public/images/cities/<slug>.jpg`; Bistrița also
`.../revery/bistrita.jpg`) — filename unchanged, no re-seed. Full provenance in
`orase-images/orase-round2-originals.json`.

| City | Brand | Live now (placeholder) | Buy exact original |
|---|---|---|---|
| București | Adorys | Palace of Parliament, sunset | Shutterstock #1102419524 (iStock gm966486626 / Adobe #207319769) |
| Bacău | Adorys | Ștefan cel Mare statue + cathedral | Shutterstock #1729397695 / #867634054 |
| Baia Mare | Adorys | Orthodox cathedral | Shutterstock #2621111247 (iStock gm2212894484) |
| Reșița | Adorys | Valley cityscape | Shutterstock #1081038752 (iStock gm1125885680) |
| Târgoviște | Adorys | Princely Court ruins, aerial | iStock gm539853834 (Adobe #109171021) |
| Bistrița | TGE | Sunrise aerial old-town | Shutterstock #650103832 |

Tip: a one-month Shutterstock/Adobe subscription covers the whole batch cheaper
than à-la-carte.

Also demo-grade (upgrade later, not in the buy list above):
- **Sfântu Gheorghe** (Adorys): staged copy is a **gray tourism-board promo** —
  source a clean central-square stock (fountain + clock tower) or a free
  Wikimedia alt (`Sfântu Gheorghe` / `Sepsiszentgyörgy`) + attribution.
- **Vaslui** (Adorys): **left unchanged** — kept the existing County-Council +
  Ștefan-cel-Mare-statue landmark (Wikimedia CC BY-SA 3.0, already credited).
  Every free `Category:Views_of_Vaslui` alt was a downgrade. Optional future
  upgrade: a purchased Ștefan-cel-Mare-statue hero.

Cleared free finals shipped this round (no purchase needed):
- **Zalău** (TGE+Adorys): Wikimedia **Public-domain** Reformed Church
  (`File:Reformed_Church,_2006_Zilah_009.jpg`, Mtomi). Attributed in
  `apps/revery/public/image-credits.txt`.
