import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { referralsAPI } from '../api/referrals';
import { useToast } from '../hooks/use-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Upload, FileText, CheckCircle, AlertCircle, Camera } from 'lucide-react';

const VerifyAccountPage = () => {
  const { isAuthenticated, user } = useAuth();
  const [formData, setFormData] = useState({
    document_type: '',
    full_name: user?.name || '',
    document_number: '',
    document_image: null
  });
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const documentTypes = [
    { value: 'national_id', label: 'Nigerian National ID Card', description: 'Government-issued national identification card' },
    { value: 'voters_card', label: 'Permanent Voters Card (PVC)', description: 'INEC voter registration card' },
    { value: 'drivers_license', label: 'Nigerian Driver\'s License', description: 'Valid Nigerian driving license' },
    { value: 'passport', label: 'Nigerian International Passport', description: 'Nigerian international passport' },
    { value: 'business_registration', label: 'CAC Business Registration', description: 'Corporate Affairs Commission certificate' }
  ];

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
        document_image: file
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
    
    if (!formData.document_type || !formData.full_name || !formData.document_image) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields and upload a document image",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      await referralsAPI.submitVerificationDocuments(
        formData.document_type,
        formData.full_name,
        formData.document_number,
        formData.document_image
      );
      
      setSubmitted(true);
      toast({
        title: "Verification Submitted",
        description: "Your documents have been submitted for review. You'll be notified within 2-3 business days."
      });
      
    } catch (error) {
      console.error('Failed to submit verification:', error);
      
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('already')) {
        toast({
          title: "Already Submitted",
          description: error.response.data.detail,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Submission Failed",
          description: error.response?.data?.detail || "Failed to submit verification documents",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm border text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">Please sign in to verify your account</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Go to Homepage
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
              <CheckCircle size={64} className="mx-auto mb-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Verification Submitted!</h2>
              <p className="text-gray-600 mb-6">
                Your identity documents have been submitted successfully. Our team will review them within 2-3 business days.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-700 space-y-1 text-left">
                  <li>• Our verification team will review your documents</li>
                  <li>• You'll receive an email notification with the result</li>
                  <li>• Once verified, you'll unlock all platform features</li>
                  <li>• Referrers will receive their 5 coin reward</li>
                </ul>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => window.location.href = '/referrals'}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
                >
                  View Referrals
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Verify Your Account</h1>
            <p className="text-gray-600">
              Upload a government-issued ID to verify your identity and unlock all features
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="bg-white p-8 rounded-lg shadow-sm border">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Document Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Document Type *
                    </label>
                    <div className="space-y-3">
                      {documentTypes.map((type) => (
                        <div key={type.value} className="flex items-start">
                          <input
                            type="radio"
                            id={type.value}
                            name="document_type"
                            value={type.value}
                            checked={formData.document_type === type.value}
                            onChange={handleInputChange}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="ml-3">
                            <label htmlFor={type.value} className="text-sm font-medium text-gray-900 cursor-pointer">
                              {type.label}
                            </label>
                            <p className="text-xs text-gray-500">{type.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name (as shown on document) *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name exactly as shown on ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Document Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Document Number (optional)
                    </label>
                    <input
                      type="text"
                      name="document_number"
                      value={formData.document_number}
                      onChange={handleInputChange}
                      placeholder="ID number, license number, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Document Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Document Image *
                    </label>
                    
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      {imagePreview ? (
                        <div className="space-y-4">
                          <img 
                            src={imagePreview} 
                            alt="Document preview" 
                            className="max-w-full h-48 object-contain mx-auto rounded-lg border"
                          />
                          <p className="text-sm text-gray-600">{formData.document_image?.name}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, document_image: null }));
                              setImagePreview(null);
                            }}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove Image
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Camera className="mx-auto h-12 w-12 text-gray-400" />
                          <div>
                            <p className="text-gray-600 mb-2">
                              Drag and drop your document image here, or
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileSelect(e.target.files[0])}
                              className="hidden"
                              id="document-upload"
                            />
                            <label
                              htmlFor="document-upload"
                              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer inline-block"
                            >
                              Browse Files
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Photo Tips */}
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">📸 Photo Tips:</h4>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>• Ensure all text on the document is clearly readable</li>
                      <li>• Take photo in good lighting without shadows</li>
                      <li>• Keep the document flat and avoid glare</li>
                      <li>• Include all four corners of the document</li>
                      <li>• File size should be less than 10MB</li>
                    </ul>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !formData.document_type || !formData.full_name || !formData.document_image}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {loading ? 'Submitting...' : 'Submit for Verification'}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Why Verify */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Why Verify?</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle size={16} className="text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-800">Build Trust</h4>
                      <p className="text-sm text-gray-600">Verified accounts are more trusted by users</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle size={16} className="text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-800">Unlock Features</h4>
                      <p className="text-sm text-gray-600">Access all platform features</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle size={16} className="text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-800">Earn Rewards</h4>
                      <p className="text-sm text-gray-600">Help friends earn referral coins</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">🔒 Your Privacy</h3>
                <p className="text-sm text-blue-700">
                  Your documents are encrypted and securely stored. We use them only for identity verification and never share them with third parties.
                </p>
              </div>

              {/* Processing Time */}
              <div className="bg-gray-50 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">⏱️ Processing Time</h3>
                <p className="text-sm text-gray-600">
                  Verification typically takes 2-3 business days. You'll receive an email notification once reviewed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VerifyAccountPage;