/**
 * Owner notification email templates — pure HTML builders (no secrets here).
 * Sent via lib/server.ts sendOwnerEmail() when RESEND_API_KEY + OWNER_EMAIL are set.
 */

function shell(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1a1a1a;">
<h2 style="color:#0f2a4a;margin:0 0 4px;">${title}</h2>
<p style="color:#666;font-size:13px;margin:0 0 20px;">TheTruckingBusiness.com — owner notification</p>
${body}
<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;" />
<p style="color:#999;font-size:12px;">Phase 2 automated notification. Reply to the customer directly at their email below.</p>
</body></html>`;
}

function kv(rows: [string, string][]): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;color:#666;vertical-align:top;white-space:nowrap;">${k}</td><td style="padding:8px 0;font-weight:bold;">${v}</td></tr>`
    )
    .join('')}</table>`;
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
}

export function purchaseEmail(o: OrderInfo): { subject: string; html: string } {
  return {
    subject: `New order ${o.id} — ${o.packageName} (${o.amount})`,
    html: shell(
      `💰 New purchase: ${esc(o.packageName)}`,
      kv([
        ['Order ID', esc(o.id)],
        ['Package', esc(o.packageName)],
        ['Amount', esc(o.amount)],
        ['Customer', esc(o.buyerName)],
        ['Email', esc(o.buyerEmail)],
        ['Placed', esc(o.createdAt)],
      ]) +
        `<p style="font-size:14px;">Next: the customer completes the intake form. You'll get another email with their answers the moment they submit.</p>`
    ),
  };
}

export function intakeEmail(
  o: OrderInfo,
  answers: Record<string, string>,
  labels: Record<string, string>
): { subject: string; html: string } {
  const rows = Object.entries(answers)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]): [string, string] => [esc(labels[k] ?? k), esc(v)]);
  return {
    subject: `Intake submitted — order ${o.id} (${o.packageName})`,
    html: shell(
      `📋 Intake submitted for order ${esc(o.id)}`,
      kv([
        ['Order ID', esc(o.id)],
        ['Package', esc(o.packageName)],
        ['Customer', `${esc(o.buyerName)} &lt;${esc(o.buyerEmail)}&gt;`],
      ]) +
        `<h3 style="color:#0f2a4a;margin:20px 0 8px;">Intake answers</h3>` +
        kv(rows) +
        `<p style="font-size:14px;">This is everything you need to start the filing. The limited-POA and consortium authorizations are included above if signed.</p>`
    ),
  };
}

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
  return {
    subject: `📅 Kickoff call booked — order ${o.id} (${long}, ${time} ET)`,
    html: shell(
      `📅 Kickoff call scheduled`,
      kv([
        ['Order ID', esc(o.id)],
        ['Customer', `${esc(o.buyerName)} &lt;${esc(o.buyerEmail)}&gt;`],
        ['Date', esc(long)],
        ['Time', `${esc(time)} Eastern`],
      ]) +
        `<p style="font-size:14px;">Suggested agenda: login.gov + FMCSA portal + Clearinghouse setup and TPA designation (customer enters their own verification codes live). Add this to your calendar.</p>`
    ),
  };
}
