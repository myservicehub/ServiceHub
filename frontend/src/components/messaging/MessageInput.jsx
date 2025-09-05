import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { 
  Send, 
  Image as ImageIcon, 
  X, 
  Loader2,
  Paperclip
} from 'lucide-react';
import { messagesAPI } from '../../api/services';
import { useToast } from '../../hooks/use-toast';

const MessageInput = ({ 
  jobId, 
  recipientId, 
  onMessageSent, 
  disabled = false,
  placeholder = "Type your message..." 
}) => {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sending, setSending] = useState(false);
  
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const validateImage = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

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
        description: "Please upload an image smaller than 10MB.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (validateImage(file)) {
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedImage) {
      toast({
        title: "Empty message",
        description: "Please enter a message or select an image.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);

      let sentMessage;
      if (selectedImage) {
        // Send image message
        sentMessage = await messagesAPI.sendImageMessage(
          jobId,
          recipientId,
          message.trim(),
          selectedImage
        );
      } else {
        // Send text message
        sentMessage = await messagesAPI.sendTextMessage(
          jobId,
          recipientId,
          message.trim()
        );
      }

      // Clear form
      setMessage('');
      removeImage();

      // Notify parent component
      if (onMessageSent) {
        onMessageSent(sentMessage);
      }

      toast({
        title: "Message sent",
        description: selectedImage ? "Image message sent successfully." : "Message sent successfully.",
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Failed to send message",
        description: error.response?.data?.detail || "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t bg-white p-4">
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-w-32 max-h-32 rounded-lg object-cover border"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={removeImage}
            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-white hover:bg-gray-50"
          >
            <X size={12} />
          </Button>
          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">
            {selectedImage?.name?.slice(0, 15)}...
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || sending}
            rows={1}
            className="min-h-[40px] max-h-32 resize-none font-lato"
            style={{ minHeight: '40px', maxHeight: '128px' }}
          />
        </div>

        {/* Image Upload Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          className="h-10 w-10 p-0"
          title="Add image"
        >
          <ImageIcon size={16} />
        </Button>

        {/* Send Button */}
        <Button
          onClick={handleSendMessage}
          disabled={disabled || sending || (!message.trim() && !selectedImage)}
          className="h-10 px-4 text-white font-lato"
          style={{backgroundColor: '#2F8140'}}
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </Button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleImageSelect}
          className="hidden"
        />
      </div>

      {/* Message Counter */}
      {message.length > 0 && (
        <div className="text-xs text-gray-500 mt-1 text-right">
          {message.length}/1000
        </div>
      )}
    </div>
  );
};

export default MessageInput;