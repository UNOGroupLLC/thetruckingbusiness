/**
 * Owner notification email templates — branded HTML (inline styles for email clients).
 * Brand: navy #0b2e4f / #072033, highway yellow #f5c400, mist #f4f7fa,
 * charcoal #22303c, steel #5b6b7b. Pure builders, no secrets here.
 * Sent via lib/server.ts sendOwnerEmail() when RESEND_API_KEY + OWNER_EMAIL are set.
 */

const NAVY = '#0b2e4f';
const NAVY_DARK = '#072033';
const YELLOW = '#f5c400';
const MIST = '#f4f7fa';
const CHARCOAL = '#22303c';
const STEEL = '#5b6b7b';
const LIGHT_STEEL = '#8fa3b8';
const BORDER = '#e5e7eb';

const FONT = "'Public Sans',Arial,Helvetica,sans-serif";
const HEADING_FONT = "'Libre Franklin',Arial,Helvetica,sans-serif";

function shell(title: string, kicker: string, body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:${MIST};font-family:${FONT};color:${CHARCOAL};">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${MIST};padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(7,32,51,0.08);">
<tr><td style="background:${NAVY_DARK};padding:30px 34px 26px;">
<p style="margin:0 0 10px;color:${YELLOW};font-size:11px;letter-spacing:3px;font-weight:bold;">THETRUCKINGBUSINESS.COM</p>
<h1 style="margin:0;color:#ffffff;font-family:${HEADING_FONT};font-size:25px;font-weight:800;line-height:1.25;">${title}</h1>
<p style="margin:10px 0 0;color:${LIGHT_STEEL};font-size:13px;">${kicker}</p>
</td></tr>
<tr><td style="background:${YELLOW};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:30px 34px 10px;">${body}</td></tr>
<tr><td style="background:${MIST};padding:18px 34px;border-top:1px solid ${BORDER};">
<p style="margin:0;color:${STEEL};font-size:12px;line-height:1.6;">Automated owner notification from your website. Reply to the customer directly at their email address.</p>
</td></tr>
</table>
<p style="margin:18px 0 0;color:${LIGHT_STEEL};font-size:11px;line-height:1.6;max-width:600px;">TheTruckingBusiness.com — an independent private company, not affiliated with FMCSA or USDOT.</p>
</td></tr>
</table>
</body></html>`;
}

function kv(rows: [string, string][]): string {
  if (rows.length === 0) return '';
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;font-size:14px;">${rows
    .map(
      ([k, v], i) =>
        `<tr><td style="padding:10px 16px 10px 0;color:${STEEL};vertical-align:top;white-space:nowrap;font-size:13px;${
          i > 0 ? `border-top:1px solid ${BORDER};` : ''
        }">${k}</td><td style="padding:10px 0;font-weight:bold;color:${CHARCOAL};vertical-align:top;${
          i > 0 ? `border-top:1px solid ${BORDER};` : ''
        }">${v}</td></tr>`
    )
    .join('')}</table>`;
}

function highlightBox(label: string, value: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 22px;background:${MIST};border-radius:10px;border-left:4px solid ${YELLOW};">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 4px;color:${STEEL};font-size:12px;letter-spacing:1px;font-weight:bold;text-transform:uppercase;">${label}</p>
<p style="margin:0;color:${NAVY};font-family:${HEADING_FONT};font-size:28px;font-weight:800;">${value}</p>
</td></tr>
</table>`;
}

function note(text: string): string {  return `<p style="font-size:14px;line-height:1.65;color:${CHARCOAL};margin:20px 0 24px;">${text}</p>`;
}

function fmtCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function billingLabel(billing?: string): string {
  if (billing === '/year') return 'Annual';
  if (billing === '/month') return 'Monthly';
  return 'One-time';
}

/**
 * The customer receipt — matches the approved receipt mockup (v3):
 * narrow paper card, centered logo + wordmark, dashed dividers,
 * RECEIPT title, meta rows, line item, subtotal / tax / total,
 * real payment method from Stripe, thank-you. One font (Libre Franklin),
 * one blue (#0b2e4f). Sales tax shows $0.00 — none collected at checkout.
 */
