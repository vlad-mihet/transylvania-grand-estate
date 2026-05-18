// Public surface of the Academy admin module.
// Components and forms are imported via subpaths (e.g.
// "@/modules/academy/forms/course-form") to keep this barrel slim.

export { academyNavGroup } from "./nav";
export * from "./types";
export * from "./lib/constants";
export * from "./lib/validations";
export { pickTitle } from "./lib/pick-title";

// Hooks
export * from "./hooks/query-keys";
export * from "./hooks/use-academy-overview";
export * from "./hooks/use-academy-courses";
export * from "./hooks/use-academy-course-stats";
export * from "./hooks/use-academy-lessons";
