/**
 * Password-reset email for academy students. Shape parallels
 * `password-reset.template.ts` (admin) so future consolidation is easy —
 * copy differs (study platform vs. TGE admin) but the layout is the same.
 */

export type AcademyPasswordResetLocale = 'en' | 'ro';

export interface AcademyPasswordResetInput {
  name: string;
  resetUrl: string;
  expiresAt: Date;
  locale?: AcademyPasswordResetLocale;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const COPY: Record<
  AcademyPasswordResetLocale,
  {
    subject: string;
    heading: (name: string) => string;
    intro: string;
    cta: string;
    expiresNote: (hours: string) => string;
    fallback: string;
    noAction: string;
    signoff: string;
  }
> = {
  en: {
    subject: 'Reset your TGE Academy password',
    heading: (name) => `Hi ${name},`,
    intro:
      'We received a request to reset the password on your TGE Academy account. Click the button below to choose a new one.',
    cta: 'Reset password',
    expiresNote: (hours) => `This link expires in ${hours}.`,
    fallback: 'If the button doesn’t work, paste this URL into your browser:',
    noAction:
      'If you didn’t request this, you can safely ignore this email — your password stays unchanged.',
    signoff: '— The TGE Academy team',
  },
  ro: {
    subject: 'Resetează-ți parola TGE Academy',
    heading: (name) => `Salut ${name},`,
    intro:
      'Am primit o cerere pentru resetarea parolei contului tău TGE Academy. Apasă butonul de mai jos pentru a alege o parolă nouă.',
    cta: 'Resetează parola',
    expiresNote: (hours) => `Acest link expiră în ${hours}.`,
    fallback: 'Dacă butonul nu funcționează, copiază acest URL în browser:',
    noAction:
      'Dacă nu tu ai cerut acest lucru, poți ignora acest email — parola rămâne neschimbată.',
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

function humanizeTtl(date: Date, locale: AcademyPasswordResetLocale): string {
  const ms = date.getTime() - Date.now();
  const hours = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
  return locale === 'ro'
    ? `${hours} ${hours === 1 ? 'oră' : 'ore'}`
    : `${hours} hour${hours === 1 ? '' : 's'}`;
}

export function renderAcademyPasswordReset(
  input: AcademyPasswordResetInput,
): RenderedEmail {
  const locale: AcademyPasswordResetLocale = input.locale ?? 'ro';
  const copy = COPY[locale];
  const ttl = humanizeTtl(input.expiresAt, locale);
  const safeUrl = escapeHtml(input.resetUrl);
  const safeName = escapeHtml(input.name);

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:24px;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;">${copy.heading(safeName)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#3a3a3a;">${copy.intro}</p>
        <p style="margin:0 0 32px;">
          <a href="${safeUrl}" style="display:inline-block;background:#5b21b6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:500;font-size:15px;">${copy.cta}</a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;color:#6b6b6b;">${copy.expiresNote(ttl)}</p>
        <p style="margin:0 0 16px;font-size:13px;color:#6b6b6b;">
          ${copy.fallback}<br />
          <a href="${safeUrl}" style="color:#6b6b6b;word-break:break-all;">${safeUrl}</a>
        </p>
        <p style="margin:0 0 24px;font-size:13px;color:#6b6b6b;">${copy.noAction}</p>
        <p style="margin:24px 0 0;font-size:13px;color:#6b6b6b;">${copy.signoff}</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    copy.heading(input.name),
    '',
    copy.intro,
    '',
    `${copy.cta}: ${input.resetUrl}`,
    '',
    copy.expiresNote(ttl),
    '',
    copy.noAction,
    '',
    copy.signoff,
  ].join('\n');

  return { subject: copy.subject, html, text };
}
