import React, { useState } from 'react';
import { X, Mail, User, Briefcase, Phone, Send, Star } from 'lucide-react';
import { reviewsAPI } from '../../api/reviews';
import { useToast } from '../../hooks/use-toast';

const RequestExternalReviewModal = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    job_title: ''
  });

  const [invitationsRemaining, setInvitationsRemaining] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const response = await reviewsAPI.inviteExternalReview(formData);
      setInvitationsRemaining(response.invitations_remaining);
      toast({
        title: "Success",
        description: `Invitation sent successfully! You have ${response.invitations_remaining} invitations left.`,
      });
      setFormData({ client_name: '', client_email: '', client_phone: '', job_title: '' });
      onClose();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || 'Failed to send invitation',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-6">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
          aria-hidden="true" 
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#34D164] to-[#2ab854] px-6 py-5">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Star size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Request External Review</h3>
                <p className="text-white/80 text-sm">Invite past clients to review your work</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Client Name */}
            <div className="space-y-1.5">
              <label htmlFor="client_name" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Client Name *
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="client_name"
                  id="client_name"
                  required
                  placeholder="Enter client's full name"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164] transition-all"
                  value={formData.client_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Job Title */}
            <div className="space-y-1.5">
              <label htmlFor="job_title" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Job Title *
              </label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="job_title"
                  id="job_title"
                  required
                  placeholder="e.g. Kitchen renovation, Plumbing repair"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164] transition-all"
                  value={formData.job_title}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Client Email */}
            <div className="space-y-1.5">
              <label htmlFor="client_email" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Client Email *
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="client_email"
                  id="client_email"
                  required
                  placeholder="client@email.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164] transition-all"
                  value={formData.client_email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Client Phone */}
            <div className="space-y-1.5">
              <label htmlFor="client_phone" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Client Phone <span className="text-gray-400 normal-case">(Optional)</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="client_phone"
                  id="client_phone"
                  placeholder="08012345678"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164] transition-all"
                  value={formData.client_phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#34D164] hover:bg-[#2ab854] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestExternalReviewModal;
