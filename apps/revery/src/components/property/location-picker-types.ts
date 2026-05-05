// Types shared by location-picker and its hook. Split out so the hook can
// import them without pulling in React component code.

export interface LocationSelection {
  label: string;
  sublabel: string;
  type: "county" | "city" | "neighborhood" | "address";
  slug: string;
  param: string; // "county" | "city" | ""
  lat?: number;
  lng?: number;
}

export interface AddressResult {
  name: string;
  sublabel: string;
  type: string;
  latitude: number;
  longitude: number;
  city?: string;
  county?: string;
}

export interface NeighborhoodResult {
  id: string;
  name: string;
  slug: string;
}

// Shape returned when a neighborhood is a search hit: carries parent-city
// info so the UI can render "cartier, Cluj-Napoca, Cluj" breadcrumbs.
export interface NeighborhoodSearchHit {
  id?: string;
  name: string;
  slug?: string;
  citySlug?: string;
  city?:
    | string
    | {
        name: string;
        slug: string;
        county?: { name: string } | null;
      };
}

export interface CityResult {
  id: string;
  name: string;
  slug: string;
  county?: { name: string; slug: string } | null;
  neighborhoods?: NeighborhoodResult[];
}

export interface LocationSearchResult {
  counties: Array<{ id: string; name: string; slug: string; code: string }>;
  cities: CityResult[];
  neighborhoods: NeighborhoodSearchHit[];
  addresses: AddressResult[];
}

// Counties passed into the picker optionally have a pre-hydrated cities list.
// We used to reach for `(county as any).cities`; this contract replaces that.
export interface CountyWithCities {
  slug: string;
  name: string;
  cities?: Array<{ name: string; slug: string }>;
}
