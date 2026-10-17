'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  useTtb,
  updatePackage,
  updateCopy,
  getCallBooking,
  getPackage,
  startFiling,
  addDocument,
  removeDocument,
  formatUSD,
  formatDate,
  type OrderDocument,
} from '@/lib/store';
import { syncFiling, syncDocument, adminKeyHeaders, storedAdminKey } from '@/lib/sync';
import type { Package, OrderRecord } from '@/lib/store';
import Field from '@/components/Field';

/**
 * OWNER ADMIN — built to the approved v7 design (sidebar, work queue,
 * assignment, board view, returns tracking, inquiries inbox, team blueprint).
 * Solo build: the signed-in identity is the Owner (ADMIN_KEY gate). Every
 * action is stamped "Owner" in the order activity trail; when staff logins
 * ship, the same trail becomes the per-person work log.
 * Type system (v6): Libre Franklin, five sizes only: 20 / 15 / 13.5 / 12.5 / 11.
 */

const NAVY = '#0a1a36';
const MUTED = '#5b6a82';
const T_TITLE = 'text-[20px] font-extrabold tracking-[-0.01em]';
const T_CARD = 'text-[15px] font-extrabold';
const T_BODY = 'text-[13.5px]';
const T_SMALL = 'text-[12.5px]';
const T_LABEL = 'text-[11px] font-extrabold uppercase tracking-[0.08em]';

const OWNER = 'Owner';

/* ------------------------------- helpers ------------------------------- */

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...adminKeyHeaders(), ...(init?.headers ?? {}) },
  });
}

type Stage = 'pending' | 'intake-in' | 'ready' | 'filing' | 'refunded';

function stageOf(o: OrderRecord): Stage {
  if (o.payStatus === 'refunded' || o.payStatus === 'cancelled') return 'refunded';
  if (o.intakeStatus === 'filing') return 'filing';
  if (o.intakeStatus === 'certified') return 'ready';
  if (o.intakeStatus === 'submitted' || o.intakeStatus === 'corrected') return 'intake-in';
  return 'pending';
}

const STAGE_LABEL: Record<Stage, string> = {
  pending: 'Intake pending',
  'intake-in': 'Intake in',
  ready: 'Ready to file',
  filing: 'Filing',
  refunded: 'Refunded',
};

function payPill(o: OrderRecord): { label: string; cls: string } {
  if (o.payStatus === 'refunded')
    return { label: 'Refunded', cls: 'bg-red-100 text-red-800' };
  if (o.payStatus === 'cancelled')
    return { label: 'Cancelled', cls: 'bg-slate-200 text-slate-700' };
  return { label: 'Paid', cls: 'bg-green-100 text-green-800' };
}

function stagePill(stage: Stage): string {
  switch (stage) {
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'intake-in':
      return 'bg-amber-100 text-amber-800';
    case 'ready':
      return 'bg-green-100 text-green-800';
    case 'filing':
      return 'bg-sky-100 text-sky-800';
    case 'refunded':
      return 'bg-red-100 text-red-800';
  }
}

function ageLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function ageLong(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(ms / 3600000);
  if (hrs < 1) return 'under an hour';
  if (hrs < 48) return `${hrs} hour${hrs === 1 ? '' : 's'}`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/** What the team does next with an order, by stage (orders table). */
const NEXT_STEP: Record<Stage, string> = {
  pending: 'Waiting on client intake',
  'intake-in': 'Review intake and documents',
  ready: 'File now',
  filing: 'Waiting on the agency',
  refunded: 'Refunded',
};

/** The company to show for an order: the intake company name when the
 *  record carries one, else the buyer who paid. */
function companyOf(o: OrderRecord): string {
  return o.companyName || o.intake?.companyName || o.buyerName;
}

function orderMatches(o: OrderRecord, q: string): boolean {
  return [o.id, o.buyerName, o.buyerEmail, o.packageName, companyOf(o), o.usdot ?? '']
    .join(' ')
    .toLowerCase()
    .includes(q);
}

/** Download one order's sealed case file (ZIP when the server can build
 *  it, the summary HTML when it cannot) via the admin-only route. */
async function downloadCaseFile(id: string): Promise<void> {
  try {
    const res = await adminFetch(`/api/orders/${encodeURIComponent(id)}/case-file`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (res.headers.get('Content-Type') ?? '').includes('zip')
      ? `${id}-case-file.zip`
      : `${id}-case-file.html`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* download unavailable; the order detail still shows everything */
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function timeLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const EVENT_LABEL: Record<string, string> = {
  payment_received: 'Payment received',
  note: 'Team note',
  document_uploaded: 'Document uploaded',
  document_uploaded_by_client: 'Document uploaded by client',
  document_accepted: 'Client document accepted',
  document_new_copy_requested: 'Clearer copy requested',
  filing_started: 'Filing started',
  order_completed: 'Order completed',
  order_reopened: 'Order reopened',
  assigned: 'Assigned',
  priority_on: 'Marked priority',
  priority_off: 'Priority removed',
  intake_edited: 'Information updated by staff',
  refund_full: 'Full refund recorded from Stripe',
  refund_partial: 'Partial refund recorded from Stripe',
  subscription_cancelled: 'Subscription cancelled',
};

interface OrderEvent {
  id?: string;
  order_id?: string;
  orderId?: string;
  actor: string;
  action: string;
  detail?: string | null;
  created_at?: string;
  createdAt?: string;
}

function eventAt(e: OrderEvent): string {
  return e.createdAt ?? e.created_at ?? '';
}

function eventOrderId(e: OrderEvent): string | undefined {
  return e.orderId ?? e.order_id;
}

interface ServerDoc {
  id: string;
  slotKey: string;
  slotLabel: string;
  fileName: string;
  uploadedAt: string;
  /** Migration-008 review fields; present on client uploads. */
  direction?: string;
  status?: string;
  staffNote?: string;
  /** Signed view URL (client uploads only); opens the file inline. */
  url?: string;
  /** Signed download URL (client uploads only); saves the file. */
  downloadUrl?: string;
}

interface OrderDetailData {
  order: OrderRecord;
  intake: {
    data: Record<string, string>;
    status: string;
    version: number;
    certified?: { name?: string; date?: string } | null;
    submittedAt: string;
  } | null;
  booking: { date: string; time: string } | null;
  documents: ServerDoc[];
  /** Documents the client uploaded to us from their portal. */
  uploads: ServerDoc[];
  /** The documents this order's package asks the client for. */
  requestedDocuments: { key: string; label: string; hint?: string }[];
  events: OrderEvent[];
}

function docStatusChip(status?: string): { label: string; cls: string } {
  switch (status) {
    case 'accepted':
      return { label: 'Accepted', cls: 'bg-green-100 text-green-800' };
    case 'needs_new_copy':
      return { label: 'Clearer copy requested', cls: 'bg-red-100 text-red-800' };
    default:
      return { label: 'In review', cls: 'bg-amber-100 text-amber-800' };
  }
}

/** Accepted count across the package's requested slots; the newest upload
 *  for a slot (uploads arrive oldest first) decides that slot's state. */
function clientDocProgress(
  uploads: ServerDoc[],
  requested: { key: string }[]
): { accepted: number; total: number } {
  const latest = new Map<string, string | undefined>();
  for (const u of uploads) latest.set(u.slotKey, u.status);
  let accepted = 0;
  for (const r of requested) if (latest.get(r.key) === 'accepted') accepted++;
  return { accepted, total: requested.length };
}

/** What the refund policy says this customer is owed, by stage (Terms 6 and 7). */
function refundDue(o: OrderRecord): { due: number; stageLabel: string } {
  const pkg = getPackage(o.packageSlug);
  if (pkg && pkg.billing !== 'one-time') {
    return {
      due: 0,
      stageLabel:
        'Subscription: a month or year already charged is not refunded. Cancelling stops the next renewal.',
    };
  }
  if (o.intakeStatus === 'filing') {
    return { due: 0, stageLabel: 'Filing submitted to the agency: no refund at this stage.' };
  }
  if (!o.intakeStatus) {
    return { due: o.amount, stageLabel: 'Before intake is submitted: full refund.' };
  }
  const service = pkg
    ? pkg.fees.filter((f) => f.kind === 'ours').reduce((s, f) => s + f.amount, 0)
    : o.amount;
  const due = Math.max(0, Math.round((o.amount - service / 2) * 100) / 100);
  return {
    due,
    stageLabel:
      'Intake submitted: half the service fee is kept for the prep work done, government fees come back if not yet paid.',
  };
}

/* ------------------------- package + copy editors ------------------------ */

function PackageEditor({ pkg }: { pkg: Package }) {
  const [name, setName] = useState(pkg.name);
  const [price, setPrice] = useState(String(pkg.price));
  const [billing, setBilling] = useState(pkg.billing);
  const [tagline, setTagline] = useState(pkg.tagline);
  const [cta, setCta] = useState(pkg.cta);
  const [inclusions, setInclusions] = useState(pkg.inclusions.join('\n'));
  const [fees, setFees] = useState(
    pkg.fees.map((f) => `${f.label} | ${f.amount} | ${f.kind}`).join('\n')
  );
  const [saved, setSaved] = useState(false);

  function save() {
    const parsedFees = fees
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [label = '', amount = '0', kind = 'ours'] = l.split('|').map((s) => s.trim());
        return {
          label,
          amount: Number(amount) || 0,
          kind: (kind === 'government' ? 'government' : 'ours') as 'ours' | 'government',
        };
      });
    updatePackage(pkg.slug, {
      name: name.trim() || pkg.name,
      price: Number(price) || pkg.price,
      billing: billing as Package['billing'],
      tagline: tagline.trim(),
      cta: cta.trim() || pkg.cta,
      inclusions: inclusions.split('\n').map((l) => l.trim()).filter(Boolean),
      fees: parsedFees,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card">
      <h3 className={T_CARD} style={{ color: NAVY }}>{pkg.name}</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Package name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (USD)">
            <input className="input" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Billing">
            <select className="input" value={billing} onChange={(e) => setBilling(e.target.value as Package['billing'])}>
              <option value="one-time">one-time</option>
              <option value="/month">/month</option>
              <option value="/year">/year</option>
            </select>
          </Field>
        </div>
        <Field label="Tagline">
          <input className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </Field>
        <Field label="Button label">
          <input className="input" value={cta} onChange={(e) => setCta(e.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Inclusions (one per line)">
            <textarea className="input min-h-28" value={inclusions} onChange={(e) => setInclusions(e.target.value)} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field
            label="Fee breakdown (one per line: label | amount | ours/government)"
            hint="Example: FMCSA operating authority filing fee | 300 | government"
          >
            <textarea className="input min-h-20 font-mono text-sm" value={fees} onChange={(e) => setFees(e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-dark" onClick={save}>Save package</button>
        {saved && <span className="text-sm font-bold text-green-700">Saved ✓</span>}
      </div>
    </div>
  );
}

function CopyEditor() {
  const { copy } = useTtb();
  const [headline, setHeadline] = useState(copy.heroHeadline);
  const [sub, setSub] = useState(copy.heroSub);
  const [notes, setNotes] = useState(copy.trustNotes.join('\n'));
  const [email, setEmail] = useState(copy.contactEmail);
  const [phone, setPhone] = useState(copy.contactPhone);
  const [saved, setSaved] = useState(false);

  function save() {
    updateCopy({
      heroHeadline: headline.trim() || copy.heroHeadline,
      heroSub: sub.trim(),
      trustNotes: notes.split('\n').map((l) => l.trim()).filter(Boolean),
      contactEmail: email.trim(),
      contactPhone: phone.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card">
      <h3 className={T_CARD} style={{ color: NAVY }}>Site copy</h3>
      <div className="mt-4 grid gap-4">
        <Field label="Hero headline">
          <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} />
        </Field>
        <Field label="Hero subheading">
          <textarea className="input min-h-20" value={sub} onChange={(e) => setSub(e.target.value)} />
        </Field>
        <Field label="Hero trust notes (one per line)">
          <textarea className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Contact email">
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Contact phone">
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-dark" onClick={save}>Save copy</button>
        {saved && <span className="text-sm font-bold text-green-700">Saved ✓</span>}
      </div>
    </div>
  );
}

/** Per-order document slots: expected docs from the package + upload/remove. */
function OrderDocuments({ order }: { order: OrderRecord }) {
  const pkg = getPackage(order.packageSlug);
  const slots = pkg?.expectedDocuments ?? [];
  // Documents can only be saved against a real (database) order; demo
  // orders live in this browser only, so their uploads can never persist.
  const isDb = order.source === 'database';
  const [uploading, setUploading] = useState<string | null>(null);
  // Result of the last document action, shown until the next one so an
  // upload is never silently assumed to have saved.
  const [docMsg, setDocMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (slots.length === 0) return null;

  async function onFile(slotKey: string, slotLabel: string, file: File | undefined) {
    if (!file || !isDb) return;
    setUploading(slotKey);
    setDocMsg(null);
    try {
      let dataUrl: string | undefined;
      if (file.size <= 3 * 1024 * 1024) {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = reject;
          r.readAsDataURL(file);
        });
      }
      const doc: OrderDocument = {
        id: `${Date.now()}-${slotKey}`,
        slotKey,
        slotLabel,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        dataUrl,
      };
      addDocument(order.id, doc);
      const result = await syncDocument(
        order.id,
        {
          id: order.id,
          packageName: order.packageName,
          amount: formatUSD(order.amount),
          buyerName: order.buyerName,
          buyerEmail: order.buyerEmail,
          createdAt: order.createdAt,
        },
        slotKey,
        slotLabel,
        file
      );
      if (result.ok) {
        setDocMsg({ ok: true, text: `Upload complete: ${file.name} saved.` });
      } else {
        // The save failed: drop the optimistic entry so the screen never
        // claims a document exists when it was not saved, and say so.
        removeDocument(order.id, doc.id);
        setDocMsg({
          ok: false,
          text: result.error ?? 'We could not save that document. Please try again.',
        });
      }
    } finally {
      setUploading(null);
    }
  }

  return (
    <div>
      <ul className="space-y-2">
        {slots.map((s) => {
          // Newest file wins for the slot: a replaced document must be the
          // one shown here, not the first version ever uploaded.
          const slotDocs = (order.documents ?? []).filter((d) => d.slotKey === s.key);
          const doc = slotDocs[slotDocs.length - 1];
          const inputId = `doc-${order.id}-${s.key}`;
          return (
            <li key={s.key} className="flex items-center justify-between gap-3 rounded-none bg-[#f6f7f9] px-3 py-2.5">
              <div>
                <p className={`font-semibold ${T_BODY}`} style={{ color: NAVY }}>{s.label}</p>
                {doc ? (
                  <p className={T_SMALL} style={{ color: MUTED }}>
                    {doc.fileName} · {formatDate(doc.uploadedAt)}
                  </p>
                ) : (
                  <p className={T_SMALL} style={{ color: MUTED }}>
                    {s.auto ? 'Auto-attached at purchase' : 'Waiting for upload'}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {doc && (
                  <button
                    className={`${T_SMALL} font-bold text-red-700 hover:underline`}
                    onClick={() => {
                      setDocMsg(null);
                      removeDocument(order.id, doc.id);
                    }}
                  >
                    Remove
                  </button>
                )}
                <label
                  htmlFor={inputId}
                  className={`rounded-none px-3 py-1.5 text-[12.5px] font-bold text-white ${
                    isDb ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  }`}
                  style={{ background: NAVY }}
                >
                  {uploading === s.key ? 'Uploading…' : doc ? 'Replace' : 'Upload'}
                </label>
                <input
                  id={inputId}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  disabled={!isDb}
                  onChange={(e) => {
                    onFile(s.key, s.label, e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {docMsg && (
        <p
          className={`mt-2 ${T_SMALL} font-bold ${docMsg.ok ? 'text-green-700' : 'text-red-700'}`}
          role={docMsg.ok ? 'status' : 'alert'}
        >
          {docMsg.ok ? '✓ ' : ''}
          {docMsg.text}
        </p>
      )}
      <p className={`mt-2 ${T_SMALL}`} style={{ color: MUTED }}>
        {isDb
          ? 'Uploading notifies the customer by email, and the file appears in their portal under their documents.'
          : 'Document uploads are available on real orders only.'}
      </p>
    </div>
  );
}

/* ------------------------------ orders queue ----------------------------- */

/** The work piles the queue is organized by. The three buckets are the
 *  primary filter; 'all', 'myqueue', and 'refunded' stay reachable as
 *  small text actions at the list header. */
type QueueFilter = 'needs' | 'clients' | 'filing' | 'all' | 'myqueue' | 'refunded';

function inQueue(o: OrderRecord, queue: QueueFilter): boolean {
  const stage = stageOf(o);
  switch (queue) {
    case 'needs':
      return stage === 'intake-in' || stage === 'ready';
    case 'clients':
      return stage === 'pending';
    case 'filing':
      return stage === 'filing';
    case 'all':
      return true;
    case 'myqueue':
      return o.assignee === OWNER && stage !== 'refunded';
    case 'refunded':
      return stage === 'refunded';
  }
}

const QUEUE_TITLE: Record<QueueFilter, string> = {
  needs: 'Needs the team',
  clients: 'Waiting on clients',
  filing: 'In filing',
  all: 'All open orders',
  myqueue: 'My queue',
  refunded: 'Refunded',
};

const PAGE_SIZE = 25;

function OrdersSection({
  orders,
  search,
  onOpen,
  onRefresh,
}: {
  orders: OrderRecord[];
  search: string;
  onOpen: (id: string) => void;
  onRefresh: () => void;
}) {
  const [queue, setQueue] = useState<QueueFilter>('needs');
  const [mode, setMode] = useState<'table' | 'board'>('table');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'amount-desc' | 'amount-asc' | 'waiting'>('newest');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [writeError, setWriteError] = useState('');

  useEffect(() => {
    setPage(0);
  }, [queue, search, sort]);

  const counts = useMemo(() => {
    const c: Record<QueueFilter, number> = {
      needs: 0, clients: 0, filing: 0, all: 0, myqueue: 0, refunded: 0,
    };
    for (const o of orders) {
      if (inQueue(o, 'needs')) c.needs += 1;
      if (inQueue(o, 'clients')) c.clients += 1;
      if (inQueue(o, 'filing')) c.filing += 1;
      if (inQueue(o, 'myqueue')) c.myqueue += 1;
      if (inQueue(o, 'refunded')) c.refunded += 1;
    }
    c.all = orders.length;
    return c;
  }, [orders]);

  /** The order that has been waiting on a client the longest, for the
   *  "Waiting on clients" bucket sub-line. */
  const longestPending = useMemo(() => {
    const pending = orders.filter((o) => stageOf(o) === 'pending');
    return pending.reduce<OrderRecord | null>(
      (acc, o) => (!acc || +new Date(o.createdAt) < +new Date(acc.createdAt) ? o : acc),
      null
    );
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders.filter((o) => inQueue(o, queue));
    if (q) {
      list = list.filter((o) => orderMatches(o, q));
    }
    const sorted = [...list];
    switch (sort) {
      case 'newest':
        sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        break;
      case 'oldest':
      case 'waiting':
        sorted.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        break;
      case 'amount-desc':
        sorted.sort((a, b) => b.amount - a.amount);
        break;
      case 'amount-asc':
        sorted.sort((a, b) => a.amount - b.amount);
        break;
    }
    // Priority always floats to the top.
    sorted.sort((a, b) => Number(b.priority ?? false) - Number(a.priority ?? false));
    return sorted;
  }, [orders, queue, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function patchOrders(ids: string[], patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const results = await Promise.all(
        ids
          .filter((id) => orders.find((o) => o.id === id)?.source === 'database')
          .map((id) =>
            adminFetch(`/api/orders/${encodeURIComponent(id)}`, {
              method: 'PATCH',
              body: JSON.stringify(patch),
            }).catch(() => null)
          )
      );
      // A save that did not land must say so, never refresh in silence.
      if (results.some((r) => !r || !r.ok)) {
        setWriteError('One or more changes did not save. Check your connection and try again.');
      } else {
        setWriteError('');
      }
    } finally {
      setBusy(false);
      setSelected(new Set());
      onRefresh();
    }
  }

  function exportCsv(rows: OrderRecord[]) {
    const head = 'Order,Package,Customer,Email,Amount,Payment,Status,Assignee,Ordered\n';
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = rows
      .map((o) =>
        [
          o.id,
          o.packageName,
          o.buyerName,
          o.buyerEmail,
          String(o.amount),
          o.payStatus ?? 'paid',
          STAGE_LABEL[stageOf(o)],
          o.assignee ?? '',
          o.createdAt,
        ]
          .map((v) => esc(String(v)))
          .join(',')
      )
      .join('\n');
    const url = URL.createObjectURL(new Blob([head + body], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const boardStages: Stage[] = ['pending', 'intake-in', 'ready', 'filing', 'refunded'];

  const buckets: {
    key: QueueFilter;
    dot: string;
    title: string;
    count: number;
    sub: string;
  }[] = [
    {
      key: 'needs',
      dot: '#dc2626',
      title: 'Needs the team',
      count: counts.needs,
      sub: 'Waiting on us, not on anyone else. Work this pile first.',
    },
    {
      key: 'clients',
      dot: '#d97706',
      title: 'Waiting on clients',
      count: counts.clients,
      sub: `Intakes and documents we cannot move without the client.${
        longestPending ? ` Longest waiting: ${ageLong(longestPending.createdAt)}.` : ''
      }`,
    },
    {
      key: 'filing',
      dot: '#0284c7',
      title: 'In filing',
      count: counts.filing,
      sub: 'With the agencies. Nothing to do but watch for the result.',
    },
  ];

  return (
    <div>
      {/* The three work piles. Clicking one filters the list below. */}
      <div className="grid gap-3 sm:grid-cols-3">
        {buckets.map((b) => (
          <button
            key={b.key}
            onClick={() => setQueue(b.key)}
            aria-pressed={queue === b.key}
            className="border bg-white px-4 py-3 text-left shadow-sm"
            style={
              queue === b.key
                ? { borderColor: NAVY, boxShadow: `0 0 0 1px ${NAVY}` }
                : { borderColor: '#dde3ec' }
            }
          >
            <p className={`${T_SMALL} font-bold`} style={{ color: MUTED }}>
              <span className="mr-1.5 inline-block h-2 w-2 align-middle" style={{ background: b.dot }} />
              {b.title}
            </p>
            <p className={`${T_TITLE} mt-1`} style={{ color: NAVY }}>{b.count}</p>
            <p className={T_SMALL} style={{ color: MUTED }}>{b.sub}</p>
          </button>
        ))}
      </div>

      {writeError && (
        <div className="mt-4 border p-3" style={{ borderColor: '#dc2626', background: '#fef2f2' }}>
          <p className={`${T_BODY} font-bold`} style={{ color: '#b91c1c' }}>
            {writeError}
          </p>
        </div>
      )}

      {/* Index card */}
      <div className="mt-4 overflow-hidden rounded-none border border-[#dde3ec] bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#dde3ec] px-4 py-3">
          <p className={`${T_BODY} font-extrabold`} style={{ color: NAVY }}>
            {QUEUE_TITLE[queue]} · {filtered.length} order{filtered.length === 1 ? '' : 's'}
          </p>
          <button
            onClick={() => setQueue('all')}
            className={`${T_SMALL} font-bold underline-offset-2 hover:underline`}
            style={{ color: queue === 'all' ? NAVY : MUTED }}
          >
            Show all open orders ({counts.all})
          </button>
          <button
            onClick={() => setQueue('myqueue')}
            className={`${T_SMALL} font-bold underline-offset-2 hover:underline`}
            style={{ color: queue === 'myqueue' ? NAVY : MUTED }}
          >
            My queue
          </button>
          <button
            onClick={() => setQueue('refunded')}
            className={`${T_SMALL} font-bold underline-offset-2 hover:underline`}
            style={{ color: queue === 'refunded' ? NAVY : MUTED }}
          >
            Refunded
          </button>
          <div className="ml-auto flex items-center gap-2">
            <select
              className={`${T_SMALL} rounded-none border border-[#dde3ec] px-2 py-1.5 font-semibold`}
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Sort orders"
            >
              <option value="newest">Newest first</option>
              <option value="waiting">Longest waiting</option>
              <option value="oldest">Oldest first</option>
              <option value="amount-desc">Amount, high to low</option>
              <option value="amount-asc">Amount, low to high</option>
            </select>
            <div className="flex overflow-hidden rounded-none border border-[#dde3ec]">
              {(['table', 'board'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`${T_SMALL} px-3 py-1.5 font-bold capitalize`}
                  style={
                    mode === m
                      ? { background: NAVY, color: '#fff' }
                      : { background: '#fff', color: MUTED }
                  }
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={onRefresh}
              className={`${T_SMALL} rounded-none border border-[#dde3ec] px-3 py-1.5 font-bold`}
              style={{ color: NAVY }}
            >
              Refresh
            </button>
          </div>
        </div>

        {selected.size > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 px-4 py-2.5"
            style={{ background: '#fff8e1', borderBottom: '1px solid #f0e2b6' }}
          >
            <span className={`${T_SMALL} font-extrabold`} style={{ color: NAVY }}>
              {selected.size} selected
            </span>
            <button disabled={busy} className={`${T_SMALL} font-bold underline`} style={{ color: NAVY }} onClick={() => patchOrders([...selected], { assignee: OWNER })}>
              Assign to me
            </button>
            <button disabled={busy} className={`${T_SMALL} font-bold underline`} style={{ color: NAVY }} onClick={() => patchOrders([...selected], { assignee: '' })}>
              Unassign
            </button>
            <button disabled={busy} className={`${T_SMALL} font-bold underline`} style={{ color: NAVY }} onClick={() => patchOrders([...selected], { priority: true })}>
              Mark priority
            </button>
            <button
              className={`${T_SMALL} font-bold underline`}
              style={{ color: NAVY }}
              onClick={() => exportCsv(orders.filter((o) => selected.has(o.id)))}
            >
              Export CSV
            </button>
            <button className={`${T_SMALL} font-bold`} style={{ color: MUTED }} onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
        )}

        {mode === 'table' ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className="border-b border-[#dde3ec] text-left" style={{ background: '#f6f7f9' }}>
                    <th className="px-3 py-2.5 w-8">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        checked={pageRows.length > 0 && pageRows.every((o) => selected.has(o.id))}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            for (const o of pageRows) {
                              if (e.target.checked) next.add(o.id);
                              else next.delete(o.id);
                            }
                            return next;
                          });
                        }}
                      />
                    </th>
                    <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Order</th>
                    <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Order details</th>
                    <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Status</th>
                    <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Priority</th>
                    <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Next step</th>
                    <th className={`px-3 py-2.5 text-right ${T_LABEL}`} style={{ color: MUTED }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((o) => {
                    const stage = stageOf(o);
                    const pay = payPill(o);
                    return (
                      <tr
                        key={o.id}
                        className="cursor-pointer border-b border-[#eef1f6] hover:bg-[#f6f7f9]"
                        style={!o.assignee && stage !== 'refunded' ? { background: '#fffdf5' } : undefined}
                        onClick={() => onOpen(o.id)}
                      >
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${o.id}`}
                            checked={selected.has(o.id)}
                            onChange={() => toggleSelect(o.id)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <p className={`${T_BODY} font-bold`} style={{ color: NAVY }}>{o.id}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className={`${T_BODY} font-semibold`} style={{ color: NAVY }}>{o.packageName}</p>
                          <p className={T_SMALL} style={{ color: MUTED }}>
                            {companyOf(o)}{o.usdot ? ` · USDOT ${o.usdot}` : ''}
                          </p>
                          <p className={T_SMALL} style={{ color: MUTED }}>
                            Ordered {formatDate(o.createdAt)}
                            {stage === 'pending' ? ` · waiting ${ageLong(o.createdAt)}` : ''}
                          </p>
                          {o.clientDocs && o.clientDocs.accepted < o.clientDocs.total && (
                            <span className="mt-1 inline-block rounded-none bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
                              Waiting on client: {o.clientDocs.accepted} of {o.clientDocs.total} accepted
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className="flex flex-col items-start gap-1">
                            <span className={`rounded-none px-2.5 py-1 text-[11px] font-extrabold ${stagePill(stage)}`}>
                              {STAGE_LABEL[stage]}
                            </span>
                            <span className={`rounded-none px-2.5 py-1 text-[11px] font-extrabold ${pay.cls}`}>{pay.label}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {o.priority ? (
                            <button
                              aria-label="Remove priority"
                              title="Remove priority"
                              className="rounded-none bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold text-amber-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (o.source === 'database') {
                                  adminFetch(`/api/orders/${encodeURIComponent(o.id)}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ priority: false }),
                                  })
                                    .then((res) => {
                                      if (!res.ok)
                                        setWriteError('That change did not save. Check your connection and try again.');
                                      else setWriteError('');
                                      onRefresh();
                                    })
                                    .catch(() =>
                                      setWriteError('That change did not save. Check your connection and try again.')
                                    );
                                }
                              }}
                            >
                              ★ High
                            </button>
                          ) : (
                            <button
                              aria-label="Mark priority"
                              title="Mark priority"
                              className={`${T_SMALL} font-semibold`}
                              style={{ color: MUTED }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (o.source === 'database') {
                                  adminFetch(`/api/orders/${encodeURIComponent(o.id)}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ priority: true }),
                                  })
                                    .then((res) => {
                                      if (!res.ok)
                                        setWriteError('That change did not save. Check your connection and try again.');
                                      else setWriteError('');
                                      onRefresh();
                                    })
                                    .catch(() =>
                                      setWriteError('That change did not save. Check your connection and try again.')
                                    );
                                }
                              }}
                            >
                              Normal
                            </button>
                          )}
                        </td>
                        <td className={`px-3 py-3 ${T_SMALL} font-semibold`} style={{ color: NAVY }}>
                          {NEXT_STEP[stage]}
                        </td>
                        <td className={`px-3 py-3 text-right ${T_BODY} font-bold`} style={{ color: NAVY }}>
                          {formatUSD(o.amount)}
                        </td>
                      </tr>
                    );
                  })}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className={`px-4 py-10 text-center ${T_BODY}`} style={{ color: MUTED }}>
                        No orders in this pile.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <p className={T_SMALL} style={{ color: MUTED }}>
                {filtered.length} order{filtered.length === 1 ? '' : 's'} · page {page + 1} of {pageCount}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className={`${T_SMALL} rounded-none border border-[#dde3ec] px-3 py-1.5 font-bold disabled:opacity-40`}
                  style={{ color: NAVY }}
                >
                  Previous
                </button>
                <button
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  className={`${T_SMALL} rounded-none border border-[#dde3ec] px-3 py-1.5 font-bold disabled:opacity-40`}
                  style={{ color: NAVY }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-5">
            {boardStages.map((stage) => {
              const cards = filtered.filter((o) => stageOf(o) === stage);
              return (
                <div key={stage} className="rounded-none bg-[#f6f7f9] p-2.5">
                  <p className={`${T_LABEL} px-1 pb-2`} style={{ color: MUTED }}>
                    {STAGE_LABEL[stage]} · {cards.length}
                  </p>
                  <div className="space-y-2">
                    {cards.slice(0, 25).map((o) => (
                      <button
                        key={o.id}
                        onClick={() => onOpen(o.id)}
                        className="block w-full rounded-none border border-[#dde3ec] bg-white p-3 text-left shadow-sm"
                      >
                        <p className={`${T_SMALL} font-extrabold`} style={{ color: NAVY }}>
                          {o.priority ? '★ ' : ''}{o.id}
                        </p>
                        <p className={`${T_SMALL} font-semibold`} style={{ color: NAVY }}>{o.buyerName}</p>
                        <p className={T_SMALL} style={{ color: MUTED }}>{o.packageName}</p>
                        {o.clientDocs && o.clientDocs.accepted < o.clientDocs.total && (
                          <span className="mt-1 inline-block rounded-none bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
                            Waiting on client: {o.clientDocs.accepted} of {o.clientDocs.total} accepted
                          </span>
                        )}
                        <p className="mt-1 flex items-center justify-between">
                          <span className={`${T_SMALL} font-bold`} style={{ color: NAVY }}>{formatUSD(o.amount)}</span>
                          <span className={T_SMALL} style={{ color: MUTED }}>
                            {o.assignee ? initials(o.assignee) : 'Unassigned'}
                          </span>
                        </p>
                      </button>
                    ))}
                    {cards.length === 0 && (
                      <p className={`${T_SMALL} px-1`} style={{ color: MUTED }}>Nothing here.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className={`mt-3 ${T_SMALL}`} style={{ color: MUTED }}>
        Board cards move on their own when an order changes stage. Nothing is dragged, so the
        board and the table can never disagree.
      </p>
    </div>
  );
}

/* ------------------------- documents from client ------------------------ */

function ClientDocumentsSection({
  orderId,
  uploads,
  requested,
  onChanged,
}: {
  orderId: string;
  uploads: ServerDoc[];
  requested: { key: string; label: string; hint?: string }[];
  onChanged: () => void;
}) {
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, { text: string; ok: boolean }>>({});

  const knownKeys = new Set(requested.map((r) => r.key));
  const groups: { key: string; label: string; hint?: string; files: ServerDoc[] }[] = [
    ...requested.map((r) => ({
      key: r.key,
      label: r.label,
      hint: r.hint,
      files: uploads.filter((u) => u.slotKey === r.key),
    })),
    ...uploads
      .filter((u) => !knownKeys.has(u.slotKey))
      .map((u) => ({ key: u.slotKey, label: u.slotLabel, hint: undefined, files: [u] })),
  ];

  async function review(doc: ServerDoc, action: 'accept' | 'request_new') {
    const note = (drafts[doc.id] ?? '').trim();
    if (action === 'request_new' && !note) {
      setMsgs((m) => ({
        ...m,
        [doc.id]: { text: 'Add a short note telling the client what to fix first.', ok: false },
      }));
      return;
    }
    setBusyId(doc.id);
    setMsgs((m) => ({ ...m, [doc.id]: { text: '', ok: true } }));
    try {
      const res = await adminFetch(
        `/api/orders/${encodeURIComponent(orderId)}/documents/review`,
        {
          method: 'POST',
          body: JSON.stringify({
            docId: doc.id,
            action,
            ...(action === 'request_new' ? { note } : {}),
          }),
        }
      );
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setOpenNoteId(null);
        setMsgs((m) => ({
          ...m,
          [doc.id]: {
            text:
              action === 'accept'
                ? 'Accepted. The client has been emailed.'
                : 'Sent back. The client has been emailed your note.',
            ok: true,
          },
        }));
        onChanged();
      } else {
        setMsgs((m) => ({
          ...m,
          [doc.id]: { text: data?.error ?? 'Could not save that review.', ok: false },
        }));
      }
    } catch {
      setMsgs((m) => ({ ...m, [doc.id]: { text: 'Could not save that review.', ok: false } }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-3 border-t border-[#eef1f6] pt-3">
      <p className={T_LABEL} style={{ color: MUTED }}>Documents from client</p>
      <p className={`${T_SMALL} mt-1`} style={{ color: MUTED }}>
        Files the client uploaded from their portal. Accept each one, or send it back with a
        note asking for a clearer copy.
      </p>
      <div className="mt-2 space-y-3">
        {groups.map((g) => (
          <div key={g.key}>
            <p className={`${T_SMALL} font-extrabold`} style={{ color: NAVY }}>
              {g.label}
            </p>
            {g.files.length === 0 ? (
              <p className={T_SMALL} style={{ color: MUTED }}>
                Not uploaded yet.
              </p>
            ) : (
              <ul className="mt-1 space-y-2">
                {g.files.map((d) => {
                  const chip = docStatusChip(d.status);
                  const busy = busyId === d.id;
                  return (
                    <li
                      key={d.id}
                      className="rounded-none bg-[#f6f7f9] px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`${T_SMALL} font-semibold`} style={{ color: NAVY }}>
                          {d.fileName}
                        </span>
                        <span className={T_SMALL} style={{ color: MUTED }}>
                          {timeLabel(d.uploadedAt)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-none px-2.5 py-1 text-[11px] font-extrabold ${chip.cls}`}
                        >
                          {chip.label}
                        </span>
                        {d.url && (
                          <a
                            className={`${T_SMALL} font-extrabold`}
                            style={{ color: '#1755a8' }}
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                        )}
                        {d.url && (
                          <a
                            className={`${T_SMALL} font-extrabold`}
                            style={{ color: '#1755a8' }}
                            href={d.downloadUrl ?? d.url}
                            download={d.fileName}
                          >
                            Download
                          </a>
                        )}
                        {d.status !== 'accepted' && (
                          <button
                            className={`${T_SMALL} rounded-none px-3 py-1.5 font-extrabold text-white disabled:opacity-50`}
                            style={{ background: '#1755a8' }}
                            disabled={busy}
                            onClick={() => review(d, 'accept')}
                          >
                            {busy ? 'Saving…' : 'Accept'}
                          </button>
                        )}
                        <button
                          className={`${T_SMALL} rounded-none border border-[#dde3ec] px-3 py-1.5 font-bold disabled:opacity-50`}
                          style={{ color: NAVY }}
                          disabled={busy}
                          onClick={() =>
                            setOpenNoteId((cur) => (cur === d.id ? null : d.id))
                          }
                        >
                          Request a clearer copy
                        </button>
                      </div>
                      {d.status === 'needs_new_copy' && d.staffNote && (
                        <p className={`${T_SMALL} mt-1.5`} style={{ color: MUTED }}>
                          Your note to the client: {d.staffNote}
                        </p>
                      )}
                      {openNoteId === d.id && (
                        <div className="mt-2">
                          <textarea
                            className="input min-h-20 w-full"
                            placeholder="Tell the client what to fix, for example: the photo is cut off on the left side, please upload the full page."
                            value={drafts[d.id] ?? ''}
                            maxLength={300}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [d.id]: e.target.value }))
                            }
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              className="btn-dark"
                              disabled={busy}
                              onClick={() => review(d, 'request_new')}
                            >
                              {busy ? 'Sending…' : 'Send to client'}
                            </button>
                            <button
                              className={`${T_SMALL} font-bold`}
                              style={{ color: MUTED }}
                              onClick={() => setOpenNoteId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {msgs[d.id]?.text && (
                        <p
                          className={`${T_SMALL} mt-1.5 font-bold ${
                            msgs[d.id].ok ? 'text-green-700' : 'text-red-700'
                          }`}
                        >
                          {msgs[d.id].text}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ order detail ----------------------------- */

function OrderDetail({
  order,
  onBack,
  onRefresh,
}: {
  order: OrderRecord;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const isDb = order.source === 'database';
  const [detail, setDetail] = useState<OrderDetailData | null>(null);
  const [note, setNote] = useState('');
  const [editData, setEditData] = useState<Record<string, string> | null>(null);
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [actionError, setActionError] = useState('');

  async function loadDetail() {
    if (!isDb) return;
    try {
      const res = await adminFetch(`/api/orders/${encodeURIComponent(order.id)}`);
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setDetail(data as OrderDetailData);
        setEditData(data.intake?.data ?? null);
      }
    } catch {
      /* local record still renders */
    }
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const live = detail?.order ?? order;
  const stage = stageOf(live);
  const pay = payPill(live);
  const completed = Boolean(live.completedAt);
  const intakeData = detail?.intake?.data ?? live.intake ?? null;
  const certified =
    detail?.intake?.certified ??
    (live.intakeVersions?.[live.intakeVersions.length - 1]?.certifiedAt
      ? {
          name: live.intakeVersions[live.intakeVersions.length - 1].certifiedName,
          date: live.intakeVersions[live.intakeVersions.length - 1].certifiedDate,
        }
      : null);
  const booking = detail?.booking ?? getCallBooking(live.id) ?? live.booking;
  const events = detail?.events ?? [];
  const canFile = live.intakeStatus === 'submitted' || live.intakeStatus === 'certified';

  const timeline: { label: string; at?: string; done: boolean }[] = [
    { label: 'Payment received', at: live.createdAt, done: true },
    {
      label: 'Intake submitted',
      at: detail?.intake?.submittedAt,
      done: Boolean(live.intakeStatus),
    },
    {
      label: 'Certified final',
      // A submitted intake is already certified by the signature inside the
      // form, so for an order that never needed a correction the
      // certification moment is the submission itself. The separate
      // certification record only exists after a correction.
      at:
        certified?.date ??
        (live.intakeStatus === 'submitted' || stage === 'filing'
          ? detail?.intake?.submittedAt
          : undefined),
      done:
        live.intakeStatus === 'submitted' ||
        live.intakeStatus === 'certified' ||
        stage === 'filing',
    },
    { label: 'Filing started', at: live.filingStartedAt, done: stage === 'filing' },
  ];
  // Progress line fill, same treatment as the client portal timeline: the
  // line fills up to the furthest completed step.
  const furthestDone = timeline.reduce((acc, t, i) => (t.done ? i : acc), 0);
  const progressFillPct = (furthestDone / (timeline.length - 1)) * 100;

  async function patch(patchBody: Record<string, unknown>) {
    if (!isDb) return;
    const res = await adminFetch(`/api/orders/${encodeURIComponent(live.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patchBody),
    }).catch(() => null);
    // A save that did not land must say so, never refresh in silence.
    if (!res || !res.ok) {
      setActionError('That change did not save. Check your connection and try again.');
    } else {
      setActionError('');
    }
    onRefresh();
    loadDetail();
  }

  async function addNote() {
    if (!note.trim() || !isDb) return;
    setSaving(true);
    try {
      await adminFetch(`/api/orders/${encodeURIComponent(live.id)}/events`, {
        method: 'POST',
        body: JSON.stringify({ detail: note.trim() }),
      });
      setNote('');
      loadDetail();
    } finally {
      setSaving(false);
    }
  }

  async function saveIntakeEdits() {
    if (!editData || !isDb) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/api/orders/${encodeURIComponent(live.id)}/intake/admin-edit`, {
        method: 'POST',
        body: JSON.stringify({ data: editData, note: editReason.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setSavedMsg('Saved. The customer sees the updated information in their portal.');
        setEditReason('');
        loadDetail();
        onRefresh();
      } else {
        setSavedMsg(data?.error ?? 'Could not save those changes.');
      }
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(''), 4000);
    }
  }

  async function handleMarkComplete() {
    if (
      !window.confirm(
        `Mark order ${live.id} complete? It will leave the Orders queue and live in Finished.`
      )
    )
      return;
    await patch({ completed_at: new Date().toISOString() });
  }

  async function handleReopen() {
    await patch({ completed_at: null });
  }

  async function handleStartFiling() {
    if (!window.confirm(`Start filing for order ${live.id}? The intake will be fully locked.`)) return;
    startFiling(live.id);
    syncFiling(live.id);
    if (isDb) {
      const res = await adminFetch(`/api/orders/${encodeURIComponent(live.id)}/filing`, {
        method: 'POST',
        body: '{}',
      }).catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;
      if (!res || !res.ok || data?.persisted === false) {
        setActionError(
          'Filing did not start. The change did not save, so the intake is not locked. Check your connection and try again.'
        );
      } else {
        setActionError('');
      }
    }
    onRefresh();
    loadDetail();
  }

  return (
    <div>
      <button onClick={onBack} className={`${T_SMALL} font-extrabold`} style={{ color: '#1755a8' }}>
        ← Back to orders
      </button>
      {actionError && (
        <div className="mt-3 border p-3" style={{ borderColor: '#dc2626', background: '#fef2f2' }}>
          <p className={`${T_BODY} font-bold`} style={{ color: '#b91c1c' }}>
            {actionError}
          </p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className={T_TITLE} style={{ color: NAVY }}>{live.id}</h2>
        <span className={`rounded-none px-2.5 py-1 text-[11px] font-extrabold ${pay.cls}`}>{pay.label}</span>
        <span className={`rounded-none px-2.5 py-1 text-[11px] font-extrabold ${stagePill(stage)}`}>
          {STAGE_LABEL[stage]}
        </span>
        {live.priority && (
          <span className="rounded-none bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold text-amber-800">
            ★ Priority
          </span>
        )}
        {detail &&
          detail.requestedDocuments.length > 0 &&
          (() => {
            const progress = clientDocProgress(detail.uploads, detail.requestedDocuments);
            return progress.accepted < progress.total ? (
              <span className="rounded-none bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold text-amber-800">
                Waiting on client: {progress.accepted} of {progress.total} accepted
              </span>
            ) : null;
          })()}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className={`${T_LABEL} flex items-center gap-2`} style={{ color: MUTED }}>
            Assigned to
            <select
              className={`${T_SMALL} rounded-none border border-[#dde3ec] px-2 py-1.5 font-bold normal-case tracking-normal`}
              style={{ color: NAVY }}
              value={live.assignee ?? ''}
              onChange={(e) => patch({ assignee: e.target.value })}
            >
              <option value="">Unassigned</option>
              <option value={OWNER}>Owner (me)</option>
            </select>
          </label>
          <button
            onClick={() => patch({ priority: !live.priority })}
            className={`${T_SMALL} rounded-none border border-[#dde3ec] px-3 py-1.5 font-bold`}
            style={{ color: NAVY }}
          >
            {live.priority ? 'Remove priority' : 'Mark priority'}
          </button>
          {canFile && (
            <button
              onClick={handleStartFiling}
              className={`${T_SMALL} rounded-none px-3 py-1.5 font-extrabold text-white`}
              style={{ background: '#1755a8' }}
            >
              Start filing, lock intake
            </button>
          )}
          {isDb && !completed && (
            <button
              onClick={handleMarkComplete}
              className={`${T_SMALL} rounded-none px-3 py-1.5 font-extrabold text-white`}
              style={{ background: '#15803d' }}
            >
              Mark complete
            </button>
          )}
        </div>
      </div>
      <p className={`${T_BODY} mt-1`} style={{ color: MUTED }}>
        {live.packageName} · ordered {formatDate(live.createdAt)}
        {live.filingStartedAt ? ` · filing started ${formatDate(live.filingStartedAt)}` : ''}
      </p>

      {/* Timeline: same progress treatment as the client portal (track line
          with a navy fill up to the furthest completed step). */}
      <div className="mt-4 rounded-none border border-[#dde3ec] bg-white px-4 py-4 shadow-sm">
        <div className="relative" role="list" aria-label="Order progress">
          <div
            aria-hidden
            className="absolute left-[12.5%] right-[12.5%] top-[15px] h-[3px] rounded-none bg-[#e6ebf2]"
          >
            <div
              className="h-full rounded-none"
              style={{ width: `${progressFillPct}%`, background: NAVY }}
            />
          </div>
          <div className="relative z-[1] grid grid-cols-4">
            {timeline.map((t, i) => (
              <div key={t.label} role="listitem" className="text-center">
                <span
                  className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full text-[12.5px] font-extrabold"
                  style={
                    t.done
                      ? { background: NAVY, color: '#fff' }
                      : { background: '#e6ebf2', color: MUTED }
                  }
                >
                  {t.done ? '✓' : i + 1}
                </span>
                <p className={`${T_SMALL} mt-[6px] font-extrabold`} style={{ color: t.done ? NAVY : MUTED }}>{t.label}</p>
                <p className={T_SMALL} style={{ color: MUTED }}>{t.at ? timeLabel(t.at) : 'Waiting'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {completed && (
        <div className="mt-4 border p-4" style={{ borderColor: '#15803d', background: '#f0fdf4' }}>
          <h3 className={T_CARD} style={{ color: '#166534' }}>
            ✓ Completed {live.completedAt ? formatDate(live.completedAt) : ''}
          </h3>
          <p className={`${T_BODY} mt-1`} style={{ color: '#166534' }}>
            Completed {live.completedAt ? formatDate(live.completedAt) : ''}. This order now
            lives in Finished. Its case file holds the order, the payment record, the signed
            intake, the documents, and the activity trail.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => downloadCaseFile(live.id)}
              className={`${T_SMALL} border px-3 py-1.5 font-extrabold`}
              style={{ borderColor: '#15803d', color: '#166534', background: '#fff' }}
            >
              Download case file
            </button>
            {isDb && (
              <button
                onClick={handleReopen}
                className={`${T_SMALL} px-3 py-1.5 font-bold`}
                style={{ color: '#166534' }}
              >
                Reopen this order
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* Intake answers + staff edit */}
          <div className="rounded-none border border-[#dde3ec] bg-white p-4 shadow-sm">
            <h3 className={T_CARD} style={{ color: NAVY }}>Filing information</h3>
            {certified?.name && (
              <p className={`mt-2 rounded-none bg-green-50 px-3 py-2 ${T_SMALL} font-semibold text-green-800`}>
                Certified final by {certified.name}
                {certified.date ? ` on ${certified.date}` : ''}. Safe to file from these answers.
              </p>
            )}
            {intakeData ? (
              <>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {Object.entries(editData ?? intakeData).map(([k, v]) => (
                    <Field key={k} label={k}>
                      <input
                        className="input"
                        value={v}
                        disabled={!isDb}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...(prev ?? intakeData), [k]: e.target.value }))
                        }
                      />
                    </Field>
                  ))}
                </div>
                {isDb && (
                  <>
                    <Field label="Why the change (optional, goes in the activity trail)">
                      <input
                        className="input"
                        placeholder="Example: customer called to update their mailing address"
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                      />
                    </Field>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        className="btn-dark"
                        disabled={saving}
                        onClick={saveIntakeEdits}
                      >
                        {saving ? 'Saving…' : 'Save changes'}
                      </button>
                      {savedMsg && <span className={`${T_SMALL} font-bold text-green-700`}>{savedMsg}</span>}
                    </div>
                    <p className={`mt-2 ${T_SMALL}`} style={{ color: MUTED }}>
                      Customers call to change filing information. When you save a change here it is
                      stamped in the activity trail and shows in their portal right away. Light
                      details, like a nickname, they can still update themselves.
                    </p>
                  </>
                )}
              </>
            ) : (
              <p className={`mt-2 ${T_BODY}`} style={{ color: MUTED }}>
                The customer has not submitted their intake yet.
              </p>
            )}
          </div>

          {/* Documents */}
          <div className="rounded-none border border-[#dde3ec] bg-white p-4 shadow-sm">
            <h3 className={T_CARD} style={{ color: NAVY }}>Documents</h3>
            <div className="mt-3">
              <OrderDocuments order={live} />
            </div>
            {detail &&
              detail.documents.filter((d) => d.direction !== 'from_client').length > 0 && (
                <div className="mt-3 border-t border-[#eef1f6] pt-3">
                  <p className={T_LABEL} style={{ color: MUTED }}>On file in the office copy</p>
                  <ul className="mt-2 space-y-1.5">
                    {detail.documents
                      .filter((d) => d.direction !== 'from_client')
                      .map((d) => (
                        <li key={d.id} className={`${T_SMALL} flex justify-between gap-3`}>
                          <span className="font-semibold" style={{ color: NAVY }}>{d.slotLabel}: {d.fileName}</span>
                          <span style={{ color: MUTED }}>{formatDate(d.uploadedAt)}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            {detail && isDb && detail.requestedDocuments.length > 0 && (
              <ClientDocumentsSection
                orderId={live.id}
                uploads={detail.uploads}
                requested={detail.requestedDocuments}
                onChanged={loadDetail}
              />
            )}
          </div>

          {/* Team notes */}
          <div className="rounded-none border border-[#dde3ec] bg-white p-4 shadow-sm">
            <h3 className={T_CARD} style={{ color: NAVY }}>Team notes</h3>
            <p className={`${T_SMALL} mt-1`} style={{ color: MUTED }}>
              Internal only. Customers never see these.
            </p>
            {isDb ? (
              <>
                <div className="mt-3 flex gap-2">
                  <input
                    className="input"
                    placeholder="Add a note for the team…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addNote();
                    }}
                  />
                  <button className="btn-dark shrink-0" disabled={saving || !note.trim()} onClick={addNote}>
                    Add note
                  </button>
                </div>
                <ul className="mt-3 space-y-2">
                  {events
                    .filter((e) => e.action === 'note')
                    .map((e) => (
                      <li key={e.id ?? `${e.action}-${eventAt(e)}`} className="rounded-none bg-[#f6f7f9] px-3 py-2.5">
                        <p className={T_BODY} style={{ color: NAVY }}>{e.detail}</p>
                        <p className={T_SMALL} style={{ color: MUTED }}>
                          {e.actor} · {timeLabel(eventAt(e))}
                        </p>
                      </li>
                    ))}
                </ul>
              </>
            ) : (
              <p className={`mt-2 ${T_BODY}`} style={{ color: MUTED }}>
                Notes are available on real orders.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Customer */}
          <div className="rounded-none border border-[#dde3ec] bg-white p-4 shadow-sm">
            <h3 className={T_CARD} style={{ color: NAVY }}>Customer</h3>
            <p className={`${T_BODY} mt-2 font-bold`} style={{ color: NAVY }}>{live.buyerName}</p>
            <p className={T_SMALL} style={{ color: MUTED }}>{live.buyerEmail}</p>
            <p className={`${T_SMALL} mt-2`} style={{ color: MUTED }}>
              {booking
                ? `Kickoff call booked: ${booking.date} at ${booking.time} ET`
                : 'No kickoff call booked.'}
            </p>
            <a
              className={`${T_SMALL} mt-2 inline-block font-extrabold`}
              style={{ color: '#1755a8' }}
              href={`mailto:${live.buyerEmail}`}
            >
              Email the customer
            </a>
          </div>

          {/* Payment */}
          <div className="rounded-none border border-[#dde3ec] bg-white p-4 shadow-sm">
            <h3 className={T_CARD} style={{ color: NAVY }}>Payment</h3>
            <dl className={`mt-2 space-y-1.5 ${T_BODY}`}>
              <div className="flex justify-between">
                <dt style={{ color: MUTED }}>Package</dt>
                <dd className="font-semibold" style={{ color: NAVY }}>{live.packageName}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: MUTED }}>Amount</dt>
                <dd className="font-bold" style={{ color: NAVY }}>{formatUSD(live.amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: MUTED }}>Status</dt>
                <dd className="font-semibold" style={{ color: NAVY }}>{pay.label}</dd>
              </div>
              {(live.refundedCents ?? 0) > 0 && (
                <div className="flex justify-between">
                  <dt style={{ color: MUTED }}>Refunded</dt>
                  <dd className="font-semibold text-red-700">
                    {formatUSD((live.refundedCents ?? 0) / 100)}
                  </dd>
                </div>
              )}
            </dl>
            <p className={`${T_SMALL} mt-3`} style={{ color: MUTED }}>
              Refunds are issued in your Stripe login, never here. Once issued, the refund appears
              in Returns and refunds on its own.
            </p>
          </div>

          {/* Activity */}
          <div className="rounded-none border border-[#dde3ec] bg-white p-4 shadow-sm">
            <h3 className={T_CARD} style={{ color: NAVY }}>Activity</h3>
            {isDb ? (
              <ul className="mt-3 space-y-3">
                {events
                  .filter((e) => e.action !== 'note')
                  .map((e) => (
                    <li key={e.id ?? `${e.action}-${eventAt(e)}`} className="flex gap-2.5">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-none" style={{ background: '#1755a8' }} />
                      <div>
                        <p className={`${T_SMALL} font-bold`} style={{ color: NAVY }}>
                          {EVENT_LABEL[e.action] ?? e.action}
                          {e.detail ? `: ${e.detail}` : ''}
                        </p>
                        <p className={T_SMALL} style={{ color: MUTED }}>
                          {e.actor} · {timeLabel(eventAt(e))}
                        </p>
                      </div>
                    </li>
                  ))}
                {events.length === 0 && (
                  <li className={T_SMALL} style={{ color: MUTED }}>
                    Nothing recorded yet. Actions on this order will be stamped here.
                  </li>
                )}
              </ul>
            ) : (
              <p className={`${T_SMALL} mt-2`} style={{ color: MUTED }}>
                The activity trail is recorded on real orders.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- returns -------------------------------- */

function ReturnsSection({ orders, onOpen }: { orders: OrderRecord[]; onOpen: (id: string) => void }) {
  const rows = orders.filter(
    (o) => o.payStatus === 'refunded' || o.payStatus === 'cancelled' || (o.refundedCents ?? 0) > 0
  );
  const totalRefunded = rows.reduce((s, o) => s + (o.refundedCents ?? 0) / 100, 0);
  return (
    <div>
      <h2 className={T_TITLE} style={{ color: NAVY }}>Returns &amp; refunds</h2>
      <p className={`${T_BODY} mt-1 max-w-3xl`} style={{ color: MUTED }}>
        Refunds themselves are issued in Stripe, one click from the payment. This section tracks
        every refund and cancellation in one place, and shows what each customer is owed under
        your refund stages, so nothing depends on memory.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-none border border-[#dde3ec] bg-white px-4 py-3 shadow-sm">
          <p className={T_LABEL} style={{ color: MUTED }}>Refunds and cancellations</p>
          <p className={`${T_TITLE} mt-1`} style={{ color: NAVY }}>{rows.length}</p>
          <p className={T_SMALL} style={{ color: MUTED }}>orders on record</p>
        </div>
        <div className="rounded-none border border-[#dde3ec] bg-white px-4 py-3 shadow-sm">
          <p className={T_LABEL} style={{ color: MUTED }}>Total refunded</p>
          <p className={`${T_TITLE} mt-1`} style={{ color: NAVY }}>{formatUSD(totalRefunded)}</p>
          <p className={T_SMALL} style={{ color: MUTED }}>recorded from Stripe</p>
        </div>
        <div className="rounded-none border border-[#dde3ec] bg-white px-4 py-3 shadow-sm">
          <p className={T_LABEL} style={{ color: MUTED }}>Policy</p>
          <p className={`${T_BODY} mt-1.5 font-semibold`} style={{ color: NAVY }}>
            Full refund before intake, half the service fee kept after intake, no refund once a
            filing is submitted.
          </p>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-none border border-[#dde3ec] bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className={`px-4 py-10 text-center ${T_BODY}`} style={{ color: MUTED }}>
            No refunds or cancellations yet. When you issue a refund in Stripe, it lands here
            automatically.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-[#dde3ec] text-left" style={{ background: '#f6f7f9' }}>
                  <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Order</th>
                  <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Customer</th>
                  <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Status</th>
                  <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Policy stage</th>
                  <th className={`px-3 py-2.5 text-right ${T_LABEL}`} style={{ color: MUTED }}>Policy says</th>
                  <th className={`px-3 py-2.5 text-right ${T_LABEL}`} style={{ color: MUTED }}>Refunded</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const { due, stageLabel } = refundDue(o);
                  const pay = payPill(o);
                  return (
                    <tr key={o.id} className="cursor-pointer border-b border-[#eef1f6] hover:bg-[#f6f7f9]" onClick={() => onOpen(o.id)}>
                      <td className={`px-3 py-3 ${T_BODY} font-bold`} style={{ color: NAVY }}>{o.id}</td>
                      <td className="px-3 py-3">
                        <p className={`${T_BODY} font-semibold`} style={{ color: NAVY }}>{o.buyerName}</p>
                        <p className={T_SMALL} style={{ color: MUTED }}>{o.packageName}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-none px-2.5 py-1 text-[11px] font-extrabold ${pay.cls}`}>{pay.label}</span>
                      </td>
                      <td className={`px-3 py-3 ${T_SMALL} max-w-[260px]`} style={{ color: MUTED }}>{stageLabel}</td>
                      <td className={`px-3 py-3 text-right ${T_BODY} font-bold`} style={{ color: NAVY }}>{formatUSD(due)}</td>
                      <td className={`px-3 py-3 text-right ${T_BODY} font-bold text-red-700`}>
                        {(o.refundedCents ?? 0) > 0 ? formatUSD((o.refundedCents ?? 0) / 100) : '·'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- inquiries ------------------------------- */

interface Inquiry {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: 'new' | 'in_progress' | 'done';
  assignedTo?: string;
  createdAt: string;
}

function InquiriesSection({ onCount }: { onCount: (n: number) => void }) {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [patchError, setPatchError] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  async function load() {
    try {
      const res = await adminFetch('/api/inquiries');
      const data = await res.json().catch(() => null);
      if (data?.ok && Array.isArray(data.inquiries)) {
        setItems(data.inquiries as Inquiry[]);
        onCount((data.inquiries as Inquiry[]).filter((i) => i.status !== 'done').length);
        setState('ready');
      } else {
        setState('unavailable');
      }
    } catch {
      setState('unavailable');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await adminFetch(`/api/inquiries/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res || !res.ok) {
      setPatchError('That change did not save. Check your connection and try again.');
    } else {
      setPatchError('');
    }
    load();
  }

  const statusCls: Record<Inquiry['status'], string> = {
    new: 'bg-amber-100 text-amber-800',
    in_progress: 'bg-sky-100 text-sky-800',
    done: 'bg-green-100 text-green-800',
  };
  const statusLabel: Record<Inquiry['status'], string> = {
    new: 'New',
    in_progress: 'In progress',
    done: 'Done',
  };

  return (
    <div>
      <h2 className={T_TITLE} style={{ color: NAVY }}>Inquiries</h2>
      <p className={`${T_BODY} mt-1`} style={{ color: MUTED }}>
        Messages from the contact page land here as well as in your email, so they can be worked
        and tracked like everything else.
      </p>
      {state === 'loading' && (
        <p className={`mt-4 ${T_BODY}`} style={{ color: MUTED }}>Loading inquiries…</p>
      )}
      {patchError && (
        <div className="mt-4 border p-3" style={{ borderColor: '#dc2626', background: '#fef2f2' }}>
          <p className={`${T_BODY} font-bold`} style={{ color: '#b91c1c' }}>
            {patchError}
          </p>
        </div>
      )}
      {state === 'unavailable' && (
        <div className="card mt-4">
          <p className={T_BODY} style={{ color: MUTED }}>
            The inquiries inbox is not available yet. Contact messages still arrive by email.
          </p>
        </div>
      )}
      {state === 'ready' && items.length === 0 && (
        <div className="card mt-4">
          <p className={T_BODY} style={{ color: MUTED }}>No inquiries yet.</p>
        </div>
      )}
      <div className="mt-4 space-y-3">
        {items.map((i) => (
          <div key={i.id} className="rounded-none border border-[#dde3ec] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`${T_BODY} font-extrabold`} style={{ color: NAVY }}>{i.name}</p>
              <span className={`rounded-none px-2.5 py-1 text-[11px] font-extrabold ${statusCls[i.status]}`}>
                {statusLabel[i.status]}
              </span>
              <span className={`${T_SMALL} font-semibold`} style={{ color: MUTED }}>{i.topic}</span>
              <span className={`${T_SMALL} ml-auto`} style={{ color: MUTED }}>{timeLabel(i.createdAt)}</span>
            </div>
            <p className={`${T_SMALL} mt-0.5`} style={{ color: MUTED }}>{i.email}</p>
            <p className={`${T_BODY} mt-2 whitespace-pre-wrap`} style={{ color: NAVY }}>{i.message}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={`mailto:${i.email}?subject=${encodeURIComponent('Re: ' + i.topic)}`}
                className={`${T_SMALL} rounded-none px-3 py-1.5 font-extrabold text-white`}
                style={{ background: '#1755a8' }}
              >
                Reply by email
              </a>
              {i.status === 'new' && (
                <button className={`${T_SMALL} rounded-none border border-[#dde3ec] px-3 py-1.5 font-bold`} style={{ color: NAVY }} onClick={() => patch(i.id, { status: 'in_progress' })}>
                  Start working it
                </button>
              )}
              {i.status !== 'done' ? (
                <button className={`${T_SMALL} rounded-none border border-[#dde3ec] px-3 py-1.5 font-bold`} style={{ color: NAVY }} onClick={() => patch(i.id, { status: 'done' })}>
                  Mark done
                </button>
              ) : (
                <button className={`${T_SMALL} rounded-none border border-[#dde3ec] px-3 py-1.5 font-bold`} style={{ color: NAVY }} onClick={() => patch(i.id, { status: 'new' })}>
                  Reopen
                </button>
              )}
              <span className={`${T_SMALL} ml-auto`} style={{ color: MUTED }}>
                {i.assignedTo ? `Assigned to ${i.assignedTo}` : 'Unassigned'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- team ---------------------------------- */

function TeamSection({ orders, openInquiries }: { orders: OrderRecord[]; openInquiries: number }) {
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/activity');
        const data = await res.json().catch(() => null);
        if (data?.ok && Array.isArray(data.events)) setEvents(data.events as OrderEvent[]);
      } catch {
        /* work log is best-effort */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const active = orders.filter((o) => {
    const s = stageOf(o);
    return s === 'pending' || s === 'intake-in' || s === 'ready';
  }).length;
  const readyCount = orders.filter((o) => stageOf(o) === 'ready' || stageOf(o) === 'intake-in').length;

  const roles: { name: string; sees: string; never: string }[] = [
    {
      name: 'Owner (you)',
      sees: 'Everything: orders, returns, inquiries, pricing, site copy, the blog, and this Team section.',
      never: 'Nothing is hidden from the owner.',
    },
    {
      name: 'Orders',
      sees: 'Orders, intakes, filings, and documents. They move orders through the pipeline and upload filing documents.',
      never: 'No pricing changes, no site copy, no team settings, and nothing about money.',
    },
    {
      name: 'Support',
      sees: 'Inquiries, plus a read-only order lookup so they can answer customers and take information change calls.',
      never: 'No pricing, no filings, no team settings, and nothing about money.',
    },
  ];

  return (
    <div>
      <h2 className={T_TITLE} style={{ color: NAVY }}>Team &amp; access</h2>
      <p className={`${T_BODY} mt-1 max-w-3xl`} style={{ color: MUTED }}>
        Owner only. Each person signs in with their own email code and sees only the sections
        their role allows. Sections a role cannot use do not appear at all.
      </p>

      <div className="mt-4 rounded-none border border-amber-200 bg-amber-50 px-4 py-3">
        <p className={`${T_BODY} font-extrabold text-amber-900`}>The money rule</p>
        <p className={`${T_SMALL} mt-1 text-amber-900`}>
          Money lives only in your Stripe login: bank details, payouts, keys, and refunds. No
          employee role includes payments, ever. Refunds are issued by you in Stripe, and the
          admin picks them up from there.
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {roles.map((r) => (
          <div key={r.name} className="rounded-none border border-[#dde3ec] bg-white p-4 shadow-sm">
            <h3 className={T_CARD} style={{ color: NAVY }}>{r.name}</h3>
            <p className={`${T_LABEL} mt-3`} style={{ color: MUTED }}>Can do</p>
            <p className={`${T_SMALL} mt-1`} style={{ color: NAVY }}>{r.sees}</p>
            <p className={`${T_LABEL} mt-3`} style={{ color: MUTED }}>Never</p>
            <p className={`${T_SMALL} mt-1`} style={{ color: NAVY }}>{r.never}</p>
          </div>
        ))}
      </div>
      <p className={`mt-3 ${T_SMALL}`} style={{ color: MUTED }}>
        Staff logins are the next build, switched on when your first hire is close. The roles
        above are the blueprint they will be built to. Until then, everything in the work log is
        stamped Owner, because the shared owner key is the only sign-in.
      </p>

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-[320px_1fr]">
        <div className="rounded-none border border-[#dde3ec] bg-white p-4 shadow-sm">
          <h3 className={T_CARD} style={{ color: NAVY }}>Current load</h3>
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr className="text-left">
                <th className={`py-1.5 ${T_LABEL}`} style={{ color: MUTED }}>Person</th>
                <th className={`py-1.5 text-right ${T_LABEL}`} style={{ color: MUTED }}>Active</th>
                <th className={`py-1.5 text-right ${T_LABEL}`} style={{ color: MUTED }}>Ready</th>
                <th className={`py-1.5 text-right ${T_LABEL}`} style={{ color: MUTED }}>Inquiries</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#eef1f6]">
                <td className={`py-2 ${T_BODY} font-bold`} style={{ color: NAVY }}>
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-none text-[11px] font-extrabold text-white" style={{ background: NAVY }}>
                    {initials(OWNER)}
                  </span>
                  Owner
                </td>
                <td className={`py-2 text-right ${T_BODY} font-semibold`} style={{ color: NAVY }}>{active}</td>
                <td className={`py-2 text-right ${T_BODY} font-semibold`} style={{ color: NAVY }}>{readyCount}</td>
                <td className={`py-2 text-right ${T_BODY} font-semibold`} style={{ color: NAVY }}>{openInquiries}</td>
              </tr>
            </tbody>
          </table>
          <p className={`${T_SMALL} mt-2`} style={{ color: MUTED }}>
            Unassigned work counts toward the owner until it is assigned.
          </p>
        </div>

        <div className="rounded-none border border-[#dde3ec] bg-white p-4 shadow-sm">
          <h3 className={T_CARD} style={{ color: NAVY }}>Work log</h3>
          <p className={`${T_SMALL} mt-1`} style={{ color: MUTED }}>
            Every action in the admin is stamped with who did it and when. This is the pay sheet
            for per-project work.
          </p>
          {!loaded ? (
            <p className={`${T_SMALL} mt-3`} style={{ color: MUTED }}>Loading the work log…</p>
          ) : events.length === 0 ? (
            <p className={`${T_SMALL} mt-3`} style={{ color: MUTED }}>
              Nothing recorded yet. Payments, filings, document uploads, notes, and information
              changes will appear here.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[#eef1f6]">
              {events.map((e) => (
                <li key={e.id ?? `${e.action}-${eventAt(e)}`} className="flex flex-wrap items-baseline gap-x-3 py-2">
                  <span className={`${T_SMALL} font-extrabold`} style={{ color: NAVY }}>{e.actor}</span>
                  <span className={T_SMALL} style={{ color: NAVY }}>
                    {EVENT_LABEL[e.action] ?? e.action}
                    {e.detail ? `: ${e.detail}` : ''}
                  </span>
                  {eventOrderId(e) && (
                    <span className={`${T_SMALL} font-bold`} style={{ color: '#1755a8' }}>{eventOrderId(e)}</span>
                  )}
                  <span className={`${T_SMALL} ml-auto`} style={{ color: MUTED }}>{timeLabel(eventAt(e))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- admin shell ----------------------------- */

/* ------------------------------ finished ------------------------------- */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Statement CSV for a set of finished orders (month or year export):
 *  one row per order plus the section total. */
function statementCsv(rows: OrderRecord[], filename: string) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = 'Order,Package,Company,Amount,Payment reference,Finished date\n';
  const body = rows
    .map((o) =>
      [
        o.id,
        o.packageName,
        companyOf(o),
        String(o.amount),
        o.stripePaymentId ?? '',
        (o.completedAt ?? '').slice(0, 10),
      ]
        .map((v) => esc(String(v)))
        .join(',')
    )
    .join('\n');
  const total = rows.reduce((s, o) => s + o.amount, 0);
  const text = `${head}${body}\n${esc('Total')},,,${total},,`;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function FinishedSection({
  orders,
  onOpen,
  onRefresh,
}: {
  orders: OrderRecord[];
  onOpen: (id: string) => void;
  onRefresh: () => void;
}) {
  const sorted = useMemo(
    () =>
      [...orders].sort(
        (a, b) => +new Date(b.completedAt ?? b.createdAt) - +new Date(a.completedAt ?? a.createdAt)
      ),
    [orders]
  );
  const recent = sorted.slice(0, 5);
  const years = useMemo(
    () =>
      [...new Set(sorted.map((o) => new Date(o.completedAt ?? o.createdAt).getFullYear()))].sort(
        (a, b) => b - a
      ),
    [sorted]
  );
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const activeYear = pickedYear ?? years[0];
  const yearOrders = useMemo(
    () =>
      sorted.filter((o) => new Date(o.completedAt ?? o.createdAt).getFullYear() === activeYear),
    [sorted, activeYear]
  );
  const months = useMemo(() => {
    const byMonth = new Map<number, OrderRecord[]>();
    for (const o of yearOrders) {
      const m = new Date(o.completedAt ?? o.createdAt).getMonth();
      byMonth.set(m, [...(byMonth.get(m) ?? []), o]);
    }
    return [...byMonth.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([m, rows]) => ({ month: m, rows, total: rows.reduce((s, o) => s + o.amount, 0) }));
  }, [yearOrders]);
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [reopenMsg, setReopenMsg] = useState('');
  useEffect(() => {
    // Default: the newest month of the year you are looking at is open.
    setOpenMonths(months.length ? new Set([`${activeYear}-${months[0].month}`]) : new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeYear]);

  async function reopen(o: OrderRecord) {
    if (o.source !== 'database') return;
    const res = await adminFetch(`/api/orders/${encodeURIComponent(o.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed_at: null }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setReopenMsg('That order did not reopen. The change did not save. Check your connection and try again.');
    } else {
      setReopenMsg('');
    }
    onRefresh();
  }

  function finishedRow(o: OrderRecord, withActions: boolean) {
    return (
      <tr
        key={o.id}
        className="cursor-pointer border-b border-[#eef1f6] hover:bg-[#f6f7f9]"
        onClick={() => onOpen(o.id)}
      >
        <td className={`px-3 py-3 ${T_BODY} font-bold`} style={{ color: NAVY }}>{o.id}</td>
        <td className="px-3 py-3">
          <p className={`${T_BODY} font-semibold`} style={{ color: NAVY }}>{o.packageName}</p>
          <p className={T_SMALL} style={{ color: MUTED }}>{o.buyerName}</p>
        </td>
        <td className={`px-3 py-3 ${T_BODY}`} style={{ color: NAVY }}>{companyOf(o)}</td>
        <td className={`px-3 py-3 ${T_SMALL} font-semibold`} style={{ color: MUTED }}>
          {o.completedAt ? formatDate(o.completedAt) : ''}
        </td>
        <td className={`px-3 py-3 text-right ${T_BODY} font-bold`} style={{ color: NAVY }}>
          {formatUSD(o.amount)}
        </td>
        <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <span className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => downloadCaseFile(o.id)}
              className={`${T_SMALL} border border-[#dde3ec] px-3 py-1.5 font-bold`}
              style={{ color: NAVY }}
            >
              Download case file
            </button>
            {withActions && o.source === 'database' && (
              <button
                onClick={() => reopen(o)}
                className={`${T_SMALL} font-bold`}
                style={{ color: MUTED }}
              >
                Reopen
              </button>
            )}
          </span>
        </td>
      </tr>
    );
  }

  const finishedTable = (rows: OrderRecord[], withActions: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="border-b border-[#dde3ec] text-left" style={{ background: '#f6f7f9' }}>
            <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Order</th>
            <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Order details</th>
            <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Company</th>
            <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }}>Finished</th>
            <th className={`px-3 py-2.5 text-right ${T_LABEL}`} style={{ color: MUTED }}>Amount</th>
            <th className={`px-3 py-2.5 ${T_LABEL}`} style={{ color: MUTED }} aria-label="Actions" />
          </tr>
        </thead>
        <tbody>{rows.map((o) => finishedRow(o, withActions))}</tbody>
      </table>
    </div>
  );

  return (
    <div>
      <h1 className={T_TITLE} style={{ color: NAVY }}>Finished</h1>
      <p className={`${T_BODY} mt-1 max-w-[760px]`} style={{ color: MUTED }}>
        Every finished order becomes a sealed case file: the order, the payment record, the
        signed intake and power of attorney, the documents both ways, and the full activity
        trail. Kept for at least 7 years, never deleted.
      </p>

      {reopenMsg && (
        <div className="mt-4 border p-3" style={{ borderColor: '#dc2626', background: '#fef2f2' }}>
          <p className={`${T_BODY} font-bold`} style={{ color: '#b91c1c' }}>
            {reopenMsg}
          </p>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="mt-4 border border-[#dde3ec] bg-white p-5 shadow-sm">
          <p className={T_BODY} style={{ color: MUTED }}>
            Nothing finished yet. When you mark an order complete from its detail page, it
            moves here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-hidden border border-[#dde3ec] bg-white shadow-sm">
            <div className="border-b border-[#dde3ec] px-4 py-3">
              <p className={T_LABEL} style={{ color: MUTED }}>Recently finished</p>
            </div>
            {finishedTable(recent, true)}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setPickedYear(y)}
                aria-pressed={y === activeYear}
                className={`${T_SMALL} border px-3 py-1.5 font-extrabold`}
                style={
                  y === activeYear
                    ? { background: NAVY, color: '#fff', borderColor: NAVY }
                    : { background: '#fff', color: MUTED, borderColor: '#dde3ec' }
                }
              >
                {y}
              </button>
            ))}
            <span className={T_SMALL} style={{ color: MUTED }}>
              Year total: {formatUSD(yearOrders.reduce((s, o) => s + o.amount, 0))}
            </span>
            <button
              onClick={() => statementCsv(yearOrders, `finished-${activeYear}.csv`)}
              className={`${T_SMALL} ml-auto border border-[#dde3ec] bg-white px-3 py-1.5 font-bold`}
              style={{ color: NAVY }}
            >
              Export year
            </button>
          </div>

          {months.map(({ month, rows, total }) => {
            const key = `${activeYear}-${month}`;
            const open = openMonths.has(key);
            return (
              <div key={key} className="mt-3 overflow-hidden border border-[#dde3ec] bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <button
                    onClick={() =>
                      setOpenMonths((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                    aria-expanded={open}
                    className={`${T_BODY} font-extrabold`}
                    style={{ color: NAVY }}
                  >
                    {open ? '▾' : '▸'} {MONTH_NAMES[month]} {activeYear}
                  </button>
                  <span className={T_SMALL} style={{ color: MUTED }}>
                    {rows.length} order{rows.length === 1 ? '' : 's'} finished · {formatUSD(total)}
                  </span>
                  <button
                    onClick={() => statementCsv(rows, `finished-${activeYear}-${String(month + 1).padStart(2, '0')}.csv`)}
                    className={`${T_SMALL} ml-auto border border-[#dde3ec] px-3 py-1.5 font-bold`}
                    style={{ color: NAVY }}
                  >
                    Export month
                  </button>
                </div>
                {open && <div className="border-t border-[#dde3ec]">{finishedTable(rows, false)}</div>}
              </div>
            );
          })}

          <div className="mt-4 border border-[#dde3ec] bg-white p-4 shadow-sm">
            <h3 className={T_CARD} style={{ color: NAVY }}>What an export contains</h3>
            <p className={`${T_BODY} mt-1`} style={{ color: MUTED }}>
              A statement lists every finished order in the period with its package, client,
              amount, payment reference, and completion date, plus the total. A case file is
              one order complete: the summary, the payment record, the intake and signed power
              of attorney, every document both ways, and the activity trail. That is the
              package an auditor, a CPA, or a chargeback review asks for.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------- search -------------------------------- */

function SearchResults({
  query,
  open,
  finished,
  onOpen,
}: {
  query: string;
  open: OrderRecord[];
  finished: OrderRecord[];
  onOpen: (id: string) => void;
}) {
  const resultRow = (o: OrderRecord, done: boolean) => (
    <button
      key={o.id}
      onClick={() => onOpen(o.id)}
      className="flex w-full flex-wrap items-center gap-2 border-b border-[#eef1f6] px-4 py-3 text-left hover:bg-[#f6f7f9]"
    >
      <span className={`${T_BODY} font-extrabold`} style={{ color: NAVY }}>{o.id}</span>
      <span className={`${T_BODY} font-semibold`} style={{ color: NAVY }}>{o.packageName}</span>
      <span className={T_SMALL} style={{ color: MUTED }}>
        {companyOf(o)} · {o.buyerName}
        {o.usdot ? ` · USDOT ${o.usdot}` : ''}
      </span>
      <span className="ml-auto">
        {done ? (
          <span className="bg-[#dcfce7] px-2.5 py-1 text-[11px] font-extrabold text-[#166534]">
            Finished
          </span>
        ) : (
          <span className={`px-2.5 py-1 text-[11px] font-extrabold ${stagePill(stageOf(o))}`}>
            {STAGE_LABEL[stageOf(o)]}
          </span>
        )}
      </span>
    </button>
  );

  return (
    <div>
      <h1 className={T_TITLE} style={{ color: NAVY }}>
        Search: &ldquo;{query}&rdquo; · {open.length + finished.length} result
        {open.length + finished.length === 1 ? '' : 's'}
      </h1>
      {open.length === 0 && finished.length === 0 ? (
        <div className="mt-4 border border-[#dde3ec] bg-white p-5 shadow-sm">
          <p className={T_BODY} style={{ color: MUTED }}>
            No order matches that. Try an order number, a company name, or a USDOT.
          </p>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div className="mt-4 overflow-hidden border border-[#dde3ec] bg-white shadow-sm">
              <div className="border-b border-[#dde3ec] px-4 py-3">
                <p className={T_LABEL} style={{ color: MUTED }}>Open orders</p>
              </div>
              {open.map((o) => resultRow(o, false))}
            </div>
          )}
          {finished.length > 0 && (
            <div className="mt-4 overflow-hidden border border-[#dde3ec] bg-white shadow-sm">
              <div className="border-b border-[#dde3ec] px-4 py-3">
                <p className={T_LABEL} style={{ color: MUTED }}>Finished orders</p>
              </div>
              {finished.map((o) => resultRow(o, true))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Section = 'orders' | 'returns' | 'inquiries' | 'packages' | 'copy' | 'team' | 'finished';

export default function AdminPage() {
  const { packages, orders: localOrders } = useTtb();
  const [gate, setGate] = useState<'loading' | 'locked' | 'ready'>('loading');
  const [keyInput, setKeyInput] = useState('');
  const [lockError, setLockError] = useState('');
  const [checking, setChecking] = useState(false);
  const [dbOrders, setDbOrders] = useState<OrderRecord[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [section, setSection] = useState<Section>('orders');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [inquiryCount, setInquiryCount] = useState(0);

  async function load() {
    setChecking(true);
    try {
      const res = await fetch('/api/orders', { cache: 'no-store', headers: { ...adminKeyHeaders() } });
      if (res.status === 401) {
        // Say what is wrong instead of sitting silent: a key was tried and
        // the server did not accept it. Drop the stored copy so a stale key
        // does not keep failing on every visit.
        if (storedAdminKey()) {
          setLockError(
            'That key was not accepted. It has to match the ADMIN_KEY saved in Vercel (Production) exactly, character for character. Paste it fresh from your Notes rather than typing it.'
          );
          try {
            window.localStorage.removeItem('ttb-admin-key');
          } catch {
            /* storage unavailable */
          }
        }
        setGate('locked');
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.ok && data?.configured && Array.isArray(data.orders)) {
        setDbOrders(data.orders as OrderRecord[]);
      } else {
        setDbOrders([]);
      }
      setLockError('');
      setGate('ready');
    } catch {
      if (gate === 'locked' || storedAdminKey()) {
        setLockError('Could not reach the server to check the key. Check your connection and try again.');
        setGate('locked');
      } else {
        setDbOrders([]);
        setGate('ready');
      }
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Merge: the database is the truth; this browser's local orders fill in
  // anything the database does not have (older test orders), deduped by id.
  const orders = useMemo(() => {
    const byId = new Map<string, OrderRecord>();
    for (const o of localOrders) byId.set(o.id, o);
    for (const o of dbOrders) {
      const local = byId.get(o.id);
      if (!local) {
        byId.set(o.id, o);
        continue;
      }
      const merged: Record<string, unknown> = { ...local };
      for (const [k, v] of Object.entries(o)) {
        if (v !== undefined) merged[k] = v;
      }
      byId.set(o.id, merged as unknown as OrderRecord);
    }
    return [...byId.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [localOrders, dbOrders]);

  const openOrder = openId ? orders.find((o) => o.id === openId) ?? null : null;
  const returnsCount = orders.filter(
    (o) => o.payStatus === 'refunded' || o.payStatus === 'cancelled' || (o.refundedCents ?? 0) > 0
  ).length;
  // Completed orders leave the queue entirely: the Orders badge, the
  // queue, and the counts only ever see open work. Finished holds the rest.
  const openOrders = orders.filter((o) => !o.completedAt);
  const finishedOrders = orders.filter((o) => Boolean(o.completedAt));
  const searchQuery = search.trim().toLowerCase();
  const searchOpen = searchQuery ? openOrders.filter((o) => orderMatches(o, searchQuery)) : [];
  const searchFinished = searchQuery
    ? finishedOrders.filter((o) => orderMatches(o, searchQuery))
    : [];

  if (gate === 'loading') {
    return (
      <div className="sharp bg-[#f6f7f9] py-16">
        <div className="mx-auto max-w-md px-4">
          <div className="card">
            <p className={T_BODY} style={{ color: MUTED }}>Opening the admin…</p>
          </div>
        </div>
      </div>
    );
  }

  if (gate === 'locked') {
    return (
      <div className="sharp bg-[#f6f7f9] py-16">
        <div className="mx-auto max-w-md px-4">
          <div className="card">
            <p className={T_LABEL} style={{ color: MUTED }}>Owner only</p>
            <h1 className={`${T_TITLE} mt-1`} style={{ color: NAVY }}>Admin is locked</h1>
            <p className={`mt-2 ${T_BODY}`} style={{ color: MUTED }}>
              Paste your ADMIN_KEY to open the admin. It is kept only in this browser.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!keyInput.trim()) {
                  setLockError('Paste your ADMIN_KEY first, then unlock.');
                  return;
                }
                setLockError('');
                try {
                  window.localStorage.setItem('ttb-admin-key', keyInput.trim());
                } catch {
                  /* storage unavailable */
                }
                setKeyInput('');
                setRefreshKey((k) => k + 1);
              }}
            >
              <input
                type="password"
                className="input"
                placeholder="Paste ADMIN_KEY"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  if (lockError) setLockError('');
                }}
                autoComplete="off"
              />
              {lockError && (
                <p role="alert" className={`${T_SMALL} font-bold leading-relaxed text-red-700`}>
                  {lockError}
                </p>
              )}
              <button type="submit" className="btn-primary w-full" disabled={checking}>
                {checking ? 'Checking…' : 'Unlock admin'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const navItem = (
    key: Section,
    icon: string,
    label: string,
    badge?: { text: string; gold?: boolean; green?: boolean }
  ) => (
    <button
      key={key}
      onClick={() => {
        setSection(key);
        setOpenId(null);
      }}
      className={`flex w-full items-center gap-2.5 rounded-none px-3 py-2 text-left ${T_BODY}`}
      style={
        section === key && !openId
          ? { background: 'rgba(255,255,255,0.14)', color: '#fff', fontWeight: 800 }
          : { color: '#cbd8f0', fontWeight: 600 }
      }
    >
      <span className="w-4 text-center" aria-hidden="true">{icon}</span>
      {label}
      {badge && (
        <span
          className="ml-auto rounded-none px-2 py-0.5 text-[11px] font-extrabold"
          style={
            badge.gold
              ? { background: '#ffc61a', color: NAVY }
              : badge.green
                ? { background: '#15803d', color: '#fff' }
                : { background: 'rgba(255,255,255,0.16)', color: '#fff' }
          }
        >
          {badge.text}
        </span>
      )}
    </button>
  );

  return (
    <div className="sharp bg-[#f6f7f9]">
      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        {/* Sidebar */}
        <aside
          className="shrink-0 p-4 lg:sticky lg:top-0 lg:h-screen lg:w-[248px]"
          style={{ background: NAVY }}
        >
          <div className="px-1">
            <p className="text-[15px] font-extrabold leading-tight text-white">The Trucking Business</p>
            <p className={T_SMALL} style={{ color: '#9db1d4' }}>Admin</p>
          </div>
          <div className="mt-4">
            <input
              className="w-full rounded-none border border-white/20 bg-white/10 px-3 py-2 text-[13.5px] text-white placeholder:text-[#9db1d4]"
              placeholder="Search orders, customers…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpenId(null);
              }}
            />
          </div>
          <nav className="mt-4 space-y-1">
            {navItem('orders', '▦', 'Orders', { text: String(openOrders.length) })}
            {navItem('finished', '✓', 'Finished', { text: String(finishedOrders.length), green: true })}
            {navItem('returns', '↩', 'Returns & refunds', { text: String(returnsCount) })}
            {navItem('inquiries', '✉', 'Inquiries', { text: String(inquiryCount) })}
            {navItem('packages', '▤', 'Packages & pricing')}
            {navItem('copy', '✎', 'Homepage copy')}
            {navItem('team', '⚿', 'Team & access', { text: 'OWNER', gold: true })}
          </nav>
          <Link
            href="/admin/blog"
            className={`mt-1 flex items-center gap-2.5 rounded-none px-3 py-2 ${T_BODY}`}
            style={{ color: '#cbd8f0', fontWeight: 600 }}
          >
            <span className="w-4 text-center" aria-hidden="true">✎</span>
            Blog articles
          </Link>
          <div className="mt-6 rounded-none bg-white/10 px-3 py-3">
            <p className={`${T_SMALL} font-extrabold text-white`}>Owner</p>
            <p className={T_SMALL} style={{ color: '#9db1d4' }}>
              Signed in with the owner key. Actions are stamped Owner until staff logins ship.
            </p>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 p-4 lg:p-6">
          {openOrder ? (
            <OrderDetail
              order={openOrder}
              onBack={() => setOpenId(null)}
              onRefresh={() => setRefreshKey((k) => k + 1)}
            />
          ) : searchQuery ? (
            <SearchResults
              query={search.trim()}
              open={searchOpen}
              finished={searchFinished}
              onOpen={setOpenId}
            />
          ) : section === 'orders' ? (
            <>
              <h1 className={T_TITLE} style={{ color: NAVY }}>Orders</h1>
              <div className="mt-3">
                <OrdersSection
                  orders={openOrders}
                  search=""
                  onOpen={setOpenId}
                  onRefresh={() => setRefreshKey((k) => k + 1)}
                />
              </div>
            </>
          ) : section === 'finished' ? (
            <FinishedSection
              orders={finishedOrders}
              onOpen={setOpenId}
              onRefresh={() => setRefreshKey((k) => k + 1)}
            />
          ) : section === 'returns' ? (
            <ReturnsSection orders={orders} onOpen={setOpenId} />
          ) : section === 'inquiries' ? (
            <InquiriesSection onCount={setInquiryCount} />
          ) : section === 'packages' ? (
            <div>
              <h2 className={T_TITLE} style={{ color: NAVY }}>Packages &amp; pricing</h2>
              <p className={`${T_BODY} mt-1`} style={{ color: MUTED }}>
                These editors save to this browser, the way they always have.
              </p>
              <div className="mt-4 space-y-6">
                {packages.map((p) => (
                  <PackageEditor key={p.slug} pkg={p} />
                ))}
              </div>
            </div>
          ) : section === 'copy' ? (
            <div>
              <h2 className={T_TITLE} style={{ color: NAVY }}>Homepage copy</h2>
              <div className="mt-4">
                <CopyEditor />
              </div>
            </div>
          ) : (
            <TeamSection orders={orders} openInquiries={inquiryCount} />
          )}
        </main>
      </div>
    </div>
  );
}
