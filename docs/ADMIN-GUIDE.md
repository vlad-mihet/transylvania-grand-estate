# Admin Guide

## Architecture

The dashboard layout nests providers in this order:

```
AuthProvider          — session management, login/logout
  └─ AuthGuard        — redirects to /login if unauthenticated
       └─ Providers   — React Query (QueryClient, 30s stale time, 1 retry)
            └─ SidebarProvider — sidebar open/close state
                 └─ AdminSidebar + AdminHeader + main content
```

Source: `apps/admin/src/app/[locale]/(dashboard)/layout.tsx`

## Data Fetching

All API calls go through `apiClient<T>(path, options)` from `@/lib/api-client`. It handles auth headers, token refresh, and response unwrapping automatically.

### Queries (reading data)

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["properties"],
  queryFn: () => apiClient<Property[]>("/properties"),
});
```

Query key conventions:
- List: `["properties"]`, `["developers"]`, `["cities"]`
- Single item: `["properties", id]`
- Select dropdowns: `["developers-select"]`

### Mutations (creating/updating/deleting)

```typescript
const mutation = useMutation({
  mutationFn: (data: PropertyPayload) =>
    apiClient("/properties", { method: "POST", body: data }),
  onSuccess: () => {
    toast.success("Property created");
    queryClient.invalidateQueries({ queryKey: ["properties"] });
    router.push("/properties");
  },
  onError: (error: Error) => toast.error(error.message),
});
```

## Form Pattern

Every entity form follows the same structure:

### 1. Zod Schema

Define validation in `apps/admin/src/lib/validations/<entity>.ts`:

```typescript
import { z } from "zod";

const localizedString = z.object({
  en: z.string().min(1),
  ro: z.string().min(1),
});

export const citySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: localizedString,
  propertyCount: z.coerce.number().int().min(0),
});

export type CityFormValues = z.infer<typeof citySchema>;
```

Source: `apps/admin/src/lib/validations/`

### 2. Form Component

Create the form in `apps/admin/src/components/forms/<entity>-form.tsx`:

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { citySchema, CityFormValues } from "@/lib/validations/city";

export function CityForm({ defaultValues, onSubmit, isSubmitting }) {
  const form = useForm<CityFormValues>({
    resolver: zodResolver(citySchema),
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register("name")} />
      <BilingualTextarea
        label="Description"
        enValue={form.watch("description.en")}
        roValue={form.watch("description.ro")}
        onEnChange={(v) => form.setValue("description.en", v)}
        onRoChange={(v) => form.setValue("description.ro", v)}
      />
      {/* ... */}
    </form>
  );
}
```

Use `BilingualInput` for single-line localized fields and `BilingualTextarea` for multi-line. Both render EN/RO tabs.

### 3. Page Components

- **Create page** (`<entity>/new/page.tsx`): calls `apiClient` with `POST`, redirects to list on success
- **Edit page** (`<entity>/[id]/page.tsx`): fetches existing data with `useQuery`, then calls `apiClient` with `PATCH`
- **List page** (`<entity>/page.tsx`): uses `PageHeader` + `DataTable` + `DeleteDialog`

### Image Handling

- **Single image** (city cover, developer logo): use `ImageUpload` component
- **Multiple images** (property gallery): use `ImageGalleryManager` with hero selection
- Images are uploaded separately after entity creation via `FormData` to `POST /properties/:id/images`

## CRUD Page Pattern

### List Page

```
PageHeader (title + "Create New" button)
  └─ DataTable
       └─ columns with sorting
       └─ action buttons (edit, delete)
       └─ pagination
  └─ DeleteDialog (confirmation modal)
```

### Route Structure

```
apps/admin/src/app/[locale]/(dashboard)/
  <entity>/
    page.tsx          — list with DataTable
    new/
      page.tsx        — create form
    [id]/
      page.tsx        — edit form
```

## Recipe: Adding a New Entity

Here's a step-by-step checklist for adding a new entity end-to-end (e.g., "BlogPost"):

### API (`apps/api/`)

1. **Prisma model** — Add to `prisma/schema.prisma`, run `npx prisma migrate dev --name add-blog-posts`
2. **Module** — Create `src/blog-posts/` with:
   - `blog-posts.module.ts`
   - `blog-posts.controller.ts`
   - `blog-posts.service.ts`
   - `dto/create-blog-post.dto.ts`
   - `dto/update-blog-post.dto.ts`
3. **Register** — Import `BlogPostsModule` in `app.module.ts`
4. **Public endpoints** — Add `@Public()` to GET endpoints the landing site needs
5. **Test** — Check Swagger at `http://localhost:3333/api/docs`

Use the `cities` module as a template — it's the simplest CRUD module.

### Shared Types (`packages/types/`)

6. **Type** — Add `src/blog-post.ts` with the interface, export from `src/index.ts`

### Admin (`apps/admin/`)

7. **Validation** — Create `src/lib/validations/blog-post.ts` with the Zod schema
8. **Form** — Create `src/components/forms/blog-post-form.tsx`
9. **Pages** — Create route files:
   - `src/app/[locale]/(dashboard)/blog-posts/page.tsx` (list)
   - `src/app/[locale]/(dashboard)/blog-posts/new/page.tsx` (create)
   - `src/app/[locale]/(dashboard)/blog-posts/[id]/page.tsx` (edit)
10. **Sidebar** — Add navigation link in `src/components/layout/admin-sidebar.tsx`
11. **i18n** — Add labels to `messages/en.json` and `messages/ro.json`

### Landing (`apps/landing/`) — if needed

12. **Mapper** — Add `mapApiBlogPost()` in `src/lib/mappers.ts`
13. **Page** — Create route at `src/app/[locale]/blog/page.tsx`
14. **i18n** — Add translations to `messages/en.json` and `messages/ro.json`

## Shared Components Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| `BilingualInput` | `components/shared/bilingual-input.tsx` | Single-line input with EN/RO tabs |
| `BilingualTextarea` | `components/shared/bilingual-textarea.tsx` | Multi-line textarea with EN/RO tabs |
| `DataTable` | `components/shared/data-table.tsx` | TanStack React Table with sorting, pagination, empty state |
| `DeleteDialog` | `components/shared/delete-dialog.tsx` | Confirmation dialog for destructive actions |
| `ImageUpload` | `components/shared/image-upload.tsx` | Single image upload with drag-and-drop, preview, 10MB limit |
| `ImageGalleryManager` | `components/shared/image-gallery-manager.tsx` | Multi-image upload with hero selection and reordering |
| `PageHeader` | `components/shared/page-header.tsx` | Page title + optional "Create New" button |
| `StatusBadge` | `components/shared/status-badge.tsx` | Color-coded badge for property status (available/reserved/sold) |
| `TableSkeleton` | `components/shared/table-skeleton.tsx` | Loading skeleton for DataTable |
