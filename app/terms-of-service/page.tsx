import type { Metadata } from 'next';
import { renderPost } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Terms of Service | The Trucking Business',
  description:
    'The terms that apply when you buy a service from The Trucking Business, including our refund policy, subscriptions, and filing services.',
  alternates: { canonical: 'https://www.thetruckingbusiness.com/terms-of-service' },
};

/**
 * Terms of service text (owner-approved, workspace/your_files/legal/
 * terms-of-service.md). Rendered with the same markdown pipeline as the blog.
 * The H1 is rendered by the page itself, so it is not repeated here.
 * Section 6 (Refund policy) gets id="refund-policy" on its heading so the
 * footer link /terms-of-service#refund-policy lands on it.
 */
const TERMS_MD = `
**The Trucking Business** (thetruckingbusiness.com)
Operated by UNO Group LLC

Effective October 14, 2026

By buying a service on this website or using our client portal, you agree to these terms. If you do not agree, do not purchase or use our services.

## 1. Who we are

The Trucking Business is a brand of UNO Group LLC, a Florida company. We are an independent private company that provides business startup and regulatory compliance filing services for trucking companies. We are not FMCSA, USDOT, or any other government agency, and we are not affiliated with any government agency. When this document says "we," "us," or "the company," it means UNO Group LLC. When it says "you" or "the customer," it means the person or business buying the service.

## 2. What we do

We prepare and submit regulatory filings for trucking businesses, working from the information you provide. Our services include motor carrier authority applications (MC authority, filed on Form OP-1), USDOT registration, UCR registration, BOC-3 process agent designation (included with our authority packages), state permit application filings for Oregon, New Mexico, and Kentucky, MOTUS setup, Clearinghouse queries, MCS-150 updates, support with drug and alcohol consortium enrollment, safety audit assistance kits, and a monthly compliance subscription.

We act as your preparer and filing agent. You remain the applicant on every filing. Government agencies review and decide every application, not us.

## 3. Your responsibilities

- **Accurate information.** You are responsible for giving us complete and accurate information. Filings are prepared from what you provide. An error or omission in your information can delay a filing or cause an agency to reject it, and correcting it can require a new filing and new fees.
- **Timely responses.** Some filings need documents or answers from you along the way. If we ask for something your filing needs, delays in providing it will delay the filing.
- **Your own compliance.** Buying a filing service does not transfer your legal obligations to us. You remain responsible for your company's compliance with federal and state requirements, including insurance, safety rules, and deadlines, whether or not we help with a given item.
- **Review before certification.** Before you certify an intake form, review it. Your certification confirms the information is true and complete to the best of your knowledge.

## 4. Limited power of attorney and e-signature

During intake, you grant us a limited power of attorney to prepare, sign as preparer where permitted, and submit the filings covered by your order, and to communicate with the relevant agencies about those filings. This authority is limited to the services you purchased. It does not make us your general agent, your attorney, or your partner, and it does not authorize us to act for you outside your order.

By typing your name or otherwise signing electronically in our intake form, you consent to sign electronically and agree that your e-signature has the same effect as a handwritten signature for the documents and authorizations in that intake. You may withdraw the limited power of attorney by written notice to us, but withdrawal does not undo filings already submitted and does not by itself entitle you to a refund.

Some steps in a government process must be completed by the applicant personally, in the applicant's own government account. Where that applies, we will tell you and, where the service includes it, walk through it with you on a call.

## 5. Fees: our service fees and government fees are separate

Every order can involve two kinds of charges:

- **Service fees** are what you pay us for our work. These are the prices shown on this website.
- **Government fees** are charged by agencies, such as registration and filing fees. Government fees are separate from our service fees. Where a service price states that a government fee is included, that is stated on the pricing page for that service. Otherwise, government fees are your responsibility and are paid by you or collected from you for payment to the agency.

Government fees are set by the agencies and can change without notice. We do not control them.

## 6. Refund policy

Work on an order begins when you submit your intake form. That is when our preparation starts: reviewing your information, organizing your documents, and verifying that everything matches before anything is filed. For packages, these stages apply to each service inside the package separately.

- If you cancel before submitting your intake, we refund our service fee in full.
- If you cancel after submitting your intake but before we submit your filing, we keep 50 percent of our service fee for the preparation work already done and refund the rest.
- Once a filing has been submitted to a government agency, our service fee for that filing is not refundable, because the service is complete.

Government fees follow a simple rule: if a government fee has not yet been paid to an agency, we refund it in full at any stage. Once a government fee has been paid to an agency, it is not refundable, because the agency keeps it.

If we make an error in your filing, we will correct it at no additional charge. If we cannot complete a service because of our own error, we will refund our service fee for that service in full.

**Digital products.** Ebooks, document kits, courses, and other products delivered electronically are final sale once access has been delivered, such as a download, a license, or course access, and are not refundable. If you have any trouble accessing or opening your product, contact us and we will make sure you receive it: by resending your access, delivering it another way, or, for document products, mailing you a printed copy. If an individual product page states its own guarantee, that guarantee applies to that product. We keep records of delivery and access, such as download records, license records, and account access records, and those records serve as proof that a digital product was delivered.

Approved refunds are returned to your original payment method within 10 business days. If a charge on your statement ever looks wrong, contact us first at hello@thetruckingbusiness.com and we will make it right.

## 7. Subscriptions

The Compliance Subscription costs $89 per month and renews automatically each month until cancelled. Your next renewal date is shown on the payment receipts Stripe sends for your subscription charges, and you can ask us for it at any time at hello@thetruckingbusiness.com.

You may cancel at any time by emailing us at hello@thetruckingbusiness.com. To avoid the next renewal charge, cancel at least 7 days before your renewal date. If you cancel less than 7 days before your renewal date, that renewal will be charged and your cancellation takes effect at the end of that renewal period, because preparation for the next cycle has already begun.

Whenever you cancel, we send you a written confirmation showing the date your service ends. Your service continues through the end of your last paid period. Cancellation does not refund a month that has already been charged.

If a payment fails, we may retry it and may pause subscription services until payment succeeds.

Filings and other work performed as part of the subscription are covered by the refund rules in section 6, based on the stage that work has reached. This section covers the subscription charges themselves.

## 8. Deliverables

What you receive depends on the service you bought and can include copies or confirmations of submitted filings, registration numbers issued by an agency, prepared documents, and, for document based products such as the safety audit assistance kit, the document package described on the pricing page. Delivery is electronic unless a service description says otherwise.

## 9. No guarantee of approval or timing

We prepare filings carefully and based on the information you give us, but we cannot and do not guarantee that any agency will approve an application, issue an authority or registration, or act within any particular time. Agency processing times vary, are outside our control, and can be affected by agency backlogs, protest periods, insurance filings, and the accuracy of your information. Statements on this website about typical timelines describe general experience only. They are not promises.

## 10. Limits on our liability

To the extent the law allows, our total liability for any claim connected to an order is limited to the service fees you paid us for that order. We are not liable for indirect or consequential losses, such as lost loads, lost revenue, or missed business opportunities, including losses that follow from an agency's decision or an agency's delay. Nothing in these terms limits liability that the law does not allow to be limited. Our services are filing and preparation services. They are not legal, tax, or accounting advice, and using them does not create an attorney and client relationship or any similar relationship.

## 11. Indemnification

You agree to indemnify and hold UNO Group LLC, its owners, employees, and contractors harmless from any claims, damages, losses, liabilities, costs, and expenses, including reasonable attorneys' fees, that arise from false, incomplete, or inaccurate information you provide, or from your breach of these terms or of any law. This obligation survives the end of your order or subscription.

## 12. Acceptable use

You may not use our website or services to submit false information to a government agency, to impersonate another person or business, or to break any law. If we learn that information in a filing is false, we may stop work on that filing and end our services for that order. If we end our services for an order under this section, any refund for that order is determined under section 6, based on the stage the work had reached when our services ended.

## 13. Changes to these terms

We may update these terms from time to time. The version posted on this page, with its effective date, is the version that applies. Changes apply to orders placed after the change takes effect. For active subscriptions, a material change will take effect at the next renewal after the change is posted, unless the law requires otherwise.

## 14. Governing law

These terms are governed by the laws of the State of Florida. Any dispute connected to these terms or our services will be resolved in the state or federal courts located in Florida, unless the law gives you the right to bring it elsewhere.

## 15. Contact us

UNO Group LLC, doing business as The Trucking Business
7901 4th Street North, Suite 300
St. Petersburg, FL 33702
Email: hello@thetruckingbusiness.com
Phone: +1 (725) 244-6771
`;

export default function TermsOfServicePage() {
  const html = renderPost(TERMS_MD).replace(
    /<h2>(6\. Refund policy)<\/h2>/,
    '<h2 id="refund-policy">$1</h2>',
  );
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
          Terms of Service
        </h1>
        <div className="blog-body" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  );
}
