import React, { useState } from 'react';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: '#2F8140'}}>
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold" style={{color: '#121E3C'}}>serviceHub</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-700 hover:text-green-600 transition-colors">
              How it works
            </a>
            <a href="#" className="text-gray-700 hover:text-green-600 transition-colors">
              Find tradespeople
            </a>
            <a href="#" className="text-gray-700 hover:text-green-600 transition-colors">
              Join as tradesperson
            </a>
            <a href="#" className="text-gray-700 hover:text-green-600 transition-colors">
              Help
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" className="text-gray-700 hover:text-green-600">
              Sign in
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Post a job
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white py-4">
            <nav className="flex flex-col space-y-4">
              <a href="#" className="text-gray-700 hover:text-green-600 transition-colors">
                How it works
              </a>
              <a href="#" className="text-gray-700 hover:text-green-600 transition-colors">
                Find tradespeople
              </a>
              <a href="#" className="text-gray-700 hover:text-green-600 transition-colors">
                Join as tradesperson
              </a>
              <a href="#" className="text-gray-700 hover:text-green-600 transition-colors">
                Help
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                <Button variant="ghost" className="text-gray-700 hover:text-green-600 justify-start">
                  Sign in
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white justify-start">
                  Post a job
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;