function receiptCard(o: OrderInfo, logoUrl: string): string {
  const cents =
    typeof o.amountCents === 'number' && Number.isFinite(o.amountCents)
      ? Math.round(o.amountCents)
      : null;
  const money = cents === null ? esc(o.amount) : fmtCents(cents);
  const billingSub =
    o.billing === '/year'
      ? 'Annual subscription'
      : o.billing === '/month'
        ? 'Monthly subscription'
        : 'One-time payment';
  const dash = `<div style="border-top:2px dashed ${BORDER};margin:16px 0 0;"></div>`;
  const metaRow = (k: string, v: string) =>
    `<tr><td style="color:${STEEL};padding:3px 0;">${k}</td><td align="right" style="color:${CHARCOAL};padding:3px 0;">${v}</td></tr>`;
  const sumRow = (k: string, v: string) =>
    `<tr><td style="color:${STEEL};padding:4px 0;font-size:14px;">${k}</td><td align="right" style="color:${CHARCOAL};padding:4px 0;font-size:14px;">${v}</td></tr>`;
  return (
    `<table width="440" cellpadding="0" cellspacing="0" role="presentation" style="max-width:440px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 3px 16px rgba(7,32,51,0.10);">` +
    `<tr><td style="background:${NAVY};height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>` +
    `<tr><td style="padding:30px 36px 8px;" align="center">` +
    `<img src="${logoUrl}" width="96" alt="The Trucking Business" style="display:block;">` +
    `<p style="margin:4px 0 0;color:${NAVY};font-family:${HEADING_FONT};font-size:21px;font-weight:900;letter-spacing:-0.04em;line-height:0.95;">THE TRUCKING<br>BUSINESS</p>` +
    `<p style="margin:8px 0 0;color:${STEEL};font-size:12.5px;letter-spacing:0.5px;">thetruckingbusiness.com</p>` +
    `<p style="margin:4px 0 0;color:${STEEL};font-size:12px;">orders@thetruckingbusiness.com</p>` +
    `</td></tr>` +
    `<tr><td style="padding:18px 36px 0;" align="center">` +
    `<p style="margin:0;color:${NAVY};font-size:13px;font-weight:800;letter-spacing:4px;">RECEIPT</p>${dash}</td></tr>` +
    `<tr><td style="padding:16px 36px 0;">` +
    `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:13.5px;">` +
    metaRow('Order', `<strong>${esc(o.id)}</strong>`) +
    metaRow('Date', esc(o.createdAt)) +
    metaRow('Billed to', `${esc(o.buyerName)}<br><span style="color:${STEEL};">${esc(o.buyerEmail)}</span>`) +
    `</table>${dash}</td></tr>` +
    `<tr><td style="padding:16px 36px 0;">` +
    `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:14px;"><tr>` +
    `<td style="color:${CHARCOAL};padding:4px 0;line-height:1.5;">${esc(o.packageName)}<br><span style="color:${STEEL};font-size:12.5px;">${billingSub}</span></td>` +
    `<td align="right" valign="top" style="color:${CHARCOAL};font-weight:600;white-space:nowrap;padding:4px 0;">${money}</td>` +
    `</tr></table><div style="border-top:2px dashed ${BORDER};margin:14px 0 0;"></div></td></tr>` +
    `<tr><td style="padding:14px 36px 0;">` +
    `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">` +
    sumRow('Subtotal', money) +
    sumRow('Sales tax', fmtCents(0)) +
    `<tr><td style="color:${NAVY};padding:10px 0 2px;font-size:14px;font-weight:700;">TOTAL</td><td align="right" style="color:${NAVY};padding:10px 0 2px;font-size:14px;font-weight:700;white-space:nowrap;">${money}</td></tr>` +
    `</table><div style="border-top:2px dashed ${BORDER};margin:14px 0 0;"></div></td></tr>` +
    `<tr><td style="padding:14px 36px 0;">` +
    `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:13.5px;">` +
    (o.payMethod
      ? `<tr><td style="color:${STEEL};padding:3px 0;">Payment method</td><td align="right" style="color:${CHARCOAL};font-weight:600;padding:3px 0;">${esc(o.payMethod)}</td></tr>`
      : '') +
    `<tr><td style="color:${STEEL};padding:3px 0;">Processed by</td><td align="right" style="color:${CHARCOAL};padding:3px 0;">Stripe</td></tr>` +
    `</table>${dash}</td></tr>` +
    `<tr><td align="center" style="padding:18px 36px 30px;">` +
    `<p style="margin:0;color:${NAVY};font-size:14px;font-weight:700;">Thank you for your business!</p>` +
    `<p style="margin:8px 0 0;color:${STEEL};font-size:11.5px;line-height:1.6;">Questions? Reply to this email —<br>we typically respond within one business day.</p>` +
    `</td></tr></table>`
  );
}

function sectionTitle(text: string): string {
  return `<h3 style="color:${NAVY};font-family:${HEADING_FONT};font-size:17px;margin:24px 0 6px;">${text}</h3>`;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface OrderInfo {
  id: string;
  packageName: string;
  amount: string;
  /** Structured receipt fields — preferred over parsing the display `amount`. */
  amountCents?: number;
  /** 'one-time' | '/year' | '/month' */
  billing?: string;
  /** Real payment method label from Stripe, e.g. "Visa •••• 4242". Never fabricated. */
  payMethod?: string;
  buyerName: string;
  buyerEmail: string;
  createdAt: string;
  buyerPhone?: string;
}

export function purchaseEmail(o: OrderInfo, adminUrl?: string): { subject: string; html: string } {
  return {
    subject: `New order ${o.id} — ${o.packageName} (${o.amount})`,
    html: shell(
      'New purchase',
      'A customer just checked out on your website.',
      highlightBox('Amount', esc(o.amount)) +
        kv([
          ['Order ID', esc(o.id)],
          ['Package', esc(o.packageName)],
          ['Customer', esc(o.buyerName)],
          ['Email', esc(o.buyerEmail)],
          ['Placed', esc(o.createdAt)],
        ]) +
        (adminUrl ? ctaButton('View order in admin panel', adminUrl) : '') +
        note(
          'Next: the customer completes the intake form. You&rsquo;ll get another email with their answers the moment they submit.'
        )
    ),
  };
}

export function intakeEmail(
  o: OrderInfo,
  answers: Record<string, string>,
  labels: Record<string, string>,
  corrected = false
): { subject: string; html: string } {
  const rows = Object.entries(answers)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]): [string, string] => [esc(labels[k] ?? k), esc(v)]);
  return {
    subject: corrected
      ? `Intake corrected — order ${o.id} (${o.packageName})`
      : `Intake submitted — order ${o.id} (${o.packageName})`,
    html: shell(
      corrected ? 'Intake corrected' : 'Intake submitted',
      `Order ${esc(o.id)} — ${esc(o.packageName)}`,
      highlightBox('Customer', `${esc(o.buyerName)}<br><span style="font-size:15px;">${esc(o.buyerEmail)}</span>`) +
        kv([['Order ID', esc(o.id)]]) +
        sectionTitle(corrected ? 'Corrected answers (v2 — use this version)' : 'Intake answers') +
        kv(rows) +
        (corrected
          ? note('The customer used their one correction. They will now be asked to certify these answers as final.')
          : ''),
    ),
  };
}

/** Owner: customer certified their corrections as final — safe to start filing. */
export function intakeCertifiedEmail(
  o: OrderInfo,
  certified: { name: string; date: string }
): { subject: string; html: string } {
  return {
    subject: `Intake certified final — order ${o.id} (${o.packageName})`,
    html: shell(
      'Intake certified final',
      `Order ${esc(o.id)} — ${esc(o.packageName)}`,
      highlightBox('Certified by', `${esc(certified.name)}<br><span style="font-size:15px;">${esc(certified.date)}</span>`) +
        kv([
          ['Order ID', esc(o.id)],
          ['Customer', `${esc(o.buyerName)} &lt;${esc(o.buyerEmail)}&gt;`],
        ]) +
        note(
          'The customer certified their corrected intake as final and it is now locked. You can safely start filing — press “Start filing” on this order in your admin panel.'
        ),
    ),
  };
}

/** Client: a filing document is ready in their portal. */
export function documentReadyEmail(
  o: OrderInfo,
  docLabel: string,
  portalUrl: string
): { subject: string; html: string } {
  return {
    subject: `Your ${docLabel} is ready`,
    html: clientShell(
      'A document is ready for you',
      `Order ${esc(o.id)} — ${esc(o.packageName)}`,
      highlightBox('Document', esc(docLabel)) +
        note('We just added this to your client portal. Download it anytime — it lives under “Your documents.”') +
        ctaButton('View in portal', portalUrl)
    ),
  };
}

/** The order facts the client document emails need (no amounts). */
export interface DocumentEmailInfo {
  id: string;
  packageName: string;
  buyerName: string;
  buyerEmail: string;
}

/** Client: a document they uploaded from the portal was accepted. */
export function documentAcceptedEmail(
  o: DocumentEmailInfo,
  slotLabel: string
): { subject: string; html: string } {
  return {
    subject: `Your ${slotLabel} was accepted`,
    html: clientShell(
      'Your document was accepted',
      `Order ${esc(o.id)} · ${esc(o.packageName)}`,
      highlightBox('Document', esc(slotLabel)) +
        note(
          'Good news: our team checked the document you uploaded and it is accepted. Nothing more is needed from you for this one.'
        )
    ),
  };
}

/** Client: a document they uploaded needs a clearer copy. */
export function documentNeedsNewCopyEmail(
  o: DocumentEmailInfo,
  slotLabel: string,
  staffNote: string,
  portalUrl: string
): { subject: string; html: string } {
  return {
    subject: `We need a clearer copy of your ${slotLabel}`,
    html: clientShell(
      'We need a clearer copy',
      `Order ${esc(o.id)} · ${esc(o.packageName)}`,
      highlightBox('Document', esc(slotLabel)) +
        note(
          'Our team reviewed the copy you uploaded, and we need a clearer one before we can use it. Here is what to fix:'
        ) +
        `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 22px;background:${MIST};border-radius:10px;border-left:4px solid ${YELLOW};"><tr><td style="padding:16px 20px;"><p style="margin:0;font-size:14px;line-height:1.65;color:${CHARCOAL};">${esc(staffNote)}</p></td></tr></table>` +
        note(
          'Sign in to your portal and upload a new copy under “Documents we need from you.” A phone photo is fine as long as every word is clear.'
        ) +
        ctaButton('Go to your portal', portalUrl)
    ),
  };
}

/** Owner: a client uploaded a document from their portal. */
export function documentUploadedByClientEmail(
  info: {
    orderId: string;
    packageName: string;
    buyerName: string;
    buyerEmail: string;
    slotLabel: string;
    fileName: string;
  },
  adminUrl?: string
): { subject: string; html: string } {
  return {
    subject: `New document uploaded for order ${info.orderId}`,
    html: shell(
      'Document uploaded by a client',
      'A client sent a document from their portal.',
      kv([
        ['Order', esc(info.orderId)],
        ['Package', esc(info.packageName)],
        ['Document', esc(info.slotLabel)],
        ['File', esc(info.fileName)],
        ['Customer', `${esc(info.buyerName)} &lt;${esc(info.buyerEmail)}&gt;`],
      ]) +
        (adminUrl ? ctaButton('Review in the admin panel', adminUrl) : '') +
        note(
          'Open the order to view the file. You can accept it there, or ask the client for a clearer copy.'
        )
    ),
  };
}

/** Owner: kickoff call booked. Includes the customer's phone + calendar button. */

export function bookingEmail(
  o: OrderInfo,
  date: string,
  time: string
): { subject: string; html: string } {
  const long = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const phoneRow: [string, string][] = o.buyerPhone
    ? [['Customer phone', esc(o.buyerPhone)]]
    : [];
  const gcal = calendarLink(
    `Kickoff call — ${o.buyerName} (Order ${o.id})`,
    date,
    time,
    `TheTruckingBusiness.com kickoff call. Customer: ${o.buyerName} <${o.buyerEmail}>${o.buyerPhone ? `, phone ${o.buyerPhone}` : ''}. Agenda: login.gov + FMCSA portal + Clearinghouse setup and TPA designation.`
  );
  const gcalButton = gcal
    ? `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:18px 0 4px;">
<tr><td align="center" style="border:2px solid ${NAVY};border-radius:9px;">
<a href="${gcal}" style="display:inline-block;padding:12px 26px;color:${NAVY};font-family:${HEADING_FONT};font-weight:800;font-size:14px;text-decoration:none;">📅 Add to Google Calendar</a>
</td></tr>
</table>`
    : '';
  return {
    subject: `Kickoff call booked — order ${o.id} (${long}, ${time} ET)`,
    html: shell(
      'Kickoff call scheduled',
      `Order ${esc(o.id)}`,
      highlightBox('Call time', `${esc(long)}<br><span style="font-size:19px;">${esc(time)} Eastern</span>`) +
        kv([
          ['Customer', `${esc(o.buyerName)} &lt;${esc(o.buyerEmail)}&gt;`],
          ...phoneRow,
        ]) +
        gcalButton +
        note(
          'Suggested agenda: login.gov + FMCSA portal + Clearinghouse setup and TPA designation (customer enters their own verification codes live).'
        )
    ),
  };
}

/** Owner: a visitor sent the website contact form. Sent with reply-to = sender. */
export function contactEmail(
  name: string,
  email: string,
  topic: string,
  message: string
): { subject: string; html: string } {
  const body = esc(message).replace(/\n/g, '<br>');
  return {
    subject: `Website contact: ${name}`,
    html: shell(
      'Website contact message',
      'Someone wrote in through the contact form on the website.',
      kv([
        ['Name', esc(name)],
        ['Email', esc(email)],
        ['Topic', esc(topic)],
      ]) +
        sectionTitle('Message') +
        `<p style="font-size:14px;line-height:1.65;color:${CHARCOAL};margin:0 0 24px;">${body}</p>` +
        note('Hit reply on this email to answer them — the reply goes straight to their address.')
    ),
  };
}

/* ------------------------- Client-facing emails ------------------------- */

/**
 * How kickoff calls are conducted. Owner-set: change `kind` to 'video' and set
 * `link` to the permanent personal meeting URL (Zoom / Google Meet) if video.
 */
export const CALL_METHOD = {
  kind: 'phone' as 'phone' | 'video',
  /** Shown in the client's booking confirmation. */
  headline: 'We&rsquo;ll call you',
  detail:
    'We&rsquo;ll call you at the phone number from your intake form, right at your scheduled time. Please keep your phone nearby and have your login.gov sign-in ready.',
  link: '',
};

function inclusionsList(items: string[]): string {
  if (!items || items.length === 0) return '';
  return (
    `<h3 style="color:${NAVY};font-family:${HEADING_FONT};font-size:17px;margin:24px 0 6px;">What&rsquo;s included</h3>` +
    `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">${items
      .map(
        (item, i) =>
          `<tr><td style="padding:7px 0;vertical-align:top;width:24px;color:${YELLOW};font-weight:bold;font-size:15px;${
            i > 0 ? `border-top:1px solid ${BORDER};` : ''
          }">✓</td><td style="padding:7px 0;vertical-align:top;font-size:14px;color:${CHARCOAL};${
            i > 0 ? `border-top:1px solid ${BORDER};` : ''
          }">${esc(item)}</td></tr>`
      )
      .join('')}</table>`
  );
}

/** Google Calendar "add event" link for a 1-hour slot (times are Eastern). */
function calendarLink(title: string, date: string, time: string, details: string): string {
  const m = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return '';
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = date.replace(/-/g, '');
  const start = `${d}T${pad(h)}${m[2]}00`;
  const end = `${d}T${pad(h + 1)}${m[2]}00`;
  const q = encodeURIComponent;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${q(title)}&dates=${start}/${end}&ctz=America/New_York&details=${q(details)}`;
}

