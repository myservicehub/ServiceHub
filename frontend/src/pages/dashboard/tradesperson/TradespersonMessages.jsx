import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { messagesAPI } from '../../../api/messages';
import { interestsAPI } from '../../../api/services';
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  Paperclip,
  ChevronLeft,
  User,
  MapPin,
  Briefcase,
  Mail,
  CheckCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

const TradespersonMessages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedContactDetails, setSelectedContactDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [handledIncomingChat, setHandledIncomingChat] = useState(false);
  const [contactDetailsCache, setContactDetailsCache] = useState({});
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
        const response = await messagesAPI.getOrCreateConversationForJob(openChat.jobId, user.id);
        const conversationId = response?.conversation_id;
        if (!conversationId) return;

        const matchedConversation = conversations.find((conv) => conv.id === conversationId) || {
          id: conversationId,
          job_id: openChat.jobId,
          homeowner_id: openChat.homeownerId,
          homeowner_name: openChat.homeownerName,
          job_title: openChat.jobTitle,
          job_location: openChat.jobLocation,
        };

        setSelectedConversation(matchedConversation);
        await loadMessages(conversationId);

        if (openChat.contactDetails) {
          setSelectedContactDetails(openChat.contactDetails);
        } else if (openChat.jobId) {
          await loadContactDetails(openChat.jobId);
        }

        setHandledIncomingChat(true);
        navigate(location.pathname, { replace: true, state: null });
      } catch (error) {
        console.error('Failed to open incoming chat from interests:', error);
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
          conv.id === conversationId
            ? { ...conv, unread_count_tradesperson: 0 }
            : conv
        )
      );
      await loadConversations(true);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadContactDetails = async (jobId) => {
    if (!jobId) {
      setSelectedContactDetails(null);
      return;
    }

    if (contactDetailsCache[jobId]) {
      setSelectedContactDetails(contactDetailsCache[jobId]);
      return;
    }

    try {
      setDetailsLoading(true);
      const response = await interestsAPI.getContactDetails(jobId);
      const details = response || null;
      setSelectedContactDetails(details);
      setContactDetailsCache((prev) => ({ ...prev, [jobId]: details }));
    } catch (error) {
      // Keep UI clean if contact details are not yet available
      setSelectedContactDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversation.id ? { ...conv, unread_count_tradesperson: 0 } : conv
      )
    );
    await loadMessages(conversation.id);
    await loadContactDetails(conversation.job_id);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedConversation) return;
    try {
      setSending(true);
      await messagesAPI.sendMessage(selectedConversation.id, {
        conversation_id: selectedConversation.id,
        content: message.trim(),
      });
      setMessage('');
      await loadMessages(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.homeowner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPresenceInfo = (onlineFlag, lastLoginValue) => {
    if (typeof onlineFlag === 'boolean') {
      return { isOnline: onlineFlag, label: onlineFlag ? 'Online' : 'Offline' };
    }
    const lastLogin = parseServerDate(lastLoginValue);
    if (!lastLogin || Number.isNaN(lastLogin.getTime())) {
      return { isOnline: false, label: 'Offline' };
    }
    const isOnline = (Date.now() - lastLogin.getTime()) <= 5 * 60 * 1000;
    return { isOnline, label: isOnline ? 'Online' : 'Offline' };
  };

  const homeownerPresence = getPresenceInfo(
    selectedConversation?.homeowner_online,
    selectedConversation?.homeowner_last_login
  );

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

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
        <div className="flex h-full">
          <div className="w-80 border-r border-gray-100 p-4 space-y-3">
            <div className="h-10 bg-gray-200 rounded-xl" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="flex-1 p-4">
            <div className="h-full bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex h-full">
        {/* Conversations List */}
        <div className={cn(
          "w-full sm:w-80 border-r border-gray-100 flex flex-col",
          selectedConversation ? "hidden sm:flex" : "flex"
        )}>
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#121E3C] font-montserrat mb-3">
              Messages
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164] transition-all"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-50",
                    selectedConversation?.id === conv.id && "bg-[#34D164]/5"
                  )}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[#121E3C] flex items-center justify-center text-white font-semibold">
                      {conv.homeowner_name?.charAt(0)?.toUpperCase() || 'H'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[#121E3C] text-sm truncate">
                        {conv.homeowner_name || 'Homeowner'}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatConversationTime(conv.last_message_at || conv.updated_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.last_message || 'No messages yet'}
                    </p>
                  </div>
                  {(conv.unread_count_tradesperson || 0) > 0 && (
                    <span className="w-5 h-5 bg-[#34D164] text-white text-xs font-semibold rounded-full flex items-center justify-center shrink-0">
                      {conv.unread_count_tradesperson}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No conversations yet</p>
                <p className="text-gray-400 text-xs mt-1">
                  Messages from homeowners will appear here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col",
          !selectedConversation ? "hidden sm:flex" : "flex"
        )}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="sm:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[#121E3C] flex items-center justify-center text-white font-semibold">
                      {selectedConversation.homeowner_name?.charAt(0)?.toUpperCase() || 'H'}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#121E3C] text-sm truncate">
                      {selectedConversation.homeowner_name || 'Homeowner'}
                    </p>
                    <div className={`flex items-center gap-1.5 text-xs ${homeownerPresence.isOnline ? 'text-gray-500' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${homeownerPresence.isOnline ? 'bg-[#34D164]' : 'bg-gray-400'}`} />
                      <span>{homeownerPresence.label}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="w-10 h-10 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center">
                    <Phone className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="px-4 pt-3 pb-3 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0 text-sm text-gray-700">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{selectedConversation.job_title || 'Job conversation'}</span>
                  </div>
                  {selectedContactDetails && (
                    <Badge className="rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      Contact Available
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {(selectedConversation.job_location || selectedContactDetails?.job_location) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#34D164]" />
                      <span className="font-medium text-gray-700">{selectedConversation.job_location || selectedContactDetails?.job_location}</span>
                    </div>
                  )}
                  <span className="text-gray-300">•</span>
                  <Badge variant="outline" className="rounded-full text-[10px] font-medium py-0 h-4 border-gray-200">
                    Job Owner
                  </Badge>
                </div>

                {detailsLoading && (
                  <div className="text-xs text-gray-500 py-1">Loading contact details...</div>
                )}

                {!detailsLoading && selectedContactDetails && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-2.5">
                    <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Contact Details</span>
                    </div>
                    <div className="space-y-1.5 text-sm text-[#121E3C]">
                      {selectedContactDetails.homeowner_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span>{selectedContactDetails.homeowner_phone}</span>
                        </div>
                      )}
                      {selectedContactDetails.homeowner_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span>{selectedContactDetails.homeowner_email}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-green-700 text-xs mt-2">
                      You can now contact the homeowner directly about this job!
                    </p>
                  </div>
                )}
              </div>

              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length > 0 ? (
                  messages.map((msg, index) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id || index} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[75%] rounded-2xl p-4 shadow-sm",
                          isOwn
                            ? "bg-[#34D164] rounded-tr-sm"
                            : "bg-white rounded-tl-sm"
                        )}>
                          <p className={cn("text-sm", isOwn ? "text-white" : "text-gray-800")}>
                            {msg.content}
                          </p>
                          <span className={cn("text-xs mt-2 block", isOwn ? "text-white/70" : "text-gray-400")}>
                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-gray-500">
                    <div>
                      <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p>No messages yet</p>
                      <p className="text-sm mt-1">Send a message to start the conversation</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                  <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <Paperclip className="w-5 h-5 text-gray-500" />
                  </button>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164] transition-all"
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sending}
                    className="bg-[#34D164] hover:bg-[#2ab854] text-white p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50">
              <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
                <MessageSquare className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-[#121E3C] mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500 text-sm max-w-xs">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradespersonMessages;
