"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { DataTable, ColumnDef } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { QueryError } from "@/components/shared/query-error";
import { Button } from "@tge/ui";
import { Pencil, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface City {
  id: string;
  name: string;
  slug: string;
  image: string;
  propertyCount: number;
}

export default function CitiesPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const t = useTranslations("Cities");

  const { data: cities = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["cities"],
    queryFn: () => apiClient<City[]>("/cities"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/cities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const columns: ColumnDef<City, any>[] = [
    {
      accessorKey: "image",
      header: "",
      enableSorting: false,
      cell: ({ getValue }) => {
        const src = getValue() as string | null;
        return src ? (
          <Image
            src={src}
            alt=""
            width={80}
            height={60}
            className="rounded object-cover"
            style={{ width: 80, height: 60 }}
          />
        ) : (
          <div className="h-[60px] w-[80px] rounded bg-muted" />
        );
      },
    },
    { accessorKey: "name", header: t("columnName") },
    { accessorKey: "slug", header: t("columnSlug") },
    { accessorKey: "propertyCount", header: t("columnProperties") },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/cities/${row.original.id}`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(row.original.id)}>
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
        description={t("count", { count: cities.length })}
        createHref="/cities/new"
        createLabel={t("addCity")}
      />
      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : (
        <DataTable columns={columns} data={cities} />
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
