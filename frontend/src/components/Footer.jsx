import React from 'react';
import { Button } from './ui/button';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  const footerSections = [
    {
      title: 'For homeowners',
      links: [
        'Post a job',
        'Find tradespeople',
        'How it works',
        'Cost guides',
        'Reviews',
        'Help & FAQs'
      ]
    },
    {
      title: 'For tradespeople',
      links: [
        'Join for free',
        'Tradesperson app',
        'Lead generation',
        'Success stories',
        'Help centre',
        'Training courses'
      ]
    },
    {
      title: 'Popular trades',
      links: [
        'Builders',
        'Electricians',
        'Plumbers',
        'Gardeners',
        'Painters & decorators',
        'Carpenters'
      ]
    },
    {
      title: 'Company',
      links: [
        'About us',
        'Careers',
        'Press',
        'Blog',
        'Contact us',
        'Partnerships'
      ]
    }
  ];

  const socialLinks = [
    { icon: Facebook, href: '#' },
    { icon: Twitter, href: '#' },
    { icon: Instagram, href: '#' },
    { icon: Linkedin, href: '#' }
  ];

  return (
    <footer style={{background: '#121E3C'}} className="text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* Logo and Description */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: '#2F8140'}}>
                  <span className="text-white font-bold text-sm font-montserrat">S</span>
                </div>
                <span className="text-xl font-bold font-montserrat">serviceHub</span>
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
                      className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-[#2F8140] transition-colors"
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
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a
                        href="#"
                        className="text-gray-300 hover:text-white transition-colors text-sm font-lato"
                      >
                        {link}
                      </a>
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
                  style={{borderColor: '#2F8140', focusBorderColor: '#2F8140'}}
                />
                <Button className="text-white px-6 font-lato" style={{backgroundColor: '#2F8140'}}>
                  Subscribe
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex flex-wrap items-center space-x-6 text-sm text-gray-300 font-lato">
                <span>© 2025 serviceHub Ltd. All rights reserved.</span>
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-300 font-lato">
                <span>🇳🇬 Nigeria</span>
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