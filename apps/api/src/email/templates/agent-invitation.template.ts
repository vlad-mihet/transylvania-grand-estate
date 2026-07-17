/**
 * Agent invitation email template. Inline HTML (not React Email) to keep
 * the API deploy surface small — we can graduate to MJML/React Email later
 * if we need richer layouts. All four locales supported (Phase 5);
 * fallback to RO when the caller doesn't know the invitee's locale.
 */

export type AgentInvitationLocale = 'en' | 'ro' | 'fr' | 'de';

// Which kind of invitee this is, so the intro copy is role-appropriate: an
// AGENT joins "as a real estate agent"; an ADMIN/EDITOR joins "the TGE team".
// (BUG-120: platform users were told they were joining "as a real estate
// agent" because both flows shared the agent template verbatim.)
export type InvitationRoleKind = 'agent' | 'staff';

export interface AgentInvitationInput {
  firstName: string;
  acceptUrl: string;
  expiresAt: Date;
  invitedByName?: string;
  locale?: AgentInvitationLocale;
  roleKind?: InvitationRoleKind;
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
    intro: (invitedBy: string, roleKind: InvitationRoleKind) => string;
    cta: string;
    expiresNote: (date: string) => string;
    fallback: string;
    signoff: string;
  }
> = {
  en: {
    subject: 'You’ve been invited to join TGE',
    heading: (firstName) => `Welcome, ${firstName}!`,
    intro: (invitedBy, roleKind) =>
      `${invitedBy} invited you to join ${
        roleKind === 'agent' ? 'TGE as a real estate agent' : 'the TGE team'
      }. Click the button below to set up your account — you can sign in with Google or set a password.`,
    cta: 'Accept invitation',
    expiresNote: (date) => `This link expires on ${date}.`,
    fallback:
      'If the button doesn’t work, paste this URL into your browser:',
    signoff: 'See you inside,\nThe TGE team',
  },
  ro: {
    subject: 'Ai fost invitat să te alături TGE',
    heading: (firstName) => `Bun venit, ${firstName}!`,
    intro: (invitedBy, roleKind) =>
      `${invitedBy} te-a invitat să te alături ${
        roleKind === 'agent' ? 'TGE ca agent imobiliar' : 'echipei TGE'
      }. Apasă butonul de mai jos pentru a-ți configura contul — te poți autentifica prin Google sau îți poți seta o parolă.`,
    cta: 'Acceptă invitația',
    expiresNote: (date) => `Acest link expiră pe ${date}.`,
    fallback:
      'Dacă butonul nu funcționează, copiază acest URL în browser:',
    signoff: 'Ne vedem în aplicație,\nEchipa TGE',
  },
  fr: {
    subject: 'Vous avez été invité à rejoindre TGE',
    heading: (firstName) => `Bienvenue, ${firstName} !`,
    intro: (invitedBy, roleKind) =>
      `${invitedBy} vous a invité à rejoindre ${
        roleKind === 'agent'
          ? 'TGE en tant qu’agent immobilier'
          : 'l’équipe TGE'
      }. Cliquez sur le bouton ci-dessous pour configurer votre compte — vous pouvez vous connecter avec Google ou définir un mot de passe.`,
    cta: "Accepter l'invitation",
    expiresNote: (date) => `Ce lien expire le ${date}.`,
    fallback:
      "Si le bouton ne fonctionne pas, collez cette URL dans votre navigateur :",
    signoff: "À très bientôt,\nL'équipe TGE",
  },
  de: {
    subject: 'Sie wurden eingeladen, TGE beizutreten',
    heading: (firstName) => `Willkommen, ${firstName}!`,
    intro: (invitedBy, roleKind) =>
      `${invitedBy} hat Sie eingeladen, ${
        roleKind === 'agent'
          ? 'TGE als Immobilienmakler'
          : 'dem TGE-Team'
      } beizutreten. Klicken Sie auf die Schaltfläche unten, um Ihr Konto einzurichten — Sie können sich mit Google anmelden oder ein Passwort festlegen.`,
    cta: 'Einladung annehmen',
    expiresNote: (date) => `Dieser Link läuft am ${date} ab.`,
    fallback:
      'Wenn die Schaltfläche nicht funktioniert, fügen Sie diese URL in Ihren Browser ein:',
    signoff: 'Bis bald,\nDas TGE-Team',
  },
};

const DATE_LOCALE_MAP: Record<AgentInvitationLocale, string> = {
  en: 'en-GB',
  ro: 'ro-RO',
  fr: 'fr-FR',
  de: 'de-DE',
};

const INVITED_BY_DEFAULT: Record<AgentInvitationLocale, string> = {
  en: 'An administrator',
  ro: 'Un administrator',
  fr: 'Un administrateur',
  de: 'Ein Administrator',
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
  const roleKind: InvitationRoleKind = input.roleKind ?? 'agent';
  const copy = COPY[locale];
  const invitedBy = input.invitedByName ?? INVITED_BY_DEFAULT[locale];
  const expires = new Intl.DateTimeFormat(DATE_LOCALE_MAP[locale], {
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
          ${copy.intro(safeInvitedBy, roleKind)}
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
    copy.intro(invitedBy, roleKind),
    '',
    `${copy.cta}: ${input.acceptUrl}`,
    '',
    copy.expiresNote(expires),
    '',
    copy.signoff,
  ].join('\n');

  return { subject: copy.subject, html, text };
}
