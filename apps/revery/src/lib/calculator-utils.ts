// Shim: the calculator surface lives under `./calculators/`. This re-export
// keeps existing `@/lib/calculator-utils` imports working while callers are
// migrated over time.
export * from "./calculators";
