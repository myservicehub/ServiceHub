import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Star, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  User, 
  Building2, 
  Award,
  CheckCircle,
  XCircle,
  MessageSquare,
  Phone,
  Mail
} from 'lucide-react';
import { quotesAPI } from '../../api/services';
import { useToast } from '../../hooks/use-toast';

const QuotesList = ({ jobId, quotes: initialQuotes, onQuoteUpdate }) => {
  const [quotes, setQuotes] = useState(initialQuotes || []);
  const [processingQuote, setProcessingQuote] = useState(null);
  const { toast } = useToast();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-yellow-600" />;
    }
  };

  const handleQuoteAction = async (quoteId, action) => {
    setProcessingQuote(quoteId);

    try {
      await quotesAPI.updateQuoteStatus(quoteId, action);

      // Update local state
      setQuotes(prevQuotes => 
        prevQuotes.map(quote => {
          if (quote.id === quoteId) {
            return { ...quote, status: action };
          }
          // If accepting this quote, reject others
          if (action === 'accepted' && quote.status === 'pending') {
            return { ...quote, status: 'rejected' };
          }
          return quote;
        })
      );

      toast({
        title: `Quote ${action}!`,
        description: action === 'accepted' 
          ? "You've accepted this quote. The tradesperson will contact you soon."
          : "Quote has been rejected.",
      });

      if (onQuoteUpdate) {
        onQuoteUpdate();
      }

    } catch (error) {
      console.error('Quote action error:', error);
      toast({
        title: "Action failed",
        description: error.response?.data?.detail || "Failed to update quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingQuote(null);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        className={index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
      />
    ));
  };

  if (!quotes || quotes.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold font-montserrat text-gray-900 mb-2">
            No quotes yet
          </h3>
          <p className="text-gray-600 font-lato">
            Tradespeople will start submitting quotes soon. Check back later!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
          Quotes Received ({quotes.length})
        </h2>
        
        {/* Quick stats */}
        <div className="flex space-x-4 text-sm font-lato">
          <span className="text-yellow-600">
            {quotes.filter(q => q.status === 'pending').length} Pending
          </span>
          <span className="text-green-600">
            {quotes.filter(q => q.status === 'accepted').length} Accepted
          </span>
          <span className="text-red-600">
            {quotes.filter(q => q.status === 'rejected').length} Rejected
          </span>
        </div>
      </div>

      {quotes.map((quote) => (
        <Card key={quote.id} className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                {/* Tradesperson Avatar */}
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg" 
                     style={{backgroundColor: '#2F8140'}}>
                  {quote.tradesperson?.name?.charAt(0) || 'T'}
                </div>

                {/* Tradesperson Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold font-montserrat" style={{color: '#121E3C'}}>
                      {quote.tradesperson?.name}
                    </h3>
                    {quote.tradesperson?.verified_tradesperson && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        <Award size={12} className="mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  {quote.tradesperson?.company_name && (
                    <p className="text-sm text-gray-600 font-lato flex items-center mb-1">
                      <Building2 size={14} className="mr-1" />
                      {quote.tradesperson.company_name}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-gray-600 font-lato">
                    <span className="flex items-center">
                      <MapPin size={14} className="mr-1" />
                      {quote.tradesperson?.location}
                    </span>
                    <span className="flex items-center">
                      <User size={14} className="mr-1" />
                      {quote.tradesperson?.experience_years} years exp.
                    </span>
                    {quote.tradesperson?.average_rating > 0 && (
                      <div className="flex items-center space-x-1">
                        <div className="flex">
                          {renderStars(quote.tradesperson.average_rating)}
                        </div>
                        <span>({quote.tradesperson.total_reviews})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                {getStatusIcon(quote.status)}
                <Badge className={getStatusColor(quote.status)}>
                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Quote Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <DollarSign size={20} style={{color: '#2F8140'}} />
                  <span className="font-semibold font-montserrat ml-2" style={{color: '#121E3C'}}>
                    Quote Price
                  </span>
                </div>
                <p className="text-2xl font-bold font-montserrat" style={{color: '#2F8140'}}>
                  {formatCurrency(quote.price)}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Clock size={20} style={{color: '#121E3C'}} />
                  <span className="font-semibold font-montserrat ml-2" style={{color: '#121E3C'}}>
                    Duration
                  </span>
                </div>
                <p className="text-lg font-lato text-gray-700">
                  {quote.estimated_duration}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar size={20} style={{color: '#121E3C'}} />
                  <span className="font-semibold font-montserrat ml-2" style={{color: '#121E3C'}}>
                    Start Date
                  </span>
                </div>
                <p className="text-lg font-lato text-gray-700">
                  {formatDate(quote.start_date)}
                </p>
              </div>
            </div>

            {/* Quote Message */}
            <div className="mb-6">
              <h4 className="font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                Detailed Quote
              </h4>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 font-lato whitespace-pre-wrap">
                  {quote.message}
                </p>
              </div>
            </div>

            {/* Trade Categories */}
            {quote.tradesperson?.trade_categories && (
              <div className="mb-6">
                <h4 className="font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                  Skills & Expertise
                </h4>
                <div className="flex flex-wrap gap-2">
                  {quote.tradesperson.trade_categories.map((category, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {quote.status === 'pending' && (
              <div className="flex space-x-3 pt-4 border-t">
                <Button
                  onClick={() => handleQuoteAction(quote.id, 'accepted')}
                  disabled={processingQuote === quote.id}
                  className="text-white font-lato flex-1"
                  style={{backgroundColor: '#2F8140'}}
                >
                  <CheckCircle size={16} className="mr-2" />
                  {processingQuote === quote.id ? 'Processing...' : 'Accept Quote'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleQuoteAction(quote.id, 'rejected')}
                  disabled={processingQuote === quote.id}
                  className="font-lato flex-1 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle size={16} className="mr-2" />
                  Reject
                </Button>
              </div>
            )}

            {/* Contact Info for Accepted Quotes */}
            {quote.status === 'accepted' && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold font-montserrat mb-2 text-green-800">
                  Contact Details - Quote Accepted
                </h4>
                <div className="flex flex-col space-y-2 text-sm font-lato">
                  <div className="flex items-center text-green-700">
                    <Phone size={14} className="mr-2" />
                    Contact the tradesperson to finalize details
                  </div>
                  <div className="flex items-center text-green-700">
                    <Mail size={14} className="mr-2" />
                    They will reach out to you soon to begin the project
                  </div>
                </div>
              </div>
            )}

            {/* Quote submitted date */}
            <div className="mt-4 text-xs text-gray-500 font-lato">
              Quote submitted on {formatDate(quote.created_at)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuotesList;