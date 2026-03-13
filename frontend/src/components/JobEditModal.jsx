import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  X, Save, Loader2, MapPin, Clock, DollarSign, Tag,
  Home, Mail, Phone, Calendar
} from 'lucide-react';
import { jobsAPI, statsAPI } from '../api/services';
import { useStates } from '../hooks/useStates';
import { useToast } from '../hooks/use-toast';

const JobEditModal = ({ 
  isOpen, 
  onClose, 
  job,
  onJobUpdated
}) => {
  const { toast } = useToast();
  const { states, lgas, loadLGAs } = useStates();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    state: '',
    lga: '',
    town: '',
    zip_code: '',
    home_address: '',
    budget_min: '',
    budget_max: '',
    timeline: '',
    access_fee_naira: '',
    access_fee_coins: ''
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form data when job changes
  useEffect(() => {
    if (job && isOpen) {
      setFormData({
        title: job.title || '',
        description: job.description || '',
        category: job.category || '',
        state: job.state || '',
        lga: job.lga || '',
        town: job.town || '',
        zip_code: job.zip_code || '',
        home_address: job.home_address || '',
        budget_min: job.budget_min || '',
        budget_max: job.budget_max || '',
        timeline: job.timeline || '',
        access_fee_naira: job.access_fee_naira || '',
        access_fee_coins: job.access_fee_coins || ''
      });
      
      // Load LGAs if state is already selected
      if (job.state) {
        loadLGAs(job.state);
      }
    }
  }, [job, isOpen, loadLGAs]);

  // Load categories on mount
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const response = await statsAPI.getCategories();
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Handle state change to load LGAs
    if (field === 'state' && value) {
      setFormData(prev => ({ ...prev, lga: '', town: '' }));
      loadLGAs(value);
    }

    // Clear town when LGA changes (since town is now a text input, user can enter manually)
    if (field === 'lga' && value && formData.state) {
      setFormData(prev => ({ ...prev, town: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Prepare update data (only include changed fields)
      const updateData = {};
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] != job[key]) {
          updateData[key] = formData[key];
        }
      });
      
      // Convert string numbers to integers for budget and fees
      if (updateData.budget_min) updateData.budget_min = parseInt(updateData.budget_min);
      if (updateData.budget_max) updateData.budget_max = parseInt(updateData.budget_max);
      if (updateData.access_fee_naira) updateData.access_fee_naira = parseInt(updateData.access_fee_naira);
      if (updateData.access_fee_coins) updateData.access_fee_coins = parseInt(updateData.access_fee_coins);
      
      // Only submit if there are changes
      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No Changes",
          description: "No changes were made to the job.",
        });
        onClose();
        return;
      }
      
      const updatedJob = await jobsAPI.updateJob(job.id, updateData);
      
      toast({
        title: "Job Updated",
        description: "Your job has been updated successfully.",
      });
      
      onJobUpdated(updatedJob);
      onClose();
      
    } catch (error) {
      console.error('Failed to update job:', error);
      
      let errorMessage = "Failed to update job. Please try again.";
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-5 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold font-montserrat text-[#121E3C]">Edit Job</h2>
            <p className="text-gray-500 text-sm font-lato">Only budget can be modified</p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Edit Notice */}
          <div className="bg-[#121E3C]/5 border border-[#121E3C]/10 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#34D164]/10 rounded-lg flex-shrink-0">
                <DollarSign className="w-4 h-4 text-[#34D164]" />
              </div>
              <div>
                <p className="text-[#121E3C] font-medium text-sm font-montserrat">Budget Edit Only</p>
                <p className="text-gray-500 text-xs font-lato mt-0.5">You can only modify the minimum and maximum budget. All other job details are read-only.</p>
              </div>
            </div>
          </div>

          {/* Job Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#121E3C] flex items-center gap-2 font-montserrat">
              <div className="p-1.5 bg-[#121E3C]/10 rounded-lg">
                <Tag className="w-4 h-4 text-[#121E3C]" />
              </div>
              Job Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  placeholder="Enter job title"
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Input
                  type="text"
                  value={formData.category}
                  placeholder="Select category"
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeline
                </label>
                <Input
                  type="text"
                  value={formData.timeline}
                  placeholder="Select timeline"
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  placeholder="Describe your job requirements in detail..."
                  rows={4}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed resize-none"
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#121E3C] flex items-center gap-2 font-montserrat">
              <div className="p-1.5 bg-[#121E3C]/10 rounded-lg">
                <MapPin className="w-4 h-4 text-[#121E3C]" />
              </div>
              Location Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <Input
                  type="text"
                  value={formData.state}
                  placeholder="Select state"
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LGA
                </label>
                <Input
                  type="text"
                  value={formData.lga}
                  placeholder="Select LGA"
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Town
                </label>
                <Input
                  type="text"
                  value={formData.town}
                  placeholder="Enter town name"
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zip Code
                </label>
                <Input
                  type="text"
                  value={formData.zip_code}
                  placeholder="Enter zip code"
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home Address
                </label>
                <Input
                  type="text"
                  value={formData.home_address}
                  placeholder="Full home address"
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Budget Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#121E3C] flex items-center gap-2 font-montserrat">
              <div className="p-1.5 bg-[#34D164]/10 rounded-lg">
                <DollarSign className="w-4 h-4 text-[#34D164]" />
              </div>
              Budget (Editable)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Budget (₦) *
                </label>
                <Input
                  type="number"
                  value={formData.budget_min}
                  onChange={(e) => handleInputChange('budget_min', e.target.value)}
                  placeholder="e.g., 50000"
                  min="0"
                  className="border-[#34D164]/30 focus:border-[#34D164] focus:ring-[#34D164] rounded-xl"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Budget (₦) *
                </label>
                <Input
                  type="number"
                  value={formData.budget_max}
                  onChange={(e) => handleInputChange('budget_max', e.target.value)}
                  placeholder="e.g., 100000"
                  min="0"
                  className="border-[#34D164]/30 focus:border-[#34D164] focus:ring-[#34D164] rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl font-lato"
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#34D164] hover:bg-[#2FBD59] text-white rounded-xl font-lato shadow-md shadow-[#34D164]/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobEditModal;