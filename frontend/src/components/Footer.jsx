import React, { useState } from 'react';
import { Button } from './ui/button';
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { useToast } from '../hooks/use-toast';

const Footer = () => {
  // Centralized route mapping for labels
  const routesByLabel = {
    // Homeowners
    'Post a job': '/post-job',
    'Find trades': '/trade-categories',
    'Trade Categories': '/trade-categories',
    'How it works': '/how-it-works',
    'Cost guides': '/coming-soon?feature=Cost guides',
    'Help & FAQs': '/help',

    // Tradespeople
    'Join for free': '/join-for-free',
    'Tradesperson app': '/coming-soon?feature=Tradesperson app',
    'Lead generation': '/coming-soon?feature=Lead generation',
    'Success stories': '/coming-soon?feature=Success stories',
    'Help centre': '/help',
    'Training courses': '/coming-soon?feature=Training courses',

    // Popular trades (category detail slugs)
    'Builders': '/trade-categories/building',
    'Electricians': '/trade-categories/electrical-repairs',
    'Plumbers': '/trade-categories/plumbing',
    'Painters & decorators': '/trade-categories/painting',
    'Carpenters': '/trade-categories/carpentry',

    // Company
    'About us': '/about',
    'Reviews Policy': '/reviews-policy',
    'Careers': '/careers',
    'Press': '/coming-soon?feature=Press',
    'Blog': '/blog',
    'Contact us': '/contact',
    'Partnerships': '/partnerships',
  };

  // Data-driven footer sections with destinations
  const footerSections = [
    {
      title: 'For homeowners',
      links: [
        { label: 'Post a job', to: routesByLabel['Post a job'] },
        { label: 'Find trades', to: routesByLabel['Find trades'] },
        { label: 'Trade Categories', to: routesByLabel['Trade Categories'] },
        { label: 'How it works', to: routesByLabel['How it works'] },
        { label: 'Cost guides', to: routesByLabel['Cost guides'] },
        { label: 'Help & FAQs', to: routesByLabel['Help & FAQs'] },
      ],
    },
    {
      title: 'For tradespeople',
      links: [
        { label: 'Join for free', to: routesByLabel['Join for free'] },
        { label: 'Tradesperson app', to: routesByLabel['Tradesperson app'] },
        { label: 'Lead generation', to: routesByLabel['Lead generation'] },
        { label: 'Success stories', to: routesByLabel['Success stories'] },
        { label: 'Help centre', to: routesByLabel['Help centre'] },
        { label: 'Training courses', to: routesByLabel['Training courses'] },
      ],
    },
    {
      title: 'Popular trades',
      links: [
        { label: 'Builders', to: routesByLabel['Builders'] },
        { label: 'Electricians', to: routesByLabel['Electricians'] },
        { label: 'Plumbers', to: routesByLabel['Plumbers'] },

        { label: 'Painters & decorators', to: routesByLabel['Painters & decorators'] },
        { label: 'Carpenters', to: routesByLabel['Carpenters'] },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About us', to: routesByLabel['About us'] },
        { label: 'How it works', to: routesByLabel['How it works'] },
        { label: 'Reviews Policy', to: routesByLabel['Reviews Policy'] },
        { label: 'Careers', to: routesByLabel['Careers'] },
        { label: 'Press', to: routesByLabel['Press'] },
        { label: 'Blog', to: routesByLabel['Blog'] },
        { label: 'Contact us', to: routesByLabel['Contact us'] },
        { label: 'Partnerships', to: routesByLabel['Partnerships'] },
      ],
    },
  ];

  const socialLinks = [
    { 
      icon: Facebook, 
      href: 'https://www.facebook.com/share/18xd2rkVkV/',
      label: 'Follow us on Facebook'
    },
    { 
      icon: Instagram, 
      href: 'https://www.instagram.com/myservice_hub?igsh=MTg2cWwweGQ3MzdoMA==',
      label: 'Follow us on Instagram'
    },
    { 
      icon: Youtube, 
      href: 'https://youtube.com/@myservicehub?si=bKHBrzZ-Hu4hjHW6',
      label: 'Subscribe to our YouTube channel'
    },
    { 
      icon: Twitter, 
      href: 'https://x.com/myservice_hub',
      label: 'Follow us on Twitter'
    }
  ];

  const { toast } = useToast();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async () => {
    if (!newsletterEmail) {
      toast({ title: 'Email required', description: 'Please enter your email address.', variant: 'destructive' });
      return;
    }
    setIsSubscribing(true);
    try {
      const res = await fetch(`/api/public/content/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, source: 'footer' })
      });
      if (!res.ok) throw new Error('Subscription failed');
      const data = await res.json();
      toast({ title: 'Subscribed!', description: 'You will now receive our newsletter.', variant: 'default' });
      setSubscribed(true);
      setNewsletterEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    } catch (err) {
      toast({ title: 'Subscription failed', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="relative bg-[#0d1628] text-white overflow-hidden">
      <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12 py-16 lg:py-20">
        <div className="max-w-6xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-14">
            {/* Logo and Description */}
            <div className="lg:col-span-1">
              <div className="mb-5">
                <Logo size="medium" variant="dark" />
              </div>
              <p className="text-white/50 text-sm font-lato mb-6 leading-relaxed">
                Nigeria's most trusted platform for connecting homeowners with reliable, local tradespeople.
              </p>
              <div className="flex space-x-3">
                {socialLinks.map((social, index) => {
                  const IconComponent = social.icon;
                  return (
                    <a
                      key={index}
                      href={social.href}
                      target={social.href !== '#' ? '_blank' : '_self'}
                      rel={social.href !== '#' ? 'noopener noreferrer' : undefined}
                      title={social.label}
                      className="w-9 h-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-[#34D164] hover:border-[#34D164] transition-all duration-300"
                    >
                      <IconComponent size={16} className="text-white/70 hover:text-white" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Footer Links */}
            {footerSections.map((section, index) => (
              <div key={index}>
                <h3 className="font-semibold font-montserrat text-sm uppercase tracking-wider text-white/90 mb-5">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map(({ label, to, href }, linkIndex) => (
                    <li key={linkIndex}>
                      {to ? (
                        <Link
                          to={to}
                          className="text-white/50 hover:text-[#34D164] transition-colors text-sm font-lato cursor-pointer"
                        >
                          {label}
                        </Link>
                      ) : (
                        <a
                          href={href || '#'}
                          target={href ? '_blank' : '_self'}
                          rel={href ? 'noopener noreferrer' : undefined}
                          className="text-white/50 hover:text-[#34D164] transition-colors text-sm font-lato cursor-pointer"
                        >
                          {label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter Signup */}
          <div className="border-t border-white/10 pt-10 mb-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="lg:max-w-md">
                <h3 className="font-semibold font-montserrat text-lg text-white mb-2">Stay updated</h3>
                <p className="text-white/50 text-sm font-lato">
                  Get the latest home improvement tips and exclusive offers.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:max-w-md w-full lg:w-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 min-w-0 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#34D164]/50 font-lato transition-colors"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                />
                <Button
                  className="bg-[#34D164] hover:bg-[#2ab854] text-white px-6 py-3 font-medium font-lato rounded-xl transition-all duration-300 shrink-0"
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                >
                  {isSubscribing ? 'Subscribing…' : subscribed ? 'Subscribed ✓' : 'Subscribe'}
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-white/10 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              {/* Copyright */}
              <div className="text-sm text-white/40 font-lato">
                © 2025 ServiceHub Ltd. All rights reserved.
              </div>

              {/* Policy links */}
              <div className="flex items-center gap-6 text-sm text-white/40 font-lato">
                <Link to="/privacy-policy" className="hover:text-white/70 transition-colors">Privacy</Link>
                <Link to="/terms" className="hover:text-white/70 transition-colors">Terms</Link>
                <Link to="/cookie-policy" className="hover:text-white/70 transition-colors">Cookies</Link>
              </div>

              {/* Made in Nigeria */}
              <div className="flex items-center gap-2 text-sm text-white/40 font-lato">
                <svg
                  className="w-5 h-3 rounded-sm ring-1 ring-white/10"
                  viewBox="0 0 60 40"
                  role="img"
                  aria-label="Nigeria flag"
                >
                  <rect width="60" height="40" fill="#ffffff" />
                  <rect width="20" height="40" fill="#008753" />
                  <rect x="40" width="20" height="40" fill="#008753" />
                </svg>
                <span>Made in Nigeria</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;




