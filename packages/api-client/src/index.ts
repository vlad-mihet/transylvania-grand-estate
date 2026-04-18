export {
  fetchApi,
  fetchApiSafe,
  mutateApi,
  getApiBase,
  ApiError,
  setAuthAdapter,
} from "./client";
export type {
  ApiResponse,
  FetchOptions,
  MutateOptions,
  SafeResult,
  AuthAdapter,
  ApiFieldIssue,
} from "./client";

export {
  mapApiProperty,
  mapApiProperties,
  mapApiDeveloper,
  mapApiCity,
  mapApiCounty,
  mapApiCounties,
  mapApiMapPin,
  mapApiMapPins,
  mapApiArticle,
  mapApiArticles,
  mapApiTestimonial,
} from "./mappers";
