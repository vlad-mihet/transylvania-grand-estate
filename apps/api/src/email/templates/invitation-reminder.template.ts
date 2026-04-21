/**
 * Friendly nudge sent ~24h before an invitation expires. Deliberately shorter
 * than the original invitation email \u2014 the recipient has already seen the
 * full pitch; this is pure "don't forget" plus the same acceptUrl.
 */

import type {
  AgentInvitationLocale,
  RenderedEmail,
} from './agent-invitation.template';

export interface InvitationReminderInput {
  firstName: string;
  acceptUrl: string;
  expiresAt: Date;
  locale?: AgentInvitationLocale;
}

const COPY: Record<
  AgentInvitationLocale,
  {
    subject: string;
    heading: (firstName: string) => string;
    intro: (expires: string) => string;
    cta: string;
    fallback: string;
    signoff: string;
  }
> = {
  en: {
    subject: 'Your TGE invitation expires tomorrow',
    heading: (firstName) => `Hi ${firstName},`,
    intro: (expires) =>
      `Just a heads-up: the invitation we sent you earlier expires on ${expires}. If you still want to join, click below to set up your account.`,
    cta: 'Accept invitation',
    fallback:
      'If the button doesn\u2019t work, paste this URL into your browser:',
    signoff: 'The TGE team',
  },
  ro: {
    subject: 'Invitația TGE expiră mâine',
    heading: (firstName) => `Bună ${firstName},`,
    intro: (expires) =>
      `Un reminder: invitația pe care ți-am trimis-o expiră pe ${expires}. Dacă vrei să te alături, apasă butonul de mai jos pentru a-ți configura contul.`,
    cta: 'Acceptă invitația',
    fallback:
      'Dacă butonul nu funcționează, copiază acest URL în browser:',
    signoff: 'Echipa TGE',
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

export function renderInvitationReminder(
  input: InvitationReminderInput,
): RenderedEmail {
  const locale: AgentInvitationLocale = input.locale ?? 'ro';
  const copy = COPY[locale];
  const expires = new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(input.expiresAt);

  const safeUrl = escapeHtml(input.acceptUrl);
  const safeFirstName = escapeHtml(input.firstName);

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:24px;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;">${copy.heading(safeFirstName)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#3a3a3a;">${copy.intro(expires)}</p>
        <p style="margin:0 0 24px;">
          <a href="${safeUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:500;font-size:15px;">
            ${copy.cta}
          </a>
        </p>
        <p style="margin:0 0 20px;font-size:13px;color:#6b6b6b;">
          ${copy.fallback}<br />
          <a href="${safeUrl}" style="color:#6b6b6b;word-break:break-all;">${safeUrl}</a>
        </p>
        <p style="margin:12px 0 0;font-size:13px;color:#6b6b6b;">${copy.signoff}</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    copy.heading(input.firstName),
    '',
    copy.intro(expires),
    '',
    `${copy.cta}: ${input.acceptUrl}`,
    '',
    copy.signoff,
  ].join('\n');

  return { subject: copy.subject, html, text };
}
