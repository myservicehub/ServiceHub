import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Phone, Mail, MessageCircle, HelpCircle, Users, Wallet, Briefcase, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HelpFAQsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('general');
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const categories = [
    { id: 'general', name: 'General', icon: HelpCircle },
    { id: 'homeowners', name: 'For Homeowners', icon: Briefcase },
    { id: 'tradespeople', name: 'For Tradespeople', icon: Users },
    { id: 'payments', name: 'Payments & Wallet', icon: Wallet },
    { id: 'account', name: 'Account & Security', icon: Shield }
  ];

  const faqData = {
    general: [
      {
        question: "What is serviceHub?",
        answer: "serviceHub is Nigeria's leading digital marketplace that connects homeowners with verified, reliable tradespeople and service professionals. We help you find trusted professionals for home improvement, repairs, maintenance, and various other services across Nigeria."
      },
      {
        question: "How does serviceHub work?",
        answer: "It's simple and FREE for homeowners! Post your job requirements for free, and qualified tradespeople can show interest in your job. You can then review their profiles, ratings, portfolios, and choose the best professional for your needs. Contact details and communication are completely free - no hidden charges for homeowners."
      },
      {
        question: "Is serviceHub available across Nigeria?",
        answer: "Yes! serviceHub operates across all 36 states and the Federal Capital Territory (FCT) in Nigeria. We have a growing network of verified professionals in major cities and towns nationwide."
      },
      {
        question: "How do I contact serviceHub support?",
        answer: "You can reach our support team through multiple channels: Email us at support@myservicehub.co, call our customer service line, or use the live chat feature on our website. Our support team is available Monday to Friday, 8 AM to 6 PM (WAT)."
      },
      {
        question: "Is my personal information safe on serviceHub?",
        answer: "Absolutely! We take data security seriously. Your personal information is encrypted and stored securely. We never share your contact details without your permission, and all our tradespeople go through a verification process."
      }
    ],
    homeowners: [
      {
        question: "How do I post a job on serviceHub?",
        answer: "Posting a job is completely FREE and easy! Click 'Post a Job' on our homepage, fill out the job details including category, description, budget, and location. You can post without creating an account initially, but you'll need to register to manage your job and communicate with interested tradespeople. Everything is free for homeowners - no charges at any stage."
      },
      {
        question: "Are there any hidden fees for homeowners?",
        answer: "Absolutely not! serviceHub is 100% free for homeowners with no hidden charges. You can post unlimited jobs, receive interest from tradespeople, view their profiles and portfolios, communicate with them, and hire them - all completely free. Our revenue comes from tradespeople who pay to access job opportunities, not from homeowners."
      },
      {
        question: "How much does it cost to use serviceHub as a homeowner?",
        answer: "serviceHub is completely FREE for homeowners! You can post unlimited jobs, browse tradesperson profiles, read reviews, and contact interested tradespeople without any charges. We believe homeowners should have free access to find the right professionals for their projects."
      },
      {
        question: "How do I choose the right tradesperson for my job?",
        answer: "Review their profiles, ratings, previous work photos, and read reviews from other homeowners. Look for verified badges, relevant experience, and professionals who respond promptly to your job posting. You can also message them before making your final decision."
      },
      {
        question: "What if I'm not satisfied with the work done?",
        answer: "We encourage open communication between homeowners and tradespeople. If issues arise, try to resolve them directly first. If that doesn't work, contact our support team. We also have a rating and review system to help maintain quality standards."
      },
      {
        question: "Can I hire the same tradesperson again?",
        answer: "Absolutely! Once you've worked with a tradesperson through serviceHub, you can contact them directly for future projects. Many of our users build long-term relationships with trusted professionals."
      },
      {
        question: "How long does it take to receive responses to my job posting?",
        answer: "Most jobs receive interest within 24-48 hours. However, this can vary based on the job type, location, and current demand. More specialized services might take longer to attract qualified professionals."
      }
    ],
    tradespeople: [
      {
        question: "How do I join serviceHub as a tradesperson?",
        answer: "Registration is free! Click 'Join as Tradesperson', fill out your profile with your skills, experience, location, and portfolio. Complete the verification process by submitting your ID and relevant certifications. Once approved, you can start showing interest in jobs."
      },
      {
        question: "How much does it cost to use serviceHub as a tradesperson?",
        answer: "Registration is free! You pay a small access fee (typically 5-100 coins, equivalent to ₦500-₦10,000) only when you want to access homeowner contact details for jobs you're interested in. This ensures you're serious about the job and helps maintain quality leads."
      },
      {
        question: "How do I show interest in a job?",
        answer: "Browse available jobs in your area and skill category. Click 'Show Interest' on jobs that match your expertise. Homeowners will see your profile and can choose to contact you. Make sure your profile is complete and professional to increase your chances."
      },
      {
        question: "How do I add funds to my wallet?",
        answer: "Go to your Wallet section, click 'Fund Wallet', enter the amount (minimum ₦100), and upload proof of payment to our Kuda Bank account. Our team will verify and credit your wallet within 2-4 hours during business hours."
      },
      {
        question: "How can I improve my profile visibility?",
        answer: "Complete your profile 100%, add high-quality photos of your previous work, get positive reviews from clients, maintain prompt response times, and keep your profile updated. Verified tradespeople with complete profiles get more visibility."
      },
      {
        question: "Can I refer other tradespeople to serviceHub?",
        answer: "Yes! We have a referral program where you earn rewards for referring other qualified tradespeople. When your referrals complete verification and become active, you earn bonus coins that can be used on the platform."
      }
    ],
    payments: [
      {
        question: "What payment methods do you accept?",
        answer: "We accept bank transfers to our Kuda Bank account. Simply transfer the amount you want to add to your wallet, upload proof of payment, and we'll credit your account within 2-4 hours during business hours."
      },
      {
        question: "What is the coin system?",
        answer: "The coin system is for tradespeople only - homeowners don't need to worry about coins! Our coin system makes payments simple for tradesperson. 1 coin = ₦100. Tradespeople use coins to access homeowner contact details when they want to show interest in a job. Homeowners never pay any fees and don't use the coin system."
      },
      {
        question: "How do I check my wallet balance?",
        answer: "Your current wallet balance is always visible in your dashboard and wallet section. You can see both your coin balance and the equivalent Naira amount, plus your transaction history."
      },
      {
        question: "Can I get a refund if I accidentally purchased access to a job?",
        answer: "Access fees are generally non-refundable once contact details are revealed. However, if there's a technical error or duplicate charge, contact our support team immediately. We review such cases individually."
      },
      {
        question: "What are the bank details for funding my wallet?",
        answer: "Bank: Kuda Bank | Account Name: Francis Erayefa Samuel | Account Number: 1100023164. Always upload your payment proof after transferring to ensure quick processing."
      },
      {
        question: "Is there a minimum amount I can add to my wallet?",
        answer: "The minimum funding amount is ₦100. This ensures cost-effective processing while allowing you to access jobs with lower access fees."
      }
    ],
    account: [
      {
        question: "How do I verify my account?",
        answer: "Go to your profile settings and click 'Complete Verification'. Upload a clear photo of your government-issued ID (National ID, Driver's License, or Passport) and any relevant professional certifications. Verification typically takes 24-48 hours."
      },
      {
        question: "I forgot my password. How do I reset it?",
        answer: "Click 'Forgot Password' on the login page, enter your email address, and we'll send you a password reset link. Check your spam folder if you don't receive it within a few minutes."
      },
      {
        question: "How do I update my profile information?",
        answer: "Log in to your account and go to 'Profile Settings'. You can update your personal information, skills, location, portfolio, and other details. Some changes may require re-verification."
      },
      {
        question: "Can I delete my account?",
        answer: "Yes, you can delete your account from the account settings. Please note that this action is permanent and you'll lose access to your transaction history, reviews, and wallet balance. Contact support if you need help."
      },
      {
        question: "How do I change my email address?",
        answer: "Go to Account Settings and update your email address. You'll need to verify the new email address before the change takes effect. This ensures account security."
      },
      {
        question: "What if my account gets suspended?",
        answer: "Account suspensions usually result from policy violations, suspicious activity, or user reports. If your account is suspended, you'll receive an email explaining the reason. You can appeal the decision by contacting our support team."
      }
    ]
  };

  const contactOptions = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email",
      contact: "support@myservicehub.co",
      action: "mailto:support@myservicehub.co"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Call us directly",
      contact: "+234 (0) 123 456 7890",
      action: "tel:+2341234567890"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with our team",
      contact: "Available 8 AM - 6 PM",
      action: "#"
    }
  ];

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const filteredFAQs = faqData[activeCategory]?.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Help & FAQs</h1>
            <p className="text-xl text-gray-600 mb-8">
              Find answers to common questions and get the help you need
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Category Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
                <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
                <nav className="space-y-2">
                  {categories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                          activeCategory === category.id
                            ? 'bg-green-50 text-green-700 border-green-200 border'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <IconComponent className="w-4 h-4 mr-3" />
                        {category.name}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* FAQ Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {categories.find(cat => cat.id === activeCategory)?.name} Questions
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {filteredFAQs.length} question{filteredFAQs.length !== 1 ? 's' : ''} found
                  </p>
                </div>

                <div className="divide-y divide-gray-200">
                  {filteredFAQs.length > 0 ? (
                    filteredFAQs.map((faq, index) => (
                      <div key={index} className="p-6">
                        <button
                          onClick={() => toggleFAQ(index)}
                          className="w-full flex justify-between items-center text-left"
                        >
                          <h3 className="text-lg font-medium text-gray-900 pr-4">
                            {faq.question}
                          </h3>
                          {expandedFAQ === index ? (
                            <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          )}
                        </button>
                        {expandedFAQ === index && (
                          <div className="mt-4 pr-8">
                            <p className="text-gray-600 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-gray-500">
                        No questions found matching your search. Try a different search term or browse other categories.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => navigate('/post-job')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                  >
                    <h4 className="font-medium text-gray-900">Post a Job</h4>
                    <p className="text-sm text-gray-600 mt-1">Find tradespeople for your project</p>
                  </button>
                  <button
                    onClick={() => navigate('/browse-jobs')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                  >
                    <h4 className="font-medium text-gray-900">Browse Jobs</h4>
                    <p className="text-sm text-gray-600 mt-1">Find work opportunities</p>
                  </button>
                  <button
                    onClick={() => navigate('/wallet')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                  >
                    <h4 className="font-medium text-gray-900">Manage Wallet</h4>
                    <p className="text-sm text-gray-600 mt-1">Add funds or check balance</p>
                  </button>
                  <button
                    onClick={() => navigate('/profile')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                  >
                    <h4 className="font-medium text-gray-900">Update Profile</h4>
                    <p className="text-sm text-gray-600 mt-1">Manage your account settings</p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Support Section */}
          <div className="mt-12 bg-white rounded-lg shadow-sm border p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Still Need Help?</h2>
              <p className="text-gray-600">
                Can't find what you're looking for? Our support team is here to help you.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contactOptions.map((option, index) => {
                const IconComponent = option.icon;
                return (
                  <a
                    key={index}
                    href={option.action}
                    className="flex flex-col items-center text-center p-6 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{option.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                    <p className="text-sm font-medium text-green-600">{option.contact}</p>
                  </a>
                );
              })}
            </div>

            <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Support Hours</h3>
              <p className="text-blue-800">
                Monday to Friday: 8:00 AM - 6:00 PM (West Africa Time)
                <br />
                Saturday: 9:00 AM - 2:00 PM (West Africa Time)
                <br />
                Sunday: Closed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpFAQsPage;