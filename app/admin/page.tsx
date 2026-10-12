'use client';

import { useState } from 'react';
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
import { syncFiling, syncDocument } from '@/lib/sync';
import type { Package, OrderRecord } from '@/lib/store';
import Field from '@/components/Field';

/**
 * MOCK ADMIN — Phase 1.
 * Edits persist to this browser's localStorage via the mock store.
 * Phase 2: protect with owner auth; read/write Supabase tables `packages`
 * and `site_copy` (or a headless CMS) instead.
 */

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
      <h3 className="text-lg font-extrabold text-navy">{pkg.name}</h3>
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
      <h3 className="text-lg font-extrabold text-navy">Site copy</h3>
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

const STATUS_META: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Intake submitted', cls: 'bg-amber-100 text-amber-800' },
  corrected: { label: 'Correction saved', cls: 'bg-amber-100 text-amber-800' },
  certified: { label: 'Certified final', cls: 'bg-green-100 text-green-800' },
  filing: { label: 'Filing in progress', cls: 'bg-sky-100 text-sky-800' },
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
        Intake pending
      </span>
    );
  }
  const meta = STATUS_META[status] ?? STATUS_META.submitted;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.cls}`}>{meta.label}</span>
  );
}

/** Per-order document slots: expected docs from the package + upload/remove. */
function OrderDocuments({ order }: { order: OrderRecord }) {
  const pkg = getPackage(order.packageSlug);
  const slots = pkg?.expectedDocuments ?? [];
  const [uploading, setUploading] = useState<string | null>(null);

  if (slots.length === 0) return null;

  async function onFile(slotKey: string, slotLabel: string, file: File | undefined) {
    if (!file) return;
    setUploading(slotKey);
    try {
      // Demo persistence: base64 data URL in localStorage (small PDFs).
      // Production: the API route stores bytes in Supabase Storage.
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
      syncDocument(
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
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <p className="text-xs font-bold uppercase tracking-wider text-steel">Documents</p>
      <ul className="mt-2 space-y-2">
        {slots.map((s) => {
          const doc = order.documents?.find((d) => d.slotKey === s.key);
          const inputId = `doc-${order.id}-${s.key}`;
          return (
            <li key={s.key} className="flex items-center justify-between gap-3 rounded-lg bg-mist px-3 py-2.5 text-sm">
              <div>
                <p className="font-semibold text-navy">{s.label}</p>
                {doc ? (
                  <p className="text-xs text-steel">
                    {doc.fileName} · {formatDate(doc.uploadedAt)}
                  </p>
                ) : (
                  <p className="text-xs text-steel">
                    {s.auto ? 'Auto-attached at purchase' : 'Waiting for upload'}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {doc && (
                  <button
                    className="text-xs font-bold text-red-700 hover:underline"
                    onClick={() => removeDocument(order.id, doc.id)}
                  >
                    Remove
                  </button>
                )}
                <label
                  htmlFor={inputId}
                  className="cursor-pointer rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white"
                >
                  {uploading === s.key ? 'Uploading…' : doc ? 'Replace' : 'Upload'}
                </label>
                <input
                  id={inputId}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
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
      <p className="mt-2 text-xs text-steel">
        Uploading notifies the customer by email — the file appears in their portal under “Your
        documents”.
      </p>
    </div>
  );
}

function OrderInbox({ orders }: { orders: OrderRecord[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (orders.length === 0) {
    return (
      <div className="card">
        <p className="text-sm text-steel">
          No orders in this browser yet. Run through a test purchase (pricing → buy → intake) and
          it will appear here.
        </p>
      </div>
    );
  }

  function handleStartFiling(o: OrderRecord) {
    if (!window.confirm(`Start filing for order ${o.id}? The intake will be fully locked.`)) return;
    startFiling(o.id);
    syncFiling(o.id);
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => {
        const booking = getCallBooking(o.id);
        const intakeCount = o.intake ? Object.keys(o.intake).length : 0;
        const open = openId === o.id;
        const latestCert = o.intakeVersions?.[o.intakeVersions.length - 1];
        const canFile = o.intakeStatus === 'submitted' || o.intakeStatus === 'certified';
        return (
          <div key={o.id} className="card">
            <button
              onClick={() => setOpenId(open ? null : o.id)}
              className="flex w-full items-center justify-between gap-4 text-left"
              aria-expanded={open}
            >
              <div>
                <p className="flex flex-wrap items-center gap-2 font-extrabold text-navy">
                  {o.id} · {o.packageName}
                  <StatusBadge status={o.intakeStatus} />
                </p>
                <p className="mt-1 text-sm text-steel">
                  {o.buyerName} ({o.buyerEmail}) · {formatUSD(o.amount)} · {formatDate(o.createdAt)}
                </p>
                <p className="mt-1 text-xs font-semibold">
                  <span className={intakeCount > 0 ? 'text-green-700' : 'text-amber-700'}>
                    {intakeCount > 0 ? `✓ Intake answers (${intakeCount})` : '○ Intake pending'}
                  </span>
                  {' · '}
                  <span className={booking ? 'text-green-700' : 'text-steel'}>
                    {booking ? `✓ Call booked: ${booking.date} ${booking.time} ET` : '○ No call booked'}
                  </span>
                  {o.documents && o.documents.length > 0 && (
                    <span className="text-dotblue"> · ✓ {o.documents.length} document{o.documents.length > 1 ? 's' : ''}</span>
                  )}
                </p>
              </div>
              <span className="text-xl text-steel" aria-hidden="true">{open ? '−' : '+'}</span>
            </button>
            {open && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                {latestCert?.certifiedAt && (
                  <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
                    🔒 Certified final by {latestCert.certifiedName} on {latestCert.certifiedDate} — safe to file.
                  </p>
                )}
                {canFile && (
                  <button className="btn-primary mb-3" onClick={() => handleStartFiling(o)}>
                    Start filing — lock intake
                  </button>
                )}
                {o.intake && (
                  <dl className="divide-y divide-slate-100 text-sm">
                    {Object.entries(o.intake).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-1.5">
                        <dt className="font-semibold text-steel">{k}</dt>
                        <dd className="text-right font-medium">{v === 'yes' ? 'Yes — agreed/signed' : v || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <OrderDocuments order={o} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const { packages, orders } = useTtb();

  return (
    <div className="bg-mist py-12">
      <div className="mx-auto max-w-5xl space-y-8 px-4">
        <div>
          <p className="eyebrow">Owner only (demo)</p>
          <h1 className="mt-2 text-3xl font-extrabold text-navy md:text-4xl">Admin panel</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/admin/blog" className="btn btn-y btn-s">
              ✎ Blog articles
            </Link>
          </div>
          <p className="mt-2 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Mock admin — changes save to this browser only (localStorage). In production this is
            protected by owner login and writes to the database/CMS.
          </p>
        </div>

        <section>
          <h2 className="mb-4 text-xl font-extrabold text-navy">Order inbox</h2>
          <p className="mb-4 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Demo: shows orders placed in <strong>this browser</strong>. In production this lists
            every order from the database, and you also get an <strong>email for each purchase,
            intake submission, and call booking</strong> (wired via <code>/api/orders</code> +
            Resend — set the keys in <code>.env</code>).
          </p>
          <OrderInbox orders={orders} />
        </section>

        <section>
          <h2 className="mb-4 text-xl font-extrabold text-navy">Packages &amp; pricing</h2>
          <div className="space-y-6">
            {packages.map((p) => (
              <PackageEditor key={p.slug} pkg={p} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-extrabold text-navy">Homepage copy</h2>
          <CopyEditor />
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/pricing" className="btn-outline-dark">View pricing page</Link>
          <Link href="/" className="btn-outline-dark">View homepage</Link>
        </div>
      </div>
    </div>
  );
}
