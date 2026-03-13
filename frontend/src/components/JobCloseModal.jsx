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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-amber-500 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold font-montserrat text-white">Close Job</h2>
                <p className="text-white/80 text-sm font-lato">Help us understand why</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              disabled={closing}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Job Info */}
        <div className="px-6 py-3 bg-[#121E3C]/5 border-b border-gray-100">
          <h3 className="font-medium text-[#121E3C] truncate text-sm font-montserrat">{job.title}</h3>
          <p className="text-xs text-gray-500 font-lato">{job.category} • {job.location}</p>
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
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-700 font-lato">
                    <p className="font-medium">Please note:</p>
                    <p>Closing this job will make it no longer visible to tradespeople. You can reopen it later if needed.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={closing}
              className="rounded-xl font-lato"
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={closing || loading || !selectedReason}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-lato"
            >
              {closing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
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