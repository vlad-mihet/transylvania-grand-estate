"use client";

import { RouteError } from "@/components/shared/route-error";

export default function CountiesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} resource="Counties" />;
}
