# Landing Guide

## Data Fetching

The landing site uses **server components** exclusively for data fetching. No React Query, no client-side state.

### `fetchApi<T>(path, options?)`

```typescript
import { fetchApi } from "@/lib/api";

// In a server component (page.tsx)
const properties = await fetchApi<RawProperty[]>("/properties?featured=true");
```

- Uses Next.js `fetch` with `revalidate: 60` by default (ISR — regenerates every 60 seconds)
- No auth — only hits `@Public()` API endpoints
- Auto-unwraps the `{ success, data }` envelope, returning `data` directly
- Override revalidation: `fetchApi("/path", { revalidate: 300 })` for less-frequently changing data

### `mutateApi<T>(path, options)`

Used for form submissions (e.g., contact inquiries):

```typescript
import { mutateApi } from "@/lib/api";

await mutateApi("/inquiries", {
  method: "POST",
  body: { name, email, message, type: "general" },
});
```

Source: `apps/landing/src/lib/api.ts`

## API Data Mapping

The Prisma schema stores data flat (e.g., `latitude`, `longitude` as separate columns), but `@tge/types` interfaces are nested (e.g., `location.coordinates.lat`). Mapper functions bridge this gap.

```typescript
import { mapApiProperty, mapApiDeveloper } from "@/lib/mappers";

const raw = await fetchApi<RawProperty>(`/properties/${slug}`);
const property: Property = mapApiProperty(raw);
// Now: property.location.coordinates.lat  (not property.latitude)
```

Always use mappers when consuming API data on the landing site. Available mappers:

| Function | Input | Output |
|----------|-------|--------|
| `mapApiProperty(raw)` | Flat API response | `Property` with nested `location`, `specs`, `images` |
| `mapApiProperties(raw[])` | Array variant | `Property[]` |
| `mapApiDeveloper(raw)` | Flat API response | `Developer` |
| `mapApiCity(raw)` | Flat API response | `City` |
| `mapApiTestimonial(raw)` | Flat API response | `Testimonial` |

Source: `apps/landing/src/lib/mappers.ts`

## Component Organization

```
apps/landing/src/components/
├── sections/          Homepage and reusable sections
│   ├── hero-section.tsx
│   ├── featured-properties.tsx
│   ├── city-showcase.tsx
│   ├── developer-showcase.tsx
│   ├── testimonials-section.tsx
│   └── ... (22+ section components)
├── property/          Property listing and detail
│   ├── property-card.tsx
│   ├── property-filters.tsx
│   ├── property-hero.tsx
│   └── ...
├── developer/         Developer listing and templates
│   ├── developer-card.tsx
│   └── templates/     Per-developer visual templates
├── city/              City detail components
├── layout/            Header, footer, navigation, mega-menu
├── contact/           Contact page components
├── about/             About page sections
└── inquiry/           Modal inquiry system with context provider
```

## Developer Templates

Each developer can have a distinct visual layout on their detail page. This is the most unique pattern in the landing app.

### How It Works

1. `template-map.ts` maps developer slugs to template names:

```typescript
export type TemplateName = "prestige" | "atelier" | "sovereign";

export const developerTemplateMap: Record<string, TemplateName> = {
  "studium-green": "prestige",
  "maurer-imobiliare": "atelier",
  "west-residential": "sovereign",
  "impact-developer": "prestige",
};

export const DEFAULT_TEMPLATE: TemplateName = "prestige";
```

2. The developer detail page selects the template:

```typescript
const templateName = developerTemplateMap[slug] ?? DEFAULT_TEMPLATE;
// Renders PrestigeTemplate, AtelierTemplate, or SovereignTemplate
```

3. Each template is a folder in `components/developer/templates/<name>/` containing its own hero, sections, and layout components.

Source: `apps/landing/src/app/[locale]/developers/[slug]/template-map.ts`, `apps/landing/src/components/developer/templates/`

### Adding a New Template

1. Create a folder at `components/developer/templates/<name>/`
2. Create `index.tsx` as the template entry point — it receives `{ developer, properties }` props
3. Add the template's hero, intro, listing, and any unique sections as sibling components
4. Export the template type in `template-map.ts`:
   ```typescript
   export type TemplateName = "prestige" | "atelier" | "sovereign" | "newtemplate";
   ```
5. Map developer slugs to it in `developerTemplateMap`
6. Import and add the template to the switch/conditional in the developer detail page

## i18n

The project uses `next-intl` for internationalization. There are two distinct i18n layers:

### UI Strings (next-intl messages)

Static text like button labels, page titles, and form placeholders. Stored in JSON message files:

```
apps/landing/messages/
  en.json
  ro.json
  fr.json
  de.json
```

Access in server components:

```typescript
import { getTranslations } from "next-intl/server";

const t = await getTranslations("properties");
t("title"); // "Our Properties" or "Proprietatile Noastre"
```

### Content (LocalizedString from API)

Dynamic content like property titles and descriptions comes from the API as `LocalizedString` objects:

```typescript
import { localize } from "@tge/utils";

const title = localize(property.title, locale);
// Resolves to property.title.en or property.title.ro
// Falls back to English if the requested locale is missing
```

### Routing

All URLs are locale-prefixed: `/en/properties`, `/ro/properties`. The `@tge/i18n` package configures `next-intl` routing with `localePrefix: "always"`. The landing middleware (`middleware.ts`) handles locale detection and redirects.

Source: `apps/landing/src/middleware.ts`, `packages/i18n/`

## Adding a New Page

1. Create the route at `apps/landing/src/app/[locale]/<page>/page.tsx`
2. Fetch data with `fetchApi()` in the server component
3. Map API responses with the appropriate mapper from `@/lib/mappers`
4. Use `localize()` for any `LocalizedString` content
5. Add translations to all message files (`messages/en.json`, `messages/ro.json`, etc.)
6. Add a navigation link in the header/mega-menu (`components/layout/`)
