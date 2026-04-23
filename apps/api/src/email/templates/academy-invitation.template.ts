/**
 * Academy invitation email. Separate from the agent template because the
 * copy is about joining a study platform, not a real-estate workplace.
 * Localised EN + RO in v1; DE/FR follow when the student locale picker
 * reaches production.
 */

export type AcademyInvitationLocale = 'en' | 'ro';

export interface AcademyInvitationInput {
  name: string;
  acceptUrl: string;
  expiresAt: Date;
  invitedByName?: string;
  courseTitle?: string | null;
  locale?: AcademyInvitationLocale;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const COPY: Record<
  AcademyInvitationLocale,
  {
    subject: string;
    heading: (name: string) => string;
    intro: (invitedBy: string, course: string | null) => string;
    cta: string;
    expiresNote: (date: string) => string;
    fallback: string;
    signoff: string;
  }
> = {
  en: {
    subject: 'You’ve been invited to TGE Academy',
    heading: (name) => `Welcome, ${name}!`,
    intro: (invitedBy, course) =>
      course
        ? `${invitedBy} invited you to the "${course}" course on TGE Academy. Click the button below to set up your account — you can sign in with Google or set a password.`
        : `${invitedBy} invited you to TGE Academy. Click the button below to set up your account — you can sign in with Google or set a password.`,
    cta: 'Start learning',
    expiresNote: (date) => `This link expires on ${date}.`,
    fallback: 'If the button doesn’t work, paste this URL into your browser:',
    signoff: 'See you inside,\nThe TGE Academy team',
  },
  ro: {
    subject: 'Ai fost invitat la TGE Academy',
    heading: (name) => `Bun venit, ${name}!`,
    intro: (invitedBy, course) =>
      course
        ? `${invitedBy} te-a invitat la cursul „${course}" de pe TGE Academy. Apasă butonul de mai jos pentru a-ți configura contul — te poți autentifica prin Google sau îți poți seta o parolă.`
        : `${invitedBy} te-a invitat la TGE Academy. Apasă butonul de mai jos pentru a-ți configura contul — te poți autentifica prin Google sau îți poți seta o parolă.`,
    cta: 'Începe cursul',
    expiresNote: (date) => `Acest link expiră pe ${date}.`,
    fallback: 'Dacă butonul nu funcționează, copiază acest URL în browser:',
    signoff: 'Ne vedem în aplicație,\nEchipa TGE Academy',
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

export function renderAcademyInvitation(
  input: AcademyInvitationInput,
): RenderedEmail {
  const locale: AcademyInvitationLocale = input.locale ?? 'ro';
  const copy = COPY[locale];
  const invitedBy =
    input.invitedByName ?? (locale === 'ro' ? 'Un administrator' : 'An administrator');
  const expires = new Intl.DateTimeFormat(
    locale === 'ro' ? 'ro-RO' : 'en-GB',
    { day: '2-digit', month: 'long', year: 'numeric' },
  ).format(input.expiresAt);

  const safeUrl = escapeHtml(input.acceptUrl);
  const safeName = escapeHtml(input.name);
  const safeInvitedBy = escapeHtml(invitedBy);
  const safeCourse = input.courseTitle ? escapeHtml(input.courseTitle) : null;

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:24px;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;">${copy.heading(safeName)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#3a3a3a;">
          ${copy.intro(safeInvitedBy, safeCourse)}
        </p>
        <p style="margin:0 0 32px;">
          <a href="${safeUrl}" style="display:inline-block;background:#5b21b6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:500;font-size:15px;">
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
    copy.heading(input.name),
    '',
    copy.intro(invitedBy, input.courseTitle ?? null),
    '',
    `${copy.cta}: ${input.acceptUrl}`,
    '',
    copy.expiresNote(expires),
    '',
    copy.signoff,
  ].join('\n');

  return { subject: copy.subject, html, text };
}
