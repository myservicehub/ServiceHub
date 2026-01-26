import React, { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, MessageCircle, HelpCircle, Facebook, Instagram, Youtube, Twitter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema, formatPhoneE164 } from '../utils/validation';
import ValidationBanner from '../components/ValidationBanner';

const ContactUsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [globalErrorMessage, setGlobalErrorMessage] = useState('');

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

      // Simulate form submission (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
        description: "Please try again or contact us directly via email.",
        variant: "destructive"
      });
    }
  };

  const onInvalid = (errObj) => {
    const message = summarizeErrors(errObj);
    setGlobalErrorMessage(message || 'Some fields need attention.');
    scrollToFirstError(errObj);
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      subtitle: "Get help via email",
      contact: "support@myservicehub.co",
      description: "Send us your questions and we'll respond within 24 hours",
      action: () => window.open('mailto:support@myservicehub.co')
    },
    {
      icon: Phone,
      title: "Phone Support",
      subtitle: "Call us directly",
      contact: "+2348141831420",
      description: "Available Monday to Friday, 8:00 AM - 6:00 PM (WAT)",
      action: () => window.open('tel:+2348141831420')
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
      url: "https://www.facebook.com/share/18xd2rkVkV/",
      color: "text-blue-600 hover:text-blue-700"
    },
    {
      icon: Instagram,
      name: "Instagram",
      url: "https://www.instagram.com/myservice_hub?igsh=MTg2cWwweGQ3MzdoMA==",
      color: "text-pink-600 hover:text-pink-700"
    },
    {
      icon: Youtube,
      name: "YouTube",
      url: "https://youtube.com/@myservicehub?si=bKHBrzZ-Hu4hjHW6",
      color: "text-red-600 hover:text-red-700"
    },
    {
      icon: Twitter,
      name: "Twitter",
      url: "https://x.com/myservice_hub",
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
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Have questions about serviceHub? We're here to help! Reach out to us through any of the channels below.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Send us a Message</h2>
                
                {/* Global validation banner */}
                <ValidationBanner message={globalErrorMessage} onJump={() => scrollToFirstError(errors)} />

                <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        {...register('name')}
                        aria-invalid={errors.name ? 'true' : 'false'}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent ${errors.name ? 'border border-red-400 focus:ring-red-500' : 'border border-gray-300 focus:ring-green-500'}`}
                        placeholder="Enter your full name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        {...register('email')}
                        aria-invalid={errors.email ? 'true' : 'false'}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent ${errors.email ? 'border border-red-400 focus:ring-red-500' : 'border border-gray-300 focus:ring-green-500'}`}
                        placeholder="Enter your email address"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        {...register('phone')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="+234 xxx xxx xxxx"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
                        I am a...
                      </label>
                      <select
                        id="userType"
                        {...register('userType')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">Select user type</option>
                        <option value="homeowner">Homeowner</option>
                        <option value="tradesperson">Tradesperson</option>
                        <option value="business">Business</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.userType && (
                        <p className="mt-1 text-sm text-red-600">{errors.userType.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      {...register('subject')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      {...register('message')}
                      aria-invalid={errors.message ? 'true' : 'false'}
                      rows={6}
                      className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent resize-vertical ${errors.message ? 'border border-red-400 focus:ring-red-500' : 'border border-gray-300 focus:ring-green-500'}`}
                      placeholder="Tell us how we can help you..."
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                      isSubmitting 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
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
            <div className="space-y-6">
              {/* Contact Methods */}
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Get in Touch</h3>
                <div className="space-y-4">
                  {contactMethods.map((method, index) => {
                    const IconComponent = method.icon;
                    return (
                      <div 
                        key={index}
                        onClick={method.action}
                        className="flex items-start p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                          <IconComponent className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{method.title}</h4>
                          <p className="text-green-600 font-medium text-sm mb-1">{method.contact}</p>
                          <p className="text-gray-600 text-sm">{method.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center mb-4">
                  <Clock className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="text-xl font-semibold text-gray-900">Business Hours</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monday - Friday</span>
                    <span className="font-medium">8:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saturday</span>
                    <span className="font-medium">9:00 AM - 2:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sunday</span>
                    <span className="font-medium">Closed</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">All times are West Africa Time (WAT)</p>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <MapPin className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="text-xl font-semibold text-gray-900">Our Location</h3>
                </div>
                <div className="text-sm text-gray-600 w-full text-justify leading-relaxed">
                  <p className="mb-2">ServiceHub Nigeria</p>
                  <p className="mb-2">6, D Place Guest House</p>
                  <p className="mb-2">Off Omimi Link Road</p>
                  <p className="mb-2">Ekpan, Delta State</p>
                  <p className="mb-4">Nigeria</p>
                  <p className="text-xs text-gray-500">
                    We serve 8 states accross Nigeria including FCT.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Quick Help</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickLinks.map((link, index) => {
                const IconComponent = link.icon;
                return (
                  <div
                    key={index}
                    onClick={link.action}
                    className="flex flex-col items-center text-center p-6 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{link.title}</h3>
                    <p className="text-sm text-gray-600">{link.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Social Media & Additional Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Social Media */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Follow Us</h3>
              <p className="text-gray-600 mb-4">Stay connected for updates, tips, and news</p>
              <div className="flex space-x-4">
                {socialLinks.map((social, index) => {
                  const IconComponent = social.icon;
                  return (
                    <a
                      key={index}
                      href={social.url}
                      target={social.url !== '#' ? '_blank' : '_self'}
                      rel={social.url !== '#' ? 'noopener noreferrer' : undefined}
                      className={`w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center transition-colors ${social.color} hover:border-current`}
                      title={`Follow us on ${social.name}`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-orange-900 mb-2">Need Urgent Help?</h3>
              <p className="text-orange-800 mb-4">
                For urgent platform issues or emergency support during business hours
              </p>
              <div className="flex items-center text-orange-700">
                <Phone className="w-4 h-4 mr-2" />
                <span className="font-medium">+2348141831420</span>
              </div>
              <p className="text-sm text-orange-600 mt-2">
                Available Monday-Friday, 8 AM - 6 PM (WAT)
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactUsPage;
