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
  const { states, lgas, towns, loadLGAs, loadTowns } = useStates();
  
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
      
      // Load LGAs and towns if state is already selected
      if (job.state) {
        loadLGAs(job.state);
        if (job.lga) {
          loadTowns(job.state, job.lga);
        }
      }
    }
  }, [job, isOpen, loadLGAs, loadTowns]);

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

    // Handle LGA change to load towns
    if (field === 'lga' && value && formData.state) {
      setFormData(prev => ({ ...prev, town: '' }));
      loadTowns(formData.state, value);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b p-6 flex justify-between items-center sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-semibold font-montserrat">Edit Job</h2>
            <p className="text-gray-600 text-sm">Update your job details</p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Job Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Job Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter job title"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories || []).map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeline *
                </label>
                <Select 
                  value={formData.timeline} 
                  onValueChange={(value) => handleInputChange('timeline', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASAP">ASAP</SelectItem>
                    <SelectItem value="Within 1 week">Within 1 week</SelectItem>
                    <SelectItem value="Within 2 weeks">Within 2 weeks</SelectItem>
                    <SelectItem value="Within 1 month">Within 1 month</SelectItem>
                    <SelectItem value="Flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your job requirements in detail..."
                  rows={4}
                  required
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <Select 
                  value={formData.state} 
                  onValueChange={(value) => handleInputChange('state', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {(states || []).map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LGA *
                </label>
                <Select 
                  value={formData.lga} 
                  onValueChange={(value) => handleInputChange('lga', value)}
                  disabled={!formData.state}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select LGA" />
                  </SelectTrigger>
                  <SelectContent>
                    {lgas.map((lga) => (
                      <SelectItem key={lga} value={lga}>
                        {lga}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Town *
                </label>
                <Select 
                  value={formData.town} 
                  onValueChange={(value) => handleInputChange('town', value)}
                  disabled={!formData.lga}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select town" />
                  </SelectTrigger>
                  <SelectContent>
                    {towns.map((town) => (
                      <SelectItem key={town} value={town}>
                        {town}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zip Code *
                </label>
                <Input
                  type="text"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  placeholder="6-digit zip code"
                  maxLength={6}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home Address *
                </label>
                <Input
                  type="text"
                  value={formData.home_address}
                  onChange={(e) => handleInputChange('home_address', e.target.value)}
                  placeholder="Full home address"
                  required
                />
              </div>
            </div>
          </div>

          {/* Budget Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Budget & Access Fee
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Budget (₦)
                </label>
                <Input
                  type="number"
                  value={formData.budget_min}
                  onChange={(e) => handleInputChange('budget_min', e.target.value)}
                  placeholder="e.g., 50000"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Budget (₦)
                </label>
                <Input
                  type="number"
                  value={formData.budget_max}
                  onChange={(e) => handleInputChange('budget_max', e.target.value)}
                  placeholder="e.g., 100000"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Fee (₦)
                </label>
                <Input
                  type="number"
                  value={formData.access_fee_naira}
                  onChange={(e) => handleInputChange('access_fee_naira', e.target.value)}
                  placeholder="e.g., 1000"
                  min="100"
                  max="10000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Fee (Coins)
                </label>
                <Input
                  type="number"
                  value={formData.access_fee_coins}
                  onChange={(e) => handleInputChange('access_fee_coins', e.target.value)}
                  placeholder="e.g., 10"
                  min="1"
                  max="100"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
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