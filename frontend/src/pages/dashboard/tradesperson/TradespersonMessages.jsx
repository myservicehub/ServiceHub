import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import {
  MessageSquare,
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  ChevronLeft,
  User,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

const TradespersonMessages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      setConversations([
        {
          id: 1,
          name: 'Sarah Johnson',
          avatar: null,
          lastMessage: 'Thank you for your interest in the job!',
          timestamp: '2 min ago',
          unread: 2,
          online: true,
        },
        {
          id: 2,
          name: 'Michael Adeyemi',
          avatar: null,
          lastMessage: 'Can you provide a quote for the project?',
          timestamp: '1 hour ago',
          unread: 0,
          online: false,
        },
        {
          id: 3,
          name: 'Chioma Okonkwo',
          avatar: null,
          lastMessage: 'The work looks great, thank you!',
          timestamp: 'Yesterday',
          unread: 0,
          online: true,
        },
      ]);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || !selectedConversation) return;
    // Handle send message logic
    setMessage('');
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-50",
                    selectedConversation?.id === conv.id && "bg-[#34D164]/5"
                  )}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[#121E3C] flex items-center justify-center text-white font-semibold">
                      {conv.name.charAt(0)}
                    </div>
                    {conv.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[#121E3C] text-sm truncate">
                        {conv.name}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {conv.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="w-5 h-5 bg-[#34D164] text-white text-xs font-semibold rounded-full flex items-center justify-center shrink-0">
                      {conv.unread}
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
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="sm:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[#121E3C] flex items-center justify-center text-white font-semibold">
                      {selectedConversation.name.charAt(0)}
                    </div>
                    {selectedConversation.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[#121E3C] text-sm">
                      {selectedConversation.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <Phone className="w-5 h-5 text-gray-500" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <Video className="w-5 h-5 text-gray-500" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {/* Sample messages */}
                <div className="flex justify-start">
                  <div className="max-w-[75%] bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm">
                    <p className="text-sm text-gray-800">
                      Hi! I saw your interest in my plumbing job. Can you tell me more about your experience?
                    </p>
                    <span className="text-xs text-gray-400 mt-2 block">10:30 AM</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-[#34D164] rounded-2xl rounded-tr-sm p-4">
                    <p className="text-sm text-white">
                      Hello! I have over 5 years of experience in plumbing. I specialize in pipe repairs and installations.
                    </p>
                    <span className="text-xs text-white/70 mt-2 block">10:32 AM</span>
                  </div>
                </div>
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                  <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <Paperclip className="w-5 h-5 text-gray-500" />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="w-full px-4 py-2.5 pr-10 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164] transition-all"
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Smile className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
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
