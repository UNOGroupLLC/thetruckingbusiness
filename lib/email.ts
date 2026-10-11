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

function sectionTitle(text: string): string {
  return `<h3 style="color:${NAVY};font-family:${HEADING_FONT};font-size:17px;margin:24px 0 6px;">${text}</h3>`;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface OrderInfo {
  id: string;
  packageName: string;
  amount: string;
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
  inclusions: string[] = []
): { subject: string; html: string } {
  return {
    subject: `Your order is confirmed — ${o.packageName} (Order ${o.id})`,
    html: clientShell(
      'Thank you — your order is confirmed',
      'Here&rsquo;s what happens next.',
      highlightBox('Order total', esc(o.amount)) +
        kv([
          ['Order ID', esc(o.id)],
          ['Package', esc(o.packageName)],
          ['Order date', esc(o.createdAt)],
          ['Email', esc(o.buyerEmail)],
        ]) +
        inclusionsList(inclusions) +
        note(
          '<strong>Step 1:</strong> your intake form is below &mdash; it contains everything we need to start your filing. If you need to change anything, just click through and update your answers.'
        ) +
        ctaButton('Your intake form', intakeUrl) +
        note(
          '<strong>Step 2:</strong> we review everything and get to work. You&rsquo;ll get an email the moment your intake is received.'
        )
    ),
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
