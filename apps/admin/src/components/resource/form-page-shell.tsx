"use client";

import type { ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";

interface FormPageShellProps {
  title: string;
  description?: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Thin layout for `new` + `[id]/edit` pages. Standardises the page-header +
 * form spacing so pages stop hand-rolling `<div className="space-y-6"><PageHeader
 * …/>…</div>` every time. Unsaved-changes warnings live on the form component
 * itself (via `useUnsavedChangesWarning(form.formState.isDirty)`) since only
 * the form knows its own dirty state.
 */
export function FormPageShell({
  title,
  description,
  breadcrumb,
  actions,
  children,
}: FormPageShellProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumb={breadcrumb}
        actions={actions}
      />
      {children}
    </div>
  );
}
