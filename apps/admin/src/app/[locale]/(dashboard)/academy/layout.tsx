import { type ReactNode } from "react";

/**
 * Academy workspace layout. The Academy chrome (dark workspace sidebar +
 * brand block) is rendered up the tree by `(dashboard)/layout.tsx`, which
 * swaps sidebars based on pathname. This layout exists so future Academy-
 * wide chrome (sub-headers, quick-action bar) has a stable mount point
 * without re-touching the dashboard layout.
 */
export default function AcademyWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
