"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { DataTable, ColumnDef } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { QueryError } from "@/components/shared/query-error";
import { Button, Switch } from "@tge/ui";
import { Pencil, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { formatPrice } from "@tge/utils";
import { useTranslations, useLocale } from "next-intl";

interface Property {
  id: string;
  slug: string;
  title: { en: string; ro: string };
  city: string;
  type: string;
  status: string;
  price: number;
  currency: string;
  featured: boolean;
  images: { src: string; alt: string; isHero: boolean }[];
}

export default function PropertiesPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const t = useTranslations("Properties");
  const tf = useTranslations("PropertyForm");
  const tc = useTranslations("Common");
  const locale = useLocale();

  const { data: result, isLoading, isError, refetch } = useQuery({
    queryKey: ["properties"],
    queryFn: () => apiClient<Property[]>("/properties?limit=100"),
  });

  const properties: Property[] = Array.isArray(result) ? result : [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/properties/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      apiClient(`/properties/${id}`, {
        method: "PATCH",
        body: { featured },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["properties"] }),
    onError: () => {
      toast.error(tc("featuredError"));
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  const columns: ColumnDef<Property, any>[] = [
    {
      accessorKey: "images",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const hero = row.original.images?.find((i) => i.isHero) ?? row.original.images?.[0];
        return hero ? (
          <Image
            src={hero.src}
            alt={hero.alt}
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
    {
      accessorFn: (row) => (row.title as Record<string, string>)[locale] ?? row.title.en,
      id: "title",
      header: t("columnTitle"),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{(row.original.title as Record<string, string>)[locale] ?? row.original.title.en}</p>
          <p className="text-xs text-muted-foreground">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: "city",
      header: t("columnCity"),
    },
    {
      accessorKey: "type",
      header: t("columnType"),
      cell: ({ getValue }) => {
        const type = getValue() as string;
        return <span className="text-sm capitalize">{tf.has(`types.${type}`) ? tf(`types.${type}` as any) : type.replace(/_/g, " ")}</span>;
      },
    },
    {
      accessorKey: "status",
      header: t("columnStatus"),
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
    },
    {
      accessorKey: "price",
      header: t("columnPrice"),
      cell: ({ row }) => formatPrice(row.original.price),
    },
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
            <Link href={`/properties/${row.original.id}`}>
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("title")} createHref="/properties/new" />
        <TableSkeleton rows={5} columns={7} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("title")} createHref="/properties/new" />
        <QueryError onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        description={t("count", { count: properties.length })}
        createHref="/properties/new"
        createLabel={t("addProperty")}
      />
      <DataTable columns={columns} data={properties} />
      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
