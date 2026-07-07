# Round 2 addendum (2026-07-06 batch) — extends HANDOFF-orase-images.md

New WhatsApp batch from Claudiu (RO thread 06/07, plus NL-thread items). Read this alongside the original handoff.

## A. New city images (9) — DO NOT SEED

Claudiu sent 9 more: **Adorys** → București, Bacău, Baia Mare, Reșița, Vaslui, Sfântu Gheorghe, Târgoviște; **TGE** → Bistrița, Zalău. Files in `more-to-do/`.

Same situation as Round 1, and the same call:
- **All 9 cities already exist as records and already have curated, credited images live** (they're in the 44/45 set already deployed).
- Claudiu's new sends are low-res and would regress the live sites: București `1600×1000` is the best of them; Bacău / Baia Mare / Reșița / Sfântu Gheorghe / Târgoviște are all `675×390`; Zalău is a `250×187` `.webp`; and **Vaslui is not an image at all — it's a saved Google Photos HTML page (`00000960-Vaslui 2.html`), no usable file.**
- **Action: keep the live images. Do not overwrite any of them.** Optionally add these to the "his-picks vs live" comparison so Claudiu can see his versions are lower quality and self-select out.

## B. Site / brand tweaks (actionable)

1. **Adorys Contact page** — add a location line `Cluj-Napoca, Cluj, România` next to the phone + email, matching the TGE contact block. (trivial)
2. **Privacy Policy email** — Claudiu says the address under "Politica de confidențialitate" is still a `privacy@…`. Change it to the agreed contact address (confirm with Vlad which). Same family as the known "Adorys contact still shows a Revery email" issue.
3. **Recruitment mailboxes** — create `cariere@tge.ro` and `cariere@adorys.ro`. Mail/DNS task, not code.
4. **TGE sigil placement** — Claudiu's brass "TGE diamond" plaque (`more-to-do/00000948-*.jpg` and `00000938-*.jpg`; NL-thread `00000099`) goes at the **top of the page + on the homepage**; **keep the current footer logo unchanged.** Caveat for Vlad: the supplied file is a 1024px raster mockup, not a vector — acceptable as a decorative hero, but it will not stay crisp if used as the scalable primary mark. Get a vector before it becomes the main logo.
5. **Fake-listing disclaimer** (from NL thread 27/05, still open) — overlay text on property images stating they are examples, not real listings. Consumer-protection; ship before the sites take real traffic.

## C. NOT for Claude Code — Vlad decisions

- **TGE video soundtrack** (already exists — not a new task): TGE already has a promo video with music (Claude Code produced it and merged the track). Claudiu's 06/07 message is just proposing a specific Mozart piece (~6 min, full) as the soundtrack — a taste call, not new work. One flag if you do swap it: Mozart's *composition* is public domain, but a specific *recording* (including the YouTube one) is copyrighted — use a public-domain / royalty-free recording (e.g. Musopen) rather than ripping the YouTube performance.
- **Agent collaboration contract** — relaxed TGE tier + specific clause cuts. Legal, Vlad's call. Source file: `more-to-do/00000605-Contract colaborare Transylvania Grand SRL.doc`.
- **Security** — plaintext credentials are sitting in both chat logs (`claudiu@transylvaniagrandestate.ro` / `ClaudiuTGE123…`, and the REBS login). Rotate them; do not reuse.
