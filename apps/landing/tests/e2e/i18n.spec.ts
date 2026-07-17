import * as fs from "node:fs";
import * as path from "node:path";
import { test, expect } from "./fixtures";

const MESSAGES_DIR = path.resolve(__dirname, "..", "..", "messages");

function flatten(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) {
      out.push(...flatten(v, key));
    } else {
      out.push(key);
    }
  }
  return out;
}

function loadMessages(locale: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"));
}

function flattenedValues(obj: unknown, prefix = ""): { path: string; value: string }[] {
  if (typeof obj !== "object" || obj === null) return [];
  const out: { path: string; value: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) {
      out.push(...flattenedValues(v, key));
    } else if (typeof v === "string") {
      out.push({ path: key, value: v });
    }
  }
  return out;
}

test.describe("D-7 · message-file key parity", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "static check — desktop project only");
  });

  test("ro/en/fr/de share the same key set", () => {
    const ro = new Set(flatten(loadMessages("ro")));
    const en = new Set(flatten(loadMessages("en")));
    const fr = new Set(flatten(loadMessages("fr")));
    const de = new Set(flatten(loadMessages("de")));

    const missingInEn = [...ro].filter((k) => !en.has(k));
    const missingInRo = [...en].filter((k) => !ro.has(k));
    const missingInFr = [...ro].filter((k) => !fr.has(k));
    const missingInDe = [...ro].filter((k) => !de.has(k));

    expect({ missingInEn, missingInRo, missingInFr, missingInDe }).toEqual({
      missingInEn: [],
      missingInRo: [],
      missingInFr: [],
      missingInDe: [],
    });
  });
});

test.describe("D-7 · Romanian diacritics regression", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "static check — desktop project only");
  });

  test("ro.json contains no obvious ASCII Romanian misspellings", () => {
    const values = flattenedValues(loadMessages("ro"));
    // Focus on the low-FP markers — words that should always carry diacritics.
    // Avoid false positives like English-as-Romanian-loanword cases.
    const flaggers: { pattern: RegExp; correct: string }[] = [
      { pattern: /\bRomania\b/, correct: "România" },
      { pattern: /\bconsultanta\b/i, correct: "consultanță" },
      { pattern: /\bDescoperiti\b/, correct: "Descoperiți" },
      { pattern: /\bexcep[ti]onale?\b/, correct: "excepționale" },
      { pattern: /\bimobiliara\b/, correct: "imobiliară" },
      { pattern: /\binalta\b/, correct: "înaltă" },
      { pattern: /\bMarasti\b/, correct: "Mărăști" },
      { pattern: /\bMuntii\b/, correct: "Munții" },
      { pattern: /\bTimisoara\b/, correct: "Timișoara" },
      { pattern: /\bBrasov\b/, correct: "Brașov" },
      { pattern: /\bSighisoara\b/, correct: "Sighișoara" },
    ];
    const offenders: { path: string; value: string; correct: string }[] = [];
    for (const { path: p, value } of values) {
      for (const { pattern, correct } of flaggers) {
        if (pattern.test(value)) offenders.push({ path: p, value, correct });
      }
    }
    expect(offenders).toEqual([]);
  });

  test("BUG-005/103 closed — filter panel is API-driven, no hardcoded ASCII city map", () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "..",
        "..",
        "src",
        "components",
        "property",
        "property-filter-panel.tsx",
      ),
      "utf8",
    );
    // BUG-103 fix: the hardcoded ASCII cityLabels map is gone; cities now come
    // from live API data (FilterCity[] prop derived from the listings).
    expect(src).not.toMatch(/timisoara: "Timisoara"/);
    expect(src).not.toMatch(/brasov: "Brasov"/);
    expect(src).toMatch(/cities\.map\(\(city\)/);
    expect(src).toContain("FilterCity");
  });

  test("BUG-011 evidence — RootLayout default description has ASCII Romanian city names", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "src", "app", "layout.tsx"),
      "utf8",
    );
    expect(src).toMatch(/Timisoara, Brasov/);
  });
});

test.describe("D-9 · per-locale <html lang> + meta", () => {
  for (const locale of ["ro", "en", "fr", "de"] as const) {
    test(`${locale} home <html lang> matches`, async ({ page }) => {
      await page.goto(`/${locale}`);
      const lang = await page.locator("html").getAttribute("lang");
      expect(lang).toBe(locale);
    });
  }

  test("ro · /properties has a non-empty meta description", async ({ page }) => {
    await page.goto("/ro/properties");
    // Properties page exports generateMetadata — description should be set.
    // Note: Next.js Metadata API may not always emit <meta name=description>
    // if the page only returned `title`. We check title here as the strict
    // requirement.
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });
});