function ctaButton(label: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0 8px;">
<tr><td align="center" style="background:${YELLOW};border-radius:9px;">
<a href="${esc(url)}" style="display:inline-block;padding:15px 32px;color:${NAVY_DARK};font-family:${HEADING_FONT};font-weight:800;font-size:15px;text-decoration:none;">${label}</a>
</td></tr>
</table>`;
}

function clientShell(title: string, kicker: string, body: string): string {
  return shell(title, kicker, body).replace(
    'Automated owner notification from your website. Reply to the customer directly at their email address.',
    'Questions? Just reply to this email — a real person reads every reply.'
  );
}

export function clientPurchaseEmail(
  o: OrderInfo,
  intakeUrl: string,
  inclusions: string[] = [],
  logoUrl: string = 'https://www.thetruckingbusiness.com/logo-receipt.png'
): { subject: string; html: string } {
  const F = HEADING_FONT;
  const nextCard =
    `<table width="440" cellpadding="0" cellspacing="0" role="presentation" style="max-width:440px;width:100%;margin-top:22px;">` +
    `<tr><td style="background:#ffffff;border-radius:12px;padding:24px 30px;box-shadow:0 3px 16px rgba(7,32,51,0.08);">` +
    `<p style="margin:0;color:${NAVY};font-family:${F};font-size:16px;font-weight:800;">What happens next</p>` +
    `<p style="margin:10px 0 18px;color:${CHARCOAL};font-size:13.5px;line-height:1.65;"><strong>Step 1:</strong> your intake form is below &mdash; it contains everything we need to start your filing. If you need to change anything, just click through and update your answers.</p>` +
    `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;"><tr><td align="center" style="background:${YELLOW};border-radius:10px;"><a href="${esc(intakeUrl)}" style="display:inline-block;padding:14px 34px;color:${NAVY};font-family:${F};font-size:15px;font-weight:800;text-decoration:none;">Your intake form</a></td></tr></table>` +
    `<p style="margin:18px 0 0;color:${CHARCOAL};font-size:13.5px;line-height:1.65;"><strong>Step 2:</strong> we review everything and get to work. You&rsquo;ll get an email the moment your intake is received.</p>` +
    `</td></tr></table>`;
  return {
    subject: `Your order is confirmed — ${o.packageName} (Order ${o.id})`,
    html:
      `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:${MIST};font-family:${F};color:${CHARCOAL};">` +
      `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${MIST};padding:36px 16px;"><tr><td align="center">` +
      `<table width="440" cellpadding="0" cellspacing="0" role="presentation" style="max-width:440px;width:100%;margin-bottom:20px;"><tr><td align="center" style="padding:6px 0 0;">` +
      `<p style="margin:0;color:${NAVY};font-size:15px;font-weight:800;letter-spacing:2px;">YOUR ORDER IS CONFIRMED</p>` +
      `<p style="margin:8px 0 0;color:${STEEL};font-size:13px;">Thank you &mdash; here is your receipt.</p>` +
      `</td></tr></table>` +
      receiptCard(o, logoUrl) +
      nextCard +
      `<p style="margin:20px 0 0;color:${STEEL};font-size:11px;line-height:1.6;max-width:440px;">TheTruckingBusiness.com &mdash; an independent private company, not affiliated with FMCSA or USDOT.</p>` +
      `</td></tr></table></body></html>`,
  };
}

export function clientIntakeEmail(o: OrderInfo): { subject: string; html: string } {
  return {
    subject: `We received your intake — order ${o.id}`,
    html: clientShell(
      'Intake received — we&rsquo;re on it',
      `Order ${esc(o.id)} — ${esc(o.packageName)}`,
      note(
        'Thanks for completing your intake form. Our team is reviewing your information now and will begin your filing right away.'
      ) +
        note(
          'If anything is missing or unclear, we&rsquo;ll reach out at this email address. Otherwise, sit back — we&rsquo;ll keep you posted at every step.'
        )
    ),
  };
}

export function clientBookingEmail(
  o: OrderInfo,
  date: string,
  time: string
): { subject: string; html: string } {
  const long = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const meetLine =
    CALL_METHOD.kind === 'video' && CALL_METHOD.link
      ? `<p style="font-size:14px;line-height:1.65;color:${CHARCOAL};margin:0 0 6px;"><strong>Join link:</strong> <a href="${esc(CALL_METHOD.link)}" style="color:${NAVY};font-weight:bold;">${esc(CALL_METHOD.link)}</a></p>`
      : '';
  const gcal = calendarLink(
    'Kickoff call — TheTruckingBusiness.com',
    date,
    time,
    `Kickoff call for order ${o.id} (${o.packageName}). ${CALL_METHOD.headline}.`
  );
  const gcalButton = gcal
    ? `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:18px 0 4px;">
<tr><td align="center" style="border:2px solid ${NAVY};border-radius:9px;">
<a href="${gcal}" style="display:inline-block;padding:12px 26px;color:${NAVY};font-family:${HEADING_FONT};font-weight:800;font-size:14px;text-decoration:none;">📅 Add to Google Calendar</a>
</td></tr>
</table>`
    : '';
  return {
    subject: `Your kickoff call is booked — ${long}, ${time} ET`,
    html: clientShell(
      'Your kickoff call is booked',
      `Order ${esc(o.id)}`,
      highlightBox('Call time', `${esc(long)}<br><span style="font-size:19px;">${esc(time)} Eastern</span>`) +
        `<h3 style="color:${NAVY};font-family:${HEADING_FONT};font-size:17px;margin:24px 0 6px;">How we&rsquo;ll meet</h3>` +
        `<p style="font-size:15px;font-weight:bold;color:${CHARCOAL};margin:0 0 6px;">${CALL_METHOD.headline}</p>` +
        `<p style="font-size:14px;line-height:1.65;color:${CHARCOAL};margin:0 0 6px;">${CALL_METHOD.detail}</p>` +
        meetLine +
        gcalButton +
        note(
          '<strong>To prepare:</strong> have your login.gov sign-in handy and be somewhere you can talk for about 30 minutes. We&rsquo;ll walk through the FMCSA portal and Clearinghouse setup together, live.'
        )
    ),
  };
}

/* --------------------- Calculator results (client) --------------------- */

/**
 * Client: the breakdown from one of the free calculators, emailed at the
 * visitor's own request from the results screen. Built on the site email
 * style: Libre Franklin headings, navy #0a1a36, one gray for secondary text.
 * `lines` are plain "Label: value" strings computed by the calculator.
 */
export function calculatorResultsEmail(
  calculatorTitle: string,
  headline: string,
  lines: string[]
): { subject: string; html: string } {
  const C_NAVY = '#0a1a36';
  const C_YELLOW = '#ffc61a';
  const C_INK = '#16233c';
  const C_GRAY = '#5b6a82';
  const C_BG = '#f6f7f9';
  const C_BORDER = '#dde3ec';
  const rows = lines
    .map((line, i) => {
      const idx = line.indexOf(': ');
      const label = idx > 0 ? line.slice(0, idx) : line;
      const value = idx > 0 ? line.slice(idx + 2) : '';
      const border = i > 0 ? `border-top:1px solid ${C_BORDER};` : '';
      return value
        ? `<tr><td style="padding:10px 16px 10px 0;color:${C_GRAY};font-size:13px;vertical-align:top;${border}">${esc(label)}</td><td align="right" style="padding:10px 0;font-weight:bold;color:${C_INK};vertical-align:top;${border}">${esc(value)}</td></tr>`
        : `<tr><td colspan="2" style="padding:10px 0;color:${C_INK};font-size:14px;${border}">${esc(label)}</td></tr>`;
    })
    .join('');
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:${C_BG};font-family:${FONT};color:${C_INK};">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${C_BG};padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(10,26,54,0.08);">
<tr><td style="background:${C_NAVY};padding:30px 34px 26px;">
<p style="margin:0 0 10px;color:${C_YELLOW};font-size:11px;letter-spacing:3px;font-weight:bold;">THETRUCKINGBUSINESS.COM</p>
<h1 style="margin:0;color:#ffffff;font-family:${HEADING_FONT};font-size:25px;font-weight:800;line-height:1.25;">Your calculator results</h1>
<p style="margin:10px 0 0;color:#c9d6ea;font-size:13px;">${esc(calculatorTitle)}</p>
</td></tr>
<tr><td style="background:${C_YELLOW};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:30px 34px 10px;">
<p style="font-size:14px;line-height:1.65;color:${C_INK};margin:0 0 22px;">You asked for these results from the ${esc(calculatorTitle)} on TheTruckingBusiness.com. Here is the full breakdown from your session.</p>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 22px;background:${C_BG};border-radius:10px;border-left:4px solid ${C_YELLOW};">
<tr><td style="padding:16px 20px;">
<p style="margin:0;color:${C_NAVY};font-family:${HEADING_FONT};font-size:24px;font-weight:800;line-height:1.3;">${esc(headline)}</p>
</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;font-size:14px;">${rows}</table>
<p style="font-size:14px;line-height:1.65;color:${C_INK};margin:22px 0 24px;">If you want help with any of this, reply to this email or visit thetruckingbusiness.com.</p>
</td></tr>
<tr><td style="background:${C_BG};padding:18px 34px;border-top:1px solid ${C_BORDER};">
<p style="margin:0;color:${C_GRAY};font-size:12px;line-height:1.6;">You received this email because you asked for your calculator results on our website. It is a one-time send, not a subscription.</p>
</td></tr>
</table>
<p style="margin:18px 0 0;color:${C_GRAY};font-size:11px;line-height:1.6;max-width:600px;">TheTruckingBusiness.com, an independent private company, not affiliated with FMCSA or USDOT.</p>
</td></tr>
</table>
</body></html>`;
  return { subject: `Your results from the ${calculatorTitle}`, html };
}
