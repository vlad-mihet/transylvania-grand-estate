"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { DataTable, ColumnDef } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@tge/ui";
import { Pencil, Trash2, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface Testimonial {
  id: string;
  clientName: string;
  location: string;
  propertyType: string;
  quote: string | { en: string; ro: string };
  rating: number;
}

export default function TestimonialsPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const t = useTranslations("Testimonials");

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: () => apiClient<Testimonial[]>("/testimonials"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/testimonials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const columns: ColumnDef<Testimonial, any>[] = [
    { accessorKey: "clientName", header: t("columnClient") },
    { accessorKey: "location", header: t("columnLocation") },
    { accessorKey: "propertyType", header: t("columnPropertyType") },
    {
      accessorKey: "rating",
      header: t("columnRating"),
      cell: ({ getValue }) => (
        <div className="flex gap-0.5">
          {Array.from({ length: getValue() as number }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-copper text-copper" />
          ))}
        </div>
      ),
    },
    {
      accessorKey: "quote",
      header: t("columnQuote"),
      cell: ({ getValue }) => {
        const val = getValue();
        const text = typeof val === "string" ? val : (val as any)?.en ?? "";
        return (
          <p className="max-w-[300px] truncate text-sm text-muted-foreground">
            {text}
          </p>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/testimonials/${row.original.id}`}>
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
        description={t("count", { count: testimonials.length })}
        createHref="/testimonials/new"
        createLabel={t("addTestimonial")}
      />
      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : (
        <DataTable columns={columns} data={testimonials} />
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
