// Shared between the filter-bar orchestrator and its extracted sub-views.
// Keys map 1:1 with the URL search params used by the listing page.

export interface FiltersState {
  type: string;
  transaction: string;
  radius: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  // Multi-select of room counts. Valid values are "1".."5" and the open-ended
  // "6+". The URL-building layer maps exact values to repeated `bedrooms=N`
  // params and "6+" to `minBedrooms=6`.
  bedrooms: string[];
  minFloor: string;
  maxFloor: string;
  sellerType: string;
  furnishing: string;
  minBathrooms: string;
  maxBathrooms: string;
  minYearBuilt: string;
  maxYearBuilt: string;
  minPricePerSqm: string;
  maxPricePerSqm: string;
  material: string;
  condition: string;
  postedWithin: string;
  hasBalcony: boolean;
  hasTerrace: boolean;
  hasParking: boolean;
  hasGarage: boolean;
  hasSeparateKitchen: boolean;
  hasStorage: boolean;
  hasElevator: boolean;
  hasImages: boolean;
}

export const defaultFilters: FiltersState = {
  type: "all",
  transaction: "sale",
  radius: "0",
  minPrice: "",
  maxPrice: "",
  minArea: "",
  maxArea: "",
  bedrooms: [],
  minFloor: "",
  maxFloor: "",
  sellerType: "all",
  furnishing: "all",
  minBathrooms: "",
  maxBathrooms: "",
  minYearBuilt: "",
  maxYearBuilt: "",
  minPricePerSqm: "",
  maxPricePerSqm: "",
  material: "all",
  condition: "all",
  postedWithin: "",
  hasBalcony: false,
  hasTerrace: false,
  hasParking: false,
  hasGarage: false,
  hasSeparateKitchen: false,
  hasStorage: false,
  hasElevator: false,
  hasImages: false,
};

// Keys that contribute string values; kept as a tuple so buildFilterParams
// can iterate without drifting from the state shape above. `bedrooms` (the
// multi-select) is handled separately.
export const STRING_FILTER_KEYS = [
  "type",
  "transaction",
  "radius",
  "minPrice",
  "maxPrice",
  "minArea",
  "maxArea",
  "minFloor",
  "maxFloor",
  "sellerType",
  "furnishing",
  "minBathrooms",
  "maxBathrooms",
  "minYearBuilt",
  "maxYearBuilt",
  "minPricePerSqm",
  "maxPricePerSqm",
  "material",
  "condition",
  "postedWithin",
] as const satisfies ReadonlyArray<keyof FiltersState>;

export const BOOL_FILTER_KEYS = [
  "hasBalcony",
  "hasTerrace",
  "hasParking",
  "hasGarage",
  "hasSeparateKitchen",
  "hasStorage",
  "hasElevator",
  "hasImages",
] as const satisfies ReadonlyArray<keyof FiltersState>;

export const RADIUS_OPTIONS = [
  { value: "0", label: "+ 0 km" },
  { value: "5", label: "+ 5 km" },
  { value: "10", label: "+ 10 km" },
  { value: "15", label: "+ 15 km" },
  { value: "25", label: "+ 25 km" },
  { value: "50", label: "+ 50 km" },
] as const;

export const ROOM_OPTIONS = ["1", "2", "3", "4", "5", "6+"] as const;

export const FILTER_STYLES = {
  trigger: "!h-11 rounded-lg border-border text-foreground text-sm",
  label: "text-xs text-muted-foreground font-medium mb-1.5",
  input: "h-11 rounded-lg border-border text-sm",
} as const;
