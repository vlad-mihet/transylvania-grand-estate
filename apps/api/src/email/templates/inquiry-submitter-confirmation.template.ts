/**
 * Confirmation sent to the submitter after they post a contact form. Two
 * jobs: (1) reassure them the message arrived, (2) restate the 24-hour
 * response promise that the form copy already shows. Localised across all
 * four public-facing languages because this lands in a customer's inbox.
 */

import type { EmailTemplateOutput } from './agent-invitation.template';

export type InquirySubmitterLocale = 'en' | 'ro' | 'fr' | 'de';

export interface InquirySubmitterConfirmationInput {
  submitterName: string;
  /** Brand display name, e.g. "Transylvania Grand Estate" or "Reveria". */
  brandName: string;
  /** The plain-text message the user submitted, echoed back verbatim. */
  message: string;
  /** Property/developer/etc. the inquiry referenced, when known. */
  entityName?: string;
  locale?: InquirySubmitterLocale;
}

const COPY: Record<
  InquirySubmitterLocale,
  {
    subject: (brand: string) => string;
    heading: (firstName: string) => string;
    body: (brand: string) => string;
    aboutLabel: string;
    yourMessageLabel: string;
    closing: string;
    signoff: (brand: string) => string;
  }
> = {
  en: {
    subject: (brand) => `We received your message — ${brand}`,
    heading: (first) => `Thank you, ${first}.`,
    body: (brand) =>
      `We received your message and a member of the ${brand} team will get back to you within 24 hours. If your inquiry is urgent, please reply to this email and we will reach you sooner.`,
    aboutLabel: 'Regarding',
    yourMessageLabel: 'Your message',
    closing: 'In the meantime, feel free to keep browsing our listings.',
    signoff: (brand) => `Warm regards,\nThe ${brand} team`,
  },
  ro: {
    subject: (brand) => `Am primit mesajul tău — ${brand}`,
    heading: (first) => `Mulțumim, ${first}.`,
    body: (brand) =>
      `Am primit mesajul tău și un membru al echipei ${brand} îți va răspunde în maximum 24 de ore. Dacă cererea ta este urgentă, te rugăm să răspunzi la acest email și vom reveni cât mai curând.`,
    aboutLabel: 'Referitor la',
    yourMessageLabel: 'Mesajul tău',
    closing: 'Între timp, te invităm să continui explorarea ofertelor noastre.',
    signoff: (brand) => `Cu prietenie,\nEchipa ${brand}`,
  },
  fr: {
    subject: (brand) => `Nous avons bien reçu votre message — ${brand}`,
    heading: (first) => `Merci, ${first}.`,
    body: (brand) =>
      `Nous avons bien reçu votre message et un membre de l'équipe ${brand} vous répondra sous 24 heures. Si votre demande est urgente, n'hésitez pas à répondre à cet e-mail et nous vous contacterons plus rapidement.`,
    aboutLabel: 'Concernant',
    yourMessageLabel: 'Votre message',
    closing: "En attendant, n'hésitez pas à parcourir nos offres.",
    signoff: (brand) => `Cordialement,\nL'équipe ${brand}`,
  },
  de: {
    subject: (brand) => `Wir haben Ihre Nachricht erhalten — ${brand}`,
    heading: (first) => `Vielen Dank, ${first}.`,
    body: (brand) =>
      `Wir haben Ihre Nachricht erhalten, und ein Mitglied des ${brand}-Teams meldet sich innerhalb von 24 Stunden bei Ihnen. Sollte Ihre Anfrage dringend sein, antworten Sie einfach auf diese E-Mail und wir kontaktieren Sie schneller.`,
    aboutLabel: 'Betreff',
    yourMessageLabel: 'Ihre Nachricht',
    closing: 'In der Zwischenzeit laden wir Sie ein, unsere Angebote zu entdecken.',
    signoff: (brand) => `Mit freundlichen Grüßen,\nDas ${brand}-Team`,
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

const firstNameOf = (full: string): string => {
  const trimmed = full.trim();
  const space = trimmed.indexOf(' ');
  return space > 0 ? trimmed.slice(0, space) : trimmed;
};

export function renderInquirySubmitterConfirmation(
  input: InquirySubmitterConfirmationInput,
): EmailTemplateOutput {
  const locale: InquirySubmitterLocale = input.locale ?? 'en';
  const copy = COPY[locale];
  const firstName = firstNameOf(input.submitterName);
  const safeFirst = escapeHtml(firstName);
  const safeBrand = escapeHtml(input.brandName);
  const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br />');
  const safeEntity = input.entityName ? escapeHtml(input.entityName) : null;

  const aboutBlock = safeEntity
    ? `<p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">${copy.aboutLabel}</p>
        <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;font-weight:500;">${safeEntity}</p>`
    : '';

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:24px;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;">${copy.heading(safeFirst)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3a3a3a;">${copy.body(safeBrand)}</p>
        ${aboutBlock}
        <div style="margin:0 0 24px;padding:16px;background:#f6f5f1;border-radius:8px;">
          <p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">${copy.yourMessageLabel}</p>
          <p style="margin:0;font-size:14px;line-height:1.55;color:#1a1a1a;white-space:pre-line;">${safeMessage}</p>
        </div>
        <p style="margin:0 0 24px;font-size:14px;color:#3a3a3a;">${copy.closing}</p>
        <p style="margin:0;font-size:13px;color:#6b6b6b;white-space:pre-line;">${escapeHtml(copy.signoff(input.brandName))}</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    copy.heading(firstName),
    '',
    copy.body(input.brandName),
    '',
    ...(input.entityName
      ? [`${copy.aboutLabel}: ${input.entityName}`, '']
      : []),
    `${copy.yourMessageLabel}:`,
    input.message,
    '',
    copy.closing,
    '',
    copy.signoff(input.brandName),
  ].join('\n');

  return { subject: copy.subject(input.brandName), html, text };
}
