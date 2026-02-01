import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewsAPI } from '../api/reviews';
import StarRating from '../components/reviews/StarRating';
import { toast } from 'react-hot-toast';

const ExternalReviewPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    content: '',
    would_recommend: true
  });

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const data = await reviewsAPI.getExternalInvitation(token);
        setInvitation(data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Invalid or expired invitation link');
      } finally {
        setLoading(false);
      }
    };
    fetchInvitation();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    setSubmitting(true);
    try {
      await reviewsAPI.submitExternalReview({
        token,
        ...formData
      });
      toast.success('Thank you for your review!');
      navigate('/thanks'); // Assuming there's a thanks page or we can just show success state
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  
  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-lg text-center">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-2">Invitation Error</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-xl shadow-md overflow-hidden p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Leave a Review</h1>
          <p className="mt-2 text-gray-600">
            For <strong>{invitation.tradesperson_name}</strong> {invitation.tradesperson_business_name && `(${invitation.tradesperson_business_name})`}
          </p>
          <p className="text-sm text-gray-500 mt-1">Job: {invitation.job_title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center">
            <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
            <StarRating 
              rating={formData.rating} 
              onRatingChange={(rating) => setFormData({...formData, rating})} 
              size="lg"
              editable={true}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Review Title</label>
            <input
              type="text"
              required
              placeholder="Summarize your experience"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Review Content</label>
            <textarea
              required
              rows={4}
              placeholder="Tell us about the quality of work, communication, and professionalism..."
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
            />
          </div>

          <div className="flex items-center">
            <input
              id="recommend"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={formData.would_recommend}
              onChange={(e) => setFormData({...formData, would_recommend: e.target.checked})}
            />
            <label htmlFor="recommend" className="ml-2 block text-sm text-gray-900">
              I would recommend this tradesperson to others
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 text-lg font-semibold"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExternalReviewPage;
