import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  MessageCircle,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import ConversationList from '../components/messaging/ConversationList';
import ChatWindow from '../components/messaging/ChatWindow';
import { messagesAPI } from '../api/services';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const MessagesPage = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const { user, isAuthenticated, authLoading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  // Check for mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  const loadConversations = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const response = await messagesAPI.getConversations();
      setConversations(response || []);

    } catch (error) {
      console.error('Failed to load conversations:', error);
      if (showLoading) {
        toast({
          title: "Failed to load conversations",
          description: "There was an error loading your messages.",
          variant: "destructive",
        });
      }
    } finally {
      if (showLoading) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated()) {
      loadConversations();
    }
  }, [isAuthenticated]);

  // Handle navigation state from other pages (e.g., from quotes)
  useEffect(() => {
    if (location.state && conversations.length > 0) {
      const { selectedJobId, selectedUserId, selectedUserName } = location.state;
      
      if (selectedJobId) {
        // Find conversation for this job
        const targetConversation = conversations.find(conv => 
          conv.job_id === selectedJobId
        );
        
        if (targetConversation) {
          setSelectedConversation(targetConversation);
        } else if (selectedUserId && selectedUserName) {
          // Create a temporary conversation object for new conversation
          const tempConversation = {
            job_id: selectedJobId,
            other_user_id: selectedUserId,
            other_user_name: selectedUserName,
            job_title: 'Job Discussion', // This will be updated when messages load
            unread_count: 0
          };
          setSelectedConversation(tempConversation);
        }
      }
      
      // Clear the navigation state to prevent re-selection on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, conversations]);

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  const handleRefresh = () => {
    loadConversations(false);
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{borderColor: '#2F8140'}}></div>
            <p className="text-gray-600 font-lato">Loading your messages...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Sign In Required
            </h1>
            <p className="text-gray-600 font-lato mb-6">
              Please sign in to view your messages.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="text-white font-lato"
              style={{backgroundColor: '#2F8140'}}
            >
              Sign In
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Page Header */}
      <section className="py-6 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isMobileView && selectedConversation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToList}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft size={16} />
                  </Button>
                )}
                
                <div>
                  <h1 className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                    {isMobileView && selectedConversation 
                      ? selectedConversation.other_user_name
                      : 'Messages'
                    }
                  </h1>
                  <p className="text-gray-600 font-lato">
                    {isMobileView && selectedConversation
                      ? `Job: ${selectedConversation.job_title}`
                      : 'Communicate with homeowners and tradespeople'
                    }
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="font-lato"
              >
                <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Messages Interface */}
      <section className="py-6 flex-1">
        <div className="container mx-auto px-4 h-full">
          <div className="max-w-6xl mx-auto h-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
              
              {/* Conversations List - Desktop: Always visible, Mobile: Hidden when chat is open */}
              <div className={`${isMobileView && selectedConversation ? 'hidden' : 'block'} md:block`}>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center font-montserrat" style={{color: '#121E3C'}}>
                      <MessageCircle size={20} className="mr-2" style={{color: '#2F8140'}} />
                      Conversations ({conversations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-full overflow-hidden">
                    <div className="h-full overflow-y-auto">
                      <ConversationList
                        conversations={conversations}
                        selectedConversationId={selectedConversation?.job_id}
                        onConversationSelect={handleConversationSelect}
                        loading={loading}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chat Window - Desktop: Always visible, Mobile: Only when conversation selected */}
              <div className={`md:col-span-2 ${isMobileView && !selectedConversation ? 'hidden' : 'block'}`}>
                <div className="h-full" style={{ minHeight: '600px' }}>
                  <ChatWindow
                    jobId={selectedConversation?.job_id}
                    jobTitle={selectedConversation?.job_title}
                    otherUser={{
                      id: selectedConversation?.other_user_id,
                      name: selectedConversation?.other_user_name,
                      role: selectedConversation?.other_user_role
                    }}
                    onClose={isMobileView ? handleBackToList : null}
                    isModal={isMobileView}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MessagesPage;