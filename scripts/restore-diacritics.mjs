// restore-diacritics.mjs
//
// Restores Romanian diacritics inside `ro: "..."` / `ro: '...'` string
// literals in @tge/data seed files. Only touches ro-labeled fields; never
// touches en / fr / de fields or code identifiers. Proper nouns that take
// no diacritics (Cluj-Napoca, Bihor, Oradea) are preserved — they're not
// in the mapping.
//
// Usage:
//   node scripts/restore-diacritics.mjs [--check]
//     --check : exit 1 if any replacements would happen; no write.
//     (default): apply replacements and write.
//
// The mapping below is curated from actual vocabulary in the seed files.
// If you add seed content with new ASCII-suspect words, extend the mapping.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const TARGET_FILES = [
  "packages/data/src/properties.ts",
  "packages/data/src/developers.ts",
  "packages/data/src/testimonials.ts",
  "packages/data/src/articles.ts",
].map((p) => path.join(REPO_ROOT, p));

// Word-level substitutions. Case-sensitive — keys must exactly match
// the ASCII-only variant as it appears in source. The script replaces
// whole words (\b boundaries) only inside ro: "..." values.
//
// Proper-noun rules baked in:
//   - Brasov → Brașov, Muresan → Mureșan, Carpati → Carpați, Munții, Piața
//   - Romania → România (always takes the circumflex â)
//   - Cluj-Napoca, Bihor, Oradea, Sibiu — no diacritics; not in map.
// ONLY unambiguous substitutions — words that take the same diacritic
// regardless of whether the surrounding grammatical form is definite or
// indefinite. Words like `vila` / `terasa` / `casa` / `piscina` are
// intentionally excluded because they're legitimate definite-article
// forms of `vilă` / `terasă` / `casă` / `piscină`; restoring those
// mechanically breaks running prose like "de pe terasa" ("from THE
// terrace"). Those cases are handled manually below the script run.
const MAP = {
  // Place names — always take diacritics
  Brasov: "Brașov",
  Carpati: "Carpați",
  Muntii: "Munții",
  Piata: "Piața",
  Romania: "România",
  transilvaneana: "transilvăneană",
  Mures: "Mureș",
  Muresan: "Mureșan",
  Muresanu: "Mureșanu",
  Arges: "Argeș",
  Hateg: "Hațeg",
  Bucuresti: "București",
  Iasi: "Iași",

  // Prepositions / adverbs — invariant
  langa: "lângă",
  pana: "până",

  // Verbs / past participles — invariant
  ingrijit: "îngrijit",
  ingrijite: "îngrijite",
  ingrijita: "îngrijită",
  intins: "întins",
  Intins: "Întins",
  intinsa: "întinsă",
  invecinate: "învecinate",
  incalzire: "încălzire",
  Incalzire: "Încălzire",
  proportionate: "proporționate",
  mostenire: "moștenire",
  Mostenire: "Moștenire",
  inchiriere: "închiriere",
  Inchiriere: "Închiriere",
  cumparare: "cumpărare",
  Cumparare: "Cumpărare",
  cumpara: "cumpără",
  vazut: "văzut",
  stiu: "știu",

  // Root-only feminine adjectives — `-ă`/`-a` variation doesn't apply
  // (both indefinite AND definite have the same diacritic because the
  // root vowel is what changes).
  arhitectura: "arhitectură",
  Arhitectura: "Arhitectură",
  arhitecturala: "arhitecturală",
  arhitecturale: "arhitecturale",
  traditionala: "tradițională",
  Traditionala: "Tradițională",
  traditional: "tradițional",
  Traditional: "Tradițional",
  traditionale: "tradiționale",
  traditie: "tradiție",
  Traditie: "Tradiție",
  traditii: "tradiții",
  combinatie: "combinație",
  Combinatie: "Combinație",
  combinatii: "combinații",
  constructie: "construcție",
  Constructie: "Construcție",
  constructii: "construcții",
  Constructii: "Construcții",
  contemporana: "contemporană",
  Contemporana: "Contemporană",
  frontala: "frontală",
  capodopera: "capodoperă",
  Capodopera: "Capodoperă",
  tamplarie: "tâmplărie",

  // Plurals and abstract nouns — invariant
  gradini: "grădini",
  Gradini: "Grădini",
  dobanzi: "dobânzi",
  Dobanzi: "Dobânzi",
  satesc: "sătesc",
  stramos: "strămoș",
  Stramos: "Strămoș",
  stramosi: "strămoși",
  oras: "oraș",
  Oras: "Oraș",
  orase: "orașe",
  orasul: "orașul",
  Orasul: "Orașul",
  acoperis: "acoperiș",
  santier: "șantier",
  Santier: "Șantier",
  santiere: "șantiere",
  inconjurator: "înconjurător",
  inconjuratoare: "înconjurătoare",
  privelisti: "priveliști",
  priveliste: "priveliște",
  sufrageria: "sufrageria",

  // Amenajat/ă — "landscaped / fitted"
  amenajata: "amenajată",
  Amenajata: "Amenajată",
  amenajate: "amenajate",
};

// Multi-word exact phrase replacements — applied ONLY as whole-string or
// whole-substring matches inside ro values. These are safer than the
// word-level MAP because we control the full grammatical context.
// Covers feature labels, image alts, and unambiguous prose patterns.
const PHRASES = [
  // Feature labels (whole-string)
  ["Terasa Panoramică", "Terasă Panoramică"],
  ["Terasa pe Acoperiș", "Terasă pe Acoperiș"],
  ["Terasa Acoperită", "Terasă Acoperită"],
  ["Terasa cu Verdeață", "Terasă cu Verdeață"],
  ["Terasa Dining Acoperită", "Terasă Dining Acoperită"],
  ["Terasa Privată pe Acoperiș", "Terasă Privată pe Acoperiș"],
  ["Terasa panoramică", "Terasă panoramică"],
  ["Terasa pe malul apei", "Terasă pe malul apei"],
  ["Terasa verde", "Terasă verde"],
  ["Biblioteca cu Lambriuri de Stejar", "Bibliotecă cu Lambriuri de Stejar"],
  ["Casa de Piscina", "Casă de Piscină"],
  ["Casa de Oaspeți", "Casă de Oaspeți"],
  ["Camera cu candelabru de cristal", "Cameră cu candelabru de cristal"],
  ["Camera de Tratament", "Cameră de Tratament"],
  ["Camera pentru Echipament", "Cameră pentru Echipament"],
  ["Camera de Degustare", "Cameră de Degustare"],
  ["Piscina Infinity", "Piscină Infinity"],
  ["Piscina Infinity Încălzită", "Piscină Infinity Încălzită"],
  ["Piscina Exterioară Încălzită", "Piscină Exterioară Încălzită"],
  ["Piscina Încălzită", "Piscină Încălzită"],
  ["Piscina Interioară", "Piscină Interioară"],
  ["Piscina cu Margine Infinită", "Piscină cu Margine Infinită"],
  ["Piscina Naturală", "Piscină Naturală"],
  ["Piscina de 25m", "Piscină de 25m"],
  ["Piscina și grădină", "Piscină și grădină"],
  ["Piscina naturală și grădină", "Piscină naturală și grădină"],
  ["Piscina și terasa", "Piscină și terasă"],
  ["Grădină și terasa", "Grădină și terasă"],
  ["Zona wellness cu piscina", "Zona wellness cu piscină"],
  ["Vila Modernă de Lux", "Vilă Modernă de Lux"],
  ["Vila Refugiu pe Malul Lacului", "Vilă Refugiu pe Malul Lacului"],
  ["Casa Familială Modernă", "Casă Familială Modernă"],

  // Indefinite-article prose patterns (after "o"/"O"/"această"/"Această")
  ["O vila", "O vilă"],
  ["o vila", "o vilă"],
  ["această vila", "această vilă"],
  ["Această vila", "Această vilă"],
  ["o piscina", "o piscină"],
  ["o terasa", "o terasă"],

  // Feature phrases — "piscină <adj>" patterns
  ["piscina infinity", "piscină infinity"],
  ["piscina încălzită", "piscină încălzită"],
  ["piscina exterioară încălzită", "piscină exterioară încălzită"],
  ["piscina interioară", "piscină interioară"],
  ["cu piscina\"", "cu piscină\""], // trailing quote guard for short alts
  ["și piscina în", "și piscină în"],

  // "camera de degustare" — tasting room (indefinite natural here)
  ["camera de degustare", "cameră de degustare"],

  // "ultima generație" — latest generation (adj + fem noun, both indefinite)
  ["de ultima generație", "de ultimă generație"],

  // "de avangarda" → "de avangardă" (indefinite after "de")
  ["de avangarda", "de avangardă"],

  // Vila at start of description (sentence-initial, indefinite topic)
  ["Vila contemporană", "Vilă contemporană"],
  ["Vila serenă", "Vilă serenă"],
  ["Vila orientată", "Vilă orientată"],
  ["Vila familială", "Vilă familială"],
  ["Vila rafinată", "Vilă rafinată"],
  ["vila familială", "vilă familială"],
  ["vila serenă", "vilă serenă"],
  ["vila rafinată", "vilă rafinată"],

  // Casă familială in prose
  ["Casa familială", "Casă familială"],

  // Terasa în feature contexts after "și/și o/cu" where context is indefinite
  // (kept narrow — only in apparent feature lists)
  ["și terasa în centrul", "și terasă în centrul"],
  ["terasa posterioară", "terasă posterioară"],
  ["terasa verde", "terasă verde"],
  ["terasa privată", "terasă privată"],
  ["și grădină amenajată", "și grădină amenajată"], // already ok — no change
];

function applyReplacements(source) {
  const reRo = /ro:\s*(['"])((?:\\.|[^\\])*?)\1/g;
  let total = 0;
  const changedValues = [];

  const out = source.replace(reRo, (full, quote, value) => {
    let newValue = value;
    let localCount = 0;
    // Phase 1: phrase-level substitutions (higher precedence — exact match)
    for (const [from, to] of PHRASES) {
      if (from === to) continue;
      const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "g");
      newValue = newValue.replace(re, () => {
        localCount += 1;
        return to;
      });
    }
    // Phase 2: word-level substitutions (invariant words)
    for (const [ascii, diac] of Object.entries(MAP)) {
      if (ascii === diac) continue;
      if (ascii.endsWith("_")) continue;
      const re = new RegExp(`\\b${ascii}\\b`, "g");
      newValue = newValue.replace(re, (_m) => {
        localCount += 1;
        return diac;
      });
    }
    if (localCount > 0) {
      total += localCount;
      changedValues.push({ from: value, to: newValue, count: localCount });
      return `ro: ${quote}${newValue}${quote}`;
    }
    return full;
  });

  return { out, total, changedValues };
}

function main() {
  const check = process.argv.includes("--check");
  let grandTotal = 0;

  for (const file of TARGET_FILES) {
    const src = fs.readFileSync(file, "utf8");
    const { out, total, changedValues } = applyReplacements(src);
    grandTotal += total;
    const rel = path.relative(REPO_ROOT, file);
    console.log(
      `${rel}: ${total} substitution${total === 1 ? "" : "s"} in ${changedValues.length} ro-field${changedValues.length === 1 ? "" : "s"}`,
    );
    for (const cv of changedValues.slice(0, 4)) {
      console.log(`  - ${cv.from.slice(0, 80)}${cv.from.length > 80 ? "…" : ""}`);
      console.log(`  → ${cv.to.slice(0, 80)}${cv.to.length > 80 ? "…" : ""}`);
    }
    if (changedValues.length > 4) {
      console.log(`  … and ${changedValues.length - 4} more`);
    }
    if (!check && total > 0) {
      fs.writeFileSync(file, out, "utf8");
    }
  }

  console.log(
    `\nTotal: ${grandTotal} substitution${grandTotal === 1 ? "" : "s"}${check ? " (check mode — not written)" : " (written)"}`,
  );

  if (check && grandTotal > 0) process.exit(1);
}

main();
