import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';

const AuthModal = ({ isOpen, onClose, defaultMode = 'login', defaultTab = 'tradesperson', showOnlyTradesperson = true }) => {
  const [mode, setMode] = useState(defaultMode);

  // Update mode when defaultMode prop changes
  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  const handleClose = () => {
    onClose();
    // Reset to default mode when closing
    setTimeout(() => setMode(defaultMode), 300);
  };

  const switchToLogin = () => setMode('login');
  const switchToSignup = () => setMode('signup');
  const switchToForgotPassword = () => setMode('forgotPassword');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[85vh] overflow-y-auto p-0 my-4 sm:my-8"
        onPointerDownOutside={(e) => { e.preventDefault(); }}
      >
        {/* Hidden title to satisfy accessibility requirements */}
        <DialogTitle className="sr-only">
          {mode === 'login' ? 'Login' : mode === 'forgotPassword' ? 'Forgot Password' : 'Sign Up'}
        </DialogTitle>
        {mode === 'login' ? (
          <LoginForm 
            onClose={handleClose} 
            onSwitchToSignup={switchToSignup}
            onSwitchToForgotPassword={switchToForgotPassword}
          />
        ) : mode === 'forgotPassword' ? (
          <ForgotPasswordForm 
            onClose={handleClose} 
            onBackToLogin={switchToLogin}
          />
        ) : (
          <SignupForm 
            onClose={handleClose} 
            onSwitchToLogin={switchToLogin} 
            defaultTab={defaultTab}
            showOnlyTradesperson={showOnlyTradesperson}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;