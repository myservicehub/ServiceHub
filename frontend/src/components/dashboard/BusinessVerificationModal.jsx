import React, { useEffect, useState } from 'react';
import { X, Building2, Upload, FileText, CheckCircle, ArrowRight, Image } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { authAPI } from '../../api/services';
import { useNavigate } from 'react-router-dom';

const BUSINESS_TYPES = [
  'Self-Employed / Sole Trader',
  'Limited Company (LTD)',
  'Ordinary Partnership',
  'Limited Liability Partnership (LLP)'
];

const normalizeBusinessType = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.toLowerCase();
  if (normalized.includes('self') && normalized.includes('sole')) return 'Self-Employed / Sole Trader';
  if (normalized.includes('limited') && normalized.includes('company')) return 'Limited Company (LTD)';
  if (normalized.includes('ordinary') && normalized.includes('partnership')) return 'Ordinary Partnership';
  if (normalized.includes('limited liability') || normalized.includes('(llp)')) return 'Limited Liability Partnership (LLP)';
  return raw;
};

const BusinessVerificationModal = ({ isOpen, onClose, onComplete }) => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [businessType, setBusinessType] = useState(normalizeBusinessType(user?.business_type || ''));
  const [tradingName, setTradingName] = useState(user?.trading_name || '');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [cacCertificate, setCacCertificate] = useState(null);
  const [tradeCertificate, setTradeCertificate] = useState(null);
  const [proofOfAddress, setProofOfAddress] = useState(null);

  useEffect(() => {
    setBusinessType(normalizeBusinessType(user?.business_type || ''));
  }, [user?.business_type]);

  useEffect(() => {
    if (!isOpen) return;
    onClose();
    navigate('/verify-account');
  }, [isOpen, onClose, navigate]);

  const handleFileChange = (setter) => (e) => {
    if (e.target.files?.[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!businessType) {
      toast({ title: "Required", description: "Select a business type", variant: "destructive" });
      return;
    }
    if (!tradingName.trim()) {
      toast({ title: "Required", description: "Enter your trading name", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // For now, just show success - backend integration pending
      toast({ title: "Submitted", description: "Business verification submitted for review" });
      if (onComplete) onComplete();
      onClose();
    } catch (error) {
      toast({ title: "Failed", description: error.response?.data?.detail || "Try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderSoleTraderFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Residential Address</label>
        <Input
          placeholder="Your home address"
          value={residentialAddress}
          onChange={(e) => setResidentialAddress(e.target.value)}
          className="h-11"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Proof of Address</label>
        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex flex-col items-center">
            <Image className="w-5 h-5 text-gray-400 mb-1" />
            <span className="text-sm text-gray-500">{proofOfAddress?.name || 'Upload utility bill or bank statement'}</span>
          </div>
          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange(setProofOfAddress)} />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Trade Certificate (Optional)</label>
        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex flex-col items-center">
            <FileText className="w-5 h-5 text-gray-400 mb-1" />
            <span className="text-sm text-gray-500">{tradeCertificate?.name || 'Upload trade certification'}</span>
          </div>
          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange(setTradeCertificate)} />
        </label>
      </div>
    </div>
  );

  const renderCompanyFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">CAC Certificate <span className="text-red-500">*</span></label>
        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex flex-col items-center">
            <FileText className="w-5 h-5 text-gray-400 mb-1" />
            <span className="text-sm text-gray-500">{cacCertificate?.name || 'Upload CAC certificate'}</span>
          </div>
          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange(setCacCertificate)} />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Address</label>
        <Input
          placeholder="Registered business address"
          value={residentialAddress}
          onChange={(e) => setResidentialAddress(e.target.value)}
          className="h-11"
        />
      </div>
    </div>
  );

  const renderPartnershipFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name Certificate (BN)</label>
        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex flex-col items-center">
            <FileText className="w-5 h-5 text-gray-400 mb-1" />
            <span className="text-sm text-gray-500">{cacCertificate?.name || 'Upload BN certificate'}</span>
          </div>
          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange(setCacCertificate)} />
        </label>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 sm:pb-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[85vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#121E3C]/10">
              <Building2 className="w-5 h-5 text-[#121E3C]" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Business Verification</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600 mb-5">
            Verify your business to build trust with customers and unlock premium features.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Type <span className="text-red-500">*</span></label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(normalizeBusinessType(e.target.value))}
                className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#121E3C]/20 focus:border-[#121E3C]"
              >
                <option value="">Select business type</option>
                {BUSINESS_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Trading Name <span className="text-red-500">*</span></label>
              <Input
                placeholder="Your business or trading name"
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                className="h-11"
              />
            </div>

            {businessType === 'Self-Employed / Sole Trader' && renderSoleTraderFields()}
            {businessType === 'Limited Company (LTD)' && renderCompanyFields()}
            {(businessType === 'Ordinary Partnership' || businessType === 'Limited Liability Partnership (LLP)') && renderPartnershipFields()}
          </div>
        </div>

        <div className="p-5 border-t flex-shrink-0">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !businessType || !tradingName.trim()}
            className="w-full bg-[#121E3C] hover:bg-[#0d1629] text-white"
          >
            {isLoading ? 'Submitting...' : 'Submit for Review'}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BusinessVerificationModal;
