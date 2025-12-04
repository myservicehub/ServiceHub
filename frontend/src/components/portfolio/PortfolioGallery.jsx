import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Calendar,
  MoreVertical,
  Image as ImageIcon
} from 'lucide-react';
import { portfolioAPI } from '../../api/services';
import { useToast } from '../../hooks/use-toast';

// Category mapping for display
const CATEGORY_LABELS = {
  'plumbing': 'Plumbing',
  'electrical': 'Electrical',
  'carpentry': 'Carpentry',
  'painting': 'Painting',
  'tiling': 'Tiling',
  'roofing': 'Roofing',
  'heating_gas': 'Heating & Gas',
  'kitchen_fitting': 'Kitchen Fitting',
  'bathroom_fitting': 'Bathroom Fitting',
  'garden_landscaping': 'Garden & Landscaping',
  'flooring': 'Flooring',
  'plastering': 'Plastering',
  'other': 'Other'
};

const PortfolioItem = ({ item, isOwner = false, onUpdate, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleToggleVisibility = async () => {
    try {
      setShowActions(false);
      setUpdating(true);
      const updatedItem = await portfolioAPI.updatePortfolioItem(item.id, {
        is_public: !item.is_public
      });
      
      toast({
        title: "Visibility updated",
        description: `Portfolio item is now ${updatedItem.is_public ? 'public' : 'private'}.`,
      });
      
      if (onUpdate) {
        onUpdate(updatedItem);
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update visibility. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this portfolio item? This action cannot be undone.')) {
      return;
    }

    try {
      setShowActions(false);
      setUpdating(true);
      await portfolioAPI.deletePortfolioItem(item.id);
      
      toast({
        title: "Item deleted",
        description: "Portfolio item has been removed.",
      });
      
      if (onDelete) {
        onDelete(item.id);
      }
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete portfolio item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
      <div className="relative">
        <img
          src={item.image_url}
          alt={item.title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMTAwTDEyNSA3NUwxNzUgNzVMMTUwIDEwMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
          }}
        />
        
        {/* Action Menu for Owner */}
        {isOwner && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActions(!showActions)}
                className="bg-white bg-opacity-90 hover:bg-opacity-100"
                disabled={updating}
              >
                <MoreVertical size={14} />
              </Button>
              
              {showActions && (
                <div className="absolute right-0 top-8 bg-white rounded-md shadow-lg border z-10 min-w-[120px]">
                  <div className="py-1">
                    <button
                      onClick={handleToggleVisibility}
                      disabled={updating}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center space-x-2"
                    >
                      {item.is_public ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{item.is_public ? 'Make Private' : 'Make Public'}</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={updating}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 text-red-600 flex items-center space-x-2"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Visibility Badge */}
        <div className="absolute top-2 left-2">
          <Badge className={item.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
            {item.is_public ? 'Public' : 'Private'}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold font-montserrat text-sm leading-tight" style={{color: '#121E3C'}}>
              {item.title}
            </h3>
          </div>
          
          {item.description && (
            <p className="text-sm text-gray-600 font-lato line-clamp-2">
              {item.description}
            </p>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <Badge variant="outline" className="text-xs">
              {CATEGORY_LABELS[item.category] || item.category}
            </Badge>
            
            <div className="flex items-center text-xs text-gray-500 font-lato">
              <Calendar size={12} className="mr-1" />
              {formatDate(item.created_at)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PortfolioGallery = ({ 
  items = [], 
  isOwner = false, 
  onUpdate, 
  onDelete,
  loading = false,
  emptyMessage = "No portfolio items yet.",
  emptyDescription = "Start showcasing your work by adding your first portfolio item."
}) => {
  // Close any open action menus when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      // This will be handled by each individual PortfolioItem component
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200"></div>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="flex justify-between pt-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon size={64} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold font-montserrat text-gray-900 mb-2">
          {emptyMessage}
        </h3>
        <p className="text-gray-600 font-lato">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <PortfolioItem
          key={item.id}
          item={item}
          isOwner={isOwner}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default PortfolioGallery;