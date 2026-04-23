/**
 * 24h-expiry reminder for academy invitations. Counterpart to
 * `invitation-reminder.template.ts` (admin) — same "don't forget" tone,
 * academy branding (purple CTA vs. admin's black), reused on the hourly
 * reminder cron.
 */

export type AcademyReminderLocale = 'en' | 'ro';

export interface AcademyInvitationReminderInput {
  name: string;
  acceptUrl: string;
  expiresAt: Date;
  locale?: AcademyReminderLocale;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const COPY: Record<
  AcademyReminderLocale,
  {
    subject: string;
    heading: (name: string) => string;
    intro: (expires: string) => string;
    cta: string;
    fallback: string;
    signoff: string;
  }
> = {
  en: {
    subject: 'Your TGE Academy invitation expires tomorrow',
    heading: (name) => `Hi ${name},`,
    intro: (expires) =>
      `Reminder: your TGE Academy invitation expires on ${expires}. Click below to finish creating your account.`,
    cta: 'Accept invitation',
    fallback: 'If the button doesn’t work, paste this URL into your browser:',
    signoff: '— The TGE Academy team',
  },
  ro: {
    subject: 'Invitația TGE Academy expiră mâine',
    heading: (name) => `Salut ${name},`,
    intro: (expires) =>
      `Reminder: invitația ta TGE Academy expiră pe ${expires}. Apasă butonul de mai jos pentru a-ți finaliza contul.`,
    cta: 'Acceptă invitația',
    fallback: 'Dacă butonul nu funcționează, copiază acest URL în browser:',
    signoff: '— Echipa TGE Academy',
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

export function renderAcademyInvitationReminder(
  input: AcademyInvitationReminderInput,
): RenderedEmail {
  const locale: AcademyReminderLocale = input.locale ?? 'ro';
  const copy = COPY[locale];
  const expires = new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(input.expiresAt);

  const safeUrl = escapeHtml(input.acceptUrl);
  const safeName = escapeHtml(input.name);

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:24px;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;">${copy.heading(safeName)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#3a3a3a;">${copy.intro(expires)}</p>
        <p style="margin:0 0 24px;">
          <a href="${safeUrl}" style="display:inline-block;background:#5b21b6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:500;font-size:15px;">
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
    copy.heading(input.name),
    '',
    copy.intro(expires),
    '',
    `${copy.cta}: ${input.acceptUrl}`,
    '',
    copy.signoff,
  ].join('\n');

  return { subject: copy.subject, html, text };
}
