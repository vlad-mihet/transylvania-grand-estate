import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export type AxeOptions = {
  /** Selectors to exclude from analysis (e.g. third-party widgets). */
  exclude?: string[];
  /** Disable specific axe rules by id (e.g. ['region']). Use sparingly. */
  disableRules?: string[];
  /** Tag set to include. Default: WCAG 2.1 A + AA. */
  tags?: string[];
};

const DEFAULT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export async function expectNoCriticalA11yViolations(
  page: Page,
  options: AxeOptions = {},
) {
  let builder = new AxeBuilder({ page }).withTags(options.tags ?? DEFAULT_TAGS);
  for (const sel of options.exclude ?? []) {
    builder = builder.exclude(sel);
  }
  if (options.disableRules?.length) {
    builder = builder.disableRules(options.disableRules);
  }
  const result = await builder.analyze();
  const blocking = result.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  if (blocking.length) {
    const summary = blocking
      .map(
        (v) =>
          `  [${v.impact}] ${v.id}: ${v.help}\n    nodes: ${v.nodes
            .slice(0, 3)
            .map((n) => n.target.join(' '))
            .join(' | ')}`,
      )
      .join('\n');
    expect(blocking, `axe found ${blocking.length} blocking violation(s):\n${summary}`).toEqual([]);
  }
}
