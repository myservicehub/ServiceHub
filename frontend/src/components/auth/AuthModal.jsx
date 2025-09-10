import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {mode === 'login' ? (
          <LoginForm onClose={handleClose} onSwitchToSignup={switchToSignup} />
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