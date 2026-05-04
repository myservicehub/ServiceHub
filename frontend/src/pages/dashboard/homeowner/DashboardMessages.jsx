import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { messagesAPI } from '../../../api/messages';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  Phone,
  ArrowLeft,
  MapPin,
  Briefcase,
  HelpCircle,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import HiringStatusModal from '../../../components/HiringStatusModal';

const DashboardMessages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [handledIncomingChat, setHandledIncomingChat] = useState(false);
  const [showHiringStatusModal, setShowHiringStatusModal] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const openChat = location.state?.openChat;
    if (!openChat || handledIncomingChat || !user?.id) return;

    const bootstrapIncomingChat = async () => {
      try {
        const response = await messagesAPI.getOrCreateConversationForJob(openChat.jobId, openChat.tradespersonId);
        const conversationId = response?.conversation_id;
        if (!conversationId) return;

        const matchedConversation = conversations.find((conv) => conv.id === conversationId) || {
          id: conversationId,
          job_id: openChat.jobId,
          tradesperson_id: openChat.tradespersonId,
          tradesperson_name: openChat.tradespersonName,
          job_title: openChat.jobTitle,
          job_location: openChat.jobLocation,
          job_status: openChat.jobStatus,
        };

        setSelectedConversation(matchedConversation);
        await loadMessages(conversationId);

        setHandledIncomingChat(true);
        navigate(location.pathname, { replace: true, state: null });
      } catch (error) {
        console.error('Failed to open incoming chat from interested tradespeople:', error);
      }
    };

    bootstrapIncomingChat();
  }, [location.state, handledIncomingChat, user?.id, conversations, navigate, location.pathname]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
      if (isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages, selectedConversation?.id]);

  // Live updates: conversations/unread and active chat messages without page refresh
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      // Only refresh if the tab is visible to optimize server load
      if (document.visibilityState === 'visible') {
        loadConversations(true);
        if (selectedConversation?.id) {
          loadMessages(selectedConversation.id);
        }
      }
    }, 3000); // More aggressive refresh interval (3 seconds)
    return () => window.clearInterval(intervalId);
  }, [selectedConversation?.id]);

  const parseServerDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string' && !/[zZ]|[+\-]\d{2}:\d{2}$/.test(value)) {
      return new Date(`${value}Z`);
    }
    return new Date(value);
  };

  const formatConversationTime = (value) => {
    if (!value) return '';
    const date = parseServerDate(value);
    if (!date || Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString();
  };

  const loadConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await messagesAPI.getConversations();
      setConversations(response?.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await messagesAPI.getConversationMessages(conversationId);
      setMessages(response?.messages || []);
      await messagesAPI.markConversationAsRead(conversationId);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unread_count_homeowner: 0 } : conv
        )
      );
      await loadConversations(true);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversation.id ? { ...conv, unread_count_homeowner: 0 } : conv
      )
    );
    await loadMessages(conversation.id);
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
    <div className="h-[calc(100vh-120px)] flex flex-col">
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
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex min-h-0">
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
                    formatConversationTime={formatConversationTime}
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
              {/* Conversation Header */}
              <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="w-10 h-10 rounded-full bg-[#34D164]/10 flex items-center justify-center text-[#34D164] font-bold text-lg flex-shrink-0">
                  {selectedConversation.tradesperson_name?.charAt(0)?.toUpperCase() || 'T'}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                    MYSERVICEHUB.CO
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                    <h4 className="text-xs font-semibold text-gray-700 truncate">
                      {selectedConversation.job_title || 'Untitled Job'}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-sm">
                      {selectedConversation.tradesperson_name || 'Tradesperson'}
                    </h3>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34D164]" title="Online" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedConversation.job_location && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <MapPin className="w-3 h-3 text-[#34D164]" />
                        <span>{selectedConversation.job_location}</span>
                      </div>
                    )}
                    <Badge variant="outline" className="rounded-full text-[9px] font-bold py-0 h-4 border-gray-200 uppercase tracking-tighter">
                      Job Owner
                    </Badge>
                  </div>
                </div>
                
                <button className="w-10 h-10 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Job Status Banner */}
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900">Job Status Update</h4>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Help us track your job progress and get review reminders.
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-[#34D164] hover:bg-[#2EB859] text-white text-xs h-8 rounded-lg px-3 flex-shrink-0"
                    onClick={() => navigate('/dashboard/jobs')}
                  >
                    Update Status
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length > 0 ? (
                  messages.map((message, index) => (
                    <MessageBubble
                      key={message.id || index}
                      message={message}
                      isOwn={message.sender_id === user?.id}
                    />
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 h-full">
                    <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                    <p>No messages yet. Say hi!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
                {selectedConversation?.job_status === 'completed' ? (
                  <div className="p-4 bg-gray-50 text-center text-gray-500 rounded-lg flex items-center justify-center gap-2">
                    <CheckCheck className="w-4 h-4 text-green-500" />
                    <span>This job is completed. Chat is disabled.</span>
                  </div>
                ) : (
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
                )}
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
      <HiringStatusModal
        isOpen={showHiringStatusModal}
        onClose={() => setShowHiringStatusModal(false)}
        jobId={selectedConversation?.job_id}
        jobTitle={selectedConversation?.job_title}
        tradespersonName={selectedConversation?.tradesperson_name}
        tradespersonId={selectedConversation?.tradesperson_id}
        onStatusUpdate={messagesAPI.updateHiringStatus}
        onFeedbackSubmit={messagesAPI.submitHiringFeedback}
      />
    </div>
  );
};

const ConversationItem = ({ conversation, formatConversationTime, isSelected, onClick }) => {
  const unreadCount = conversation.unread_count_homeowner || 0;
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
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className={cn(
            "font-semibold truncate",
            unreadCount > 0 ? "text-gray-900" : "text-gray-700"
          )}>
            {conversation.tradesperson_name || 'Tradesperson'}
          </h4>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {formatConversationTime(conversation.last_message_at || conversation.updated_at)}
          </span>
        </div>
        <p className="text-sm text-gray-500 truncate mt-0.5">
          {conversation.job_title || 'Job conversation'}
        </p>
        {conversation.last_message && (
          <p className={cn(
            "text-sm truncate mt-1",
            unreadCount > 0 ? "text-gray-700 font-medium" : "text-gray-500"
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
        "max-w-[75%] p-4 rounded-2xl shadow-sm",
        isOwn
          ? "bg-[#34D164] text-white rounded-tr-sm"
          : "bg-white text-gray-800 rounded-tl-sm"
      )}>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <div className={cn(
          "flex items-center justify-end gap-1 mt-2",
          isOwn ? "text-white/70" : "text-gray-400"
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
