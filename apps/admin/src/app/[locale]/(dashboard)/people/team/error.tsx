"use client";

import { RouteError } from "@/components/shared/route-error";

export default function UsersError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} resource="Users" />;
}
