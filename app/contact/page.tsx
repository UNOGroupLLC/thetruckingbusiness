import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us | The Trucking Business',
  description:
    'Questions about our trucking startup and DOT compliance services, or about an existing order? Send us a message.',
  alternates: { canonical: 'https://www.thetruckingbusiness.com/contact' },
};

const NEXT_STEPS = [
  'Send your message.',
  'We reply by email.',
  'Order questions move fastest with an order number.',
];

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export default function ContactPage() {
  return (
    <>
      {/* HERO — same treatment as the homepage hero top: deep navy, glass
          eyebrow pill, .hero-h1 with a yellow <em>, .hero-sub. The contact
          methods sit on the navy as frosted glass panels (Office wide on the
          left, Email over Call stacked on the right); the form card is solid
          white and hangs over the light tail below the hero. */}
      <section className="contact-hero">
        {/* Dashed route line — a nod to the roadmap route motif used across the site. */}
        <svg
          className="contact-route"
          viewBox="0 0 620 160"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M10 140 C 150 140, 190 34, 320 34 S 510 104, 604 44"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2.5"
            strokeDasharray="7 9"
            strokeLinecap="round"
          />
          <circle cx="10" cy="140" r="6" fill="#0a1a36" stroke="#ffc61a" strokeWidth="2.5" />
          <circle cx="320" cy="34" r="4" fill="rgba(255,255,255,0.55)" />
          <circle cx="604" cy="44" r="6" fill="#ffc61a" />
        </svg>
        <div className="mx-auto max-w-6xl px-4">
          <span className="eyebrow-pill">
            <i aria-hidden="true" />
            Support • Questions • Orders
          </span>
          <h1 className="hero-h1">
            Talk to a <em>real person.</em>
          </h1>
          <p className="hero-sub">
            Questions about a service, an order, or getting your authority started. Send a message
            and we will get back to you by email.
          </p>

          <div className="contact-grid">
            {/* LEFT: glass contact panels, on the navy */}
            <div className="contact-side">
              <div className="contact-panels">
                {/* Office — one wide, tall anchor panel */}
                <div className="contact-card">
                  <div className="contact-card-head">
                    <span className="contact-icon">
                      <svg {...ICON_PROPS}>
                        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <p className="kicker">Office</p>
                  </div>
                  <p className="contact-card-value soft">
                    7901 4th Street North
                    <br />
                    Suite 300
                    <br />
                    St. Petersburg, FL 33702
                  </p>
                </div>

                {/* Email over Call — stacked to match the Office panel height */}
                <div className="contact-stack">
                  <div className="contact-card">
                    <div className="contact-card-head">
                      <span className="contact-icon">
                        <svg {...ICON_PROPS}>
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="m3 7 9 6 9-6" />
                        </svg>
                      </span>
                      <p className="kicker">Email us</p>
                    </div>
                    <a href="mailto:hello@thetruckingbusiness.com" className="contact-card-value email">
                      hello@thetruckingbusiness.com
                    </a>
                  </div>

                  <div className="contact-card">
                    <div className="contact-card-head">
                      <span className="contact-icon">
                        <svg {...ICON_PROPS}>
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </span>
                      <p className="kicker">Call us</p>
                    </div>
                    <a href="tel:+17252446771" className="contact-card-value">
                      +1 (725) 244-6771
                    </a>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT: the form — the single solid card, overlapping the hero.
                What happens next lives inside this card as its bottom strip (v7). */}
            <div className="contact-form-card">
              <h2 className="contact-form-title">Send us a message</h2>
              <ContactForm />
              <div className="contact-next">
                <p className="kicker">What happens next</p>
                <ol className="contact-steps">
                  {NEXT_STEPS.map((step, i) => (
                    <li key={step}>
                      <span className="contact-step-num">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Light tail the form card hangs over */}
      <div className="contact-tail" aria-hidden="true" />
    </>
  );
}
