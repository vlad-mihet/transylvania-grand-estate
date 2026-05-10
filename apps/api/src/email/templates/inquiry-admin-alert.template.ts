/**
 * Admin/sales-team email fired the moment a new inquiry lands. Goal is "this
 * lead exists, click here" — keep copy terse so the on-call agent can triage
 * from a phone notification preview. EN/RO only; admin operators are a small
 * internal audience and do not need FR/DE.
 */

import type { EmailTemplateOutput } from './agent-invitation.template';

export type InquiryAdminAlertLocale = 'en' | 'ro';

export interface InquiryAdminAlertInput {
  inquiryId: string;
  type: 'general' | 'property' | 'developer' | string;
  submitterName: string;
  submitterEmail: string;
  submitterPhone?: string;
  message: string;
  budget?: string;
  entityName?: string;
  source?: string;
  sourceUrl?: string;
  adminUrl: string;
  receivedAt: Date;
  locale?: InquiryAdminAlertLocale;
}

const COPY: Record<
  InquiryAdminAlertLocale,
  {
    subject: (name: string) => string;
    heading: string;
    type: string;
    from: string;
    phone: string;
    budget: string;
    about: string;
    sourceLabel: string;
    messageLabel: string;
    cta: string;
    receivedNote: (date: string) => string;
    signoff: string;
  }
> = {
  en: {
    subject: (name) => `New inquiry from ${name}`,
    heading: 'New inquiry received',
    type: 'Type',
    from: 'From',
    phone: 'Phone',
    budget: 'Budget',
    about: 'About',
    sourceLabel: 'Source',
    messageLabel: 'Message',
    cta: 'Open in admin',
    receivedNote: (date) => `Received ${date}.`,
    signoff: 'Replies should go directly to the submitter.',
  },
  ro: {
    subject: (name) => `Cerere nouă de la ${name}`,
    heading: 'Cerere nouă primită',
    type: 'Tip',
    from: 'De la',
    phone: 'Telefon',
    budget: 'Buget',
    about: 'Despre',
    sourceLabel: 'Sursă',
    messageLabel: 'Mesaj',
    cta: 'Deschide în admin',
    receivedNote: (date) => `Primită pe ${date}.`,
    signoff: 'Răspunsurile trebuie să meargă direct către solicitant.',
  },
};

const escapeHtml = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]!,
  );

export function renderInquiryAdminAlert(
  input: InquiryAdminAlertInput,
): EmailTemplateOutput {
  const locale: InquiryAdminAlertLocale = input.locale ?? 'en';
  const copy = COPY[locale];
  const received = new Intl.DateTimeFormat(
    locale === 'ro' ? 'ro-RO' : 'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(input.receivedAt);

  const rows: Array<[string, string]> = [
    [copy.type, escapeHtml(input.type)],
    [copy.from, `${escapeHtml(input.submitterName)} &lt;${escapeHtml(input.submitterEmail)}&gt;`],
  ];
  if (input.submitterPhone) rows.push([copy.phone, escapeHtml(input.submitterPhone)]);
  if (input.budget) rows.push([copy.budget, escapeHtml(input.budget)]);
  if (input.entityName) rows.push([copy.about, escapeHtml(input.entityName)]);
  if (input.source) {
    const sourceCell = input.sourceUrl
      ? `${escapeHtml(input.source)} &mdash; <a href="${escapeHtml(input.sourceUrl)}" style="color:#3a3a3a;">${escapeHtml(input.sourceUrl)}</a>`
      : escapeHtml(input.source);
    rows.push([copy.sourceLabel, sourceCell]);
  }

  const tableRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b6b6b;font-size:13px;white-space:nowrap;">${k}</td><td style="padding:6px 0;color:#1a1a1a;font-size:13px;">${v}</td></tr>`,
    )
    .join('');

  const safeAdminUrl = escapeHtml(input.adminUrl);
  const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br />');

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:24px;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;">${copy.heading}</h1>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
          ${tableRows}
        </table>
        <div style="border-top:1px solid #ececec;padding-top:16px;">
          <p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">${copy.messageLabel}</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:#1a1a1a;white-space:pre-line;">${safeMessage}</p>
        </div>
        <p style="margin:0 0 24px;">
          <a href="${safeAdminUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:500;font-size:14px;">
            ${copy.cta}
          </a>
        </p>
        <p style="margin:0 0 4px;font-size:12px;color:#9b9b9b;">${copy.receivedNote(received)}</p>
        <p style="margin:0;font-size:12px;color:#9b9b9b;">${copy.signoff}</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const textRows = rows.map(([k, v]) => `${k}: ${v.replace(/<[^>]+>/g, '')}`);
  const text = [
    copy.heading,
    '',
    ...textRows,
    '',
    `${copy.messageLabel}:`,
    input.message,
    '',
    `${copy.cta}: ${input.adminUrl}`,
    '',
    copy.receivedNote(received),
  ].join('\n');

  return { subject: copy.subject(input.submitterName), html, text };
}
