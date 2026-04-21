"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { Action, OwnershipResource } from "@/lib/permissions";

interface CanProps {
  action: Action;
  resource?: OwnershipResource;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditional render based on the signed-in user's permissions. Supports
 * ownership checks via the optional `resource` prop (the AGENT role is
 * limited to records where `resource.agentId === session.agentId`).
 *
 *   <Can action="property.delete" resource={property}>
 *     <DeleteButton />
 *   </Can>
 */
export function Can({ action, resource, children, fallback = null }: CanProps) {
  const { can } = useAuth();
  return <>{can(action, resource) ? children : fallback}</>;
}
