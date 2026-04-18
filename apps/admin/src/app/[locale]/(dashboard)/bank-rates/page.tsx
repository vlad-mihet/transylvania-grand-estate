"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { DataTable, ColumnDef } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { QueryError } from "@/components/shared/query-error";
import { Button, Badge } from "@tge/ui";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface BankRate {
  id: string;
  bankName: string;
  rate: number;
  rateType: string;
  maxLtv: number | null;
  maxTermYears: number | null;
  processingFee: number | null;
  insuranceRate: number | null;
  active: boolean;
  sortOrder: number;
  updatedAt: string;
}

const rateTypeLabels: Record<string, string> = {
  fixed: "Fixed",
  variable: "Variable",
  govt_program: "Govt. Program",
};

export default function BankRatesPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const t = useTranslations("BankRates");

  const { data: bankRates = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["bank-rates"],
    queryFn: () => apiClient<BankRate[]>("/financial-data/bank-rates?all=true"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/financial-data/bank-rates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-rates"] });
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const columns: ColumnDef<BankRate, unknown>[] = [
    {
      accessorKey: "bankName",
      header: t("columnBank"),
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "rate",
      header: t("columnRate"),
      cell: ({ getValue }) => `${(getValue() as number).toFixed(2)}%`,
    },
    {
      accessorKey: "rateType",
      header: t("columnType"),
      cell: ({ getValue }) => {
        const type = getValue() as string;
        return (
          <Badge variant={type === "govt_program" ? "default" : "outline"} className="text-xs">
            {rateTypeLabels[type] ?? type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "active",
      header: t("columnActive"),
      cell: ({ getValue }) =>
        getValue() ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        ),
    },
    {
      accessorKey: "sortOrder",
      header: t("columnOrder"),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/bank-rates/${row.original.id}`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteId(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        description={t("count", { count: bankRates.length })}
        createHref="/bank-rates/new"
        createLabel={t("addBankRate")}
      />
      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={bankRates}
          mobileCard={(rate) => (
            <div className="rounded-xl border border-copper/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{rate.bankName}</p>
                  <p className="text-xs text-muted-foreground">
                    {rateTypeLabels[rate.rateType] ?? rate.rateType}
                  </p>
                </div>
                <span className="text-lg font-semibold">{rate.rate.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-copper/[0.06]">
                <Badge variant={rate.active ? "default" : "outline"} className="text-xs">
                  {rate.active ? t("columnActive") : "Inactive"}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/bank-rates/${rate.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(rate.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        />
      )}
      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t("deleteTitle")}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
