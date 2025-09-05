import React, { useState } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

const AuthModal = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const [mode, setMode] = useState(defaultMode);

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
          <SignupForm onClose={handleClose} onSwitchToLogin={switchToLogin} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;