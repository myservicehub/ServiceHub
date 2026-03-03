import React, { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ 
  rating = 0, 
  onRatingChange, 
  size = 'md', 
  interactive = false, 
  showValue = true,
  className = '',
  color = 'yellow'
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4', 
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const colors = {
    yellow: {
      filled: 'text-yellow-400 fill-yellow-400',
      empty: 'text-gray-300',
      hover: 'text-yellow-500 fill-yellow-500'
    },
    green: {
      filled: 'text-green-500 fill-green-500',
      empty: 'text-gray-300',
      hover: 'text-green-600 fill-green-600'
    },
    blue: {
      filled: 'text-blue-500 fill-blue-500',
      empty: 'text-gray-300',
      hover: 'text-blue-600 fill-blue-600'
    }
  };

  const colorClasses = colors[color] || colors.yellow;
  const sizeClass = sizes[size] || sizes.md;

  const handleMouseEnter = (starValue) => {
    if (!interactive) return;
    setHoverRating(starValue);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setHoverRating(0);
    setIsHovering(false);
  };

  const handleClick = (starValue) => {
    if (!interactive || !onRatingChange) return;
    onRatingChange(starValue);
  };

  const getStarClass = (starIndex) => {
    const starValue = starIndex + 1;
    const currentRating = isHovering ? hoverRating : rating;
    
    if (starValue <= currentRating) {
      return isHovering && interactive ? colorClasses.hover : colorClasses.filled;
    }
    return colorClasses.empty;
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            className={`${sizeClass} ${getStarClass(index)} ${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''
            }`}
            onMouseEnter={() => handleMouseEnter(index + 1)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(index + 1)}
          />
        ))}
      </div>
      
      {showValue && (
        <span className={`ml-2 font-medium ${
          size === 'xs' ? 'text-xs' :
          size === 'sm' ? 'text-sm' :
          size === 'lg' ? 'text-lg' :
          size === 'xl' ? 'text-xl' :
          'text-base'
        }`}>
          {rating > 0 ? rating.toFixed(1) : 'No rating'}
        </span>
      )}
    </div>
  );
};

// Category Rating Component for detailed reviews
export const CategoryRating = ({ categories, onCategoryRatingChange, interactive = false }) => {
  const categoryData = {
    quality: { label: 'Quality of Work', icon: '🔧' },
    timeliness: { label: 'Timeliness', icon: '⏰' },
    communication: { label: 'Communication', icon: '💬' },
    professionalism: { label: 'Professionalism', icon: '👔' },
    value_for_money: { label: 'Value for Money', icon: '💰' }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold font-montserrat text-gray-900">Rate by Category:</h4>
      {Object.entries(categoryData).map(([key, data]) => (
        <div key={key} className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <span className="text-lg">{data.icon}</span>
            <span className="font-lato text-gray-700">{data.label}</span>
          </div>
          <StarRating
            rating={categories[key] || 0}
            onRatingChange={interactive ? (rating) => onCategoryRatingChange(key, rating) : undefined}
            interactive={interactive}
            size="sm"
            showValue={false}
          />
        </div>
      ))}
    </div>
  );
};

// Rating Summary Component
export const RatingSummary = ({ 
  averageRating, 
  totalReviews, 
  ratingDistribution = {},
  className = '' 
}) => {
  const maxCount = Math.max(...Object.values(ratingDistribution));

  return (
    <div className={`bg-white p-6 rounded-lg border ${className}`}>
      <div className="flex items-center space-x-4 mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold font-montserrat" style={{color: '#34D164'}}>
            {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
          </div>
          <StarRating rating={averageRating} size="sm" showValue={false} />
          <div className="text-sm text-gray-600 font-lato mt-1">
            {totalReviews} review{totalReviews !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="flex-1">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingDistribution[stars] || 0;
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            
            return (
              <div key={stars} className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-lato w-6">{stars}</span>
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: '#34D164'
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600 font-lato w-8">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StarRating;
