/**
 * Limited power of attorney — the text shown inside the authority intake
 * (Complete Package and Authority Startup) and signed there by the client.
 *
 * POA_VERSION: "2026-10-15 sample, pending attorney finalization"
 *
 * The client reads this in the final intake step, certifies they are
 * authorized to sign it, and signs with a typed legal name + date. On
 * submission the server generates a standalone signed copy (see
 * buildSignedPoaHtml) and stores it with the order's documents, so the
 * business always holds the signed POA on file.
 */

export const POA_TITLE = 'Limited Power of Attorney';

export interface PoaSection {
  /** Empty string for the opening paragraph, which has no heading. */
  heading: string;
  body: string;
}

export const POA_SECTIONS: PoaSection[] = [
  {
    heading: '',
    body: 'I, the undersigned carrier, appoint UNO Group LLC, doing business as The Trucking Business, as my agent for the limited purposes in this document.',
  },
  {
    heading: 'What my agent may do',
    body: 'Prepare and submit my FMCSA operating authority application (Form OP-1), my BOC-3 designation of process agent, and my UCR registration, and communicate with the agencies about those filings.',
  },
  {
    heading: 'What my agent may not do',
    body: "Sign my applicant's oath or any certification that the law requires me to sign myself, open accounts using my personal credentials, or act on any matter not listed above.",
  },
  {
    heading: 'How long it lasts',
    body: 'This appointment starts when I sign and stays in effect until my filings are complete. I may revoke it at any time in writing.',
  },
  {
    heading: 'Electronic signature',
    body: 'By typing my full legal name below, I agree to sign this document electronically and intend it to be as binding as a handwritten signature.',
  },
];

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The signed POA copy saved with the order: a complete standalone HTML
 * document carrying the full POA text as shown to the client, the carrier
 * legal name, the typed signature, the date signed, the order id, and the
 * submission timestamp.
 */
export function buildSignedPoaHtml(input: {
  orderId: string;
  legalName: string;
  signerName: string;
  signDate: string;
  submittedAt: string; // ISO timestamp
}): string {
  const sections = POA_SECTIONS.map((s) =>
    s.heading
      ? `<h2>${esc(s.heading)}</h2><p>${esc(s.body)}</p>`
      : `<p>${esc(s.body)}</p>`
  ).join('\n      ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(POA_TITLE)} (signed), Order ${esc(input.orderId)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #0e1728; max-width: 720px; margin: 40px auto; padding: 0 24px; line-height: 1.65; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin: 22px 0 4px; }
  p { margin: 6px 0; }
  .meta { color: #5b6a82; font-size: 14px; margin-bottom: 24px; }
  .signbox { border: 1px solid #dde3ec; border-radius: 8px; padding: 16px 20px; margin-top: 28px; }
  .signbox p { margin: 4px 0; }
  .sig { font-size: 20px; font-weight: bold; }
</style>
</head>
<body>
  <h1>${esc(POA_TITLE)}</h1>
  <p class="meta">Signed electronically through the intake form at thetruckingbusiness.com.</p>
      ${sections}
  <div class="signbox">
    <p>Carrier: <strong>${esc(input.legalName)}</strong></p>
    <p>Signed by: <span class="sig">${esc(input.signerName)}</span></p>
    <p>Date signed: ${esc(input.signDate)}</p>
    <p>Order: ${esc(input.orderId)}</p>
    <p>Submitted: ${esc(input.submittedAt)}</p>
  </div>
</body>
</html>
`;
}
