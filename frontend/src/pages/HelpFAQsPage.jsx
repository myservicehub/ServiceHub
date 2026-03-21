import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search, Phone, Mail, MessageCircle, HelpCircle, Users, Wallet, Briefcase, Shield, CreditCard, Settings, FileText, Star, ChevronRight, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { contactsAPI } from '../api/wallet';

const HelpFAQsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isTradesperson } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('general');
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [contactByType, setContactByType] = useState({});
  const [blogCategoryCounts, setBlogCategoryCounts] = useState({});

  const BLOG_HELP_CATEGORIES = [
    {
      icon: Users,
      title: "Getting Started",
      description: "Learn how to set up your profile and get your first job",
      blogCategory: "getting_started"
    },
    {
      icon: CreditCard,
      title: "Payments & Earnings",
      description: "Understanding how payments work and managing your earnings",
      blogCategory: "payments_earnings"
    },
    {
      icon: Settings,
      title: "Account Management",
      description: "Managing your profile, settings, and verification status",
      blogCategory: "account_management"
    },
    {
      icon: FileText,
      title: "Job Management",
      description: "How to find, apply for, and manage your jobs effectively",
      blogCategory: "job_management"
    },
    {
      icon: Shield,
      title: "Safety & Policies",
      description: "Platform policies, safety guidelines, and best practices",
      blogCategory: "safety_policies"
    }
  ];

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const data = await contactsAPI.getAllContacts();
        const contactsObj = data?.contacts || {};
        const map = {};
        Object.entries(contactsObj).forEach(([type, arr]) => {
          if (Array.isArray(arr) && arr.length > 0) {
            const first = arr[0];
            if (first && first.value) {
              map[type] = first;
            }
          }
        });
        setContactByType(map);
      } catch (e) {}
    };
    fetchContacts();
  }, []);

  useEffect(() => {
    const fetchBlogCategoryCounts = async () => {
      try {
        const response = await fetch('/api/public/content/blog/categories?content_type=blog_post');
        const data = response.ok ? await response.json() : { categories: [] };
        const seed = BLOG_HELP_CATEGORIES.reduce((acc, item) => {
          acc[item.blogCategory] = 0;
          return acc;
        }, {});
        const merged = (data?.categories || []).reduce((acc, item) => {
          const key = item?.category;
          if (key && Object.prototype.hasOwnProperty.call(acc, key)) {
            acc[key] = Number(item.post_count || 0);
          }
          return acc;
        }, seed);
        setBlogCategoryCounts(merged);
      } catch {
        const fallback = BLOG_HELP_CATEGORIES.reduce((acc, item) => {
          acc[item.blogCategory] = 0;
          return acc;
        }, {});
        setBlogCategoryCounts(fallback);
      }
    };
    fetchBlogCategoryCounts();
  }, []);

  // Filter categories based on user role
  const getVisibleCategories = () => {
    const baseCategories = [
      { id: 'general', name: 'General', icon: HelpCircle },
      { id: 'homeowners', name: 'For Homeowners', icon: Briefcase },
      { id: 'tradespeople', name: 'For Tradespeople', icon: Users },
      { id: 'account', name: 'Account & Security', icon: Shield }
    ];

    // Only show Payments & Wallet to authenticated tradespeople
    if (isAuthenticated() && isTradesperson()) {
      baseCategories.splice(3, 0, { id: 'payments', name: 'Payments & Wallet', icon: Wallet });
    }

    return baseCategories;
  };

  const categories = getVisibleCategories();

  // Read category from query param and preselect
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const categoryParam = params.get('category');
      if (categoryParam) {
        const availableIds = categories.map(c => c.id);
        if (availableIds.includes(categoryParam)) {
          setActiveCategory(categoryParam);
        } else {
          // If payments requested but not available, default to general
          setActiveCategory('general');
        }
      }
    } catch (e) {
      // ignore parsing errors
    }
  }, [location.search, isAuthenticated, isTradesperson]);

  // Reset activeCategory if user doesn't have access to payments
  useEffect(() => {
    if (activeCategory === 'payments' && !(isAuthenticated() && isTradesperson())) {
      setActiveCategory('general');
    }
  }, [activeCategory, isAuthenticated, isTradesperson]);

  // Help categories for Browse Help Topics section
  const helpCategories = BLOG_HELP_CATEGORIES.map((item) => ({
    ...item,
    articles: blogCategoryCounts[item.blogCategory] ?? 0
  }));

  // Popular articles for the Popular Articles section
  const popularArticles = [
    {
      title: "How to create a winning tradesperson profile",
      category: "Getting Started",
      readTime: "5 min read",
      slug: 'winning-tradesperson-profile'
    },
    {
      title: "Understanding ServiceHub's payment system",
      category: "Payments & Earnings",
      readTime: "3 min read",
      slug: 'servicehub-payment-system'
    },
    {
      title: "How to get more job requests",
      category: "Job Management",
      readTime: "7 min read",
      slug: 'get-more-job-requests'
    },
    {
      title: "Verification process and requirements",
      category: "Account Management",
      readTime: "4 min read",
      slug: 'verification-process'
    },
    {
      title: "Handling difficult customers professionally",
      category: "Safety & Policies",
      readTime: "6 min read",
      slug: 'handling-difficult-customers'
    }
  ];

  const faqData = {
    general: [
      {
        question: "What is ServiceHub?",
        answer: "ServiceHub is Nigeria's leading digital marketplace that connects homeowners with verified, reliable tradespeople and service professionals. We help you find trusted professionals for home improvement, repairs, maintenance, and various other services across Nigeria."
      },
      {
        question: "How does ServiceHub work?",
        answer: "It's simple and FREE for homeowners! Post your job requirements for free, and qualified tradespeople can show interest in your job. You can then review their profiles, ratings, portfolios, and choose the best professional for your needs. Contact details and communication are completely free - no hidden charges for homeowners."
      },
      {
        question: "Is ServiceHub available across Nigeria?",
        answer: "We currently operate in 8 Nigerian states, with a growing network of verified professionals and plans to expand to more states."
      },
      {
        question: "What types of jobs are available on ServiceHub?",
        answer: "ServiceHub covers 29+ trade categories including plumbing, electrical work, painting, construction, carpentry, cleaning services, landscaping, and much more. Jobs range from small repairs to large renovation projects."
      },
      {
        question: "What if I have a dispute with a tradesperson or customer?",
        answer: "ServiceHub provides dispute resolution support. Contact our support team with details of the issue, and we'll mediate to find a fair solution. We maintain detailed job records to help resolve any disagreements professionally."
      },
      {
        question: "How do I contact ServiceHub support?",
        answer: "You can reach our support team through multiple channels: Email us at support@myservicehub.co, call our customer service line, or use the live chat feature on our website. Our support team is available Monday to Friday, 8 AM to 6 PM (WAT)."
      },
      {
        question: "Is my personal information safe on ServiceHub?",
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
        answer: "Absolutely not! serviceHub is 100% free for homeowners with no hidden charges. You can post unlimited jobs, receive interest from tradespeople, view their profiles and portfolios, communicate with them, and hire them - all completely free."
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
        question: "How do I join ServiceHub as a tradesperson?",
        answer: "Registration is free! Click 'Join as Tradesperson', fill out your profile with your skills, experience, location, and portfolio. Complete the verification process by submitting your ID and relevant certifications. Once approved, you can start showing interest in jobs."
      },
      {
        question: "How much does it cost to use ServiceHub as a tradesperson?",
        answer: "Registration is free! You pay a small access fee only when you want to access homeowner contact details for jobs you're interested in. This ensures you're serious about the job and helps maintain quality leads."
      },
      {
        question: "How are jobs matched to tradespeople?",
        answer: "Our smart matching system considers several factors: your trade specialties, location, availability, ratings, and job preferences. Jobs are sent to qualified tradespeople in the area, and you can choose which ones to respond to."
      },
      {
        question: "How do I show interest in a job?",
        answer: "Browse available jobs in your area and skill category. Click 'Show Interest' on jobs that match your expertise. Homeowners will see your profile and can choose to contact you. Make sure your profile is complete and professional to increase your chances."
      },
      {
        question: "How do I add funds to my wallet?",
        answer: "Go to your Wallet section, click 'Fund Wallet', enter the amount (minimum ₦100), and continue to Paystack checkout. Once payment is successful, your wallet is credited automatically."
      },
      {
        question: "Can I set my own prices?",
        answer: "Yes, you have full control over your pricing. You can set your rate, fixed prices for specific services, or provide custom quotes for each job. Our platform provides pricing guidance based on market rates in your area."
      },
      {
        question: "How can I improve my profile visibility and get hired?",
        answer: "Complete your profile 100%, add high-quality photos of your previous work, get verified quickly, respond to job requests promptly, maintain high ratings by delivering quality work, and collect positive reviews from satisfied customers."
      },
      {
        question: "Can I refer other tradespeople to ServiceHub?",
        answer: "Yes! We have a referral program where you earn rewards for referring other qualified tradespeople. When your referrals complete verification and become active, you earn bonus points that can be used on the platform."
      }
    ],
    payments: [
      {
        question: "What payment methods do you accept?",
        answer: "Payment methods are only for tradespeople - homeowners use serviceHub completely free! Tradespeople fund wallets through Paystack using supported payment methods such as cards, bank transfer, and other channels available in checkout."
      },
      {
        question: "What is the coin system?",
        answer: "The coin system is for tradespeople only - homeowners don't need to worry about coins! Our coin system makes payments simple for tradesperson. 1 coin = â‚¦100. Tradespeople use coins to access homeowner contact details when they want to show interest in a job. Homeowners never pay any fees and don't use the coin system."
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
        question: "How does wallet funding checkout work?",
        answer: "Enter your amount in Wallet, continue to Paystack, complete payment, and return to ServiceHub. Your wallet balance is updated automatically after successful verification."
      },
      {
        question: "Is there a minimum amount I can add to my wallet?",
        answer: "The minimum funding amount is â‚¦100. This ensures cost-effective processing while allowing you to access jobs with lower access fees."
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
        answer: "You need to contact customer support, as you can not change your email adress."
      },
      {
        question: "What if my account gets suspended?",
        answer: "Account suspensions usually result from policy violations, suspicious activity, or user reports. If your account is suspended, you'll receive an email explaining the reason. You can appeal the decision by contacting our support team."
      }
    ]
  };

  const supportEmail = contactByType['email_support']?.value || 'support@myservicehub.co';
  const supportPhone = contactByType['phone_support']?.value || '+2348141831420';
  const businessHours = contactByType['business_hours']?.value || '8:00 AM - 6:00 PM';

  const contactOptions = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email",
      contact: supportEmail,
      action: `mailto:${supportEmail}`
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Call us directly",
      contact: supportPhone,
      action: `tel:${supportPhone.replace(/\s+/g, '')}`
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with our team",
      contact: businessHours,
      action: "#"
    }
  ];

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const filteredFAQs = faqData[activeCategory]?.filter(faq => {
    // First filter by search query
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Then filter by role for specific questions
    if (activeCategory === 'tradespeople') {
      const tradespeopleOnlyQuestions = [
        "How much does it cost to use serviceHub as a tradesperson?",
        "How do I add funds to my wallet?"
      ];
      
      // If it's a tradespeople-only question and user is not an authenticated tradesperson, hide it
      if (tradespeopleOnlyQuestions.includes(faq.question) && !(isAuthenticated() && isTradesperson())) {
        return false;
      }
    }
    
    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg9.jpg" 
            alt="" 
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#121E3C]/85 via-[#121E3C]/75 to-[#121E3C]/85" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 mb-5 text-xs font-semibold font-lato tracking-wider uppercase text-[#34D164] bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
              Support Center
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-white mb-4 leading-tight">
              Help & FAQ
            </h1>
            <p className="text-white/70 font-lato mb-8 max-w-xl mx-auto">
              Find answers to common questions and get the support you need
            </p>
            
            {/* Search Bar */}
            <div className="max-w-lg mx-auto mb-6">
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border border-white/20">
                <div className="pl-4">
                  <Search className="w-5 h-5 text-white/50" strokeWidth={2} />
                </div>
                <input
                  type="text"
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-3 text-sm bg-transparent text-white placeholder:text-white/50 focus:outline-none"
                />
                <Button
                  className="bg-[#34D164] hover:bg-[#2ab854] text-white px-5 py-3 rounded-none text-sm"
                  onClick={() => {
                    const el = document.getElementById('faq-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  Search
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {['Getting started', 'Payments', 'Verification', 'Jobs'].map((term) => (
                <button
                  key={term}
                  className="px-3 py-1.5 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all duration-200"
                  onClick={() => setSearchQuery(term)}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section 
        id="faq-section"
        className="py-10 lg:py-12"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Category Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-8">
                  <h3 className="text-sm font-semibold text-[#121E3C] mb-4">Categories</h3>
                  <nav className="space-y-1">
                    {categories.map((category) => {
                      const IconComponent = category.icon;
                      return (
                        <button
                          key={category.id}
                          onClick={() => setActiveCategory(category.id)}
                          className={`w-full flex items-center px-3 py-2 rounded-lg text-left text-sm transition-all duration-200 ${
                            activeCategory === category.id
                              ? 'bg-[#34D164]/10 text-[#34D164] font-medium'
                              : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <IconComponent className="w-4 h-4 mr-2.5" />
                          {category.name}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>

              {/* FAQ Content */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100">
                    <h2 className="text-lg font-semibold font-montserrat text-[#121E3C]">
                      {categories.find(cat => cat.id === activeCategory)?.name} Questions
                    </h2>
                    <p className="text-gray-400 text-xs mt-1">
                      {filteredFAQs.length} question{filteredFAQs.length !== 1 ? 's' : ''} found
                    </p>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {filteredFAQs.length > 0 ? (
                      filteredFAQs.map((faq, index) => (
                        <div key={index} className="p-5">
                          <button
                            onClick={() => toggleFAQ(index)}
                            className="w-full flex justify-between items-center text-left"
                          >
                            <h3 className="text-sm font-medium text-[#121E3C] pr-4">
                              {faq.question}
                            </h3>
                            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${expandedFAQ === index ? 'rotate-180' : ''}`} />
                          </button>
                          {expandedFAQ === index && (
                            <div className="mt-3 pr-8">
                              <p className="text-gray-500 text-sm leading-relaxed">
                                {faq.answer}
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-gray-400 text-sm">
                          No questions found. Try a different search term.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-[#121E3C] mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => navigate('/post-job')}
                      className="group p-4 border border-gray-100 rounded-xl hover:border-[#34D164]/30 hover:bg-[#34D164]/5 transition-all duration-200 text-left"
                    >
                      <h4 className="text-sm font-medium text-[#121E3C] group-hover:text-[#34D164]">Post a Job</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Find trades for your project</p>
                    </button>
                    <button
                      onClick={() => navigate('/browse-jobs')}
                      className="group p-4 border border-gray-100 rounded-xl hover:border-[#34D164]/30 hover:bg-[#34D164]/5 transition-all duration-200 text-left"
                    >
                      <h4 className="text-sm font-medium text-[#121E3C] group-hover:text-[#34D164]">Browse Jobs</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Find work opportunities</p>
                    </button>
                    
                    {isAuthenticated() && isTradesperson() && (
                      <button
                        onClick={() => navigate('/wallet')}
                        className="group p-4 border border-gray-100 rounded-xl hover:border-[#34D164]/30 hover:bg-[#34D164]/5 transition-all duration-200 text-left"
                      >
                        <h4 className="text-sm font-medium text-[#121E3C] group-hover:text-[#34D164]">Manage Wallet</h4>
                        <p className="text-xs text-gray-400 mt-0.5">Add funds or check balance</p>
                      </button>
                    )}
                    
                    <button
                      onClick={() => navigate('/profile')}
                      className="group p-4 border border-gray-100 rounded-xl hover:border-[#34D164]/30 hover:bg-[#34D164]/5 transition-all duration-200 text-left"
                    >
                      <h4 className="text-sm font-medium text-[#121E3C] group-hover:text-[#34D164]">Update Profile</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Manage your account settings</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Help Categories Section */}
      <section 
        className="py-16 lg:py-20"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-[#121E3C] mb-2">
              Browse Help Topics
            </h2>
            <p className="text-gray-500 font-lato">
              Find answers organized by category
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {helpCategories.map((category, index) => {
              const IconComponent = category.icon;
              return (
                <div
                  key={index}
                  className="group bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:border-[#34D164]/20 transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    navigate(`/blog?contentType=blog_post&category=${category.blogCategory}`);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/blog?contentType=blog_post&category=${category.blogCategory}`);
                    }
                  }}
                >
                  <div className="w-11 h-11 rounded-xl bg-[#34D164]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-5 h-5 text-[#34D164]" />
                  </div>
                  <h3 className="text-base font-semibold font-montserrat text-[#121E3C] mb-1">
                    {category.title}
                  </h3>
                  <p className="text-gray-500 text-xs font-lato mb-3 line-clamp-2">
                    {category.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#34D164] font-medium">{category.articles} articles</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#34D164] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Articles Section */}
      <section className="relative py-16 lg:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg4.jpg" 
            alt="" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[#121E3C]/90" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-white mb-2">
              Popular Articles
            </h2>
            <p className="text-white/60 font-lato">
              Most helpful guides for our users
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {popularArticles.map((article, index) => (
              <div
                key={index}
                className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/blog/${article.slug}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white mb-2 group-hover:text-[#34D164] transition-colors truncate">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span className="bg-white/10 px-2 py-0.5 rounded">{article.category}</span>
                      <span>{article.readTime}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-[#34D164] group-hover:translate-x-1 transition-all duration-300 shrink-0 ml-3" />
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button
              onClick={() => navigate('/blog')}
              className="bg-[#34D164] hover:bg-[#2ab854] text-white px-6 py-2.5 text-sm font-medium rounded-full transition-all duration-300 hover:scale-105"
            >
              View All Articles
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Support Section */}
      <section className="relative py-16 lg:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg15.jpg" 
            alt="" 
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[#121E3C]/90" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-white mb-2">
                Still Need Help?
              </h2>
              <p className="text-white/60 font-lato text-sm">
                Our support team is here to help you
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contactOptions.map((option, index) => {
                const IconComponent = option.icon;
                return (
                  <a
                    key={index}
                    href={option.action}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 text-center hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="w-10 h-10 bg-[#34D164]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <IconComponent className="w-5 h-5 text-[#34D164]" />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{option.title}</h3>
                    <p className="text-xs text-white/60 mb-1">{option.description}</p>
                    <p className="text-xs font-medium text-[#34D164]">{option.contact}</p>
                  </a>
                );
              })}
            </div>

            <div className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
              <p className="text-white/70 text-sm">Support Hours: <span className="text-white font-medium">{businessHours}</span></p>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default HelpFAQsPage;
