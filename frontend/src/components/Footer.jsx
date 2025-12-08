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
    'Cost guides': '/blog',
    'Reviews': '/reviews',
    'Help & FAQs': '/help',

    // Tradespeople
    'Join for free': '/join-for-free',
    'Tradesperson app': '/join-for-free', // Placeholder until app page exists
    'Lead generation': '/join-for-free',  // Placeholder CTA
    'Success stories': '/blog',
    'Help centre': '/help-centre',
    'Training courses': '/careers',

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
    'Press': '/blog', // Fallback until press page exists
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
        { label: 'Reviews', to: routesByLabel['Reviews'] },
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
      href: 'https://x.com/myservicehub',
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
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/content/newsletter/subscribe`, {
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
    <footer style={{background: '#121E3C'}} className="text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* Logo and Description */}
            <div className="lg:col-span-1">
              <div className="mb-4">
                <Logo size="medium" variant="dark" />
              </div>
              <p className="text-gray-300 text-sm font-lato mb-6">
                Nigeria's most trusted platform for connecting homeowners with reliable, local tradespeople.
              </p>
              <div className="flex space-x-4">
                {socialLinks.map((social, index) => {
                  const IconComponent = social.icon;
                  return (
                    <a
                      key={index}
                      href={social.href}
                      target={social.href !== '#' ? '_blank' : '_self'}
                      rel={social.href !== '#' ? 'noopener noreferrer' : undefined}
                      title={social.label}
                      className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-[#34D164] transition-colors"
                    >
                      <IconComponent size={16} />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Footer Links */}
            {footerSections.map((section, index) => (
              <div key={index}>
                <h3 className="font-semibold font-montserrat text-lg mb-4">{section.title}</h3>
                <ul className="space-y-2">
                  {section.links.map(({ label, to, href }, linkIndex) => (
                    <li key={linkIndex}>
                      {to ? (
                        <Link
                          to={to}
                          className="text-gray-300 hover:text-white transition-colors text-sm font-lato cursor-pointer"
                        >
                          {label}
                        </Link>
                      ) : (
                        <a
                          href={href || '#'}
                          target={href ? '_blank' : '_self'}
                          rel={href ? 'noopener noreferrer' : undefined}
                          className="text-gray-300 hover:text-white transition-colors text-sm font-lato cursor-pointer"
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
          <div className="border-t border-gray-700 pt-8 mb-8">
            <div className="max-w-md">
              <h3 className="font-semibold font-montserrat text-lg mb-2">Stay updated</h3>
              <p className="text-gray-300 text-sm font-lato mb-4">
                Get the latest home improvement tips and exclusive offers.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none font-lato"
                  style={{borderColor: '#34D164', focusBorderColor: '#34D164'}}
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                />
                <Button
                  className="text-white px-6 font-lato"
                  style={{backgroundColor: '#34D164'}}
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                >
                  {isSubscribing ? 'Subscribing…' : subscribed ? 'Subscribed ✓' : 'Subscribe'}
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              {/* Copyright on its own line */}
              <div className="text-sm text-gray-300 font-lato">
                <span>© 2025 serviceHub Ltd. All rights reserved.</span>
              </div>

              {/* Only policy links kept on one line */}
              <div className="flex items-center gap-6 text-sm text-gray-300 font-lato whitespace-nowrap">
                <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                <Link to="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link>
              </div>

              {/* Made in Nigeria with flag (not forced onto policy links line) */}
              <div className="flex items-center text-sm text-gray-300 font-lato">
                <span className="flex items-center gap-2">
                  <svg
                    className="w-5 h-3 rounded-sm ring-1 ring-white/20"
                    viewBox="0 0 60 40"
                    role="img"
                    aria-label="Nigeria flag"
                  >
                    <rect width="60" height="40" fill="#ffffff" />
                    <rect width="20" height="40" fill="#008753" />
                    <rect x="40" width="20" height="40" fill="#008753" />
                  </svg>
                  <span>Made in Nigeria</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;




