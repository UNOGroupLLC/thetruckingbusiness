/**
 * Calendar helpers for kickoff-call bookings.
 *
 * Slots are picked as an Eastern wall-clock date + label ("2026-10-16",
 * "11:00 AM"). The booking emails already link to a Google Calendar
 * template in America/New_York; the .ics invite attached to those emails
 * needs the same moment expressed in UTC, correctly across EST/EDT, so
 * this module converts with Intl (no new dependencies).
 */

const EASTERN_TZ = 'America/New_York';

/** Parse a slot label like "11:00 AM" into a 24-hour hour/minute. */
function parseTimeLabel(timeLabel: string): { hour: number; minute: number } | null {
  const m = timeLabel.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) hour += 12;
  return { hour, minute: parseInt(m[2], 10) };
}

/**
 * Offset of America/New_York from UTC at the given instant, in ms, such
 * that eastern wall time = UTC instant + offset (negative west of UTC).
 */
function easternOffsetMs(atUtc: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(atUtc);
  const v: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') v[p.type] = Number(p.value);
  }
  const wallAsUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour % 24, v.minute, v.second);
  return wallAsUtc - Math.floor(atUtc.getTime() / 1000) * 1000;
}

/**
 * The UTC instant for an Eastern wall-clock date ("YYYY-MM-DD") and slot
 * label ("11:00 AM"). Falls back to midnight Eastern for a bad label.
 */
export function easternToUtc(date: string, timeLabel: string): Date {
  const t = parseTimeLabel(timeLabel);
  const [y, mo, d] = date.split('-').map((n) => parseInt(n, 10));
  const guess = Date.UTC(y, mo - 1, d, t?.hour ?? 0, t?.minute ?? 0);
  // Correct the naive guess by the zone offset, then once more at the
  // corrected instant so DST transition days land on the right offset.
  const firstPass = guess - easternOffsetMs(new Date(guess));
  return new Date(guess - easternOffsetMs(new Date(firstPass)));
}

/** UTC instant in iCalendar basic format: YYYYMMDDTHHMMSSZ. */
function icsUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Escape a TEXT value per RFC 5545 (backslash, semicolon, comma, newline). */
function escText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Parameter values (CN=) cannot carry separators; strip them instead. */
function escParam(s: string): string {
  return s.replace(/[,;:"]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Fold a content line at 75 octets per RFC 5545 (continuation = CRLF + space). */
function foldLine(line: string): string {
  if (Buffer.byteLength(line, 'utf8') <= 75) return line;
  const out: string[] = [];
  let rest = line;
  let limit = 75;
  while (Buffer.byteLength(rest, 'utf8') > limit) {
    let cut = 0;
    let bytes = 0;
    for (const ch of rest) {
      const b = Buffer.byteLength(ch, 'utf8');
      if (bytes + b > limit) break;
      bytes += b;
      cut += ch.length;
    }
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
    limit = 74; // continuation lines spend one octet on the leading space
  }
  out.push(rest);
  return out.join('\r\n ');
}

export interface BookingIcsArgs {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  date: string; // YYYY-MM-DD (Eastern)
  time: string; // slot label, e.g. "11:00 AM" (Eastern)
}

/**
 * A valid RFC 5545 VCALENDAR (METHOD:REQUEST) holding the one-hour
 * kickoff call, ready to attach to the booking emails as an invite.
 * CRLF line endings throughout.
 */
export function bookingIcs(args: BookingIcsArgs): string {
  const start = easternToUtc(args.date, args.time);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const description =
    `Phone call with The Trucking Business about order ${args.orderId}. ` +
    'We will call you at the phone number from your intake form. ' +
    'Please have your login.gov sign-in handy.';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Trucking Business//Kickoff Call//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${args.orderId}@thetruckingbusiness.com`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${escText(`Kickoff call — The Trucking Business (Order ${args.orderId})`)}`,
    `DESCRIPTION:${escText(description)}`,
    'LOCATION:Phone call',
    'ORGANIZER;CN=The Trucking Business:mailto:orders@thetruckingbusiness.com',
    `ATTENDEE;CN=${escParam(args.buyerName)};RSVP=TRUE:mailto:${args.buyerEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
