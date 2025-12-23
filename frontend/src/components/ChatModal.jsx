import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { 
  X, Send, MessageCircle, User, Clock, CheckCircle2, 
  Phone, Mail, MapPin, Briefcase, Loader2, HelpCircle, Paperclip, Image as ImageIcon, FileText
} from 'lucide-react';
import { messagesAPI } from '../api/messages';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import HiringStatusModal from './HiringStatusModal';

const ChatModal = ({ 
  isOpen, 
  onClose, 
  jobId, 
  jobTitle, 
  otherParty, // { id, name, type: 'homeowner'|'tradesperson', email, phone, location }
  conversationId: initialConversationId = null,
  contactDetails = null, // Optional contact details to display
  showContactDetails = false // Flag to show contact details section
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0); // Force update counter
  
  // Hiring status modal state
  const [showHiringStatusModal, setShowHiringStatusModal] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [hasShownHiringModal, setHasShownHiringModal] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen && jobId && otherParty) {
      initializeConversation();
    }
  }, [isOpen, jobId, otherParty]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeConversation = async () => {
    let response = null;
    
    try {
      setLoading(true);
      
      console.log('=== CHAT MODAL DEBUG ===');
      console.log('Current user:', user);
      console.log('Current user role:', user?.role);
      console.log('Job ID:', jobId);
      console.log('Other party:', otherParty);
      
      // Get or create conversation
      if (!conversationId) {
        // CRITICAL FIX: Determine the correct tradesperson ID based on user role
        let tradespersonId;
        
        if (user?.role === 'tradesperson') {
          // Current user is tradesperson, so use current user's ID
          tradespersonId = user.id;
          console.log('✅ User is tradesperson, using user ID:', tradespersonId);
        } else if (user?.role === 'homeowner') {
          // Current user is homeowner, so otherParty should be the tradesperson
          tradespersonId = otherParty.id;
          console.log('✅ User is homeowner, using otherParty ID:', tradespersonId);
        } else {
          console.error('❌ Invalid user role:', user?.role);
          throw new Error('Invalid user role for chat');
        }
        
        console.log('🔧 Making API call: getOrCreateConversationForJob');
        console.log('   jobId:', jobId);
        console.log('   tradespersonId:', tradespersonId);
        
        response = await messagesAPI.getOrCreateConversationForJob(jobId, tradespersonId);
        console.log('✅ Conversation API response:', response);
        setConversationId(response.conversation_id);
      }
      
      // Load messages if we have a conversation ID
      const currentConvId = conversationId || response?.conversation_id;
      if (currentConvId) {
        console.log('✅ Loading messages for conversation:', currentConvId);
        await loadMessages(currentConvId);
      }
      
    } catch (error) {
      console.error('❌ CHAT MODAL ERROR:', error);
      console.error('Full error details:', error.response || error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        const detail = error.response.data?.detail || "Access required";
        console.error('❌ 403 ERROR DETAILS:', detail);
        
        toast({
          title: "Access Required",
          description: "You need to complete payment before starting a conversation. Please pay for access first.",
          variant: "destructive",
        });
      } else if (error.response?.status === 404) {
        console.error('❌ 404 ERROR: Job or user not found');
        toast({
          title: "Not Found",
          description: "Job or conversation not found. Please try again.",
          variant: "destructive",
        });
      } else {
        console.error('❌ UNKNOWN ERROR:', error.message);
        toast({
          title: "Error",
          description: "Failed to initialize conversation. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const loadMessages = async (convId) => {
    try {
      console.log('=== LOADING MESSAGES ===');
      console.log('Conversation ID:', convId);
      
      const response = await messagesAPI.getConversationMessages(convId);
      
      console.log('=== MESSAGES LOADED ===');
      console.log('Response:', response);
      console.log('Messages:', response.messages);
      console.log('Messages length:', response.messages?.length);
      
      if (response.messages) {
        setMessages(response.messages);
        setMessageCount(response.messages.length);
        console.log('✅ Messages set to state:', response.messages.length);
      } else {
        setMessages(response || []);
        setMessageCount((response || []).length);
        console.log('✅ Messages set to state (fallback):', (response || []).length);
      }
      
      // Mark messages as read
      await messagesAPI.markConversationAsRead(convId);
      
    } catch (error) {
      console.error('❌ FAILED TO LOAD MESSAGES:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !conversationId || sending) return;

    // Store the message content before clearing
    const messageContent = newMessage.trim();
    
    try {
      setSending(true);
      
      const messageData = {
        conversation_id: conversationId,
        message_type: 'text',
        content: messageContent
      };

      console.log('=== SENDING MESSAGE ===');
      console.log('Conversation ID:', conversationId);
      console.log('Message data:', messageData);
      console.log('Current messages count:', messages.length);

      // Clear input immediately for better UX
      setNewMessage('');

      const response = await messagesAPI.sendMessage(conversationId, messageData);
      
      console.log('=== MESSAGE SENT RESPONSE ===');
      console.log('Response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response));
      
      // Add message to local state immediately with better error handling
      if (response && response.id) {
        // Force React to re-render by using functional state update with dependency check
        setMessages(prevMessages => {
          // Check if message already exists to prevent duplicates
          const messageExists = prevMessages.some(msg => msg.id === response.id);
          if (messageExists) {
            console.log('⚠️ Message already exists, skipping duplicate');
            return prevMessages;
          }
          
          const newMessages = [...prevMessages, response];
          console.log('=== UPDATING MESSAGE STATE ===');
          console.log('Previous messages:', prevMessages.length);
          console.log('New messages:', newMessages.length);
          console.log('Added message:', response);
          
          // Update message count and check if we should show hiring modal
          setMessageCount(newMessages.length);
          
          // Show hiring status modal after 5 messages if homeowner and hasn't been shown yet
          if (user?.role === 'homeowner' && newMessages.length >= 5 && !hasShownHiringModal) {
            setTimeout(() => {
              setShowHiringStatusModal(true);
              setHasShownHiringModal(true);
            }, 2000); // Show after 2 seconds delay
          }
          
          // Force component re-render and scroll
          setForceUpdate(prev => prev + 1);
          setTimeout(() => {
            scrollToBottom();
          }, 100);
          
          return newMessages;
        });
        
        console.log('✅ Message added to state and input cleared');
        
        // Show success toast for user feedback
        toast({
          title: "Message Sent",
          description: "Your message has been sent successfully.",
          variant: "default",
        });
        
      } else {
        console.error('❌ Invalid message response format:', response);
        // Restore message content on error
        setNewMessage(messageContent);
        throw new Error('Invalid message response format');
      }
      
    } catch (error) {
      console.error('❌ FAILED TO SEND MESSAGE:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Restore message content on error
      setNewMessage(messageContent);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        toast({
          title: "Access Denied",
          description: "You need to complete payment before sending messages. Please pay for access first.",
          variant: "destructive",
        });
      } else if (error.response?.status === 404) {
        toast({
          title: "Conversation Not Found",
          description: "This conversation no longer exists. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to send message: ${error.message}. Please try again.`,
          variant: "destructive",
        });
      }
    } finally {
      setSending(false);
    }
  }, [newMessage, conversationId, sending, messages.length, toast, scrollToBottom, setForceUpdate]);

  const handleAttachmentClick = () => {
    if (sending) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (!conversationId) {
        await initializeConversation();
      }
      if (!conversationId) return;
      setSending(true);
      const uploadRes = await messagesAPI.uploadAttachment(file);
      const attachmentUrl = uploadRes?.url || messagesAPI.getAttachmentUrl(uploadRes?.filename);
      const messageType = (file.type || '').startsWith('image/') ? 'image' : 'file';
      const response = await messagesAPI.sendMessage(conversationId, {
        conversation_id: conversationId,
        message_type: messageType,
        content: file.name,
        attachment_url: attachmentUrl,
      });
      if (response && response.id) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === response.id);
          if (exists) return prev;
          const next = [...prev, response];
          setMessageCount(next.length);
          setForceUpdate(p => p + 1);
          setTimeout(() => { scrollToBottom(); }, 100);
          return next;
        });
        toast({ title: 'Attachment Sent', description: 'Your file has been sent.' });
      } else {
        throw new Error('Invalid message response');
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send attachment.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // Hiring status handlers
  const handleStatusUpdate = async (statusData) => {
    try {
      await messagesAPI.updateHiringStatus(statusData);
      toast({
        title: "Status Updated",
        description: "Your hiring status has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating hiring status:', error);
      throw error; // Re-throw so the modal can handle it
    }
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      await messagesAPI.submitHiringFeedback(feedbackData);
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback.",
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error; // Re-throw so the modal can handle it
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const hasTZ = typeof dateString === 'string' && /[zZ]|[+-]\d{2}:?\d{2}$/.test(dateString);
    const date = new Date(hasTZ ? dateString : `${dateString}Z`);
    const lagos = 'Africa/Lagos';
    const formatDay = new Intl.DateTimeFormat('en-US', { timeZone: lagos, year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayStr = formatDay.format(new Date());
    const dateStr = formatDay.format(date);
    const isToday = todayStr === dateStr;
    if (isToday) {
      return new Intl.DateTimeFormat('en-US', { timeZone: lagos, hour: '2-digit', minute: '2-digit' }).format(date);
    }
    return new Intl.DateTimeFormat('en-US', { timeZone: lagos, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const getMessageAlignment = (message) => {
    return message.sender_id === user?.id ? 'justify-end' : 'justify-start';
  };

  const getMessageStyle = (message) => {
    return message.sender_id === user?.id 
      ? 'bg-green-600 text-white' 
      : 'bg-gray-100 text-gray-900';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold font-montserrat">
                Chat with {otherParty?.name}
              </h2>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span className="font-medium">{jobTitle}</span>
              </div>
              
              {otherParty?.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{otherParty.location}</span>
                </div>
              )}
              
              {otherParty?.type && (
                <Badge variant="outline" className="text-xs">
                  {otherParty.type === 'homeowner' ? 'Job Owner' : 'Tradesperson'}
                </Badge>
              )}
            </div>

            {/* Contact Details Section - Only show to tradespeople */}
            {showContactDetails && contactDetails && user?.role === 'tradesperson' && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">Contact Details Available</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {contactDetails.homeowner_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-gray-600" />
                      <span className="font-medium">{contactDetails.homeowner_phone}</span>
                    </div>
                  )}
                  
                  {contactDetails.homeowner_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-gray-600" />
                      <span className="font-medium">{contactDetails.homeowner_email}</span>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-green-700 mt-1">
                  You can now contact the homeowner directly about this job!
                </p>
              </div>
            )}

            {/* Hiring Status Prompt - Only show to homeowners */}
            {user?.role === 'homeowner' && messageCount >= 3 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">Job Status Update</span>
                  </div>
                  <Button
                    onClick={() => setShowHiringStatusModal(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    Update Status
                  </Button>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Help us track your job progress and get review reminders.
                </p>
              </div>
            )}
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

        {/* Messages Area */}
        <div key={forceUpdate} className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && initialLoad ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={message.id || index} className={`flex ${getMessageAlignment(message)}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${getMessageStyle(message)}`}>
                  <div className="flex items-start gap-2">
                    {message.sender_id !== user?.id && (
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <p className="text-sm break-words">{message.content}</p>
                      {message.attachment_url && (
                        message.message_type === 'image' ? (
                          <img src={message.attachment_url} alt="attachment" className="mt-2 rounded max-h-40" />
                        ) : (
                          <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-flex items-center gap-1 text-xs ${message.sender_id === user?.id ? 'text-green-100 underline' : 'text-green-700 underline'}`}>
                            <FileText className="w-3 h-3" />
                            <span>Open attachment</span>
                          </a>
                        )
                      )}
                      
                      <div className={`flex items-center gap-1 mt-1 text-xs ${
                        message.sender_id === user?.id ? 'text-green-100' : 'text-gray-500'
                      }`}>
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(message.created_at)}</span>
                        
                        {message.sender_id === user?.id && message.status === 'read' && (
                          <CheckCircle2 className="w-3 h-3 ml-1" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-3 items-end">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              disabled={sending}
            />

            <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
            <Button
              type="button"
              variant="outline"
              onClick={handleAttachmentClick}
              disabled={sending}
              className="self-end"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="self-end bg-green-600 hover:bg-green-700 text-white"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Hiring Status Modal */}
      <HiringStatusModal
        isOpen={showHiringStatusModal}
        onClose={() => setShowHiringStatusModal(false)}
        jobId={jobId}
        jobTitle={jobTitle}
        tradespersonName={otherParty?.name}
        tradespersonId={otherParty?.id}
        onStatusUpdate={handleStatusUpdate}
        onFeedbackSubmit={handleFeedbackSubmit}
      />
    </div>
  );
};

export default ChatModal;