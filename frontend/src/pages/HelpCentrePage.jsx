import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { 
  Search, 
  HelpCircle, 
  Users, 
  Settings, 
  CreditCard, 
  FileText,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Star,
  Shield,
  Zap
} from 'lucide-react';

const HelpCentrePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const helpCategories = [
    {
      icon: Users,
      title: "Getting Started",
      description: "Learn how to set up your profile and get your first job",
      articles: 8,
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: CreditCard,
      title: "Payments & Earnings",
      description: "Understanding how payments work and managing your earnings",
      articles: 12,
      color: "bg-green-100 text-green-600"
    },
    {
      icon: Settings,
      title: "Account Management",
      description: "Managing your profile, settings, and verification status",
      articles: 15,
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: FileText,
      title: "Job Management",
      description: "How to find, apply for, and manage your jobs effectively",
      articles: 10,
      color: "bg-orange-100 text-orange-600"
    },
    {
      icon: Star,
      title: "Reviews & Ratings",
      description: "Building your reputation and handling customer feedback",
      articles: 6,
      color: "bg-yellow-100 text-yellow-600"
    },
    {
      icon: Shield,
      title: "Safety & Policies",
      description: "Platform policies, safety guidelines, and best practices",
      articles: 9,
      color: "bg-red-100 text-red-600"
    }
  ];

  const popularArticles = [
    {
      title: "How to create a winning tradesperson profile",
      category: "Getting Started",
      readTime: "5 min read",
      views: "2.1k views"
    },
    {
      title: "Understanding ServiceHub's payment system",
      category: "Payments & Earnings",
      readTime: "3 min read", 
      views: "1.8k views"
    },
    {
      title: "How to get more job requests",
      category: "Job Management",
      readTime: "7 min read",
      views: "1.5k views"
    },
    {
      title: "Verification process and requirements",
      category: "Account Management",
      readTime: "4 min read",
      views: "1.3k views"
    },
    {
      title: "Handling difficult customers professionally",
      category: "Safety & Policies",
      readTime: "6 min read",
      views: "1.1k views"
    }
  ];

  const faqs = [
    {
      question: "How much does it cost to join ServiceHub?",
      answer: "Joining ServiceHub is completely free. There are no subscription fees, setup costs, or hidden charges. You only pay a small service fee when you successfully complete a job through our platform."
    },
    {
      question: "How do I get verified on ServiceHub?",
      answer: "To get verified, you need to: 1) Complete your profile with accurate information, 2) Upload a valid government-issued ID, 3) Pass our trade-specific skills assessment, 4) Provide proof of your trade experience or qualifications. The verification process typically takes 2-3 business days."
    },
    {
      question: "How are jobs matched to tradespeople?",
      answer: "Our smart matching system considers several factors: your trade specialties, location, availability, ratings, and job preferences. Jobs are sent to qualified tradespeople in the area, and you can choose which ones to respond to."
    },
    {
      question: "How do I get paid for completed jobs?",
      answer: "Payments are processed securely through our platform. Once a job is marked as complete and approved by the homeowner, payment is released to your ServiceHub wallet. You can then withdraw funds to your bank account within 1-2 business days."
    },
    {
      question: "What if I have a dispute with a customer?",
      answer: "ServiceHub provides dispute resolution support. Contact our support team with details of the issue, and we'll mediate to find a fair solution. We maintain detailed job records to help resolve any disagreements professionally."
    },
    {
      question: "Can I set my own prices?",
      answer: "Yes, you have full control over your pricing. You can set hourly rates, fixed prices for specific services, or provide custom quotes for each job. Our platform provides pricing guidance based on market rates in your area."
    },
    {
      question: "How do I improve my chances of getting hired?",
      answer: "To improve your success rate: 1) Complete your profile with professional photos and detailed descriptions, 2) Get verified quickly, 3) Respond to job requests promptly, 4) Maintain high ratings by delivering quality work, 5) Collect positive reviews from satisfied customers."
    },
    {
      question: "What types of jobs are available on ServiceHub?",
      answer: "ServiceHub covers 43+ trade categories including plumbing, electrical work, painting, construction, carpentry, cleaning services, landscaping, and much more. Jobs range from small repairs to large renovation projects."
    }
  ];

  const contactOptions = [
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with our support team",
      availability: "Mon-Fri, 9AM-6PM",
      action: "Start Chat",
      primary: true
    },
    {
      icon: Mail,
      title: "Email Support", 
      description: "support@servicehub.ng",
      availability: "Response within 24 hours",
      action: "Send Email"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "+234 901 234 5678",
      availability: "Mon-Fri, 9AM-5PM",
      action: "Call Now"
    }
  ];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Tradesperson Help Centre
          </h1>
          <p className="text-xl mb-8 text-green-100">
            Everything you need to succeed on ServiceHub. Find answers, guides, and get support.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center bg-white rounded-full overflow-hidden shadow-lg">
              <Search className="w-6 h-6 text-gray-400 ml-6" />
              <input
                type="text"
                placeholder="Search for help articles, FAQs, or guides..."
                className="flex-1 px-4 py-4 text-gray-900 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-none">
                Search
              </Button>
            </div>
          </div>

          <div className="mt-8 text-green-200">
            <span>Popular searches: </span>
            <button className="underline hover:text-white mx-2">Getting started</button>
            <button className="underline hover:text-white mx-2">Payments</button>
            <button className="underline hover:text-white mx-2">Verification</button>
          </div>
        </div>
      </div>

      {/* Help Categories */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Browse Help Topics
            </h2>
            <p className="text-xl text-gray-600">
              Find answers organized by category
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map((category, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                <div className={`w-12 h-12 rounded-xl ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <category.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {category.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {category.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{category.articles} articles</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Articles */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Popular Articles
            </h2>
            <p className="text-xl text-gray-600">
              Most helpful guides for tradespeople
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {popularArticles.map((article, index) => (
              <div key={index} className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                      {article.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded">{article.category}</span>
                      <span>{article.readTime}</span>
                      <span>{article.views}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-8 py-3">
              View All Articles
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Quick answers to common questions
            </p>
          </div>

          <div className="space-y-4">
            {filteredFAQs.map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-xl overflow-hidden">
                <button
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                >
                  <h3 className="text-lg font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  {expandedFAQ === index ? (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {expandedFAQ === index && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredFAQs.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try searching with different keywords</p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Support */}
      <div className="py-20 bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Still Need Help?
            </h2>
            <p className="text-xl text-green-100">
              Our support team is here to help you succeed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {contactOptions.map((option, index) => (
              <div key={index} className={`rounded-xl p-6 text-center ${
                option.primary ? 'bg-white text-gray-900' : 'bg-white/10 backdrop-blur-sm'
              }`}>
                <option.icon className={`w-12 h-12 mx-auto mb-4 ${
                  option.primary ? 'text-green-600' : 'text-white'
                }`} />
                <h3 className={`text-xl font-semibold mb-2 ${
                  option.primary ? 'text-gray-900' : 'text-white'
                }`}>
                  {option.title}
                </h3>
                <p className={`mb-2 ${
                  option.primary ? 'text-gray-700' : 'text-green-100'
                }`}>
                  {option.description}
                </p>
                <p className={`text-sm mb-6 ${
                  option.primary ? 'text-gray-500' : 'text-green-200'
                }`}>
                  {option.availability}
                </p>
                <Button className={
                  option.primary 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-white text-green-700 hover:bg-gray-100'
                }>
                  {option.action}
                </Button>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <p className="text-green-100 mb-4">
              Want to join our community of successful tradespeople?
            </p>
            <Button
              onClick={() => navigate('/join-for-free')}
              className="bg-white text-green-700 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
            >
              Join for Free
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HelpCentrePage;