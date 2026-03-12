"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button, Card, CardContent } from "@tge/ui";
import { useTranslations } from "next-intl";

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryError({ message, onRetry }: QueryErrorProps) {
  const t = useTranslations("Common");

  return (
    <Card className="border-destructive/20">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-destructive/60" />
        <p className="text-sm font-medium text-destructive">
          {message ?? t("loadError")}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onRetry}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {t("tryAgain")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
