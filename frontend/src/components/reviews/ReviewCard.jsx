import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import StarRating, { CategoryRating } from './StarRating';
import { 
  ThumbsUp, 
  MessageSquare, 
  MoreHorizontal, 
  Flag, 
  Edit, 
  Eye, 
  EyeOff,
  Camera,
  Heart,
  Reply
} from 'lucide-react';
import { ReviewUtils } from '../../api/reviews';
import { useAuth } from '../../contexts/AuthContext';

const ReviewCard = ({ 
  review, 
  onReply, 
  onEdit, 
  onMarkHelpful, 
  onFlag, 
  showActions = true,
  compact = false 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const { user } = useAuth();

  const isOwnReview = user?.id === review.reviewer_id;
  const isReviewee = user?.id === review.reviewee_id;
  const canEdit = isOwnReview && new Date(review.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const truncatedContent = ReviewUtils.truncateContent(review.content, compact ? 100 : 200);
  const shouldTruncate = review.content.length > (compact ? 100 : 200);

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !onReply) return;
    
    setSubmittingReply(true);
    try {
      await onReply(review.id, replyText);
      setShowReplyForm(false);
      setReplyText('');
    } catch (error) {
      console.error('Reply submission error:', error);
    } finally {
      setSubmittingReply(false);
    }
  };

  const getReviewTypeIcon = () => {
    if (review.review_type === 'homeowner_to_tradesperson') {
      return '🏠→🔧'; // Homeowner to Tradesperson
    }
    return '🔧→🏠'; // Tradesperson to Homeowner
  };

  return (
    <Card className="w-full hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="font-bold font-montserrat text-gray-600">
                    {review.reviewer_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold font-montserrat text-gray-900">
                    {review.reviewer_name}
                  </h4>
                  <p className="text-sm text-gray-500 font-lato">
                    {ReviewUtils.formatReviewDate(review.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <StarRating 
                  rating={review.rating} 
                  size="sm" 
                  showValue={true}
                />
                <span className="text-xs text-gray-500">
                  {getReviewTypeIcon()}
                </span>
              </div>
            </div>

            {/* Job Info */}
            {review.job_title && (
              <div className="flex items-center space-x-2 mb-3">
                <Badge variant="secondary" className="text-xs">
                  {review.job_title}
                </Badge>
                {review.job_category && (
                  <Badge variant="outline" className="text-xs">
                    {review.job_category}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Recommendation Badge */}
            {review.would_recommend ? (
              <Badge className="bg-green-100 text-green-800">
                <ThumbsUp size={12} className="mr-1" />
                Recommends
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">
                Not Recommended
              </Badge>
            )}

            {/* Actions Menu */}
            {showActions && (
              <div className="relative">
                <Button variant="ghost" size="sm">
                  <MoreHorizontal size={16} />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Review Title */}
        <h3 className="text-lg font-bold font-montserrat mb-3" style={{color: '#121E3C'}}>
          {review.title}
        </h3>

        {/* Review Content */}
        <div className="mb-4">
          <p className="text-gray-700 font-lato leading-relaxed">
            {expanded ? review.content : truncatedContent}
          </p>
          
          {shouldTruncate && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 hover:text-blue-800 text-sm font-lato mt-2 flex items-center"
            >
              {expanded ? (
                <>
                  <EyeOff size={14} className="mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <Eye size={14} className="mr-1" />
                  Read More
                </>
              )}
            </button>
          )}
        </div>

        {/* Category Ratings */}
        {review.category_ratings && Object.keys(review.category_ratings).length > 0 && (
          <div className="mb-4">
            <CategoryRating 
              categories={review.category_ratings}
              interactive={false}
            />
          </div>
        )}

        {/* Photos */}
        {review.photos && review.photos.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Camera size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700 font-lato">
                Photos ({review.photos.length})
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {review.photos.slice(0, 4).map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo}
                    alt={`Review photo ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {/* TODO: Open image modal */}}
                  />
                  {index === 3 && review.photos.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <span className="text-white font-semibold">
                        +{review.photos.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Response */}
        {review.response && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Reply size={16} className="text-gray-500" />
              <span className="font-semibold font-montserrat text-gray-900">
                Response from {review.reviewee_name}
              </span>
              <span className="text-sm text-gray-500 font-lato">
                {ReviewUtils.formatReviewDate(review.response_date)}
              </span>
            </div>
            <p className="text-gray-700 font-lato">
              {review.response}
            </p>
          </div>
        )}

        {/* Reply Form */}
        {showReplyForm && isReviewee && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h5 className="font-semibold font-montserrat mb-2">Write a Response</h5>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Thank the reviewer and address any concerns professionally..."
              className="w-full p-3 border border-gray-300 rounded-lg font-lato resize-none"
              rows={3}
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-500 font-lato">
                {replyText.length}/500
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReplyForm(false)}
                  disabled={submittingReply}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleReplySubmit}
                  disabled={!replyText.trim() || submittingReply}
                  className="text-white"
                  style={{backgroundColor: '#2F8140'}}
                >
                  {submittingReply ? 'Posting...' : 'Post Response'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-4">
            {/* Helpful Button */}
            <button
              onClick={() => onMarkHelpful && onMarkHelpful(review.id)}
              className="flex items-center space-x-1 text-gray-600 hover:text-green-600 transition-colors"
            >
              <ThumbsUp size={16} />
              <span className="text-sm font-lato">
                Helpful {review.helpful_count > 0 && `(${review.helpful_count})`}
              </span>
            </button>

            {/* Reply Button */}
            {isReviewee && !review.response && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <MessageSquare size={16} />
                <span className="text-sm font-lato">Reply</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Edit Button */}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit && onEdit(review)}
                className="text-gray-600 hover:text-blue-600"
              >
                <Edit size={14} className="mr-1" />
                Edit
              </Button>
            )}

            {/* Flag Button */}
            {!isOwnReview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFlag && onFlag(review.id)}
                className="text-gray-600 hover:text-red-600"
              >
                <Flag size={14} className="mr-1" />
                Report
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewCard;