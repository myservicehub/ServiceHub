import React, { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, MessageCircle, HelpCircle, Facebook, Instagram, Youtube, Twitter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { publicAPI } from '../api/public';
import { statsAPI } from '../api/services';
import { contactsAPI } from '../api/wallet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema, formatPhoneE164 } from '../utils/validation';
import ValidationBanner from '../components/ValidationBanner';

const ContactUsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [globalErrorMessage, setGlobalErrorMessage] = useState('');
  const [platformStats, setPlatformStats] = useState(null);
  const [contactByType, setContactByType] = useState({});

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await statsAPI.getStats();
        setPlatformStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, []);

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
      } catch (err) {
        console.error('Failed to fetch contacts:', err);
      }
    };
    fetchContacts();
  }, []);

  // React Hook Form setup with Zod schema
  const form = useForm({
    resolver: zodResolver(contactSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      userType: '',
      message: ''
    }
  });

  const { register, handleSubmit, formState: { errors, isSubmitting, isValid }, reset } = form;

  // Build a friendly summary message for the banner
  const summarizeErrors = (errObj) => {
    const order = ['name', 'email', 'message', 'phone', 'subject', 'userType'];
    const labels = {
      name: 'Full Name',
      email: 'Email Address',
      message: 'Message',
      phone: 'Phone',
      subject: 'Subject',
      userType: 'User Type',
    };
    const missing = order.filter((key) => errObj[key]).map((key) => labels[key]);
    if (missing.length === 0) return '';
    return `Please complete or correct: ${missing.join(', ')}`;
  };

  const scrollToFirstError = (errObj) => {
    const order = ['name', 'email', 'message', 'phone', 'subject', 'userType'];
    const first = order.find((key) => errObj[key]);
    if (!first) return;
    const el = document.getElementById(first);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    }
  };

  const onSubmit = async (data) => {
    setGlobalErrorMessage('');
    try {
      // Normalize phone to E.164 if provided
      const payload = {
        ...data,
        phone: data.phone ? formatPhoneE164(data.phone, 'NG') : undefined,
      };

      // Send contact form to backend
      await publicAPI.submitContactForm({
        name: payload.name,
        email: payload.email,
        subject: payload.subject,
        message: payload.message
      });
      
      toast({
        title: "Message Sent Successfully!",
        description: "Thank you for contacting us. We'll get back to you within 24 hours.",
        variant: "default"
      });

      // Reset form
      reset();
    } catch (error) {
      toast({
        title: "Error Sending Message",
        description: error.response?.data?.detail || "Please try again or contact us directly via email.",
        variant: "destructive"
      });
    }
  };

  const onInvalid = (errObj) => {
    const message = summarizeErrors(errObj);
    setGlobalErrorMessage(message || 'Some fields need attention.');
    scrollToFirstError(errObj);
  };

  const supportEmail = contactByType['email_support']?.value || 'support@myservicehub.co';
  const supportPhone = contactByType['phone_support']?.value || '+2348141831420';
  const businessHours = contactByType['business_hours']?.value || 'Available Monday to Friday, 8:00 AM - 6:00 PM (WAT)';
  const socialFacebook = contactByType['social_facebook']?.value || 'https://www.facebook.com/share/18xd2rkVkV/';
  const socialInstagram = contactByType['social_instagram']?.value || 'https://www.instagram.com/myservice_hub?igsh=MTg2cWwweGQ3MzdoMA==';
  const socialYoutube = contactByType['social_youtube']?.value || 'https://youtube.com/@myservicehub?si=bKHBrzZ-Hu4hjHW6';
  const socialTwitter = contactByType['social_twitter']?.value || 'https://x.com/myservice_hub';

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      subtitle: "Get help via email",
      contact: supportEmail,
      description: "Send us your questions and we'll respond within 24 hours",
      action: () => window.open(`mailto:${supportEmail}`)
    },
    {
      icon: Phone,
      title: "Phone Support",
      subtitle: "Call us directly",
      contact: supportPhone,
      description: businessHours,
      action: () => window.open(`tel:${supportPhone.replace(/\s+/g, '')}`)
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      subtitle: "Chat with our team",
      contact: "Available on website",
      description: "Get instant help during business hours",
      action: () => toast({ title: "Live Chat", description: "Live chat feature coming soon!" })
    }
  ];

  const socialLinks = [
    {
      icon: Facebook,
      name: "Facebook",
      url: socialFacebook,
      color: "text-blue-600 hover:text-blue-700"
    },
    {
      icon: Instagram,
      name: "Instagram",
      url: socialInstagram,
      color: "text-pink-600 hover:text-pink-700"
    },
    {
      icon: Youtube,
      name: "YouTube",
      url: socialYoutube,
      color: "text-red-600 hover:text-red-700"
    },
    {
      icon: Twitter,
      name: "Twitter",
      url: socialTwitter,
      color: "text-blue-400 hover:text-blue-500"
    }
  ];

  const quickLinks = [
    {
      title: "Browse Help & FAQs",
      description: "Find answers to common questions",
      icon: HelpCircle,
      action: () => navigate('/help')
    },
    {
      title: "Post a Job",
      description: "Get started with finding professionals",
      icon: MessageCircle,
      action: () => navigate('/post-job')
    },
    {
      title: "Join as Tradesperson",
      description: "Start earning with your skills",
      icon: Phone,
      action: () => navigate('/')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-14 lg:py-16 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg9.jpg" 
            alt="" 
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#121E3C]/90 via-[#121E3C]/85 to-[#121E3C]/90" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Mail size={24} className="text-[#34D164]" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-white mb-3">
              Contact Us
            </h1>
            <p className="text-white/70 font-lato text-sm max-w-lg mx-auto">
              Have questions about ServiceHub? We're here to help! Reach out through any channel below.
            </p>
          </div>
        </div>
      </section>

      <section 
        className="py-12 lg:py-14"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Contact Form */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold font-montserrat text-[#121E3C] mb-5">Send us a Message</h2>
                  
                  {/* Global validation banner */}
                  <ValidationBanner message={globalErrorMessage} onJump={() => scrollToFirstError(errors)} />

                  <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-xs font-medium text-[#121E3C] mb-1.5">
                          Full Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          {...register('name')}
                          aria-invalid={errors.name ? 'true' : 'false'}
                          className={`w-full px-3 py-2.5 text-sm rounded-xl focus:ring-2 focus:border-transparent ${errors.name ? 'border border-red-300 focus:ring-red-200' : 'border border-gray-200 focus:ring-[#34D164]/20 focus:border-[#34D164]'}`}
                          placeholder="Your full name"
                        />
                        {errors.name && (
                          <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-xs font-medium text-[#121E3C] mb-1.5">
                          Email Address <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          {...register('email')}
                          aria-invalid={errors.email ? 'true' : 'false'}
                          className={`w-full px-3 py-2.5 text-sm rounded-xl focus:ring-2 focus:border-transparent ${errors.email ? 'border border-red-300 focus:ring-red-200' : 'border border-gray-200 focus:ring-[#34D164]/20 focus:border-[#34D164]'}`}
                          placeholder="Your email"
                        />
                        {errors.email && (
                          <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="phone" className="block text-xs font-medium text-[#121E3C] mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          {...register('phone')}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164]"
                          placeholder="+234 xxx xxx xxxx"
                        />
                        {errors.phone && (
                          <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label htmlFor="userType" className="block text-xs font-medium text-[#121E3C] mb-1.5">
                          I am a...
                        </label>
                        <select
                          id="userType"
                          {...register('userType')}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164]"
                        >
                          <option value="">Select user type</option>
                          <option value="homeowner">Homeowner</option>
                          <option value="tradesperson">Tradesperson</option>
                          <option value="business">Business</option>
                          <option value="other">Other</option>
                        </select>
                        {errors.userType && (
                          <p className="mt-1 text-xs text-red-500">{errors.userType.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-xs font-medium text-[#121E3C] mb-1.5">
                        Subject
                      </label>
                      <select
                        id="subject"
                        {...register('subject')}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164]"
                      >
                        <option value="">Select a subject</option>
                        <option value="general">General Inquiry</option>
                        <option value="account">Account Issues</option>
                        <option value="payment">Payment & Billing</option>
                        <option value="technical">Technical Support</option>
                        <option value="partnership">Partnership Opportunities</option>
                        <option value="feedback">Feedback & Suggestions</option>
                        <option value="complaint">Complaint</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-xs font-medium text-[#121E3C] mb-1.5">
                        Message <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        id="message"
                        {...register('message')}
                        aria-invalid={errors.message ? 'true' : 'false'}
                        rows={4}
                        className={`w-full px-3 py-2.5 text-sm rounded-xl focus:ring-2 focus:border-transparent resize-none ${errors.message ? 'border border-red-300 focus:ring-red-200' : 'border border-gray-200 focus:ring-[#34D164]/20 focus:border-[#34D164]'}`}
                        placeholder="Tell us how we can help you..."
                      />
                      {errors.message && (
                        <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-medium text-white transition-colors ${
                        isSubmitting 
                          ? 'bg-gray-300 cursor-not-allowed' 
                          : 'bg-[#34D164] hover:bg-[#2ab854]'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-5">
                {/* Contact Methods */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-4">Get in Touch</h3>
                  <div className="space-y-3">
                    {contactMethods.map((method, index) => {
                      const IconComponent = method.icon;
                      return (
                        <div 
                          key={index}
                          onClick={method.action}
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="w-9 h-9 bg-[#34D164]/10 rounded-xl flex items-center justify-center shrink-0">
                            <IconComponent className="w-4 h-4 text-[#34D164]" />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-[#121E3C]">{method.title}</h4>
                            <p className="text-[#34D164] font-medium text-xs mb-0.5">{method.contact}</p>
                            <p className="text-gray-400 text-[10px]">{method.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Business Hours */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-[#34D164]/10 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-[#34D164]" />
                    </div>
                    <h3 className="text-sm font-semibold font-montserrat text-[#121E3C]">Business Hours</h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Monday - Friday</span>
                      <span className="font-medium text-[#121E3C]">8:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Saturday</span>
                      <span className="font-medium text-[#121E3C]">9:00 AM - 2:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sunday</span>
                      <span className="font-medium text-[#121E3C]">Closed</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">All times are West Africa Time (WAT)</p>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-[#34D164]/10 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-[#34D164]" />
                    </div>
                    <h3 className="text-sm font-semibold font-montserrat text-[#121E3C]">Our Location</h3>
                  </div>
                  <p className="text-gray-500 font-lato text-xs leading-relaxed mb-2">
                    ServiceHub Nigeria, 6, D Place Guest House, Off Omimi Link Road, Ekpan, Delta State, Nigeria
                  </p>
                  <p className="text-[10px] text-gray-400">
                    We serve {platformStats?.total_states || '8'} states across Nigeria including FCT.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-base font-semibold font-montserrat text-[#121E3C] mb-5 text-center">Quick Help</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickLinks.map((link, index) => {
                  const IconComponent = link.icon;
                  return (
                    <div
                      key={index}
                      onClick={link.action}
                      className="flex flex-col items-center text-center p-5 border border-gray-100 rounded-xl hover:border-[#34D164]/30 hover:bg-[#34D164]/5 cursor-pointer transition-all duration-300"
                    >
                      <div className="w-10 h-10 bg-[#34D164]/10 rounded-xl flex items-center justify-center mb-3">
                        <IconComponent className="w-5 h-5 text-[#34D164]" />
                      </div>
                      <h3 className="text-sm font-semibold text-[#121E3C] mb-1">{link.title}</h3>
                      <p className="text-xs text-gray-500">{link.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Social Media & Emergency */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
              {/* Social Media */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-3">Follow Us</h3>
                <p className="text-gray-500 text-xs mb-4">Stay connected for updates, tips, and news</p>
                <div className="flex gap-3">
                  {socialLinks.map((social, index) => {
                    const IconComponent = social.icon;
                    return (
                      <a
                        key={index}
                        href={social.url}
                        target={social.url !== '#' ? '_blank' : '_self'}
                        rel={social.url !== '#' ? 'noopener noreferrer' : undefined}
                        className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center transition-all hover:border-[#34D164] hover:bg-[#34D164]/10 group"
                        title={`Follow us on ${social.name}`}
                      >
                        <IconComponent className="w-4 h-4 text-gray-400 group-hover:text-[#34D164]" />
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                <h3 className="text-sm font-semibold font-montserrat text-amber-800 mb-2">Need Urgent Help?</h3>
                <p className="text-amber-700 text-xs mb-3">
                  For urgent platform issues or emergency support
                </p>
                <div className="flex items-center text-amber-700">
                  <Phone className="w-4 h-4 mr-2" />
                  <span className="font-medium text-sm">{supportPhone}</span>
                </div>
                <p className="text-[10px] text-amber-600 mt-2">
                  {businessHours}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactUsPage;
