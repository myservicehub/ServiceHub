import React, { useState } from 'react';
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
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Request External Review
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Invite a client you have worked for in the past outside ServiceHub platform to leave a review for the work you did for the client..
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 sm:mt-6 space-y-4">
            <div>
              <label htmlFor="client_name" className="block text-sm font-medium text-gray-700">Client Name *</label>
              <input
                type="text"
                name="client_name"
                id="client_name"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.client_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="job_title" className="block text-sm font-medium text-gray-700">Job Title *</label>
              <input
                type="text"
                name="job_title"
                id="job_title"
                required
                placeholder="e.g. Bathroom renovation"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.job_title}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="client_email" className="block text-sm font-medium text-gray-700">Client Email *</label>
              <input
                type="email"
                name="client_email"
                id="client_email"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.client_email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="client_phone" className="block text-sm font-medium text-gray-700">Client Phone (Optional)</label>
              <input
                type="tel"
                name="client_phone"
                id="client_phone"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.client_phone}
                onChange={handleChange}
              />
            </div>

            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:flow-row-reverse">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestExternalReviewModal;
