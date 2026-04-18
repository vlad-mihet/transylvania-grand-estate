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

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  email: string;
  phone: string;
  photo: string | null;
  active: boolean;
}

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const t = useTranslations("Agents");
  const tc = useTranslations("Common");

  const { data: agents = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiClient<Agent[]>("/agents"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/agents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiClient(`/agents/${id}`, { method: "PATCH", body: { active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
    onError: () => {
      toast.error(tc("featuredError"));
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const columns: ColumnDef<Agent, unknown>[] = [
    {
      accessorKey: "photo",
      header: "",
      enableSorting: false,
      cell: ({ getValue }) => {
        const src = getValue() as string | null;
        return src ? (
          <Image src={src} alt="Photo" width={40} height={40} className="rounded-full object-cover" />
        ) : (
          <div className="h-[40px] w-[40px] rounded-full bg-muted" />
        );
      },
    },
    {
      id: "name",
      header: t("columnName"),
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    },
    { accessorKey: "email", header: t("columnEmail") },
    { accessorKey: "phone", header: t("columnPhone") },
    {
      accessorKey: "active",
      header: t("columnActive"),
      cell: ({ row }) => (
        <Switch
          checked={row.original.active}
          onCheckedChange={(checked) =>
            toggleActive.mutate({ id: row.original.id, active: checked })
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
            <Link href={`/agents/${row.original.id}`}>
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
        description={t("count", { count: agents.length })}
        createHref="/agents/new"
        createLabel={t("addAgent")}
      />
      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={agents}
          mobileCard={(agent) => (
            <div className="rounded-xl border border-copper/[0.08] p-4 space-y-3">
              <div className="flex items-center gap-3">
                {agent.photo ? (
                  <Image src={agent.photo} alt="Photo" width={40} height={40} className="rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-[40px] w-[40px] rounded-full bg-muted shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{agent.firstName} {agent.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                  <p className="text-xs text-muted-foreground">{agent.phone}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-copper/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("columnActive")}</span>
                  <Switch
                    checked={agent.active}
                    onCheckedChange={(checked) =>
                      toggleActive.mutate({ id: agent.id, active: checked })
                    }
                  />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/agents/${agent.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(agent.id)}
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
