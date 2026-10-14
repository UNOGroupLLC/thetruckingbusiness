import Link from 'next/link';

/* Footer with the full menu columns from the approved prototype. */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <b>The Trucking Business</b>
            <span>
              TheTruckingBusiness.com — Start, operate &amp; stay compliant. English counterpart of
              NegocioDeCamionero.com.
            </span>
          </div>
          <div>
            <b>Start</b>
            <Link href="/#start">How It Works</Link>
            <Link href="/pricing">Packages &amp; Pricing</Link>
            <Link href="/calculators/startup-cost">Startup Calculator</Link>
          </div>
          <div>
            <b>Compliance</b>
            <Link href="/#compliance">All Services</Link>
            <Link href="/#checker">Audit Readiness Check</Link>
            <Link href="/calculators/cost-per-mile">Cost-Per-Mile Tool</Link>
          </div>
          <div>
            <b>Company</b>
            <Link href="/#resources">Free Guides</Link>
            <a href="mailto:hello@thetruckingbusiness.com">Talk to us</a>
            <a href="https://negociodecamionero.com" target="_blank" rel="noopener">
              Español ↗
            </a>
          </div>
        </div>
        <p className="disclaimer">
          <strong>Disclaimer:</strong> The Trucking Business is an independent private company and
          is not affiliated with FMCSA, the U.S. Department of Transportation, or any government
          agency. Information on this site is educational and for planning only; always verify
          current requirements, fees, and deadlines with FMCSA, the eCFR, IRS, and your state
          agencies before filing. Phase 1 demo — checkout is simulated and no payment is processed.
        </p>
        <p style={{ fontSize: 12, marginTop: 16 }}>
          <Link href="/contact" style={{ display: 'inline', padding: 0 }}>
            Contact
          </Link>
          {'  ·  '}
          <Link href="/privacy-policy" style={{ display: 'inline', padding: 0 }}>
            Privacy Policy
          </Link>
          {'  ·  '}
          <Link href="/terms-of-service" style={{ display: 'inline', padding: 0 }}>
            Terms of Service
          </Link>
          {'  ·  '}
          <Link href="/terms-of-service#refund-policy" style={{ display: 'inline', padding: 0 }}>
            Refund Policy
          </Link>
        </p>
        <p style={{ fontSize: 12, marginTop: 12 }}>
          © 2026 The Trucking Business. Educational content only; not legal advice.
        </p>
      </div>
    </footer>
  );
}
