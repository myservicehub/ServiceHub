import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import StarRating, { CategoryRating } from './StarRating';
import { Camera, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { ReviewUtils } from '../../api/reviews';

const ReviewForm = ({ 
  jobId, 
  revieweeId, 
  revieweeName, 
  jobTitle, 
  onSubmit, 
  onCancel, 
  loading = false,
  initialData = null 
}) => {
  const [formData, setFormData] = useState({
    rating: initialData?.rating || 0,
    title: initialData?.title || '',
    content: initialData?.content || '',
    categoryRatings: initialData?.category_ratings || {},
    photos: initialData?.photos || [],
    wouldRecommend: initialData?.would_recommend ?? true
  });
  
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleCategoryRatingChange = (category, rating) => {
    setFormData(prev => ({
      ...prev,
      categoryRatings: {
        ...prev.categoryRatings,
        [category]: rating
      }
    }));
  };

  const handlePhotoUpload = (files) => {
    const newPhotos = Array.from(files).slice(0, 5 - formData.photos.length);
    
    newPhotos.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: `${file.name} is larger than 5MB. Please choose a smaller file.`,
          variant: "destructive"
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, e.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handlePhotoUpload(files);
  };

  const validateForm = () => {
    const validation = ReviewUtils.validateReviewData(formData);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Please fix the errors",
        description: "Check the form for validation errors and try again.",
        variant: "destructive"
      });
      return;
    }

    const reviewData = {
      job_id: jobId,
      reviewee_id: revieweeId,
      rating: formData.rating,
      title: formData.title,
      content: formData.content,
      category_ratings: formData.categoryRatings,
      photos: formData.photos,
      would_recommend: formData.wouldRecommend
    };

    try {
      await onSubmit(reviewData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const characterCount = formData.content.length;
  const titleCharacterCount = formData.title.length;

  return (
    <Card className="w-full max-w-4xl mx-auto rounded-2xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
          {initialData ? 'Edit Review' : 'Write a Review'}
        </CardTitle>
        <div className="text-gray-600 font-lato">
          <p><strong>Job:</strong> {jobTitle}</p>
          <p><strong>Job ID:</strong> {jobId}</p>
          <p><strong>For:</strong> {revieweeName}</p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pb-[max(5rem,env(safe-area-inset-bottom))]">
        <form onSubmit={handleSubmit}>
          {/* Overall Rating */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 font-lato">
              Overall Rating *
            </label>
            <StarRating
              rating={formData.rating}
              onRatingChange={(rating) => handleInputChange('rating', rating)}
              interactive={true}
              size="lg"
              showValue={true}
            />
            {errors.rating && (
              <p className="text-sm text-red-600 font-lato">{errors.rating}</p>
            )}
          </div>

          {/* Category Ratings */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 font-lato">
              Detailed Ratings (Optional)
            </label>
            <CategoryRating
              categories={formData.categoryRatings}
              onCategoryRatingChange={handleCategoryRatingChange}
              interactive={true}
            />
          </div>

          {/* Review Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 font-lato">
              Review Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Summarize your experience in a few words"
              className={`w-full px-3 py-2 border rounded-md font-lato ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              maxLength={100}
            />
            <div className="flex justify-between items-center">
              {errors.title && (
                <p className="text-sm text-red-600 font-lato">{errors.title}</p>
              )}
              <p className="text-sm text-gray-500 font-lato ml-auto">
                {titleCharacterCount}/100
              </p>
            </div>
          </div>

          {/* Review Content */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 font-lato">
              Detailed Review *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Share details about your experience. What went well? What could be improved? This helps other homeowners make informed decisions."
              rows={6}
              className={`w-full px-3 py-2 border rounded-md font-lato ${
                errors.content ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical`}
              maxLength={1000}
            />
            <div className="flex justify-between items-center">
              {errors.content && (
                <p className="text-sm text-red-600 font-lato">{errors.content}</p>
              )}
              <p className="text-sm text-gray-500 font-lato ml-auto">
                {characterCount}/1000
              </p>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 font-lato">
              Photos (Optional)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                dragOver ? 'border-green-500 bg-green-50' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 font-lato mb-2">
                Drag photos here or click to upload
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e.target.files)}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white cursor-pointer"
                style={{backgroundColor: '#34D164'}}
              >
                Choose Photos
              </label>
              <p className="text-xs text-gray-500 font-lato mt-2">
                Up to 5 photos, max 5MB each
              </p>
            </div>

            {/* Photo Preview */}
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo}
                      alt={`Review photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handlePhotoRemove(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommendation */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 font-lato">
              Would you recommend this person?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleInputChange('wouldRecommend', true)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-lato transition-colors ${
                  formData.wouldRecommend
                    ? 'bg-green-100 text-green-800 border-2 border-green-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
                }`}
              >
                <ThumbsUp size={16} />
                <span>Yes, I recommend</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleInputChange('wouldRecommend', false)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-lato transition-colors ${
                  !formData.wouldRecommend
                    ? 'bg-red-100 text-red-800 border-2 border-red-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
                }`}
              >
                <ThumbsDown size={16} />
                <span>No, I don't recommend</span>
              </button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t sticky bottom-0 bg-white/95 supports-[backdrop-filter]:bg-white/85 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="submit"
              disabled={loading}
              className="text-white font-lato px-8 w-full sm:w-auto"
              style={{backgroundColor: '#34D164'}}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {initialData ? 'Updating...' : 'Submitting...'}
                </>
              ) : (
                <>
                  {initialData ? 'Update Review' : 'Submit Review'}
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="font-lato w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
