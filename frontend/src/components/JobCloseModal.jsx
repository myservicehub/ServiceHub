import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  X, AlertTriangle, Loader2, MessageSquare
} from 'lucide-react';
import { jobsAPI } from '../api/services';
import { useToast } from '../hooks/use-toast';

const JobCloseModal = ({ 
  isOpen, 
  onClose, 
  job,
  onJobClosed
}) => {
  const { toast } = useToast();
  
  const [selectedReason, setSelectedReason] = useState('');
  const [additionalFeedback, setAdditionalFeedback] = useState('');
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  // Load close reasons on mount
  useEffect(() => {
    if (isOpen) {
      loadCloseReasons();
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedReason('');
      setAdditionalFeedback('');
    }
  }, [isOpen]);

  const loadCloseReasons = async () => {
    try {
      setLoading(true);
      const response = await jobsAPI.getCloseReasons();
      setReasons(response.reasons || []);
    } catch (error) {
      console.error('Failed to load close reasons:', error);
      toast({
        title: "Error",
        description: "Failed to load close reasons. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedReason) {
      toast({
        title: "Required Field",
        description: "Please select a reason for closing the job.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setClosing(true);
      
      const closeData = {
        reason: selectedReason,
        additional_feedback: additionalFeedback.trim() || null
      };
      
      await jobsAPI.closeJob(job.id, closeData);
      
      toast({
        title: "Job Closed",
        description: "Your job has been closed successfully. Thank you for your feedback.",
      });
      
      onJobClosed(job.id);
      onClose();
      
    } catch (error) {
      console.error('Failed to close job:', error);
      
      let errorMessage = "Failed to close job. Please try again.";
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      toast({
        title: "Close Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setClosing(false);
    }
  };

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="border-b p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <div>
              <h2 className="text-lg font-semibold font-montserrat">Close Job</h2>
              <p className="text-gray-600 text-sm">Help us understand why you're closing this job</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={closing}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Job Info */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <h3 className="font-medium text-gray-900 truncate">{job.title}</h3>
          <p className="text-sm text-gray-600">{job.category} • {job.location}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading reasons...</span>
            </div>
          ) : (
            <>
              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why are you closing this job? *
                </label>
                <Select 
                  value={selectedReason} 
                  onValueChange={setSelectedReason}
                  disabled={closing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Feedback */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Additional feedback (optional)
                </label>
                <Textarea
                  value={additionalFeedback}
                  onChange={(e) => setAdditionalFeedback(e.target.value)}
                  placeholder="Please share any additional details that might help us improve our service..."
                  rows={3}
                  maxLength={500}
                  disabled={closing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {additionalFeedback.length}/500 characters
                </p>
              </div>

              {/* Warning Message */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium">Please note:</p>
                    <p>Closing this job will make it no longer visible to tradespeople. You can reopen it later if needed.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={closing}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={closing || loading || !selectedReason}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {closing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Closing Job...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Close Job
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobCloseModal;