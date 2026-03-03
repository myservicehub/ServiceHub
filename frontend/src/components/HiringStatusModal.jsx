import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { 
  X, CheckCircle, Clock, AlertCircle, MessageSquare, 
  ThumbsUp, ThumbsDown, Star, Send, User
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
  onFeedbackSubmit
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-semibold font-montserrat">
                Job Status Update
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {jobTitle} • {tradespersonName}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>    
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Step 1: Hiring Status */}
          {step === 'hiring' && (
            <div className="space-y-4">
              <div className="text-center">
                <User className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Did you hire {tradespersonName}?
                </h3>
                <p className="text-sm text-gray-600">
                  This helps us track job progress and improve our service.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleHiringStatusSelect('yes')}
                  className="h-16 flex flex-col items-center justify-center space-y-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <ThumbsUp className="w-6 h-6" />
                  <span className="text-sm font-medium">Yes, I hired them</span>
                </Button>
                
                <Button
                  onClick={() => handleHiringStatusSelect('no')}
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center space-y-1 border-red-200 hover:bg-red-50 text-red-600"
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
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  What's the current job status?
                </h3>
                <p className="text-sm text-gray-600">
                  We'll send you review reminders when the job is completed.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => handleJobStatusSelect('not_started')}
                  variant="outline"
                  className="w-full h-14 flex items-center justify-start space-x-3 text-left"
                  disabled={submitting}
                >
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="font-medium">Not Started Yet</div>
                    <div className="text-xs text-gray-500">Work hasn't begun</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleJobStatusSelect('in_progress')}
                  variant="outline"
                  className="w-full h-14 flex items-center justify-start space-x-3 text-left"
                  disabled={submitting}
                >
                  <Clock className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium">In Progress</div>
                    <div className="text-xs text-gray-500">Work is ongoing</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleJobStatusSelect('completed')}
                  variant="outline"
                  className="w-full h-14 flex items-center justify-start space-x-3 text-left"
                  disabled={submitting}
                >
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium">Completed</div>
                    <div className="text-xs text-gray-500">Work is finished</div>
                  </div>
                </Button>
              </div>

              <Button
                onClick={() => setStep('hiring')}
                variant="ghost"
                className="w-full text-gray-600"
                disabled={submitting}
              >
                ← Back
              </Button>
            </div>
          )}

          {/* Step 3: Feedback Form */}
          {step === 'feedback' && (
            <div className="space-y-4">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Help us improve
                </h3>
                <p className="text-sm text-gray-600">
                  Why didn't you hire {tradespersonName}? Your feedback helps us improve our platform.
                </p>
              </div>

              <RadioGroup value={feedbackType} onValueChange={setFeedbackType}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="too_expensive" id="too_expensive" />
                    <Label htmlFor="too_expensive" className="text-sm">Too expensive</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not_available" id="not_available" />
                    <Label htmlFor="not_available" className="text-sm">Not available when needed</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="poor_communication" id="poor_communication" />
                    <Label htmlFor="poor_communication" className="text-sm">Poor communication</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lack_experience" id="lack_experience" />
                    <Label htmlFor="lack_experience" className="text-sm">Lack of experience</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="found_someone_else" id="found_someone_else" />
                    <Label htmlFor="found_someone_else" className="text-sm">Found someone else</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="changed_mind" id="changed_mind" />
                    <Label htmlFor="changed_mind" className="text-sm">Changed my mind about the job</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="text-sm">Other reason</Label>
                  </div>
                </div>
              </RadioGroup>

              <div>
                <Label htmlFor="comment" className="text-sm font-medium">
                  Additional comments (optional)
                </Label>
                <Textarea
                  id="comment"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Any additional feedback..."
                  className="mt-1"
                  rows="3"
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => setStep('hiring')}
                  variant="outline"
                  className="flex-1"
                  disabled={submitting}
                >
                  ← Back
                </Button>
                
                <Button
                  onClick={handleFeedbackSubmit}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
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

          {/* Step 4: Completion */}
          {step === 'completed' && (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Thank you!
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {hiringStatus === 'yes' 
                  ? "We've updated your job status. You'll receive review reminders when appropriate."
                  : "Your feedback has been submitted and will help us improve our platform."
                }
              </p>
              <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
};

export default HiringStatusModal;