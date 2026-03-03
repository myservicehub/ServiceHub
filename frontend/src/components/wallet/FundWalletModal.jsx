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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Fund Wallet</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Bank Details */}
          {bankDetails && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Transfer to ServiceHub Account</h3>
              <div className="space-y-1 text-sm text-blue-700">
                <p><strong>Bank:</strong> {bankDetails.bank_name}</p>
                <p><strong>Account Name:</strong> {bankDetails.account_name}</p>
                <p><strong>Account Number:</strong> {bankDetails.account_number}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              {formData.amount_naira && (
                <p className="text-sm text-gray-600 mt-1">
                  = {calculateCoins(parseInt(formData.amount_naira) || 0)} coins
                </p>
              )}
            </div>

            {/* Payment Proof Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Proof (Screenshot)
              </label>
              
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
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
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded cursor-pointer inline-block"
                    >
                      Browse Files
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Instructions:</h4>
              <ol className="text-xs text-yellow-700 space-y-1">
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
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.amount_naira || !formData.proof_image}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
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