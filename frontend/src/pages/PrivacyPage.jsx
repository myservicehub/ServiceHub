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

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-700 mb-6">
            This Privacy Policy explains how ServiceHub Limited ("ServiceHub", "we", "us", "our") collects,
            uses, shares, and protects personal data when you use our platforms and services. It is divided
            into two parts: <strong>Part A</strong> (Privacy Policy for Service Providers / Tradespeople) and <strong>Part B</strong>
            (Privacy Policy for Customers). If you use ServiceHub as both a Service Provider and a Customer,
            both parts apply to you.
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <a href="#tradespeople" className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg">
              Privacy policy for tradespeople
            </a>
            <a href="#customers" className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg">
              Privacy policy for customers
            </a>
          </div>

          <SectionBar>1. DATA CONTROLLER DETAILS</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <p>ServiceHub Limited is the data controller responsible for personal data processed in connection with our services.</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Legal Name: ServiceHub Limited</li>
              <li>RC: 8905084</li>
              <li>Registered Address: 6, D Place Guest House, Off Omimi Link Road, Ekpan, Delta State, Nigeria</li>
              <li>Email: <a href="mailto:privacy@myservicehub.co" className="text-green-600 hover:text-green-700">privacy@myservicehub.co</a> (or servicehub9ja@gmail.com until updated)</li>
            </ul>
            <p>
              We process personal data in accordance with applicable data protection laws, including the Nigeria Data Protection Act (NDPA),
              the Nigeria Data Protection Regulation (NDPR), and other relevant regulations.
            </p>
          </div>

          <SectionBar>2. SCOPE OF THIS POLICY</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <p>This Policy applies to all users of the ServiceHub platform, including:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Service Providers / Tradespeople who list, promote, or provide services via ServiceHub; and</li>
              <li>Customers (homeowners, tenants, landlords, businesses, or individuals) who request, book, or manage services via ServiceHub.</li>
            </ul>
            <p>
              It covers data collected through our website(s), mobile applications, communication channels (including email, calls, SMS, social media, chat),
              and any other digital tools or services we operate (the "Platform").
            </p>
          </div>

          <SubSectionBar id="tradespeople">PART A: PRIVACY POLICY FOR SERVICE PROVIDERS / TRADESPEOPLE</SubSectionBar>

          <SectionBar>A1. INTRODUCTION</SectionBar>
          <p className="text-gray-700 mb-6">
            This section applies to artisans, professionals, independent contractors, and companies who create a ServiceHub account or otherwise
            use ServiceHub to receive leads, connect with Customers, or promote their services. It explains what personal data we collect about you,
            how we use it, who we share it with, how long we keep it, and the rights you have.
          </p>

          <SectionBar>A2. HOW WE COLLECT PERSONAL INFORMATION</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <span className="font-semibold">Directly from you</span>:
                <ul className="list-disc list-inside ml-5 space-y-1">
                  <li>When you register for an account or update your profile</li>
                  <li>When you subscribe to plans, pay fees, or update billing details</li>
                  <li>When you communicate with us via email, phone, chat, or support</li>
                  <li>When you upload documents, portfolio items, or respond to Customer requests</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">Automatically when you use the Platform</span>:
                <ul className="list-disc list-inside ml-5 space-y-1">
                  <li>Through cookies and similar technologies</li>
                  <li>Through logs of access, device information, and in‑app activity</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">From third parties (where lawful)</span>:
                <ul className="list-disc list-inside ml-5 space-y-1">
                  <li>Identity verification and KYC providers</li>
                  <li>Payment processors and financial partners</li>
                  <li>Advertising and analytics providers</li>
                  <li>Publicly available sources (e.g., corporate registries, professional listings)</li>
                  <li>Customers who submit reviews, complaints, or references about your services</li>
                </ul>
              </li>
            </ol>
            <p>
              In some cases, we are legally or contractually required to collect certain information. If you do not provide it, we may not be able to open or maintain your account.
            </p>
          </div>

          <SectionBar>A3. WHAT WE COLLECT</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <span className="font-semibold">Identification and Contact Information</span>:
                <ul className="list-disc list-inside ml-5 space-y-1">
                  <li>Full name</li>
                  <li>Business name and trading name</li>
                  <li>Date of birth (where required)</li>
                  <li>Phone number, email address</li>
                  <li>Business and/or correspondence address</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">Account and Profile Details</span>:
                <ul className="list-disc list-inside ml-5 space-y-1">
                  <li>Username and password</li>
                  <li>Profile photo or logo</li>
                  <li>Service categories, skills, qualifications</li>
                  <li>Service coverage areas and availability</li>
                  <li>Portfolio images and descriptions of previous work</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">Verification and Compliance Data</span>:
                <ul className="list-disc list-inside ml-5 space-y-1">
                  <li>Government‑issued ID</li>
                  <li>CAC or business registration documents</li>
                  <li>Tax or regulatory identifiers (where applicable)</li>
                  <li>Professional licences, certifications, insurance</li>
                  <li>References or guarantor details provided by you</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">Financial and Transaction Data</span>:
                <ul className="list-disc list-inside ml-5 space-y-1">
                  <li>Bank account details for payouts (if applicable)</li>
                  <li>Records of payments made to ServiceHub (e.g., subscriptions, access/lead fees)</li>
                  <li>Invoices and transaction history</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">Communications and Behavioural Data</span>:
                <ul className="list-disc list-inside ml-5 space-y-1">
                  <li>Messages exchanged with Customers via the Platform</li>
                  <li>Emails, support tickets, dispute correspondence</li>
                  <li>Response times, acceptance rates, completion records</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">Technical and Usage Data</span>:
                <ul className="list-disc list-inside ml-5 space-y-1">
                  <li>IP address, device type, operating system, browser type</li>
                  <li>Login timestamps, app/website interactions, features used</li>
                  <li>Activity logs used for security, analytics, and service optimisation</li>
                </ul>
              </li>
            </ol>
          </div>

          <SectionBar>A4. HOW WE USE YOUR PERSONAL INFORMATION AND LEGAL BASIS</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <span className="font-semibold">Identification, Verification & Authentication</span> – to create your account, verify your identity, confirm eligibility, and secure access. Legal basis: performance of contract; legitimate interests (security, fraud prevention); legal obligation.
              </li>
              <li>
                <span className="font-semibold">Operating Our Services</span> – to display your profile, provide you with leads, enquiries, and contact details of Customers who shortlist or hire you; to manage subscriptions, invoices, and payments. Legal basis: performance of contract.
              </li>
              <li>
                <span className="font-semibold">Improving Our Platform and Services</span> – to monitor performance, run analytics, develop new features, and improve user experience; to understand how trades and leads perform to refine our matching systems. Legal basis: legitimate interests.
              </li>
              <li>
                <span className="font-semibold">Preventing Fraud and Ensuring Safety</span> – to detect and prevent fake profiles, fee avoidance, abuse, and unsafe conduct; to enforce our Terms of Use and policies. Legal basis: legitimate interests; legal obligation.
              </li>
              <li>
                <span className="font-semibold">Communications</span> – to send administrative messages (security alerts, policy updates, billing notices); to respond to your enquiries and support requests; to request feedback and conduct surveys. Legal basis: performance of contract; legitimate interests.
              </li>
              <li>
                <span className="font-semibold">Marketing</span> – to send you relevant updates, offers, and educational content about using ServiceHub effectively; to create basic segments (e.g., by trade, location) to keep communications relevant; you can opt out at any time. Legal basis: legitimate interests; consent where required.
              </li>
              <li>
                <span className="font-semibold">Business Operations and Corporate Transactions</span> – for internal reporting, audits, risk management; in connection with any merger, acquisition, or restructuring under appropriate safeguards. Legal basis: legitimate interests.
              </li>
              <li>
                <span className="font-semibold">Legal & Regulatory Compliance</span> – to comply with applicable laws, tax requirements, and regulatory requests; to cooperate with authorities and handle legal claims. Legal basis: legal obligation.
              </li>
            </ol>
          </div>

          <SectionBar>A5. ANONYMISED AND AGGREGATED DATA</SectionBar>
          <p className="text-gray-700 mb-6">
            We may anonymise or aggregate your personal data so that it can no longer be used to identify you. We may use such data for analytics, industry insights, service optimisation, and business reporting.
          </p>

          <SectionBar>A6. HOW AND WHEN WE SHARE YOUR PERSONAL INFORMATION</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <p>We may share your personal data with:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <span className="font-semibold">Customers</span> – when you are shortlisted or hired, we share your name, business name, profile, and contact details so they can reach you.
              </li>
              <li>
                <span className="font-semibold">Other Users / Public</span> – public elements of your profile (e.g., name, business name, services, coverage area, reviews, portfolio) may appear on the Platform and in search engine results.
              </li>
              <li>
                <span className="font-semibold">Service Providers and Processors</span> – technology providers (hosting, storage, CRM), payment processors and billing partners, communication tools (SMS, email, in‑app messaging), analytics and marketing platforms. These parties act on our instructions and are bound by confidentiality and data protection obligations.
              </li>
              <li>
                <span className="font-semibold">Advertising Partners</span> – we may share limited, pseudonymised data (e.g., hashed email) to measure or deliver relevant advertising. These partners process data under their own privacy terms.
              </li>
              <li>
                <span className="font-semibold">Professional Advisers</span> – lawyers, auditors, consultants where reasonably necessary.
              </li>
              <li>
                <span className="font-semibold">Regulators, Law Enforcement, and Legal Requests</span> – where required by law or necessary to protect rights, safety, or prevent fraud.
              </li>
              <li>
                <span className="font-semibold">Corporate Transactions</span> – in the event of a merger, acquisition, or asset transfer, subject to safeguards.
              </li>
            </ol>
            <p className="mt-2">We do not sell your personal data.</p>
          </div>

          <SectionBar>A7. INTERNATIONAL DATA TRANSFERS</SectionBar>
          <p className="text-gray-700 mb-6">
            Some of our service providers or systems may be located outside Nigeria. Where your data is transferred internationally, we take reasonable steps to ensure an adequate level of protection, including contractual safeguards and security measures, in line with applicable data protection laws.
          </p>

          <SectionBar>A8. INFORMATION SECURITY AND STORAGE</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <p>
              We implement technical and organisational measures designed to protect your data against unauthorised access, loss, misuse, or disclosure. While no system is completely secure, we work continuously to enhance our security posture.
            </p>
            <p className="font-semibold">We retain your personal data for as long as:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Your account is active; and/or</li>
              <li>Necessary to fulfil the purposes described in this Policy;</li>
              <li>Required by law (e.g., tax, accounting, regulatory);</li>
              <li>Needed to resolve disputes, enforce our terms, or prevent fraud.</li>
            </ul>
            <p>Certain limited records (e.g., blocked or banned accounts) may be retained to protect the integrity of the Platform.</p>
          </div>

          <SectionBar>A9. YOUR RIGHTS AS A SERVICE PROVIDER</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <p>Subject to applicable law, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Request access to the personal data we hold about you</li>
              <li>Request correction of inaccurate or incomplete data</li>
              <li>Request deletion of your data, where legally permissible</li>
              <li>Object to or restrict certain types of processing, including direct marketing</li>
              <li>Request data portability, where applicable</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p>
              You can exercise these rights by contacting us at
              {' '}<a href="mailto:privacy@myservicehub.co" className="text-green-600 hover:text-green-700">privacy@myservicehub.co</a>.
              We may request additional information to verify your identity. If you are dissatisfied, you may lodge a complaint with the Nigeria Data Protection Commission (NDPC).
            </p>
          </div>

          <SubSectionBar id="customers">PART B: PRIVACY POLICY FOR CUSTOMERS</SubSectionBar>

          <SectionBar>B1. INTRODUCTION</SectionBar>
          <p className="text-gray-700 mb-6">
            This section applies to individuals and organisations who use ServiceHub to request, book, or manage services, including homeowners,
            tenants, landlords, property managers, and businesses. It explains how we collect and use your personal information when you interact
            with Service Providers via our Platform.
          </p>

          <SectionBar>B2. HOW WE COLLECT PERSONAL INFORMATION</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <span className="font-semibold">Direct interactions</span> – when you create an account or submit a job request; when you communicate with Service Providers through the Platform; when you contact us via email, chat, or phone; when you submit reviews, ratings, or feedback.
              </li>
              <li>
                <span className="font-semibold">Automated means</span> – through cookies and similar technologies when you browse or use our Platform; via logs of device and usage information.
              </li>
              <li>
                <span className="font-semibold">Third parties</span> – analytics and marketing platforms (e.g., how you arrived at our site); Service Providers who update us on job status or outcomes.
              </li>
            </ol>
          </div>

          <SectionBar>B3. WHAT WE COLLECT</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <span className="font-semibold">Identification and Contact Information</span> – name, phone number, email address.
              </li>
              <li>
                <span className="font-semibold">Account and Usage Details</span> – login details and preferences; records of jobs posted, viewed, or managed via the Platform.
              </li>
              <li>
                <span className="font-semibold">Job and Property Details</span> – type of work requested; job description, budget range, timing; approximate or full job location (as provided by you).
              </li>
              <li>
                <span className="font-semibold">Media and Content</span> – photos or videos you upload relating to the requested work or reviews.
              </li>
              <li>
                <span className="font-semibold">Communications</span> – messages with Service Providers and support; call notes or summaries where applicable.
              </li>
              <li>
                <span className="font-semibold">Technical and Analytics Data</span> – IP address, device and browser information; pages visited, actions taken, referral sources.
              </li>
            </ol>
          </div>

          <SectionBar>B4. HOW WE USE YOUR PERSONAL INFORMATION AND LEGAL BASIS</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <span className="font-semibold">Offering and Operating Our Services</span> – to create and manage your account; to allow you to post jobs and receive responses from Service Providers; to connect you with suitable Service Providers and manage bookings. Legal basis: performance of contract.
              </li>
              <li>
                <span className="font-semibold">Communication</span> – to send confirmations, alerts, and updates about your jobs and account; to respond to enquiries, support requests, and disputes. Legal basis: performance of contract; legitimate interests.
              </li>
              <li>
                <span className="font-semibold">Customising Your Experience</span> – to show relevant Service Providers based on your needs and location; to improve search results and recommendations. Legal basis: legitimate interests.
              </li>
              <li>
                <span className="font-semibold">Marketing</span> – to send you information about ServiceHub features, tips, and promotions (where permitted); to tailor messages based on your use of the Platform. You may opt out at any time. Legal basis: legitimate interests; consent where required.
              </li>
              <li>
                <span className="font-semibold">Reviews and Platform Integrity</span> – to enable you to leave feedback on Service Providers; to publish reviews (with your chosen display options) to help other users make informed decisions; to detect and manage misuse or fake content. Legal basis: legitimate interests.
              </li>
              <li>
                <span className="font-semibold">Fraud Prevention, Security and Legal Compliance</span> – to protect users from scams, abuse, and unauthorised activity; to enforce our Terms of Use and comply with legal obligations. Legal basis: legitimate interests; legal obligations.
              </li>
            </ol>
          </div>

          <SectionBar>B5. ANONYMISED AND AGGREGATED DATA</SectionBar>
          <p className="text-gray-700 mb-6">
            We may anonymise or aggregate Customer data and use it for analytics, service improvement, and business reporting, without identifying you.
          </p>

          <SectionBar>B6. HOW AND WHEN WE SHARE YOUR PERSONAL INFORMATION</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <p>We may share your information with:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <span className="font-semibold">Service Providers</span> – when you shortlist, invite, or hire a Service Provider, we share your name, contact details, and relevant job information so they can contact you and deliver the service.
              </li>
              <li>
                <span className="font-semibold">Service Providers (technical and operational)</span> – hosting, communications, analytics, and payment partners who act on our instructions.
              </li>
              <li>
                <span className="font-semibold">Advertising and Analytics Partners</span> – limited data used to measure and improve our marketing performance.
              </li>
              <li>
                <span className="font-semibold">Regulators, Law Enforcement, and Legal Processes</span> – where required to comply with law or protect rights and safety.
              </li>
              <li>
                <span className="font-semibold">Corporate Transactions</span> – in connection with a merger, acquisition, or similar event, under appropriate safeguards.
              </li>
            </ol>
            <p className="mt-2">We do not sell your personal data.</p>
          </div>

          <SectionBar>B7. INTERNATIONAL DATA TRANSFERS</SectionBar>
          <p className="text-gray-700 mb-6">
            Where data is transferred or stored outside Nigeria, we take steps to ensure it is protected with appropriate safeguards, in line with applicable laws.
          </p>

          <SectionBar>B8. INFORMATION SECURITY, RETENTION AND YOUR RIGHTS</SectionBar>
          <div className="text-gray-700 space-y-3 mb-6">
            <p>
              We use reasonable security measures to protect your data. We retain your personal data only for as long as necessary to provide our services, meet legal and regulatory requirements, resolve disputes, and enforce our agreements.
            </p>
            <p className="font-semibold">As a Customer, you may, subject to applicable law:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Request access to your personal data</li>
              <li>Request correction of inaccurate or incomplete data</li>
              <li>Request deletion of your personal data, where lawful</li>
              <li>Object to or restrict certain processing, including direct marketing</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p>
              You can contact us at{' '}
              <a href="mailto:privacy@myservicehub.co" className="text-green-600 hover:text-green-700">privacy@myservicehub.co</a>
              {' '}to exercise these rights. We may ask for additional information to verify your identity. You also have the right to complain to the Nigeria Data Protection Commission (NDPC).
            </p>
          </div>

          <SectionBar>9. CHANGES TO THIS PRIVACY POLICY</SectionBar>
          <p className="text-gray-700 mb-6">
            We may update this Privacy Policy from time to time. When we make material changes, we will notify you via the Platform, email, or other appropriate means. Your continued use of ServiceHub after the effective date of any update constitutes your acceptance of the revised Policy.
          </p>

          <div className="text-gray-700">
            <p>
              For cookie details, see our{' '}
              <Link to="/cookie-policy" className="text-green-600 hover:text-green-700 underline">Cookie Policy</Link>.
              {' '}For other questions, contact us via the{' '}
              <Link to="/contact" className="text-green-600 hover:text-green-700 underline">Contact page</Link>.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPage;