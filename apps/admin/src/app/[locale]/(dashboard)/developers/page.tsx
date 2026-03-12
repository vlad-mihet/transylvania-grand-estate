"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { DataTable, ColumnDef } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { QueryError } from "@/components/shared/query-error";
import { Button, Switch } from "@tge/ui";
import { Pencil, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface Developer {
  id: string;
  name: string;
  slug: string;
  logo: string;
  city: string;
  projectCount: number;
  featured: boolean;
}

export default function DevelopersPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const t = useTranslations("Developers");
  const tc = useTranslations("Common");

  const { data: developers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["developers"],
    queryFn: () => apiClient<Developer[]>("/developers"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/developers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["developers"] });
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      apiClient(`/developers/${id}`, { method: "PATCH", body: { featured } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["developers"] }),
    onError: () => {
      toast.error(tc("featuredError"));
      queryClient.invalidateQueries({ queryKey: ["developers"] });
    },
  });

  const columns: ColumnDef<Developer, any>[] = [
    {
      accessorKey: "logo",
      header: "",
      enableSorting: false,
      cell: ({ getValue }) => {
        const src = getValue() as string | null;
        return src ? (
          <Image src={src} alt="Logo" width={40} height={40} className="rounded" />
        ) : (
          <div className="h-[40px] w-[40px] rounded bg-muted" />
        );
      },
    },
    { accessorKey: "name", header: t("columnName") },
    { accessorKey: "city", header: t("columnCity") },
    { accessorKey: "projectCount", header: t("columnProjects") },
    {
      accessorKey: "featured",
      header: t("columnFeatured"),
      cell: ({ row }) => (
        <Switch
          checked={row.original.featured}
          onCheckedChange={(checked) =>
            toggleFeatured.mutate({ id: row.original.id, featured: checked })
          }
        />
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/developers/${row.original.id}`}>
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
        description={t("count", { count: developers.length })}
        createHref="/developers/new"
        createLabel={t("addDeveloper")}
      />
      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : (
        <DataTable columns={columns} data={developers} />
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
