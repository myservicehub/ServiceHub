import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-700 mb-6">
            These Terms govern your use of serviceHub. By accessing or using the platform,
            you agree to these Terms.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Accounts & Eligibility</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>You must provide accurate information and keep your account secure.</li>
            <li>Tradespeople must comply with applicable regulations and professional standards.</li>
            <li>We may suspend or terminate accounts that violate these Terms.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Marketplace Use</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Homeowners may post jobs and review interested tradespeople.</li>
            <li>serviceHub is a facilitator; agreements are between users.</li>
            <li>Users are responsible for communications, pricing, and compliance with law.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Reviews & Conduct</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Reviews must be truthful and respectful; no harassment or hate speech.</li>
            <li>We may moderate or remove content that violates policies.</li>
            <li>See our <Link to="/reviews-policy" className="text-green-600 hover:text-green-700 underline">Reviews Policy</Link> for details.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Payments & Fees</h2>
          <p className="text-gray-700 mb-4">
            Where applicable, payments and fees will be communicated clearly in the app.
            You agree to pay any applicable charges and taxes.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Disclaimer & Liability</h2>
          <p className="text-gray-700 mb-4">
            serviceHub provides a marketplace platform "as is" without warranties. To the
            maximum extent permitted by law, we are not liable for user agreements,
            services performed, or damages arising from platform use.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Changes & Contact</h2>
          <p className="text-gray-700">
            We may update these Terms from time to time to reflect improvements or legal
            requirements. If you have questions, reach out via our{' '}
            <Link to="/contact" className="text-green-600 hover:text-green-700 underline">Contact page</Link>.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsPage;