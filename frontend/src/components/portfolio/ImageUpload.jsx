import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { portfolioAPI } from '../../api/services';
import { useToast } from '../../hooks/use-toast';

// Valid backend enum values for portfolio categories
const VALID_BACKEND_CATEGORIES = [
  'plumbing', 'electrical', 'carpentry', 'painting', 'tiling', 'roofing',
  'heating_gas', 'kitchen_fitting', 'bathroom_fitting', 'garden_landscaping',
  'flooring', 'plastering', 'other'
];

// Mapping from common trade category names to valid backend enum values
const CATEGORY_MAPPING = {
  'plumbing': 'plumbing',
  'electrical': 'electrical',
  'electrician': 'electrical',
  'carpentry': 'carpentry',
  'carpenter': 'carpentry',
  'painting': 'painting',
  'painter': 'painting',
  'painting & decorating': 'painting',
  'tiling': 'tiling',
  'tiler': 'tiling',
  'roofing': 'roofing',
  'roofer': 'roofing',
  'heating & gas': 'heating_gas',
  'heating_gas': 'heating_gas',
  'gas': 'heating_gas',
  'hvac': 'heating_gas',
  'kitchen fitting': 'kitchen_fitting',
  'kitchen_fitting': 'kitchen_fitting',
  'kitchen & bathroom fitting': 'kitchen_fitting',
  'bathroom fitting': 'bathroom_fitting',
  'bathroom_fitting': 'bathroom_fitting',
  'garden & landscaping': 'garden_landscaping',
  'garden_landscaping': 'garden_landscaping',
  'landscaping': 'garden_landscaping',
  'gardening': 'garden_landscaping',
  'flooring': 'flooring',
  'plastering': 'plastering',
  'plasterer': 'plastering',
  'generator services': 'electrical',
  'ac & refrigeration': 'heating_gas',
  'cleaning services': 'other',
  'fumigation': 'other',
  'interior design': 'other',
  'other': 'other'
};

// Default fallback categories if user has none
const DEFAULT_CATEGORIES = [
  { value: 'other', label: 'Other' }
];

// Helper to convert trade category name to valid backend enum value
const categoryToValue = (category) => {
  const normalized = category.toLowerCase().trim();
  // Check direct mapping first
  if (CATEGORY_MAPPING[normalized]) {
    return CATEGORY_MAPPING[normalized];
  }
  // Try to find partial match
  for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  // Default to 'other' if no match found
  return 'other';
};

const ImageUpload = ({ onUploadSuccess, onCancel, userCategories = [] }) => {
  // Use user's registered trades or fallback to default
  const portfolioCategories = userCategories.length > 0 
    ? userCategories.map(cat => ({ value: categoryToValue(cat), label: cat }))
    : DEFAULT_CATEGORIES;
  
  // Set default category to the first user trade or 'other'
  const defaultCategory = portfolioCategories[0]?.value || 'other';
  
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: defaultCategory
  });
  
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const validateFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (file) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
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

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select an image to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your portfolio item.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      const uploadData = new FormData();
      uploadData.append('file', selectedFile);
      uploadData.append('title', formData.title);
      uploadData.append('description', formData.description);
      uploadData.append('category', formData.category);

      const result = await portfolioAPI.uploadImage(uploadData);

      toast({
        title: "Upload successful!",
        description: "Your portfolio item has been added.",
      });

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setFormData({ title: '', description: '', category: defaultCategory });
      
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error.response?.data?.detail || "There was an error uploading your image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold font-montserrat mb-4" style={{color: '#121E3C'}}>
          Add Portfolio Item
        </h3>

        {/* File Upload Area */}
        <div className="space-y-4">
          {!previewUrl ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-green-400 bg-green-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="space-y-2">
                <Upload size={48} className="mx-auto text-gray-400" />
                <div>
                  <p className="text-gray-600 font-lato">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-sm text-gray-500 font-lato">
                    JPG, PNG, WebP up to 5MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveFile}
                className="absolute top-2 right-2 bg-white hover:bg-gray-50"
              >
                <X size={16} />
              </Button>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {selectedFile?.name}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Modern Kitchen Installation - Lagos"
                className="font-lato"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the project, techniques used, or any special features..."
                className="font-lato"
                rows={3}
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-lato focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {portfolioCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={uploading}
                className="font-lato w-full sm:w-auto"
              >
                Cancel
              </Button>
            )}
            
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="text-white font-lato w-full sm:w-auto"
              style={{backgroundColor: '#34D164'}}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageUpload;
