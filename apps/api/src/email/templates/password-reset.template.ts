/**
 * Password reset email. Tighter than the invitation template — shorter TTL
 * (1h vs 7d), no "invited by" signal, focused on a single action. Layout
 * intentionally mirrors `agent-invitation.template.ts` so a future React
 * Email migration can refactor them together. All four locales (Phase 5).
 */

import type { AgentInvitationLocale } from './agent-invitation.template';

export interface PasswordResetInput {
  firstName: string | null;
  resetUrl: string;
  expiresAt: Date;
  locale?: AgentInvitationLocale;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const COPY: Record<
  AgentInvitationLocale,
  {
    subject: string;
    heading: (firstName: string) => string;
    intro: string;
    cta: string;
    expiresNote: (when: string) => string;
    fallback: string;
    ignoreNote: string;
    signoff: string;
  }
> = {
  en: {
    subject: 'Reset your TGE password',
    heading: (firstName) =>
      firstName ? `Hi ${firstName},` : 'Reset your password',
    intro:
      'We received a request to reset your password. Click the button below to set a new one. If this wasn’t you, you can safely ignore this email — your password stays as it is.',
    cta: 'Reset password',
    expiresNote: (when) => `This link expires on ${when}.`,
    fallback:
      'If the button doesn’t work, paste this URL into your browser:',
    ignoreNote:
      'Only the most recent reset link works. Older links are invalidated as soon as this one is issued.',
    signoff: 'The TGE team',
  },
  ro: {
    subject: 'Resetează parola TGE',
    heading: (firstName) =>
      firstName ? `Bună ${firstName},` : 'Resetează-ți parola',
    intro:
      'Am primit o cerere de resetare a parolei. Apasă butonul de mai jos pentru a-ți seta una nouă. Dacă nu ai făcut tu cererea, poți ignora în siguranță acest email — parola rămâne neschimbată.',
    cta: 'Resetează parola',
    expiresNote: (when) => `Acest link expiră pe ${when}.`,
    fallback:
      'Dacă butonul nu funcționează, copiază acest URL în browser:',
    ignoreNote:
      'Doar cel mai recent link de resetare funcționează. Link-urile anterioare se invalidează în momentul emiterii celui nou.',
    signoff: 'Echipa TGE',
  },
  fr: {
    subject: 'Réinitialisez votre mot de passe TGE',
    heading: (firstName) =>
      firstName ? `Bonjour ${firstName},` : 'Réinitialisez votre mot de passe',
    intro:
      "Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau. Si ce n'est pas vous, vous pouvez ignorer cet e-mail — votre mot de passe reste inchangé.",
    cta: 'Réinitialiser le mot de passe',
    expiresNote: (when) => `Ce lien expire le ${when}.`,
    fallback:
      "Si le bouton ne fonctionne pas, collez cette URL dans votre navigateur :",
    ignoreNote:
      "Seul le lien de réinitialisation le plus récent fonctionne. Les liens précédents sont invalidés dès qu'un nouveau est émis.",
    signoff: "L'équipe TGE",
  },
  de: {
    subject: 'Setzen Sie Ihr TGE-Passwort zurück',
    heading: (firstName) =>
      firstName ? `Hallo ${firstName},` : 'Setzen Sie Ihr Passwort zurück',
    intro:
      'Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten. Klicken Sie auf die Schaltfläche unten, um ein neues festzulegen. Wenn Sie das nicht waren, können Sie diese E-Mail ignorieren — Ihr Passwort bleibt unverändert.',
    cta: 'Passwort zurücksetzen',
    expiresNote: (when) => `Dieser Link läuft am ${when} ab.`,
    fallback:
      'Wenn die Schaltfläche nicht funktioniert, fügen Sie diese URL in Ihren Browser ein:',
    ignoreNote:
      'Nur der neueste Reset-Link funktioniert. Frühere Links werden ungültig, sobald ein neuer ausgestellt wird.',
    signoff: 'Das TGE-Team',
  },
};

const DATE_LOCALE_MAP: Record<AgentInvitationLocale, string> = {
  en: 'en-GB',
  ro: 'ro-RO',
  fr: 'fr-FR',
  de: 'de-DE',
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

export function renderPasswordReset(
  input: PasswordResetInput,
): RenderedEmail {
  const locale: AgentInvitationLocale = input.locale ?? 'ro';
  const copy = COPY[locale];
  const expires = new Intl.DateTimeFormat(DATE_LOCALE_MAP[locale], {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(input.expiresAt);

  const safeUrl = escapeHtml(input.resetUrl);
  const safeFirstName = input.firstName ? escapeHtml(input.firstName) : '';

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:24px;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;">${copy.heading(safeFirstName)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#3a3a3a;">${copy.intro}</p>
        <p style="margin:0 0 28px;">
          <a href="${safeUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:500;font-size:15px;">
            ${copy.cta}
          </a>
        </p>
        <p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">${copy.expiresNote(expires)}</p>
        <p style="margin:0 0 20px;font-size:13px;color:#6b6b6b;">
          ${copy.fallback}<br />
          <a href="${safeUrl}" style="color:#6b6b6b;word-break:break-all;">${safeUrl}</a>
        </p>
        <p style="margin:0 0 0;font-size:12px;color:#8a8a8a;">${copy.ignoreNote}</p>
        <p style="margin:20px 0 0;font-size:13px;color:#6b6b6b;">${copy.signoff}</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    copy.heading(input.firstName ?? ''),
    '',
    copy.intro,
    '',
    `${copy.cta}: ${input.resetUrl}`,
    '',
    copy.expiresNote(expires),
    '',
    copy.ignoreNote,
    '',
    copy.signoff,
  ].join('\n');

  return { subject: copy.subject, html, text };
}
