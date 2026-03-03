import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CalendarDays, DollarSign, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { quotesAPI } from '../../api/services';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';

const QuoteForm = ({ job, onQuoteSubmitted, onCancel }) => {
  const [formData, setFormData] = useState({
    price: '',
    message: '',
    estimated_duration: '',
    start_date: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Please provide a detailed message';
    } else if (formData.message.length < 20) {
      newErrors.message = 'Message must be at least 20 characters';
    }

    if (!formData.estimated_duration.trim()) {
      newErrors.estimated_duration = 'Please specify estimated duration';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Please select when you can start';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const quoteData = {
        job_id: job.id,
        price: parseFloat(formData.price),
        message: formData.message,
        estimated_duration: formData.estimated_duration,
        start_date: new Date(formData.start_date).toISOString()
      };

      await quotesAPI.createQuote(quoteData);

      toast({
        title: "Quote submitted successfully!",
        description: "Your quote has been sent to the homeowner. They will contact you if interested.",
      });

      if (onQuoteSubmitted) {
        onQuoteSubmitted();
      }

    } catch (error) {
      console.error('Quote submission error:', error);
      toast({
        title: "Failed to submit quote",
        description: error.response?.data?.detail || "There was an error submitting your quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold font-montserrat flex items-center" style={{color: '#121E3C'}}>
          <MessageSquare className="mr-2" style={{color: '#34D164'}} />
          Submit Your Quote
        </CardTitle>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold font-montserrat text-gray-900 mb-2">{job.title}</h3>
          <p className="text-sm text-gray-600 font-lato mb-2">{job.category} • {job.location}</p>
          <p className="text-sm text-gray-600 font-lato">
            Budget: {job.budget_min && job.budget_max ? 
              `${formatCurrency(job.budget_min)} - ${formatCurrency(job.budget_max)}` : 
              'Budget not specified'
            }
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Price Field */}
          <div>
            <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
              Your Quote Price (₦) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="number"
                placeholder="Enter your price in Naira"
                value={formData.price}
                onChange={(e) => updateFormData('price', e.target.value)}
                className={`pl-10 font-lato ${errors.price ? 'border-red-500' : ''}`}
              />
            </div>
            {formData.price && (
              <p className="text-sm text-gray-600 font-lato mt-1">
                Your quote: {formatCurrency(parseFloat(formData.price) || 0)}
              </p>
            )}
            {errors.price && (
              <div className="flex items-center mt-1 text-red-500 text-sm">
                <AlertCircle size={16} className="mr-1" />
                {errors.price}
              </div>
            )}
          </div>

          {/* Duration Field */}
          <div>
            <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
              Estimated Duration *
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="e.g., 2 weeks, 5 days, 1 month"
                value={formData.estimated_duration}
                onChange={(e) => updateFormData('estimated_duration', e.target.value)}
                className={`pl-10 font-lato ${errors.estimated_duration ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.estimated_duration && (
              <div className="flex items-center mt-1 text-red-500 text-sm">
                <AlertCircle size={16} className="mr-1" />
                {errors.estimated_duration}
              </div>
            )}
          </div>

          {/* Start Date Field */}
          <div>
            <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
              When can you start? *
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="date"
                min={minDate}
                value={formData.start_date}
                onChange={(e) => updateFormData('start_date', e.target.value)}
                className={`pl-10 font-lato ${errors.start_date ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.start_date && (
              <div className="flex items-center mt-1 text-red-500 text-sm">
                <AlertCircle size={16} className="mr-1" />
                {errors.start_date}
              </div>
            )}
          </div>

          {/* Message Field */}
          <div>
            <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
              Detailed Quote Message *
            </label>
            <Textarea
              placeholder="Provide details about your approach, materials, experience with similar projects, and why you're the right choice for this job..."
              value={formData.message}
              onChange={(e) => updateFormData('message', e.target.value)}
              rows={6}
              className={`font-lato ${errors.message ? 'border-red-500' : ''}`}
            />
            <div className="flex justify-between mt-1">
              {errors.message && (
                <div className="flex items-center text-red-500 text-sm">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.message}
                </div>
              )}
              <p className="text-gray-500 text-sm ml-auto">
                {formData.message.length}/1000 characters
              </p>
            </div>
          </div>

          {/* Professional Info Display */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
              Your Professional Details
            </h4>
            <div className="space-y-1 text-sm font-lato">
              <p><strong>Name:</strong> {user?.name}</p>
              <p><strong>Experience:</strong> {user?.experience_years} years</p>
              {user?.company_name && <p><strong>Company:</strong> {user.company_name}</p>}
              <p><strong>Location:</strong> {user?.location}</p>
              {user?.average_rating > 0 && (
                <p><strong>Rating:</strong> {user.average_rating}★ ({user.total_reviews} reviews)</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="font-lato"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-white font-lato px-8 disabled:opacity-50"
              style={{backgroundColor: '#34D164'}}
            >
              {isSubmitting ? 'Submitting Quote...' : 'Submit Quote'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuoteForm;
