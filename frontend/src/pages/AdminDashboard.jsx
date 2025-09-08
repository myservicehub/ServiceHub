import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api/wallet';
import { adminReferralsAPI } from '../api/referrals';
import { useToast } from '../hooks/use-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';

const AdminDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('funding');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [fundingRequests, setFundingRequests] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'funding') {
        const data = await adminAPI.getFundingRequests();
        setFundingRequests(data.funding_requests || []);
      } else if (activeTab === 'jobs') {
        const data = await adminAPI.getJobsWithFees();
        setJobs(data.jobs || []);
      } else if (activeTab === 'verifications') {
        const data = await adminReferralsAPI.getPendingVerifications();
        setVerifications(data.verifications || []);
      } else if (activeTab === 'stats') {
        const data = await adminAPI.getDashboardStats();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.login(loginForm.username, loginForm.password);
      setIsLoggedIn(true);
      toast({
        title: "Login Successful",
        description: "Welcome to Admin Dashboard"
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid credentials",
        variant: "destructive"
      });
    }
  };

  const handleConfirmFunding = async (transactionId, notes = '') => {
    try {
      await adminAPI.confirmFunding(transactionId, notes);
      toast({
        title: "Funding Confirmed",
        description: "Coins have been added to user's wallet"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm funding",
        variant: "destructive"
      });
    }
  };

  const handleRejectFunding = async (transactionId, notes) => {
    if (!notes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide a reason for rejection",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await adminAPI.rejectFunding(transactionId, notes);
      toast({
        title: "Funding Rejected",
        description: "User will be notified of the rejection"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject funding",
        variant: "destructive"
      });
    }
  };

  const handleUpdateJobFee = async (jobId, newFee) => {
    try {
      await adminAPI.updateJobAccessFee(jobId, newFee);
      toast({
        title: "Fee Updated",
        description: "Job access fee has been updated successfully"
      });
      setEditingJob(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job access fee",
        variant: "destructive"
      });
    }
  };

  const handleApproveVerification = async (verificationId, notes = '') => {
    try {
      await adminReferralsAPI.approveVerification(verificationId, notes);
      toast({
        title: "Verification Approved",
        description: "User has been verified and referral rewards processed"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve verification",
        variant: "destructive"
      });
    }
  };

  const handleRejectVerification = async (verificationId, notes) => {
    if (!notes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide a reason for rejection",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await adminReferralsAPI.rejectVerification(verificationId, notes);
      toast({
        title: "Verification Rejected",
        description: "User has been notified of the rejection"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject verification",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Admin Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Login
              </button>
            </form>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-gray-600">Manage wallet funding and job access fees</p>
            </div>
            <button
              onClick={() => setIsLoggedIn(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'funding', label: 'Funding Requests', icon: '💰' },
                  { id: 'jobs', label: 'Job Access Fees', icon: '🔧' },
                  { id: 'verifications', label: 'ID Verifications', icon: '🆔' },
                  { id: 'users', label: 'User Management', icon: '👥' },
                  { id: 'stats', label: 'Dashboard Stats', icon: '📊' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Funding Requests Tab */}
              {activeTab === 'funding' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Pending Funding Requests</h2>
                    <button
                      onClick={fetchData}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Refresh
                    </button>
                  </div>

                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-gray-50 p-4 rounded-lg animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : fundingRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No pending funding requests
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fundingRequests.map((request) => (
                        <div key={request.id} className="bg-gray-50 p-6 rounded-lg">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold text-gray-800">
                                {request.user_name} ({request.user_email})
                              </h3>
                              <p className="text-sm text-gray-600">
                                Requested: ₦{request.amount_naira.toLocaleString()} ({request.amount_coins} coins)
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(request.created_at)}
                              </p>
                            </div>
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleConfirmFunding(request.id)}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setSelectedTransaction(request)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                          
                          {request.proof_image && (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Payment Proof:</p>
                              <img
                                src={adminAPI.getPaymentProofUrl(request.proof_image)}
                                alt="Payment proof"
                                className="h-32 w-auto rounded border cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => window.open(adminAPI.getPaymentProofUrl(request.proof_image), '_blank')}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Jobs Tab */}
              {activeTab === 'jobs' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Job Access Fees</h2>
                    <button
                      onClick={fetchData}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Refresh
                    </button>
                  </div>

                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-gray-50 p-4 rounded-lg animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Job Details
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Access Fee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Interests
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {jobs.map((job) => (
                            <tr key={job.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {job.title}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {job.category} • {job.location}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    By {job.homeowner_name}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingJob === job.id ? (
                                  <div className="flex space-x-2">
                                    <input
                                      type="number"
                                      min="1"
                                      max="10000"
                                      defaultValue={job.access_fee_naira}
                                      className="w-20 px-2 py-1 border rounded text-sm"
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          handleUpdateJobFee(job.id, parseInt(e.target.value));
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => setEditingJob(null)}
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      ₦{job.access_fee_naira.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {job.access_fee_coins} coins
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {job.interests_count}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => setEditingJob(job.id)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Edit Fee
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Verifications Tab */}
              {activeTab === 'verifications' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">ID Verifications</h2>
                    <button
                      onClick={fetchData}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Refresh
                    </button>
                  </div>

                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-gray-50 p-4 rounded-lg animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : verifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No pending verifications
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {verifications.map((verification) => (
                        <div key={verification.id} className="bg-gray-50 p-6 rounded-lg">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <h3 className="font-semibold text-gray-800 mb-2">
                                {verification.user_name} ({verification.user_email})
                              </h3>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p><strong>Role:</strong> {verification.user_role}</p>
                                <p><strong>Document Type:</strong> {verification.document_type.replace('_', ' ').toUpperCase()}</p>
                                <p><strong>Full Name:</strong> {verification.full_name}</p>
                                {verification.document_number && (
                                  <p><strong>Document Number:</strong> {verification.document_number}</p>
                                )}
                                <p><strong>Submitted:</strong> {formatDate(verification.submitted_at)}</p>
                              </div>
                            </div>
                            
                            <div>
                              {verification.document_url && (
                                <div className="mb-4">
                                  <p className="text-sm text-gray-600 mb-2">Document Image:</p>
                                  <img
                                    src={adminReferralsAPI.getDocumentUrl(verification.document_url)}
                                    alt="Document"
                                    className="h-32 w-auto rounded border cursor-pointer hover:shadow-lg transition-shadow"
                                    onClick={() => window.open(adminReferralsAPI.getDocumentUrl(verification.document_url), '_blank')}
                                  />
                                </div>
                              )}
                              
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleApproveVerification(verification.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setSelectedVerification(verification)}
                                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Stats Tab */}
              {activeTab === 'stats' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Dashboard Statistics</h2>
                  
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[...Array(7)].map((_, i) => (
                        <div key={i} className="bg-gray-50 p-6 rounded-lg animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                        <h3 className="text-sm font-medium text-yellow-800">Pending Requests</h3>
                        <p className="text-2xl font-bold text-yellow-600">
                          {stats.wallet_stats.pending_funding_requests}
                        </p>
                      </div>
                      
                      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                        <h3 className="text-sm font-medium text-green-800">Pending Amount</h3>
                        <p className="text-2xl font-bold text-green-600">
                          ₦{stats.wallet_stats.total_pending_amount_naira.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                        <h3 className="text-sm font-medium text-blue-800">Total Jobs</h3>
                        <p className="text-2xl font-bold text-blue-600">
                          {stats.job_stats.total_jobs}
                        </p>
                      </div>
                      
                      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                        <h3 className="text-sm font-medium text-purple-800">Total Interests</h3>
                        <p className="text-2xl font-bold text-purple-600">
                          {stats.job_stats.total_interests}
                        </p>
                      </div>
                      
                      <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                        <h3 className="text-sm font-medium text-indigo-800">Avg Access Fee</h3>
                        <p className="text-2xl font-bold text-indigo-600">
                          ₦{stats.job_stats.average_access_fee_naira}
                        </p>
                      </div>
                      
                      <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                        <h3 className="text-sm font-medium text-red-800">Pending Verifications</h3>
                        <p className="text-2xl font-bold text-red-600">
                          {stats.verification_stats?.pending_verifications || 0}
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-800">Referral Reward</h3>
                        <p className="text-lg font-bold text-gray-600">
                          5 coins per verified referral
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Funding Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject Funding Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              User: {selectedTransaction.user_name} ({selectedTransaction.user_email})
              <br />
              Amount: ₦{selectedTransaction.amount_naira.toLocaleString()}
            </p>
            <textarea
              placeholder="Reason for rejection (required)"
              className="w-full p-3 border rounded-lg mb-4"
              rows="3"
              id="rejection-notes"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const notes = document.getElementById('rejection-notes').value;
                  handleRejectFunding(selectedTransaction.id, notes);
                  setSelectedTransaction(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Verification Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject ID Verification</h3>
            <p className="text-sm text-gray-600 mb-4">
              User: {selectedVerification.user_name} ({selectedVerification.user_email})
              <br />
              Document: {selectedVerification.document_type.replace('_', ' ').toUpperCase()}
            </p>
            <textarea
              placeholder="Reason for rejection (required)"
              className="w-full p-3 border rounded-lg mb-4"
              rows="3"
              id="verification-rejection-notes"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedVerification(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const notes = document.getElementById('verification-rejection-notes').value;
                  handleRejectVerification(selectedVerification.id, notes);
                  setSelectedVerification(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminDashboard;