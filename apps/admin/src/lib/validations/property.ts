import { z } from "zod";
import { createPropertySchema } from "@tge/types/schemas/property";

// Form-specific shape:
// - API accepts nested `coordinates: { lat, lng }`; the admin form is flat
//   with `latitude` / `longitude` inputs. Strip `coordinates`, add the flat
//   fields, and let the caller re-compose when submitting.
// - API marks many fields optional; the admin form requires them (forms
//   prevent partial-state submissions that would need a later patch).
// - Extra floor constraint: non-terrain properties must have a plausible
//   year built (>= 1800).
export const propertySchema = createPropertySchema
  .omit({
    coordinates: true,
    // Re-declared below with form-stricter rules.
    currency: true,
    status: true,
    pool: true,
    featured: true,
    isNew: true,
    features: true,
    landArea: true,
    garage: true,
    developerId: true,
    agentId: true,
  })
  .extend({
    // Plain `z.number()` (not coerce) so the form's input and output types
    // align — zod v4's `z.coerce.number()` types input as `unknown`, which
    // breaks `useForm<T>`. The shared schema keeps coerce at the API boundary.
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    price: z.number().min(0),
    bedrooms: z.number().int().min(0),
    bathrooms: z.number().int().min(0),
    area: z.number().min(0),
    floors: z.number().int().min(0),
    yearBuilt: z.number().int().min(0),
    floor: z.number().int().optional(),
    currency: z.string().min(3).max(10),
    status: z.enum(["available", "sold", "reserved"]),
    pool: z.boolean(),
    featured: z.boolean(),
    isNew: z.boolean(),
    features: z.array(
      z.object({
        en: z.string().min(1),
        ro: z.string().min(1),
        fr: z.string().optional(),
        de: z.string().optional(),
      }),
    ),
    landArea: z.number().optional().nullable(),
    garage: z.number().int().optional().nullable(),
    developerId: z.string().optional().nullable(),
    agentId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "terrain" && data.yearBuilt < 1800) {
      ctx.addIssue({
        code: "too_small",
        minimum: 1800,
        origin: "number",
        inclusive: true,
        message: "Year built must be at least 1800",
        path: ["yearBuilt"],
      });
    }
  });

export type PropertyFormValues = z.infer<typeof propertySchema>;
