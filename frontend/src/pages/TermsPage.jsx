import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const SectionBar = ({ children }) => (
  <div className="rounded-md bg-green-600 text-white px-4 py-2 font-semibold mb-3">{children}</div>
);

const SubSectionBar = ({ children, id }) => (
  <div id={id} className="rounded-md bg-green-100 text-green-900 px-4 py-2 font-semibold mb-3">{children}</div>
);

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Terms and Conditions</h1>
          <p className="text-gray-700 mb-6">Effective Date: 1 of january 2026 | Version: 1.0</p>

          <div className="mb-6">
  <ul className="list-disc list-inside text-purple-700 space-y-2">
    <li>
      <a href="#tradespeople-terms" className="underline hover:text-purple-800">
        Terms &amp; Conditions for tradespeople
      </a>
    </li>
    <li>
      <a href="#customer-terms" className="underline hover:text-purple-800">
        Terms &amp; Conditions for customers
      </a>
    </li>
  </ul>
</div>

          <SectionBar>1. INTRODUCTION &amp; LEGAL FRAMEWORK</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <p>
              Welcome to ServiceHub Limited also known as myservicehub ("ServiceHub", "we", "our", "us"). These Terms govern use of the ServiceHub online marketplace and mobile/web services that connect Customers (homeowners and businesses) with verified Service Providers (artisans, professionals, and companies) across Nigeria.
            </p>
            <p>
              By accessing or using the ServiceHub Platform, you agree to be bound by these Terms. If you do not agree, do not use the Platform.
            </p>
            <p>
              Governing Laws &amp; Standards: Companies and Allied Matters Act 2020 (CAMA); Nigeria Data Protection Act 2023 (NDPA) and NDPR; Value Added Tax Act (as amended); Federal Inland Revenue Service (FIRS) regulations; CAC rules; and other applicable Nigerian laws and regulations.
            </p>
          </div>

          <SectionBar>2. KEY DEFINITIONS</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-semibold">Agreement</span> – this merged Terms of Service document (Service Provider &amp; Customer Terms) and all ServiceHub policies linked or referenced herein.</li>
              <li><span className="font-semibold">Customer</span> – a person or organisation that posts a Job on the ServiceHub Platform or engages a Service Provider found via the Platform.</li>
              <li><span className="font-semibold">Service Provider</span> – any verified artisan, professional, contractor, company or sole trader who registers to connect with Customers via the Platform.</li>
              <li><span className="font-semibold">ServiceHub Platform</span> – the ServiceHub website(s), mobile app(s), APIs and tools operated by ServiceHub.</li>
              <li><span className="font-semibold">Job</span> – a request for services submitted by a Customer on the ServiceHub Platform.</li>
              <li><span className="font-semibold">Lead</span> – a Job which ServiceHub presents to a Service Provider to consider.</li>
              <li><span className="font-semibold">Shortlist / Shortlisted</span> – when a Customer chooses to share contact details with a Service Provider via the Platform, or the Service Provider selects a "shortlist me" option where available.</li>
              <li><span className="font-semibold">Lead Access Fee</span> – a non-refundable access fee payable by the Service Provider to obtain the Customer’s contact details after being Shortlisted (ServiceHub operates an access-fee model and does not charge commissions on completed jobs).</li>
              <li><span className="font-semibold">Account Credit</span> – a balance credited by ServiceHub which may be used to pay Lead Access Fees (not convertible to cash).</li>
              <li><span className="font-semibold">Service Agreement</span> – any contract (written, verbal, SMS, email, or in-app) between a Customer and a Service Provider for services. ServiceHub is not a party.</li>
              <li><span className="font-semibold">Content</span> – materials posted or transmitted on/through the Platform (profiles, messages, photos, quotes, Feedback, etc.).</li>
              <li><span className="font-semibold">Feedback</span> – ratings/reviews by Customers about Service Providers, subject to ServiceHub’s Reviews Policy.</li>
              <li><span className="font-semibold">VAT</span> – Value Added Tax in Nigeria (currently 7.5%) or any successor consumption tax.</li>
            </ul>
          </div>

          <SectionBar>3. ACCOUNTS, ELIGIBILITY &amp; VERIFICATION</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li>Creating an account requires accurate information. Keep details current. We may request documents to verify identity, trade competence, addresses, tax status and compliance. Non-compliance may lead to suspension.</li>
              <li>Nigeria-only: ServiceHub primarily serves the Nigerian market; Service Providers represent that they are legally entitled to work and operate in Nigeria, hold required licences/insurances, and comply with all tax obligations.</li>
              <li>Data &amp; Compliance Checks: You authorise ServiceHub to collect and process information for onboarding, fraud prevention, dispute handling, and compliance with legal/regulatory requests (e.g., NDPC, CAC, FIRS, law enforcement).</li>
            </ol>
          </div>

          <SectionBar>4. PLATFORM USE, SECURITY &amp; ACCEPTABLE CONDUCT</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li>Use the Platform lawfully. Do not upload illegal, abusive, defamatory, or misleading Content.</li>
              <li>Protect your credentials; use updated security software; notify us of suspected compromise immediately.</li>
              <li>Prohibited: reverse-engineering; scraping; automated harvesting; creating multiple accounts without consent; attempts to avoid Lead Access Fees; using data to train AI models; or building competing services with Platform data.</li>
              <li>Availability: We aim for 24/7 access but may conduct maintenance or suspend access for security or legal reasons. Internet issues may be outside our control.</li>
            </ol>
          </div>

          <SectionBar>5. INTELLECTUAL PROPERTY &amp; BRANDING</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li>ServiceHub owns or licenses Platform IP (designs, text, databases, code, graphics and layouts). Limited licence granted to access and use per these Terms.</li>
              <li>While your account is active, you may reference “ServiceHub Verified” badges as provided. Upon termination, remove ServiceHub branding within 28 days.</li>
              <li>You grant ServiceHub a non-exclusive, royalty-free licence to host, display and use your profile Materials for operating and improving the Platform, advertising your services, analytics and safety (including derived metrics). Goodwill remains yours.</li>
            </ol>
          </div>

          <SectionBar>6. DATA PROTECTION &amp; PRIVACY (NDPA/NDPR)</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li>ServiceHub and each user act as independent data controllers for their own processing. We process data under the Nigeria Data Protection Act 2023 and NDPR. See the <Link to="/privacy-policy" className="text-green-600 hover:text-green-700 underline">ServiceHub Privacy Policy</Link> for details (rights of access/rectification/erasure/objection, security, breach notification).</li>
              <li>If you receive personal data via the Platform (e.g., Customer contact details), you will: (a) use it only for agreed service purposes; (b) keep it secure; (c) not share beyond necessity; (d) assist with data-subject requests; and (e) notify ServiceHub promptly of any breach.</li>
            </ol>
          </div>

          <SubSectionBar id="tradespeople-terms">PART A — SERVICE PROVIDER TERMS &amp; CONDITIONS</SubSectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li><span className="font-semibold">A1. Eligibility &amp; Conduct</span>: You operate as a legitimate business/sole trader in Nigeria; you hold licences/insurances; you honour commitments; you only offer services you are qualified to perform; you meet quality standards and our Reviews Policy.</li>
              <li><span className="font-semibold">A2. Leads, Shortlisting &amp; Contact Details</span>: When you are Shortlisted (or select “shortlist me” where enabled), ServiceHub shares Customer contact details with you.</li>
              <li><span className="font-semibold">A3. Lead Access Fees (No Commission Model)</span>: ServiceHub operates an access-fee model only. Each Shortlisting triggers a non-refundable Lead Access Fee (exclusive of VAT). The fee is shown with each Lead and may vary by trade, value, and location.</li>
              <li><span className="font-semibold">A4. Payment &amp; Invoicing</span>: We issue invoices (typically weekly or more frequently if thresholds are reached) for accrued fees. Invoices are due upon issue. You authorise card auto-debit for due invoices (we may offer additional payment methods). Late payments may attract interest at the rate permitted under Nigerian law; overdue accounts may be suspended until settled.</li>
              <li><span className="font-semibold">A5. Anti-Circumvention</span>: You must not exchange contact details or direct Customers off-platform to avoid Lead Access Fees. Breach may result in suspension or termination and recovery of losses.</li>
              <li><span className="font-semibold">A6. Service Agreements &amp; Liability Between You and Customer</span>: ServiceHub is not a party to any Service Agreement. Quotes, pricing, scope, payment and delivery are solely between you and the Customer. You are responsible for tax (FIRS), regulatory compliance, warranty obligations and safety.</li>
              <li><span className="font-semibold">A7. Feedback &amp; Reviews</span>: Customers may leave Feedback once work begins or money changes hands. You may respond. Do not solicit fake, paid or misleading reviews. We may remove fraudulent or policy-breaching Feedback.</li>
              <li><span className="font-semibold">A8. Account Credit</span>: From time to time, we may credit Account Credit (non-cash, non-transferable) with an expiry (default 12 months). It auto-applies to Lead Access Fees first.</li>
            </ol>
          </div>

          <SubSectionBar id="customer-terms">PART B — CUSTOMER TERMS &amp; CONDITIONS</SubSectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li><span className="font-semibold">B1. Posting Jobs</span>: Describe needs accurately; do not include offensive content or external contact details in postings.</li>
              <li><span className="font-semibold">B2. Reviewing Providers</span>: Check profiles, qualifications, insurance and Feedback. ServiceHub does not guarantee availability, quality, timing or legality of any service.</li>
              <li><span className="font-semibold">B3. Service Agreements</span>: Any agreement you reach with a Service Provider is solely between you and them. Verify identity, licences, scope, pricing and warranties before hiring.</li>
              <li><span className="font-semibold">B4. Feedback</span>: You may post honest, respectful Feedback after work starts or payment is made. No defamatory, abusive, discriminatory, or doxxing content. We may remove policy-breaching Feedback.</li>
            </ol>
          </div>

          <SectionBar>7. DISCOVERY &amp; RANKING TRANSPARENCY</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <p>
              We rank profiles using relevance (trade match), proximity, Customer Feedback, recent activity/responsiveness and limited randomisation to surface newer verified Providers. Fees do not buy better rank.
            </p>
          </div>

          <SectionBar>8. CONTENT RULES &amp; MODERATION</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <p>
              Users are responsible for their Content. We may (but are not obliged to) monitor, remove or alter Content that breaches these Terms, law, or our policies.
            </p>
          </div>

          <SectionBar>9. PAYMENTS, TAXES &amp; RECORDS</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <p>
              Service Providers must maintain accurate tax/VAT records and comply with FIRS obligations (including VAT where applicable). Keep your own copies of invoices and records.
            </p>
          </div>

          <SectionBar>10. LIABILITY &amp; INDEMNITIES</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li>Nothing limits liability for death/personal injury caused by negligence, fraud or any liability that cannot be limited by law.</li>
              <li><span className="font-semibold">Platform Liability (ServiceHub)</span>: To the extent permitted by law, ServiceHub is not liable for indirect, consequential, loss of profit, business or goodwill, or for disputes between Customers and Service Providers. The Platform is provided “as is” and may be affected by factors beyond our control.</li>
              <li><span className="font-semibold">Provider Indemnity</span>: Service Providers shall indemnify and hold ServiceHub harmless against third-party claims arising from their services, Content, misrepresentations, or legal non-compliance.</li>
            </ol>
          </div>

          <SectionBar>11. SUSPENSION, TERMINATION &amp; CHANGES</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li>We may suspend or terminate accounts for breach, fraud, legal or security risks, serious negative Feedback trends, or non-payment.</li>
              <li>We typically provide notice, except where urgent action is required by law, security, or user safety.</li>
              <li>You may stop using the Platform at any time; Providers remain liable for accrued Lead Access Fees and issued invoices.</li>
              <li>We may update these Terms (normally with notice). Continued use after effective date constitutes acceptance.</li>
            </ol>
          </div>

          <SectionBar>12. COMPLAINTS &amp; DISPUTE RESOLUTION</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li><span className="font-semibold">Contact</span>: <a href="mailto:servicehub9ja@gmail.com" className="text-green-600 hover:text-green-700">servicehub9ja@gmail.com</a>. We aim to resolve complaints amicably and promptly.</li>
              <li><span className="font-semibold">Mediation/Arbitration</span>: If unresolved within 14 days, disputes may be referred to mediation, and thereafter binding arbitration at the Lagos Multi-Door Courthouse (LMDC) under the Arbitration and Mediation Act 2023.</li>
            </ol>
          </div>

          <SectionBar>13. GENERAL TERMS</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li><span className="font-semibold">Force Majeure</span>: No party is liable for delays/failures caused by events beyond reasonable control; time for performance is extended accordingly.</li>
              <li><span className="font-semibold">Assignment</span>: We may assign our rights/obligations in connection with a restructure or transfer of the Platform; we will notify you.</li>
              <li><span className="font-semibold">Entire Agreement</span>: These Terms constitute the entire agreement between you and ServiceHub regarding Platform use.</li>
              <li><span className="font-semibold">No Third-Party Rights</span>: No third party has enforcement rights.</li>
              <li><span className="font-semibold">Severability &amp; Waiver</span>: Invalid terms are severed; delay in enforcement is not a waiver.</li>
              <li><span className="font-semibold">Notices</span>: Electronic communications (in-app/email) constitute written notice.</li>
            </ol>
          </div>

          <SectionBar>14. GOVERNING LAW &amp; JURISDICTION</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <p>
              These Terms are governed by the laws of the Federal Republic of Nigeria. Subject to clause 12, courts of competent jurisdiction in Nigeria shall have jurisdiction.
            </p>
          </div>

          <SectionBar>15. APPROVAL</SectionBar>
          <div className="text-gray-700 space-y-3">
            <p>Approved by the Board of Directors — <span className="font-semibold">SERVICEHUB LIMITED (RC 8905084)</span></p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsPage;