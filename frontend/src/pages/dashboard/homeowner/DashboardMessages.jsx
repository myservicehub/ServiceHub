import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { messagesAPI } from '../../../api/messages';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  User,
  Clock,
  CheckCheck,
  Image,
  File,
  Smile,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

const DashboardMessages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await messagesAPI.getConversations();
      setConversations(response?.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await messagesAPI.getConversationMessages(conversationId);
      setMessages(response?.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      await messagesAPI.sendMessage(selectedConversation.id, {
        conversation_id: selectedConversation.id,
        content: newMessage.trim(),
      });
      setNewMessage('');
      await loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.tradesperson_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500 mt-1">
            Chat with tradespeople about your jobs
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex">
        {/* Conversations List */}
        <div className={cn(
          "w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col",
          selectedConversation && "hidden md:flex"
        )}>
          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {filteredConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isSelected={selectedConversation?.id === conv.id}
                    onClick={() => handleSelectConversation(conv)}
                  />
                ))}
              </div>
            ) : (
              <EmptyConversations />
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col",
          !selectedConversation && "hidden md:flex"
        )}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors md:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
                  {selectedConversation.tradesperson_name?.charAt(0)?.toUpperCase() || 'T'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {selectedConversation.tradesperson_name || 'Tradesperson'}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {selectedConversation.job_title || 'Job conversation'}
                  </p>
                </div>
                <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length > 0 ? (
                  messages.map((message, index) => (
                    <MessageBubble
                      key={message.id || index}
                      message={message}
                      isOwn={message.sender_id === user?.id}
                    />
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-gray-500">
                    <div>
                      <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p>No messages yet</p>
                      <p className="text-sm mt-1">Send a message to start the conversation</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </div>
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="h-12 w-12 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-center text-gray-500">
              <div>
                <div className="w-20 h-20 mx-auto bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Messages</h3>
                <p className="text-gray-500 max-w-sm">
                  Select a conversation to view messages or start chatting with tradespeople
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ConversationItem = ({ conversation, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 text-left transition-all duration-200",
        isSelected
          ? "bg-green-50 border-l-2 border-green-500"
          : "hover:bg-gray-50 border-l-2 border-transparent"
      )}
    >
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
          {conversation.tradesperson_name?.charAt(0)?.toUpperCase() || 'T'}
        </div>
        {conversation.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {conversation.unread_count}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className={cn(
            "font-semibold truncate",
            conversation.unread_count > 0 ? "text-gray-900" : "text-gray-700"
          )}>
            {conversation.tradesperson_name || 'Tradesperson'}
          </h4>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {conversation.last_message_time || ''}
          </span>
        </div>
        <p className="text-sm text-gray-500 truncate mt-0.5">
          {conversation.job_title || 'Job conversation'}
        </p>
        {conversation.last_message && (
          <p className={cn(
            "text-sm truncate mt-1",
            conversation.unread_count > 0 ? "text-gray-700 font-medium" : "text-gray-500"
          )}>
            {conversation.last_message}
          </p>
        )}
      </div>
    </button>
  );
};

const MessageBubble = ({ message, isOwn }) => {
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[75%] px-4 py-2.5 rounded-2xl",
        isOwn
          ? "bg-green-600 text-white rounded-br-md"
          : "bg-gray-100 text-gray-900 rounded-bl-md"
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className={cn(
          "flex items-center justify-end gap-1 mt-1",
          isOwn ? "text-green-100" : "text-gray-400"
        )}>
          <span className="text-[10px]">
            {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
          {isOwn && message.read && (
            <CheckCheck className="w-3 h-3" />
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyConversations = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex items-center justify-center p-8 text-center">
      <div>
        <div className="w-16 h-16 mx-auto bg-green-50 rounded-2xl flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">No conversations yet</h3>
        <p className="text-sm text-gray-500 mb-4 max-w-xs">
          Post a job and start chatting with interested tradespeople
        </p>
        <Button
          onClick={() => navigate('/dashboard/post-job')}
          variant="outline"
          className="border-green-200 text-green-600 hover:bg-green-50"
        >
          Post a Job
        </Button>
      </div>
    </div>
  );
};

export default DashboardMessages;
