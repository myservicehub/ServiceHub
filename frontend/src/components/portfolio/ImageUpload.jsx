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
    <Card className="w-full border border-gray-100 shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <h3 className="text-lg font-semibold font-montserrat mb-5" style={{color: '#121E3C'}}>
          Add Portfolio Item
        </h3>

        <div className="space-y-5">
          {/* File Upload Area */}
          {!previewUrl ? (
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragActive 
                  ? 'border-[#34D164] bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
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
              
              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-white border border-gray-200 flex items-center justify-center">
                  <Upload size={24} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-700 font-lato">
                    <span className="font-semibold text-[#121E3C]">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-sm text-gray-500 font-lato mt-1">
                    JPG, PNG, WebP up to 5MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveFile}
                className="absolute top-3 right-3 bg-white hover:bg-gray-50 rounded-lg shadow-sm"
              >
                <X size={16} />
              </Button>
              <div className="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm font-lato">
                {selectedFile?.name}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium font-montserrat mb-2" style={{color: '#121E3C'}}>
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Modern Kitchen Installation - Lagos"
                className="font-lato rounded-lg border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium font-montserrat mb-2" style={{color: '#121E3C'}}>
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the project, techniques used, or any special features..."
                className="font-lato rounded-lg border-gray-200 focus:border-[#34D164] focus:ring-[#34D164] resize-none"
                rows={3}
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium font-montserrat mb-2" style={{color: '#121E3C'}}>
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg font-lato text-[#121E3C] bg-white focus:outline-none focus:ring-2 focus:ring-[#34D164] focus:border-transparent appearance-none cursor-pointer"
                style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25rem'}}
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
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-5 border-t border-gray-100">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={uploading}
                className="font-lato w-full sm:w-auto rounded-lg border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </Button>
            )}
            
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="text-white font-lato w-full sm:w-auto rounded-lg hover:opacity-90 transition-opacity"
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
