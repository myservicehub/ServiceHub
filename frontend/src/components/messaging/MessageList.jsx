import React, { useEffect, useRef } from 'react';
import { Badge } from '../ui/badge';
import { 
  Check, 
  CheckCheck, 
  Clock,
  User,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const MessageBubble = ({ message, isOwn, showAvatar, onImageClick }) => {
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <Clock size={12} className="text-gray-400" />;
      case 'delivered':
        return <Check size={12} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={12} className="text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex items-end space-x-2 ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      {/* Avatar for other user's messages */}
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User size={16} className="text-gray-500" />
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwn
            ? 'text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
        style={isOwn ? { backgroundColor: '#2F8140' } : {}}
      >
        {/* Image Message */}
        {message.message_type === 'image' && message.image_url && (
          <div className="mb-2">
            <img
              src={message.image_url}
              alt="Shared image"
              className="max-w-full h-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onImageClick && onImageClick(message.image_url)}
              style={{ maxHeight: '200px' }}
            />
            {!message.content && (
              <div className="flex items-center mt-1 text-xs opacity-75">
                <ImageIcon size={12} className="mr-1" />
                Image
              </div>
            )}
          </div>
        )}

        {/* Text Content */}
        {message.content && (
          <div className="whitespace-pre-wrap break-words font-lato">
            {message.content}
          </div>
        )}

        {/* Message Footer */}
        <div className={`flex items-center justify-between mt-1 text-xs ${
          isOwn ? 'text-white text-opacity-75' : 'text-gray-500'
        }`}>
          <span>{formatTime(message.created_at)}</span>
          {isOwn && (
            <div className="ml-2">
              {getStatusIcon(message.status)}
            </div>
          )}
        </div>
      </div>

      {/* Spacer for own messages */}
      {isOwn && !showAvatar && <div className="w-8" />}
    </div>
  );
};

const DateSeparator = ({ date }) => {
  const formatDate = (dateString) => {
    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-100 px-3 py-1 rounded-full">
        <span className="text-xs text-gray-600 font-lato font-medium">
          {formatDate(date)}
        </span>
      </div>
    </div>
  );
};

const MessageList = ({ 
  messages = [], 
  loading = false, 
  onImageClick,
  className = "" 
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Group messages by date and consecutive sender
  const groupedMessages = React.useMemo(() => {
    if (!messages.length) return [];

    const groups = [];
    let currentGroup = null;
    let lastDate = null;

    messages.forEach((message, index) => {
      const messageDate = new Date(message.created_at).toDateString();
      const isOwn = message.sender_id === user?.id;
      const prevMessage = messages[index - 1];
      const nextMessage = messages[index + 1];

      // Check if we need a date separator
      if (messageDate !== lastDate) {
        groups.push({ type: 'date', date: message.created_at });
        lastDate = messageDate;
        currentGroup = null;
      }

      // Check if we should start a new group
      const shouldStartNewGroup = !currentGroup || 
                                  currentGroup.isOwn !== isOwn ||
                                  (prevMessage && 
                                   new Date(message.created_at) - new Date(prevMessage.created_at) > 5 * 60 * 1000); // 5 minutes

      if (shouldStartNewGroup) {
        currentGroup = {
          type: 'messages',
          isOwn,
          messages: [message],
          showAvatar: !isOwn && (!nextMessage || nextMessage.sender_id !== message.sender_id)
        };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(message);
        // Update avatar visibility for the group
        currentGroup.showAvatar = !isOwn && (!nextMessage || nextMessage.sender_id !== message.sender_id);
      }
    });

    return groups;
  }, [messages, user?.id]);

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{borderColor: '#2F8140'}}></div>
          <p className="text-gray-600 font-lato">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <ImageIcon size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold font-montserrat text-gray-900 mb-2">
            No messages yet
          </h3>
          <p className="text-gray-600 font-lato">
            Start the conversation by sending a message.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto px-4 py-4 ${className}`}>
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex}>
          {group.type === 'date' ? (
            <DateSeparator date={group.date} />
          ) : (
            <div>
              {group.messages.map((message, messageIndex) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={group.isOwn}
                  showAvatar={group.showAvatar && messageIndex === group.messages.length - 1}
                  onImageClick={onImageClick}
                />
              ))}
            </div>
          )}
        </div>
      ))}
      
      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;