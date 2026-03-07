import { PropertyFormValues } from "./validations/property";

export function toPropertyPayload(data: PropertyFormValues) {
  const { latitude, longitude, ...rest } = data;
  return {
    ...rest,
    coordinates: {
      lat: latitude ?? 0,
      lng: longitude ?? 0,
    },
  };
}
