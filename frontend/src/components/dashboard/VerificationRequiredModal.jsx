import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, X, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';

const VerificationRequiredModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleVerifyNow = () => {
    onClose();
    navigate('/trades/overview');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div 
        className="bg-white rounded-3xl max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
          
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-[#121E3C]/5 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[#121E3C]" />
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-bold text-[#121E3C] text-center font-montserrat">
            Account Not Yet Verified
          </h3>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <p className="text-gray-500 text-center text-sm font-lato leading-relaxed mb-6">
            To access this feature, please complete all verification steps in your profile. This helps us maintain a trusted community for homeowners and tradespeople.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleVerifyNow}
              className="w-full h-12 rounded-xl bg-[#34D164] hover:bg-[#2ab854] text-white font-medium font-lato flex items-center justify-center gap-2"
            >
              Complete Verification
              <ArrowRight className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full h-10 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-lato"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationRequiredModal;
