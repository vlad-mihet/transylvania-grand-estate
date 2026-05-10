import { type Locale, localePath, toolsHubPath, toolPath } from './locale';

export type RouteSpec = {
  /** Stable identifier across locales. */
  id: string;
  /** Builds the URL path for this route under a given locale. */
  path: (locale: Locale) => string;
  /** True if this is a dynamic route (only the static index is exercised in routes.spec.ts). */
  dynamic?: boolean;
};

export const STATIC_ROUTES: RouteSpec[] = [
  { id: 'home', path: (l) => localePath(l, '') },
  { id: 'properties', path: (l) => localePath(l, 'properties') },
  { id: 'properties-map', path: (l) => `${localePath(l, 'properties')}?view=map` },
  { id: 'cities', path: (l) => localePath(l, 'cities') },
  { id: 'agents', path: (l) => localePath(l, 'agents') },
  { id: 'developers', path: (l) => localePath(l, 'developers') },
  { id: 'blog', path: (l) => localePath(l, 'blog') },
  { id: 'about', path: (l) => localePath(l, 'about') },
  { id: 'faq', path: (l) => localePath(l, 'faq') },
  { id: 'contact', path: (l) => localePath(l, 'contact') },
  { id: 'tools-hub', path: (l) => toolsHubPath(l) },
  { id: 'tool-mortgage', path: (l) => toolPath(l, 'mortgage') },
  { id: 'tool-borrowing', path: (l) => toolPath(l, 'borrowing') },
  { id: 'tool-purchase', path: (l) => toolPath(l, 'purchase') },
  { id: 'tool-rental', path: (l) => toolPath(l, 'rental') },
];

export const DYNAMIC_ROUTE_PARENTS = [
  'properties',
  'cities',
  'agents',
  'developers',
  'blog',
] as const;
