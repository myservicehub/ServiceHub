import React, { useState, useEffect } from 'react';
import { walletAPI } from '../../api/wallet';
import { useToast } from '../../hooks/use-toast';
import PaymentProofImage from '../common/PaymentProofImage';
import { ChevronDown, ChevronUp, Plus, Minus, RotateCcw, RefreshCw, Wallet, Receipt } from 'lucide-react';

const WalletTransactions = ({ refreshToken = 0 }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [pagination, setPagination] = useState({ skip: 0, limit: 10 });
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, [pagination.skip, refreshToken]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await walletAPI.getTransactions(pagination.skip, pagination.limit);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'wallet_funding':
        return { icon: Plus, bg: 'bg-green-50', color: 'text-green-500' };
      case 'access_fee_deduction':
        return { icon: Minus, bg: 'bg-red-50', color: 'text-red-500' };
      case 'refund':
        return { icon: RotateCcw, bg: 'bg-blue-50', color: 'text-blue-500' };
      default:
        return { icon: Receipt, bg: 'bg-gray-50', color: 'text-gray-500' };
    }
  };

  const getStatusStyles = (status) => {
    const styles = {
      confirmed: 'text-green-600',
      pending: 'text-amber-600',
      rejected: 'text-red-600'
    };
    return styles[status] || 'text-gray-600';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-sm border animate-pulse">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-[#121E3C]">Transaction History</h3>
        <button
          onClick={fetchTransactions}
          className="text-[#34D164] hover:text-[#2ab854] text-sm flex items-center gap-1"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-3">
            <Wallet className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-[#121E3C]">No transactions yet</p>
          <p className="text-xs text-gray-400 mt-1">Fund your wallet to get started</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {transactions.map((transaction) => {
            const iconData = getTransactionIcon(transaction.transaction_type);
            const IconComponent = iconData.icon;
            const isExpanded = expandedId === transaction.id;
            const isFunding = transaction.transaction_type === 'wallet_funding';
            
            return (
              <div key={transaction.id}>
                {/* Main Row - Always Visible */}
                <div 
                  className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 cursor-pointer hover:bg-gray-50/50 transition-colors gap-2"
                  onClick={() => toggleExpand(transaction.id)}
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl ${iconData.bg} flex items-center justify-center shrink-0`}>
                      <IconComponent className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${iconData.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-[#121E3C] truncate">
                        {isFunding ? 'Wallet Funding' : transaction.description || 'Transaction'}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-400">{formatDate(transaction.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-xs sm:text-sm font-semibold ${isFunding ? 'text-[#34D164]' : 'text-red-500'}`}>
                        {isFunding ? '+' : '-'}{transaction.amount_coins}
                      </p>
                      <p className={`text-[10px] sm:text-xs capitalize ${getStatusStyles(transaction.status)}`}>
                        {transaction.status}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-gray-400 hidden sm:block" />
                    ) : (
                      <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
                    )}
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-4 pt-0 bg-gray-50/50">
                    <div className="pl-10 sm:pl-12 space-y-2">
                      <div className="flex justify-between text-[10px] sm:text-xs gap-2">
                        <span className="text-gray-500">Amount (₦)</span>
                        <span className="text-[#121E3C] font-medium">₦{transaction.amount_naira?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px] sm:text-xs gap-2">
                        <span className="text-gray-500">Time</span>
                        <span className="text-[#121E3C]">{formatTime(transaction.created_at)}</span>
                      </div>
                      {transaction.reference && (
                        <div className="flex justify-between text-[10px] sm:text-xs gap-2">
                          <span className="text-gray-500 flex-shrink-0">Reference</span>
                          <span className="text-[#121E3C] font-mono truncate text-right">{transaction.reference}</span>
                        </div>
                      )}
                      {transaction.admin_notes && (
                        <div className="flex justify-between text-[10px] sm:text-xs gap-2">
                          <span className="text-gray-500 flex-shrink-0">Note</span>
                          <span className="text-blue-600 truncate text-right">{transaction.admin_notes}</span>
                        </div>
                      )}
                      {transaction.proof_image && (
                        <div className="pt-2">
                          <p className="text-[10px] sm:text-xs text-gray-500 mb-2">Payment Proof:</p>
                          <PaymentProofImage
                            filename={transaction.proof_image}
                            className="h-14 sm:h-16 w-auto rounded-lg border cursor-pointer hover:shadow-lg transition-shadow"
                            alt="Payment proof"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {transactions.length === pagination.limit && (
        <div className="px-5 py-3 border-t border-gray-100">
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
            className="w-full py-2 text-sm text-[#34D164] hover:bg-[#34D164]/5 rounded-xl transition-colors font-medium"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletTransactions;