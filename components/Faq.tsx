'use client';

import { useState } from 'react';

export interface FaqItem {
  q: string;
  a: string;
}

export default function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-[#dde3ec] rounded-2xl border border-[#dde3ec] bg-white">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-navy">{item.q}</span>
              <span className="text-[20px] font-bold text-dotblue" aria-hidden="true">
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <p className="px-5 pb-5 text-[13.5px] leading-relaxed text-charcoal">{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
