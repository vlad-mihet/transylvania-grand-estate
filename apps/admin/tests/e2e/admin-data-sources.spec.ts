import { test, expect } from '@playwright/test';
import {
  adminApi,
  getAdminAccessToken,
  type ApiEnvelope,
} from './_fixtures/api';

/**
 * One smoke per sidebar entry the demo will touch. Proves the API the page
 * depends on returns 200 + actual data. Doesn't render the page, but if
 * these go red, the corresponding admin page is dead in the water.
 *
 * Doesn't replace clicking through the actual UI — visual / form-validation
 * issues still need a human pass.
 */
type Row = { id: string };

const DATA_SOURCES: Array<{ label: string; path: string; expectRows?: boolean }> = [
  { label: 'Inquiries',         path: '/inquiries?limit=5' },
  { label: 'Properties',        path: '/properties?limit=5', expectRows: true },
  { label: 'Developers',        path: '/developers?limit=5' },
  { label: 'Agents',            path: '/agents?limit=5', expectRows: true },
  { label: 'Testimonials',      path: '/testimonials?limit=5' },
  { label: 'Counties',          path: '/counties?light=true' },
  { label: 'Cities',            path: '/cities?limit=5', expectRows: true },
  { label: 'Articles',          path: '/articles?limit=5' },
  { label: 'Academy courses',   path: '/admin/academy/courses?limit=5' },
  { label: 'Academy users',     path: '/admin/academy/users?limit=5' },
  { label: 'Audit logs',        path: '/audit-logs?limit=5' },
  { label: 'Site config',       path: '/site-config' },
];

for (const ds of DATA_SOURCES) {
  test(`admin sidebar data source: ${ds.label} (${ds.path})`, async () => {
    const token = getAdminAccessToken();
    const env = await adminApi<ApiEnvelope<Row[] | Row | unknown>>(token, ds.path);
    expect(env.success, `${ds.label}: success=false`).toBeTruthy();
    if (ds.expectRows) {
      expect(
        Array.isArray(env.data) && env.data.length > 0,
        `${ds.label}: expected at least one row from seed`,
      ).toBeTruthy();
    }
  });
}
