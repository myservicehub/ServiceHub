import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-700 mb-6">
            This Privacy Policy explains how serviceHub collects, uses, and protects your information
            when you use our platform and services.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Information We Collect</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Account details such as name, email, phone number, and role.</li>
            <li>Profile and portfolio information for tradespeople.</li>
            <li>Job postings, interests, messages, and reviews.</li>
            <li>Technical data including device, browser, and usage analytics.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">How We Use Your Information</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Provide and improve our marketplace services.</li>
            <li>Verify users and maintain platform safety and integrity.</li>
            <li>Facilitate communication between homeowners and tradespeople.</li>
            <li>Send service-related notifications you opt into.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Sharing & Disclosure</h2>
          <p className="text-gray-700 mb-4">
            We do not sell your personal data. We may share information with trusted service providers
            who help us operate the platform (e.g., hosting, analytics) and as required by law.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Security</h2>
          <p className="text-gray-700 mb-4">
            We use reasonable administrative, technical, and physical safeguards to protect your data.
            No online service can be 100% secure, but we continuously improve our protections.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Your Rights</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Access, update, or delete your account information.</li>
            <li>Manage notification preferences and data-sharing choices.</li>
            <li>Contact us to exercise applicable privacy rights.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Cookies</h2>
          <p className="text-gray-700 mb-4">
            We use cookies to enhance your experience and analyze usage. Learn more in our{' '}
            <Link to="/cookie-policy" className="text-green-600 hover:text-green-700 underline">Cookie Policy</Link>.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Contact</h2>
          <p className="text-gray-700">
            For privacy questions, contact us via the{' '}
            <Link to="/contact" className="text-green-600 hover:text-green-700 underline">Contact page</Link>.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPage;