import React, { useState, useEffect } from 'react';
import { walletAPI } from '../../api/wallet';
import { useToast } from '../../hooks/use-toast';

const FundWalletModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount_naira: '',
    proof_image: null
  });
  const [bankDetails, setBankDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchBankDetails();
    }
  }, [isOpen]);

  const fetchBankDetails = async () => {
    try {
      const data = await walletAPI.getBankDetails();
      setBankDetails(data);
    } catch (error) {
      console.error('Failed to fetch bank details:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      setFormData(prev => ({
        ...prev,
        proof_image: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid image file",
        variant: "destructive"
      });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount_naira || !formData.proof_image) {
      toast({
        title: "Missing Information",
        description: "Please enter amount and upload payment proof",
        variant: "destructive"
      });
      return;
    }

    if (parseInt(formData.amount_naira) < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum funding amount is ₦100",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await walletAPI.fundWallet(parseInt(formData.amount_naira), formData.proof_image);
      
      toast({
        title: "Funding Request Submitted",
        description: "Your funding request will be reviewed within 24 hours",
        variant: "default"
      });
      
      // Reset form
      setFormData({ amount_naira: '', proof_image: null });
      setImagePreview(null);
      
      if (onSuccess) onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Failed to submit funding request:', error);
      toast({
        title: "Submission Failed",
        description: error.response?.data?.detail || "Failed to submit funding request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const calculateCoins = (naira) => Math.floor(naira / 100);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-5 sm:p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-[#121E3C] font-montserrat">Fund Wallet</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Bank Details */}
          {bankDetails && (
            <div className="bg-[#121E3C]/5 border border-[#121E3C]/10 p-4 rounded-xl mb-5">
              <h3 className="font-semibold text-[#121E3C] mb-2 text-sm font-montserrat">Transfer to ServiceHub Account</h3>
              <div className="space-y-1.5 text-xs sm:text-sm text-gray-600 font-lato">
                <p><span className="text-gray-400">Bank:</span> {bankDetails.bank_name}</p>
                <p><span className="text-gray-400">Account Name:</span> {bankDetails.account_name}</p>
                <p><span className="text-gray-400">Account Number:</span> <span className="font-mono font-medium text-[#121E3C]">{bankDetails.account_number}</span></p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 font-lato">
                Amount to Fund (₦)
              </label>
              <input
                type="number"
                name="amount_naira"
                value={formData.amount_naira}
                onChange={handleInputChange}
                min="100"
                step="100"
                placeholder="Enter amount (min. ₦100)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164] focus:border-[#34D164] text-sm font-lato"
                required
              />
              {formData.amount_naira && (
                <p className="text-xs text-[#34D164] mt-1.5 font-medium font-lato">
                  = {calculateCoins(parseInt(formData.amount_naira) || 0)} coins
                </p>
              )}
            </div>

            {/* Payment Proof Upload */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 font-lato">
                Payment Proof (Screenshot)
              </label>
              
              <div
                className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center transition-colors ${
                  dragActive 
                    ? 'border-[#34D164] bg-[#34D164]/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <div className="space-y-2">
                    <img 
                      src={imagePreview} 
                      alt="Payment proof preview" 
                      className="max-w-full h-32 object-contain mx-auto"
                    />
                    <p className="text-sm text-gray-600">{formData.proof_image?.name}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, proof_image: null }));
                        setImagePreview(null);
                      }}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-2">
                      <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Drag and drop your payment screenshot here, or
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                      className="hidden"
                      id="proof-upload"
                    />
                    <label
                      htmlFor="proof-upload"
                      className="bg-[#34D164] hover:bg-[#2FBD59] text-white px-4 py-2 rounded-lg cursor-pointer inline-block text-sm font-medium font-lato"
                    >
                      Browse Files
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
              <h4 className="text-xs font-medium text-amber-700 mb-1.5 font-montserrat">Instructions:</h4>
              <ol className="text-[10px] sm:text-xs text-amber-600 space-y-1 font-lato">
                <li>1. Transfer the amount to the account above</li>
                <li>2. Take a screenshot of the successful transfer</li>
                <li>3. Upload the screenshot and submit</li>
                <li>4. Admin will review and confirm within 24 hours</li>
              </ol>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium font-lato"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.amount_naira || !formData.proof_image}
                className="flex-1 px-4 py-2.5 bg-[#34D164] hover:bg-[#2FBD59] disabled:bg-gray-300 text-white rounded-xl transition-colors text-sm font-medium shadow-md shadow-[#34D164]/20 font-lato"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FundWalletModal;