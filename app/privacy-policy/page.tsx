import type { Metadata } from 'next';
import { renderPost } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Privacy Policy | The Trucking Business',
  description:
    'What information The Trucking Business collects, how we use it, and who we share it with. We do not sell your personal information.',
  alternates: { canonical: 'https://www.thetruckingbusiness.com/privacy-policy' },
};

/**
 * Privacy policy text (owner-approved draft, workspace/your_files/legal/
 * privacy-policy.md). Rendered with the same markdown pipeline as the blog.
 * The H1 is rendered by the page itself, so it is not repeated here.
 */
const POLICY_MD = `
**The Trucking Business** (thetruckingbusiness.com)
Operated by UNO Group LLC

Effective October 14, 2026

## Who we are

The Trucking Business is a brand of UNO Group LLC, a Florida company. We provide business startup and regulatory compliance filing services for trucking companies. We are an independent private company. We are not FMCSA, USDOT, or any other government agency, and we are not affiliated with any government agency.

This policy explains what information we collect when you use our website and services, how we use it, and who we share it with.

## Information we collect

**Information you give us at checkout.** When you buy a service, our payment processor collects your name, email address, and payment details. We receive your name, email address, and order details. We do not receive or store your full card number.

**Information you give us in an intake form.** After purchase, you complete a form specific to the service you bought. Depending on the service, this can include your business legal name, business structure, business and mailing addresses, USDOT and MC numbers, your EIN (employer identification number), owner and officer names and details, vehicle information, and driver details needed for drug and alcohol consortium enrollment and Clearinghouse queries, including driver names, CDL numbers, and CDL issuing states. You may also upload documents for us to use in your filing.

**Information from booking a call.** If you book a kickoff call, we collect the name, email address, and time you choose, along with anything you write in the booking notes.

**Information you give us through the contact form.** If you send us a message from our contact page, we collect your name, email address, the topic you select, and the message you write, so that we can read it and reply to you.

**Account information.** If you use our client portal, we store the email address you log in with. Portal login is passwordless. We send a one-time code to your email to sign you in.

**Information collected automatically.** Our hosting and service providers collect standard technical information, such as your IP address, browser type, and pages visited, as part of operating and securing the website.

## How we use your information

We use your information to:

- Process your order and payment
- Prepare and submit the filings you purchased, as your authorized preparer, to the government agencies involved
- Communicate with you about your order, your filing, and your account
- Schedule and hold your kickoff call
- Provide ongoing services under a subscription you purchased
- Meet our legal, tax, and record keeping obligations
- Protect the security of our website and prevent fraud

Submitting a filing means sending the information required by that filing to the relevant government agency, such as FMCSA or a state agency. We only submit what the filing requires and what you have authorized us to submit.

## Who we share information with

**Government agencies.** We share the information a filing requires with the agency that processes it, because that is the service you hired us to perform. Information submitted to an agency becomes part of that agency's records. Some carrier information, such as USDOT and MC numbers, operating authority status, and insurance filings, is publicly available from the agency itself. We cannot control, change, or delete what an agency keeps or publishes.

**Service providers.** We use the following providers to run the website and deliver our services:

- Stripe, for payment processing
- Supabase, for our database and portal login
- Resend, for sending transactional email
- Vercel, for website hosting

These providers process information on our behalf to provide their services to us.

**Legal requirements.** We may disclose information if the law requires it, such as in response to a court order or a lawful request from a government authority, or if disclosure is needed to protect our rights or the safety of others.

**We do not sell your personal information.** We do not rent it or trade it, and we do not share it for advertising purposes.

## Cookies and browser storage

We use cookies and browser storage that are essential for the website to work. Our client portal keeps you signed in using storage in your own browser. Our payment processor, Stripe, sets cookies during checkout on its own pages. We do not use cookies or browser storage to build advertising profiles, and we do not use analytics or advertising cookies. If we add analytics or advertising cookies in the future, we will update this policy first.

## How long we keep information

We keep your information for as long as needed to provide your services and to meet legal, tax, and record keeping obligations that apply to our business and to your filings. When information is no longer needed for those purposes, we delete it or remove the parts that identify you.

## Security

We use reputable providers for hosting, payments, and data storage, and access to customer information inside our business is limited to the people who need it to do the work. Payments are handled by Stripe, so your full card number never touches our systems. No system is completely secure, and we cannot guarantee absolute security. If a security incident affects your information and the law requires us to tell you, we will.

## Your choices and rights

You may ask us to:

- Show you the personal information we hold about you
- Correct information that is wrong or incomplete
- Delete your information, subject to records we are required by law to keep

Send any of these requests to hello@thetruckingbusiness.com. We will respond within a reasonable time and may need to confirm your identity before acting on a request, so that we do not hand one customer's information to someone else.

## Children

Our services are for businesses and the adults who run them. They are not directed at minors, and we do not knowingly collect information from anyone under 18. If you believe a minor has given us information, contact us and we will delete it.

## Changes to this policy

If we change this policy, we will post the updated version on this page and update the effective date at the top. If a change is significant, we will make a reasonable effort to notify customers by email before it takes effect.

## Contact us

UNO Group LLC, doing business as The Trucking Business
7901 4th Street North, Suite 300
St. Petersburg, FL 33702
Email: hello@thetruckingbusiness.com
Phone: +1 (725) 244-6771
`;

export default function PrivacyPolicyPage() {
  const html = renderPost(POLICY_MD);
  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 64 }}>
      <article style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1
          style={{
            color: '#0b2e4f',
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            margin: '12px 0 24px',
          }}
        >
          Privacy Policy
        </h1>
        <div className="blog-body" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  );
}
