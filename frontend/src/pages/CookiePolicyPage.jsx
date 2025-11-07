import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const CookiePolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
          <p className="text-gray-700 mb-6">
            This Cookie Policy explains what cookies are, how we use them, and how
            you can manage your cookie preferences on serviceHub.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">What Are Cookies?</h2>
          <p className="text-gray-700 mb-4">
            Cookies are small text files stored on your device to remember information
            about your visit and help websites function properly.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Types of Cookies We Use</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li><strong>Strictly Necessary</strong> – required for essential features like authentication.</li>
            <li><strong>Functional</strong> – remember preferences and improve your experience.</li>
            <li><strong>Analytics</strong> – help us understand usage to improve the platform.</li>
            <li><strong>Marketing</strong> – used to show relevant content and promotions.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Managing Cookies</h2>
          <p className="text-gray-700 mb-4">
            You can manage cookies through your browser settings. Disabling certain cookies
            may affect site functionality. For privacy details, see our{' '}
            <Link to="/privacy-policy" className="text-green-600 hover:text-green-700 underline">Privacy Policy</Link>.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Updates</h2>
          <p className="text-gray-700">
            We may update this Cookie Policy to reflect changes in technology or regulations.
            If you have questions, contact us via the{' '}
            <Link to="/contact" className="text-green-600 hover:text-green-700 underline">Contact page</Link>.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CookiePolicyPage;