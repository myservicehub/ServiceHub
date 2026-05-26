import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { 
  X, CheckCircle, Clock, AlertCircle, MessageSquare, 
  ThumbsUp, ThumbsDown, Send, User
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const HiringStatusModal = ({ 
  isOpen, 
  onClose, 
  jobId, 
  jobTitle, 
  tradespersonName,
  tradespersonId,
  onStatusUpdate,
  onFeedbackSubmit,
  onComplete,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState('hiring'); // 'hiring', 'job-status', 'feedback', 'completed'
  const [hiringStatus, setHiringStatus] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleHiringStatusSelect = (status) => {
    setHiringStatus(status);
    if (status === 'yes') {
      setStep('job-status');
    } else {
      setStep('feedback');
    }
  };

  const handleJobStatusSelect = async (status) => {
    setJobStatus(status);
    setSubmitting(true);
    
    try {
      // Send the status update to backend
      await onStatusUpdate({
        jobId,
        tradespersonId,
        hired: true,
        jobStatus: status
      });

      toast({
        title: "Status Updated",
        description: `Job status updated to "${status}". ${status === 'completed' ? 'You will receive a review reminder soon.' : 'We will send you updates about the review process.'}`,
      });

      setStep('completed');
      onComplete?.({ jobStatus: status, hired: true });

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('Error updating job status:', error);
      toast({
        title: "Error",
        description: "Failed to update job status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackType) {
      toast({
        title: "Please select a reason",
        description: "Please tell us why you didn't hire this tradesperson.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      await onFeedbackSubmit({
        jobId,
        tradespersonId,
        hired: false,
        feedbackType,
        comment: feedbackComment
      });

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback. This helps us improve our platform.",
      });

      setStep('completed');
      onComplete?.({ jobStatus: null, hired: false });

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setStep('hiring');
    setHiringStatus('');
    setJobStatus('');
    setFeedbackType('');
    setFeedbackComment('');
    setSubmitting(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85dvh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-100 bg-white">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h3 className="text-xl font-bold font-montserrat text-[#121E3C]">Job Status Update</h3>
              <p className="text-sm text-gray-500 mt-1 font-lato truncate">{jobTitle} • {tradespersonName}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {/* Step 1: Hiring Status */}
          {step === 'hiring' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-[#121E3C] mb-2 font-montserrat">
                  Did you hire {tradespersonName}?
                </h3>
                <p className="text-sm text-gray-600 font-lato">
                  This helps us track job progress and improve our service.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleHiringStatusSelect('yes')}
                  className="h-16 rounded-xl flex flex-col items-center justify-center space-y-1 bg-[#34D164] hover:bg-[#2ab854] text-white"
                >
                  <ThumbsUp className="w-6 h-6" />
                  <span className="text-sm font-medium">Yes, I hired them</span>
                </Button>
                
                <Button
                  onClick={() => handleHiringStatusSelect('no')}
                  variant="outline"
                  className="h-16 rounded-xl flex flex-col items-center justify-center space-y-1 border-gray-200 hover:bg-gray-50 text-[#121E3C]"
                >
                  <ThumbsDown className="w-6 h-6" />
                  <span className="text-sm font-medium">No, I didn't hire them</span>
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Job Status */}
          {step === 'job-status' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-[#121E3C] mb-2 font-montserrat">
                  What's the current job status?
                </h3>
                <p className="text-sm text-gray-600 font-lato">
                  We'll send you review reminders when the job is completed.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => handleJobStatusSelect('not_started')}
                  variant="outline"
                  className="w-full h-14 rounded-xl flex items-center justify-start space-x-3 text-left border-gray-200 hover:bg-gray-50"
                  disabled={submitting}
                >
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="font-medium text-[#121E3C]">Not Started Yet</div>
                    <div className="text-xs text-gray-500">Work hasn't begun</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleJobStatusSelect('in_progress')}
                  variant="outline"
                  className="w-full h-14 rounded-xl flex items-center justify-start space-x-3 text-left border-gray-200 hover:bg-gray-50"
                  disabled={submitting}
                >
                  <Clock className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-[#121E3C]">In Progress</div>
                    <div className="text-xs text-gray-500">Work is ongoing</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleJobStatusSelect('completed')}
                  variant="outline"
                  className="w-full h-14 rounded-xl flex items-center justify-start space-x-3 text-left border-gray-200 hover:bg-gray-50"
                  disabled={submitting}
                >
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-[#121E3C]">Completed</div>
                    <div className="text-xs text-gray-500">Work is finished</div>
                  </div>
                </Button>
              </div>

            </div>
          )}

          {/* Step 3: Feedback Form */}
          {step === 'feedback' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-[#121E3C] mb-2 font-montserrat">
                  Help us improve
                </h3>
                <p className="text-sm text-gray-600 font-lato">
                  Why didn't you hire {tradespersonName}? Your feedback helps us improve our platform.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { value: 'too_expensive', label: 'Too expensive' },
                  { value: 'not_available', label: 'Not available when needed' },
                  { value: 'poor_communication', label: 'Poor communication' },
                  { value: 'lack_experience', label: 'Lack of experience' },
                  { value: 'found_someone_else', label: 'Found someone else' },
                  { value: 'changed_mind', label: 'Changed my mind about the job' },
                  { value: 'other', label: 'Other reason' },
                ].map((option) => {
                  const selected = feedbackType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFeedbackType(option.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        selected
                          ? 'border-[#34D164] bg-[#34D164]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selected ? 'border-[#34D164]' : 'border-gray-300'
                      }`}>
                        {selected && <span className="w-2.5 h-2.5 rounded-full bg-[#34D164]" />}
                      </span>
                      <span className="text-sm text-[#121E3C] font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <p className="text-sm font-medium text-[#121E3C] mb-1">Additional comments (optional)</p>
                <Textarea
                  id="comment"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Any additional feedback..."
                  className="mt-1 rounded-xl border-gray-200"
                  rows="3"
                />
              </div>
            </div>
          )}

          {/* Step 4: Completion */}
          {step === 'completed' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-[#121E3C] mb-2 font-montserrat">
                Thank you!
              </h3>
              <p className="text-sm text-gray-600 mb-4 font-lato">
                {hiringStatus === 'yes' 
                  ? "We've updated your job status. You'll receive review reminders when appropriate."
                  : "Your feedback has been submitted and will help us improve our platform."
                }
              </p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-green-700 bg-green-100 border border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete
              </span>
            </div>
          )}

        </div>

        {step === 'feedback' && (
          <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-100 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6">
            <div className="flex gap-3">
              <Button
                onClick={() => setStep('hiring')}
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                disabled={submitting}
              >
                ← Back
              </Button>
              <Button
                onClick={handleFeedbackSubmit}
                className="flex-1 h-12 rounded-xl bg-[#34D164] hover:bg-[#2ab854] text-white"
                disabled={submitting || !feedbackType}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  , document.body);
};

export default HiringStatusModal;
