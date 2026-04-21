/**
 * Agent invitation email template. Inline HTML (not React Email) to keep
 * the API deploy surface small — we can graduate to MJML/React Email later
 * if we need richer layouts. Localised EN + RO in v1; DE/FR follow when
 * the admin UI exposes a language picker on the invite form.
 */

export type AgentInvitationLocale = 'en' | 'ro';

export interface AgentInvitationInput {
  firstName: string;
  acceptUrl: string;
  expiresAt: Date;
  invitedByName?: string;
  locale?: AgentInvitationLocale;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// Re-exportable so reminder / reset / future templates can share the shape.
export type { RenderedEmail as EmailTemplateOutput };

const COPY: Record<
  AgentInvitationLocale,
  {
    subject: string;
    heading: (firstName: string) => string;
    intro: (invitedBy: string) => string;
    cta: string;
    expiresNote: (date: string) => string;
    fallback: string;
    signoff: string;
  }
> = {
  en: {
    subject: 'You\u2019ve been invited to join TGE',
    heading: (firstName) => `Welcome, ${firstName}!`,
    intro: (invitedBy) =>
      `${invitedBy} invited you to join TGE as a real estate agent. Click the button below to set up your account \u2014 you can sign in with Google or set a password.`,
    cta: 'Accept invitation',
    expiresNote: (date) => `This link expires on ${date}.`,
    fallback:
      'If the button doesn\u2019t work, paste this URL into your browser:',
    signoff: 'See you inside,\nThe TGE team',
  },
  ro: {
    subject: 'Ai fost invitat să te alături TGE',
    heading: (firstName) => `Bun venit, ${firstName}!`,
    intro: (invitedBy) =>
      `${invitedBy} te-a invitat să te alături TGE ca agent imobiliar. Apasă butonul de mai jos pentru a-ți configura contul \u2014 te poți autentifica prin Google sau îți poți seta o parolă.`,
    cta: 'Acceptă invitația',
    expiresNote: (date) => `Acest link expiră pe ${date}.`,
    fallback:
      'Dacă butonul nu funcționează, copiază acest URL în browser:',
    signoff: 'Ne vedem în aplicație,\nEchipa TGE',
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

export function renderAgentInvitation(
  input: AgentInvitationInput,
): RenderedEmail {
  const locale: AgentInvitationLocale = input.locale ?? 'ro';
  const copy = COPY[locale];
  const invitedBy = input.invitedByName ?? (locale === 'ro' ? 'Un administrator' : 'An administrator');
  const expires = new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(input.expiresAt);

  const safeUrl = escapeHtml(input.acceptUrl);
  const safeFirstName = escapeHtml(input.firstName);
  const safeInvitedBy = escapeHtml(invitedBy);

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:24px;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;">${copy.heading(safeFirstName)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#3a3a3a;">
          ${copy.intro(safeInvitedBy)}
        </p>
        <p style="margin:0 0 32px;">
          <a href="${safeUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:500;font-size:15px;">
            ${copy.cta}
          </a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;color:#6b6b6b;">${copy.expiresNote(expires)}</p>
        <p style="margin:0 0 24px;font-size:13px;color:#6b6b6b;">
          ${copy.fallback}<br />
          <a href="${safeUrl}" style="color:#6b6b6b;word-break:break-all;">${safeUrl}</a>
        </p>
        <p style="margin:24px 0 0;font-size:13px;color:#6b6b6b;white-space:pre-line;">${escapeHtml(copy.signoff)}</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    copy.heading(input.firstName),
    '',
    copy.intro(invitedBy),
    '',
    `${copy.cta}: ${input.acceptUrl}`,
    '',
    copy.expiresNote(expires),
    '',
    copy.signoff,
  ].join('\n');

  return { subject: copy.subject, html, text };
}
