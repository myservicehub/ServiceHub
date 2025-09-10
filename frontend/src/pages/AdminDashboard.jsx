import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api/wallet';
import { adminReferralsAPI } from '../api/referrals';
import { useToast } from '../hooks/use-toast';
import ContactManagementTab from './ContactManagementTab';
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
  
  // Location & Trades Management state
  const [activeLocationTab, setActiveLocationTab] = useState('states');
  const [states, setStates] = useState([]);
  const [lgas, setLgas] = useState([]);
  const [towns, setTowns] = useState([]);
  const [trades, setTrades] = useState([]);
  const [tradeGroups, setTradeGroups] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Skills Questions Management state
  const [skillsQuestions, setSkillsQuestions] = useState({});
  const [questionStats, setQuestionStats] = useState({});
  const [selectedTrade, setSelectedTrade] = useState('');
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  
  // Policy Management state
  const [policies, setPolicies] = useState([]);
  const [policyTypes, setPolicyTypes] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [policyHistory, setPolicyHistory] = useState([]);
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [showPolicyHistory, setShowPolicyHistory] = useState(false);
  
  // Contact Management state
  const [contacts, setContacts] = useState([]);
  const [contactTypes, setContactTypes] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  // Jobs Management state
  const [jobsFilter, setJobsFilter] = useState('');
  const [editingJobStatus, setEditingJobStatus] = useState(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [editingJobData, setEditingJobData] = useState(null);
  
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
        const data = await adminAPI.getAllJobsAdmin(0, 100, jobsFilter || null);
        setJobs(data.jobs || []);
      } else if (activeTab === 'verifications') {
        const data = await adminReferralsAPI.getPendingVerifications();
        setVerifications(data.verifications || []);
      } else if (activeTab === 'users') {
        const data = await adminAPI.getAllUsers();
        setUsers(data.users || []);
        setUserStats(data.stats || {});
      } else if (activeTab === 'locations') {
        // Load location and trade data based on active sub-tab
        if (activeLocationTab === 'states') {
          const data = await adminAPI.getAllStates();
          setStates(data.states || []);
        } else if (activeLocationTab === 'lgas') {
          const data = await adminAPI.getAllLGAs();
          setLgas(data.lgas || {});
        } else if (activeLocationTab === 'towns') {
          const data = await adminAPI.getAllTowns();
          setTowns(data.towns || {});
        } else if (activeLocationTab === 'trades') {
          const data = await adminAPI.getAllTrades();
          setTrades(data.trades || []);
          setTradeGroups(data.groups || []);
        }
      } else if (activeTab === 'questions') {
        // Load both skills questions and available trade categories
        const [questionsData, tradesData] = await Promise.all([
          adminAPI.getAllSkillsQuestions(),
          adminAPI.getAllTrades()
        ]);
        
        setSkillsQuestions(questionsData.questions || {});
        setQuestionStats(questionsData.stats || {});
        setTrades(tradesData.trades || []); // Use trades for dropdown options
      } else if (activeTab === 'policies') {
        // Load policies and policy types
        const [policiesData, typesData] = await Promise.all([
          adminAPI.getAllPolicies(),
          adminAPI.getPolicyTypes()
        ]);
        
        setPolicies(policiesData.policies || []);
        setPolicyTypes(typesData.policy_types || []);
      } else if (activeTab === 'contacts') {
        // Load contacts and contact types
        const [contactsData, typesData] = await Promise.all([
          adminAPI.getAllContacts(),
          adminAPI.getContactTypes()
        ]);
        
        setContacts(contactsData.contacts || []);
        setContactTypes(typesData.contact_types || []);
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

  // Jobs Management Functions
  const handleUpdateJobStatus = async (jobId, newStatus) => {
    try {
      const response = await adminAPI.updateJobStatus(jobId, newStatus);
      if (response) {
        toast({
          title: "Success",
          description: "Job status updated successfully",
        });
        setEditingJobStatus(null);
        fetchData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  const handleViewJobDetails = (job) => {
    setSelectedJobDetails(job);
    setShowJobDetailsModal(true);
  };

  const handleEditJob = (job) => {
    setEditingJobData(job);
    setShowEditJobModal(true);
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await adminAPI.deleteJob(jobId);
      if (response) {
        toast({
          title: "Success",
          description: "Job deleted successfully",
        });
        fetchData();
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to delete job",
        variant: "destructive",
      });
    }
  };

  const getJobStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const handleLocationDataLoad = async () => {
    try {
      // Load states data for dropdowns
      const statesData = await adminAPI.getAllStates();
      setStates(statesData.states || []);
    } catch (error) {
      console.error('Failed to load states data:', error);
    }
  };

  // Load states data when component mounts and when location tab is active
  useEffect(() => {
    if (isLoggedIn && activeTab === 'locations') {
      handleLocationDataLoad();
    }
  }, [isLoggedIn, activeTab]);

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
                  { id: 'locations', label: 'Locations & Trades', icon: '🌍' },
                  { id: 'questions', label: 'Skills Questions', icon: '📝' },
                  { id: 'policies', label: 'Policy Management', icon: '📄' },
                  { id: 'contacts', label: 'Contact Management', icon: '📞' },
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
                    <h2 className="text-xl font-semibold">Jobs Management</h2>
                    <div className="flex space-x-2">
                      <select
                        value={jobsFilter}
                        onChange={(e) => setJobsFilter(e.target.value)}
                        className="px-3 py-1 border rounded text-sm"
                      >
                        <option value="">All Jobs</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="expired">Expired</option>
                      </select>
                      <button
                        onClick={fetchData}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Refresh
                      </button>
                    </div>
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
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Budget
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
                            <tr key={job.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {job.title}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {job.category} • {job.location}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    By {job.homeowner?.name || 'Unknown'} • {new Date(job.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingJobStatus === job.id ? (
                                  <select
                                    defaultValue={job.status}
                                    onChange={(e) => handleUpdateJobStatus(job.id, e.target.value)}
                                    className="text-sm border rounded px-2 py-1"
                                  >
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="expired">Expired</option>
                                    <option value="on_hold">On Hold</option>
                                  </select>
                                ) : (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getJobStatusColor(job.status)}`}>
                                    {job.status || 'active'}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {job.budget_min && job.budget_max ? (
                                  <div>
                                    <div className="font-medium">₦{job.budget_min.toLocaleString()} - ₦{job.budget_max.toLocaleString()}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">Negotiable</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center">
                                  <span className="font-medium">{job.interests_count || 0}</span>
                                  <span className="text-gray-500 ml-1">interested</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button
                                  onClick={() => handleViewJobDetails(job)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleEditJob(job)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setEditingJobStatus(job.id)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Status
                                </button>
                                <button
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="text-red-600 hover:text-red-900"
                                  disabled={job.status === 'deleted'}
                                >
                                  Delete
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

              {/* Location & Trades Management Tab */}
              {activeTab === 'locations' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Location & Trades Management</h2>
                    <button
                      onClick={fetchData}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Sub-tabs for different management areas */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex space-x-4 mb-6">
                      {[
                        { id: 'states', label: 'States', icon: '🏛️' },
                        { id: 'lgas', label: 'LGAs', icon: '🏘️' },
                        { id: 'towns', label: 'Towns', icon: '🏠' },
                        { id: 'trades', label: 'Trade Categories', icon: '🔨' }
                      ].map((subTab) => (
                        <button
                          key={subTab.id}
                          onClick={() => setActiveLocationTab(subTab.id)}
                          className={`py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                            activeLocationTab === subTab.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <span className="mr-2">{subTab.icon}</span>
                          {subTab.label}
                        </button>
                      ))}
                    </div>

                    {/* States Management */}
                    {activeLocationTab === 'states' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Nigerian States</h3>
                          <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            {showAddForm ? 'Cancel' : 'Add New State'}
                          </button>
                        </div>

                        {showAddForm && (
                          <div className="bg-white p-4 rounded-lg border">
                            <h4 className="font-semibold mb-3">Add New State</h4>
                            <form onSubmit={async (e) => {
                              e.preventDefault();
                              const formData = new FormData(e.target);
                              try {
                                await adminAPI.addNewState(
                                  formData.get('state_name'),
                                  formData.get('region'),
                                  formData.get('postcodes') // This matches the form field name
                                );
                                toast({ title: "State added successfully" });
                                setShowAddForm(false);
                                fetchData();
                              } catch (error) {
                                console.error('Add state error:', error);
                                toast({ title: "Failed to add state", variant: "destructive" });
                              }
                            }}>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    State Name *
                                  </label>
                                  <input
                                    type="text"
                                    name="state_name"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Ogun"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Region
                                  </label>
                                  <input
                                    type="text"
                                    name="region"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., South West"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sample Postcodes
                                  </label>
                                  <input
                                    type="text"
                                    name="postcodes"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 110001,110002"
                                  />
                                </div>
                              </div>
                              <div className="flex space-x-2 mt-4">
                                <button
                                  type="submit"
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                                >
                                  Add State
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowAddForm(false)}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {loading ? (
                          <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className="bg-white p-4 rounded-lg animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-white rounded-lg border overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    State Name
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {states.map((state, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {state}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={() => setEditingItem({ type: 'state', name: state })}
                                          className="text-blue-600 hover:text-blue-900"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (window.confirm(`Delete state "${state}"? This will also delete all its LGAs and towns.`)) {
                                              try {
                                                await adminAPI.deleteState(state);
                                                toast({ title: "State deleted successfully" });
                                                fetchData();
                                              } catch (error) {
                                                toast({ title: "Failed to delete state", variant: "destructive" });
                                              }
                                            }
                                          }}
                                          className="text-red-600 hover:text-red-900"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* LGAs Management */}
                    {activeLocationTab === 'lgas' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Local Government Areas (LGAs)</h3>
                          <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            {showAddForm ? 'Cancel' : 'Add New LGA'}
                          </button>
                        </div>

                        {showAddForm && (
                          <div className="bg-white p-4 rounded-lg border">
                            <h4 className="font-semibold mb-3">Add New LGA</h4>
                            <form onSubmit={async (e) => {
                              e.preventDefault();
                              const formData = new FormData(e.target);
                              try {
                                await adminAPI.addNewLGA(
                                  formData.get('state_name'),
                                  formData.get('lga_name'),
                                  formData.get('zip_codes')
                                );
                                toast({ title: "LGA added successfully" });
                                setShowAddForm(false);
                                fetchData();
                              } catch (error) {
                                toast({ title: "Failed to add LGA", variant: "destructive" });
                              }
                            }}>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    State *
                                  </label>
                                  <select
                                    name="state_name"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">Select State</option>
                                    {states.map((state, index) => (
                                      <option key={index} value={state}>{state}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    LGA Name *
                                  </label>
                                  <input
                                    type="text"
                                    name="lga_name"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Abeokuta North"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Zip Codes
                                  </label>
                                  <input
                                    type="text"
                                    name="zip_codes"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 110001,110002"
                                  />
                                </div>
                              </div>
                              <div className="flex space-x-2 mt-4">
                                <button
                                  type="submit"
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                                >
                                  Add LGA
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowAddForm(false)}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {loading ? (
                          <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className="bg-white p-4 rounded-lg animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {Object.entries(lgas).map(([state, stateLgas]) => (
                              <div key={state} className="bg-white rounded-lg border overflow-hidden">
                                <div className="bg-gray-50 px-6 py-3 border-b">
                                  <h4 className="font-semibold text-gray-800">{state} ({stateLgas.length} LGAs)</h4>
                                </div>
                                <div className="p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {stateLgas.map((lga, index) => (
                                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-700">{lga}</span>
                                        <div className="flex space-x-1">
                                          <button
                                            onClick={() => setEditingItem({ type: 'lga', state, name: lga })}
                                            className="text-blue-600 hover:text-blue-900 text-xs"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={async () => {
                                              if (window.confirm(`Delete LGA "${lga}" from ${state}?`)) {
                                                try {
                                                  await adminAPI.deleteLGA(state, lga);
                                                  toast({ title: "LGA deleted successfully" });
                                                  fetchData();
                                                } catch (error) {
                                                  toast({ title: "Failed to delete LGA", variant: "destructive" });
                                                }
                                              }
                                            }}
                                            className="text-red-600 hover:text-red-900 text-xs"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Towns Management */}
                    {activeLocationTab === 'towns' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Towns</h3>
                          <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            {showAddForm ? 'Cancel' : 'Add New Town'}
                          </button>
                        </div>

                        {showAddForm && (
                          <div className="bg-white p-4 rounded-lg border">
                            <h4 className="font-semibold mb-3">Add New Town</h4>
                            <form onSubmit={async (e) => {
                              e.preventDefault();
                              const formData = new FormData(e.target);
                              try {
                                await adminAPI.addNewTown(
                                  formData.get('state_name'),
                                  formData.get('lga_name'),
                                  formData.get('town_name'),
                                  formData.get('zip_code')
                                );
                                toast({ title: "Town added successfully" });
                                setShowAddForm(false);
                                fetchData();
                              } catch (error) {
                                toast({ title: "Failed to add town", variant: "destructive" });
                              }
                            }}>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    State *
                                  </label>
                                  <select
                                    name="state_name"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    onChange={async (e) => {
                                      const selectedState = e.target.value;
                                      if (selectedState) {
                                        try {
                                          const data = await adminAPI.getLGAsForState(selectedState);
                                          const lgaSelect = document.querySelector('select[name="lga_name"]');
                                          lgaSelect.innerHTML = '<option value="">Select LGA</option>';
                                          data.lgas.forEach(lga => {
                                            const option = document.createElement('option');
                                            option.value = lga;
                                            option.textContent = lga;
                                            lgaSelect.appendChild(option);
                                          });
                                        } catch (error) {
                                          console.error('Failed to load LGAs:', error);
                                        }
                                      }
                                    }}
                                  >
                                    <option value="">Select State</option>
                                    {states.map((state, index) => (
                                      <option key={index} value={state}>{state}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    LGA *
                                  </label>
                                  <select
                                    name="lga_name"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">Select LGA</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Town Name *
                                  </label>
                                  <input
                                    type="text"
                                    name="town_name"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Iberekodo"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Zip Code
                                  </label>
                                  <input
                                    type="text"
                                    name="zip_code"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 110001"
                                  />
                                </div>
                              </div>
                              <div className="flex space-x-2 mt-4">
                                <button
                                  type="submit"
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                                >
                                  Add Town
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowAddForm(false)}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {loading ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="bg-white p-4 rounded-lg animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {Object.entries(towns).map(([state, stateTowns]) => (
                              <div key={state} className="bg-white rounded-lg border overflow-hidden">
                                <div className="bg-gray-50 px-6 py-3 border-b">
                                  <h4 className="font-semibold text-gray-800">{state}</h4>
                                </div>
                                <div className="p-4">
                                  {Object.entries(stateTowns).map(([lga, lgaTowns]) => (
                                    <div key={lga} className="mb-4 last:mb-0">
                                      <h5 className="font-medium text-gray-700 mb-2">{lga} ({lgaTowns.length} towns)</h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                        {lgaTowns.map((town, index) => (
                                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                            <span className="text-sm text-gray-700">{town}</span>
                                            <button
                                              onClick={async () => {
                                                if (window.confirm(`Delete town "${town}" from ${lga}, ${state}?`)) {
                                                  try {
                                                    await adminAPI.deleteTown(state, lga, town);
                                                    toast({ title: "Town deleted successfully" });
                                                    fetchData();
                                                  } catch (error) {
                                                    toast({ title: "Failed to delete town", variant: "destructive" });
                                                  }
                                                }
                                              }}
                                              className="text-red-600 hover:text-red-900 text-xs"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Trade Categories Management */}
                    {activeLocationTab === 'trades' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Trade Categories</h3>
                          <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            {showAddForm ? 'Cancel' : 'Add New Trade'}
                          </button>
                        </div>

                        {showAddForm && (
                          <div className="bg-white p-4 rounded-lg border">
                            <h4 className="font-semibold mb-3">Add New Trade Category</h4>
                            <form onSubmit={async (e) => {
                              e.preventDefault();
                              const formData = new FormData(e.target);
                              try {
                                await adminAPI.addNewTrade(
                                  formData.get('trade_name'),
                                  formData.get('group'),
                                  formData.get('description')
                                );
                                toast({ title: "Trade category added successfully" });
                                setShowAddForm(false);
                                fetchData();
                              } catch (error) {
                                toast({ title: "Failed to add trade category", variant: "destructive" });
                              }
                            }}>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Trade Name *
                                  </label>
                                  <input
                                    type="text"
                                    name="trade_name"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Solar Installation"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Group
                                  </label>
                                  <select
                                    name="group"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="General Services">General Services</option>
                                    {tradeGroups.map((group, index) => (
                                      <option key={index} value={group}>{group}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                  </label>
                                  <input
                                    type="text"
                                    name="description"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Brief description"
                                  />
                                </div>
                              </div>
                              <div className="flex space-x-2 mt-4">
                                <button
                                  type="submit"
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                                >
                                  Add Trade
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowAddForm(false)}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {loading ? (
                          <div className="space-y-2">
                            {[...Array(8)].map((_, i) => (
                              <div key={i} className="bg-white p-4 rounded-lg animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-white rounded-lg border overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Trade Name
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Group
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {trades.map((trade, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {trade}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        General Services
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={() => setEditingItem({ type: 'trade', name: trade })}
                                          className="text-blue-600 hover:text-blue-900"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (window.confirm(`Delete trade category "${trade}"?`)) {
                                              try {
                                                await adminAPI.deleteTrade(trade);
                                                toast({ title: "Trade category deleted successfully" });
                                                fetchData();
                                              } catch (error) {
                                                toast({ title: "Failed to delete trade category", variant: "destructive" });
                                              }
                                            }
                                          }}
                                          className="text-red-600 hover:text-red-900"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Skills Questions Management Tab */}
              {activeTab === 'questions' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Skills Test Questions Management</h2>
                    <button
                      onClick={fetchData}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Trade Category Selection */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Trade Category
                      </label>
                      <select
                        value={selectedTrade}
                        onChange={(e) => setSelectedTrade(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a trade category</option>
                        {trades.map((trade) => (
                          <option key={trade} value={trade}>{trade}</option>
                        ))}
                      </select>
                    </div>

                    {/* Questions Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-lg font-semibold text-gray-800">Total Questions</h3>
                        <p className="text-3xl font-bold text-blue-600">
                          {Object.values(skillsQuestions).reduce((total, questions) => total + questions.length, 0)}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-lg font-semibold text-gray-800">Trade Categories</h3>
                        <p className="text-3xl font-bold text-green-600">
                          {trades.length}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-lg font-semibold text-gray-800">Selected Trade</h3>
                        <p className="text-lg font-semibold text-purple-600">
                          {selectedTrade ? `${skillsQuestions[selectedTrade]?.length || 0} questions` : 'None selected'}
                        </p>
                      </div>
                    </div>

                    {/* Questions for Selected Trade */}
                    {selectedTrade && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Questions for {selectedTrade}</h3>
                          <button
                            onClick={() => setShowAddQuestion(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Add New Question
                          </button>
                        </div>

                        {loading ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="bg-white p-4 rounded-lg animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(skillsQuestions[selectedTrade] || []).map((question, index) => (
                              <div key={question.id || index} className="bg-white border rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 mb-1">
                                      Q{index + 1}: {question.question}
                                    </h4>
                                    <div className="text-sm text-gray-600 mb-2">
                                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                                        {question.category || 'General'}
                                      </span>
                                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                                        {question.difficulty || 'Medium'}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                      <strong>Options:</strong>
                                      <ul className="list-disc list-inside mt-1">
                                        {question.options?.map((option, optIndex) => (
                                          <li key={optIndex} className={optIndex === question.correct_answer ? 'text-green-600 font-medium' : ''}>
                                            {option} {optIndex === question.correct_answer && '✓'}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    {question.explanation && (
                                      <div className="text-sm text-gray-600 mt-2">
                                        <strong>Explanation:</strong> {question.explanation}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => setEditingQuestion(question)}
                                      className="text-blue-600 hover:text-blue-900 text-sm"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (window.confirm('Are you sure you want to delete this question?')) {
                                          try {
                                            await adminAPI.deleteSkillsQuestion(question.id);
                                            toast({ title: "Question deleted successfully" });
                                            fetchData();
                                          } catch (error) {
                                            toast({ title: "Failed to delete question", variant: "destructive" });
                                          }
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-900 text-sm"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Policy Management Tab */}
              {activeTab === 'policies' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Policy Management</h2>
                    <button
                      onClick={fetchData}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Policy Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-800">Total Policies</h3>
                      <p className="text-3xl font-bold text-blue-600">
                        {policies.length}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-800">Active Policies</h3>
                      <p className="text-3xl font-bold text-green-600">
                        {policies.filter(p => p.status === 'active').length}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-800">Scheduled Policies</h3>
                      <p className="text-3xl font-bold text-orange-600">
                        {policies.filter(p => p.status === 'scheduled').length}
                      </p>
                    </div>
                  </div>

                  {/* Add New Policy Button */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Manage Policies</h3>
                    <button
                      onClick={() => setShowAddPolicy(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      Add New Policy
                    </button>
                  </div>

                  {/* Add Policy Form */}
                  {showAddPolicy && (
                    <div className="bg-white p-6 rounded-lg border">
                      <h4 className="text-lg font-semibold mb-4">Add New Policy</h4>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        const policyData = {
                          policy_type: formData.get('policy_type'),
                          title: formData.get('title'),
                          content: formData.get('content'),
                          effective_date: formData.get('effective_date') || null,
                          notes: formData.get('notes') || ''
                        };
                        
                        try {
                          await adminAPI.createPolicy(policyData);
                          toast({ title: "Policy created successfully" });
                          setShowAddPolicy(false);
                          fetchData();
                        } catch (error) {
                          toast({ title: "Failed to create policy", variant: "destructive" });
                        }
                      }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Policy Type
                            </label>
                            <select
                              name="policy_type"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select policy type</option>
                              {policyTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Effective Date (Optional)
                            </label>
                            <input
                              type="datetime-local"
                              name="effective_date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Policy Title
                          </label>
                          <input
                            type="text"
                            name="title"
                            required
                            minLength="5"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Privacy Policy for ServiceHub"
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Policy Content
                          </label>
                          <textarea
                            name="content"
                            required
                            minLength="50"
                            rows="10"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="Enter the complete policy content in plain text..."
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Admin Notes (Optional)
                          </label>
                          <input
                            type="text"
                            name="notes"
                            maxLength="500"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Internal notes about this policy update..."
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Create Policy
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddPolicy(false)}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Policies List */}
                  {loading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white p-4 rounded-lg animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Policy Details
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status & Version
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Dates
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {policies.map((policy, index) => (
                            <tr key={policy.id || index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {policy.title}
                                  </div>
                                  <div className="text-sm text-gray-500 capitalize">
                                    {(policy.policy_type || '').replace('_', ' ')}
                                  </div>
                                  {policy.notes && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      📝 {policy.notes}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    policy.status === 'active' 
                                      ? 'bg-green-100 text-green-800' 
                                      : policy.status === 'scheduled'
                                      ? 'bg-orange-100 text-orange-800'
                                      : policy.status === 'draft'
                                      ? 'bg-gray-100 text-gray-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {policy.status}
                                  </span>
                                  <span className="text-xs text-gray-500 mt-1">
                                    v{policy.version} {policy.has_history && `(${policy.total_versions} total)`}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="space-y-1">
                                  <div>Created: {new Date(policy.created_at).toLocaleDateString()}</div>
                                  {policy.effective_date && (
                                    <div>Effective: {new Date(policy.effective_date).toLocaleDateString()}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      setSelectedPolicy(policy);
                                      setEditingPolicy({
                                        id: policy.id,
                                        title: policy.title,
                                        content: policy.content,
                                        notes: policy.notes || ''
                                      });
                                    }}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    Edit
                                  </button>
                                  {policy.has_history && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          const historyData = await adminAPI.getPolicyHistory(policy.policy_type);
                                          setPolicyHistory(historyData.history || []);
                                          setSelectedPolicy(policy);
                                          setShowPolicyHistory(true);
                                        } catch (error) {
                                          toast({ title: "Failed to load policy history", variant: "destructive" });
                                        }
                                      }}
                                      className="text-purple-600 hover:text-purple-900"
                                    >
                                      History
                                    </button>
                                  )}
                                  {policy.status === 'draft' && (
                                    <button
                                      onClick={async () => {
                                        if (window.confirm(`Delete draft policy "${policy.title}"?`)) {
                                          try {
                                            await adminAPI.deletePolicy(policy.id);
                                            toast({ title: "Policy deleted successfully" });
                                            fetchData();
                                          } catch (error) {
                                            toast({ title: "Failed to delete policy", variant: "destructive" });
                                          }
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Delete
                                    </button>
                                  )}
                                  {policy.status !== 'archived' && (
                                    <button
                                      onClick={async () => {
                                        if (window.confirm(`Archive policy "${policy.title}"?`)) {
                                          try {
                                            await adminAPI.archivePolicy(policy.id);
                                            toast({ title: "Policy archived successfully" });
                                            fetchData();
                                          } catch (error) {
                                            toast({ title: "Failed to archive policy", variant: "destructive" });
                                          }
                                        }
                                      }}
                                      className="text-yellow-600 hover:text-yellow-900"
                                    >
                                      Archive
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {policies.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No policies found. Click "Add New Policy" to create your first policy.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit Policy Modal */}
                  {editingPolicy && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h4 className="text-lg font-semibold mb-4">Edit Policy</h4>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.target);
                          const policyData = {
                            title: formData.get('title'),
                            content: formData.get('content'),
                            effective_date: formData.get('effective_date') || null,
                            notes: formData.get('notes') || ''
                          };
                          
                          try {
                            await adminAPI.updatePolicy(editingPolicy.id, policyData);
                            toast({ title: "Policy updated successfully" });
                            setEditingPolicy(null);
                            fetchData();
                          } catch (error) {
                            toast({ title: "Failed to update policy", variant: "destructive" });
                          }
                        }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Policy Title
                              </label>
                              <input
                                type="text"
                                name="title"
                                required
                                minLength="5"
                                defaultValue={editingPolicy.title}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Effective Date (Optional)
                              </label>
                              <input
                                type="datetime-local"
                                name="effective_date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Policy Content
                            </label>
                            <textarea
                              name="content"
                              required
                              minLength="50"
                              rows="15"
                              defaultValue={editingPolicy.content}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            />
                          </div>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Admin Notes (Optional)
                            </label>
                            <input
                              type="text"
                              name="notes"
                              maxLength="500"
                              defaultValue={editingPolicy.notes}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                            >
                              Update Policy
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPolicy(null)}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Policy History Modal */}
                  {showPolicyHistory && selectedPolicy && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white p-6 rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-lg font-semibold">
                            Policy History: {selectedPolicy.title}
                          </h4>
                          <button
                            onClick={() => {
                              setShowPolicyHistory(false);
                              setSelectedPolicy(null);
                              setPolicyHistory([]);
                            }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          {policyHistory.map((version, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h5 className="font-medium">Version {version.version}</h5>
                                  <p className="text-sm text-gray-500">
                                    Created by {version.created_by} on {new Date(version.created_at).toLocaleDateString()}
                                  </p>
                                  {version.effective_date && (
                                    <p className="text-sm text-gray-500">
                                      Effective: {new Date(version.effective_date).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`Restore version ${version.version}? This will create a new active version.`)) {
                                      try {
                                        await adminAPI.restorePolicyVersion(selectedPolicy.policy_type, version.version);
                                        toast({ title: `Version ${version.version} restored successfully` });
                                        setShowPolicyHistory(false);
                                        fetchData();
                                      } catch (error) {
                                        toast({ title: "Failed to restore version", variant: "destructive" });
                                      }
                                    }
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                >
                                  Restore
                                </button>
                              </div>
                              <div className="text-sm">
                                <p className="font-medium mb-1">{version.title}</p>
                                <div className="bg-gray-50 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                                  {version.content.substring(0, 500)}
                                  {version.content.length > 500 && '...'}
                                </div>
                                {version.notes && (
                                  <p className="text-gray-600 mt-2">Notes: {version.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Management Tab */}
              {activeTab === 'contacts' && (
                <ContactManagementTab
                  contacts={contacts}
                  contactTypes={contactTypes}
                  showAddContact={showAddContact}
                  setShowAddContact={setShowAddContact}
                  editingContact={editingContact}
                  setEditingContact={setEditingContact}
                  loading={loading}
                  fetchData={fetchData}
                  toast={toast}
                />
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

              {/* User Management Tab */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">User Management</h2>
                    {userStats && (
                      <div className="flex space-x-4 text-sm text-gray-600">
                        <span>Total: {userStats.total_users}</span>
                        <span>Active: {userStats.active_users}</span>
                        <span>Verified: {userStats.verified_users}</span>
                      </div>
                    )}
                  </div>

                  {/* User Statistics Cards */}
                  {userStats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="text-sm font-medium text-blue-800">Total Users</h3>
                        <p className="text-2xl font-bold text-blue-600">{userStats.total_users}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="text-sm font-medium text-green-800">Active Users</h3>
                        <p className="text-2xl font-bold text-green-600">{userStats.active_users}</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h3 className="text-sm font-medium text-purple-800">Tradespeople</h3>
                        <p className="text-2xl font-bold text-purple-600">{userStats.tradespeople}</p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <h3 className="text-sm font-medium text-orange-800">Homeowners</h3>
                        <p className="text-2xl font-bold text-orange-600">{userStats.homeowners}</p>
                      </div>
                    </div>
                  )}

                  {/* Users Table */}
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-gray-50 p-4 rounded-lg animate-pulse">
                          <div className="flex justify-between items-center">
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-48"></div>
                              <div className="h-3 bg-gray-200 rounded w-32"></div>
                            </div>
                            <div className="h-8 bg-gray-200 rounded w-20"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User Details
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role & Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Activity
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Registration
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                              <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-700">
                                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">
                                        {user.name || 'No Name'}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {user.email}
                                      </div>
                                      {user.phone && (
                                        <div className="text-xs text-gray-400">
                                          {user.phone}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      user.role === 'tradesperson' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {user.role}
                                    </span>
                                    <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      user.status === 'active' 
                                        ? 'bg-green-100 text-green-800' 
                                        : user.status === 'suspended'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {user.status || 'active'}
                                    </span>
                                    {user.is_verified && (
                                      <span className="mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                        ✓ Verified
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {user.role === 'tradesperson' ? (
                                    <div className="space-y-1">
                                      <div>Interests: {user.interests_shown || 0}</div>
                                      <div>Wallet: {user.wallet_balance || 0} coins</div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div>Jobs: {user.jobs_posted || 0}</div>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => window.alert(`User ID: ${user.id}\nEmail: ${user.email}\nRole: ${user.role}\nStatus: ${user.status || 'active'}`)}
                                      className="text-blue-600 hover:text-blue-900"
                                    >
                                      View
                                    </button>
                                    {user.status !== 'suspended' && (
                                      <button
                                        onClick={() => {
                                          if (window.confirm(`Suspend user ${user.name || user.email}?`)) {
                                            adminAPI.updateUserStatus(user.id, 'suspended', 'Suspended by admin')
                                              .then(() => {
                                                toast({ title: "User suspended successfully" });
                                                fetchData();
                                              })
                                              .catch(() => {
                                                toast({ title: "Failed to suspend user", variant: "destructive" });
                                              });
                                          }
                                        }}
                                        className="text-yellow-600 hover:text-yellow-900"
                                      >
                                        Suspend
                                      </button>
                                    )}
                                    {user.status === 'suspended' && (
                                      <button
                                        onClick={() => {
                                          if (window.confirm(`Reactivate user ${user.name || user.email}?`)) {
                                            adminAPI.updateUserStatus(user.id, 'active', 'Reactivated by admin')
                                              .then(() => {
                                                toast({ title: "User reactivated successfully" });
                                                fetchData();
                                              })
                                              .catch(() => {
                                                toast({ title: "Failed to reactivate user", variant: "destructive" });
                                              });
                                          }
                                        }}
                                        className="text-green-600 hover:text-green-900"
                                      >
                                        Activate
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Edit {editingItem.type === 'state' ? 'State' : editingItem.type === 'lga' ? 'LGA' : editingItem.type === 'trade' ? 'Trade Category' : 'Item'}
            </h3>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              
              try {
                if (editingItem.type === 'state') {
                  await adminAPI.updateState(
                    editingItem.name,
                    formData.get('new_name'),
                    formData.get('region'),
                    formData.get('postcodes')
                  );
                } else if (editingItem.type === 'lga') {
                  await adminAPI.updateLGA(
                    editingItem.state,
                    editingItem.name,
                    formData.get('new_name'),
                    formData.get('zip_codes')
                  );
                } else if (editingItem.type === 'trade') {
                  await adminAPI.updateTrade(
                    editingItem.name,
                    formData.get('new_name'),
                    formData.get('group'),
                    formData.get('description')
                  );
                }
                
                toast({ title: `${editingItem.type} updated successfully` });
                setEditingItem(null);
                fetchData();
              } catch (error) {
                toast({ title: `Failed to update ${editingItem.type}`, variant: "destructive" });
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingItem.type === 'state' ? 'State' : editingItem.type === 'lga' ? 'LGA' : 'Trade'} Name *
                  </label>
                  <input
                    type="text"
                    name="new_name"
                    required
                    defaultValue={editingItem.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {editingItem.type === 'state' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Region
                      </label>
                      <input
                        type="text"
                        name="region"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., South West"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sample Postcodes
                      </label>
                      <input
                        type="text"
                        name="postcodes"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 110001,110002"
                      />
                    </div>
                  </>
                )}
                
                {editingItem.type === 'lga' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zip Codes
                    </label>
                    <input
                      type="text"
                      name="zip_codes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 110001,110002"
                    />
                  </div>
                )}
                
                {editingItem.type === 'trade' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Group
                      </label>
                      <select
                        name="group"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="General Services">General Services</option>
                        {tradeGroups.map((group, index) => (
                          <option key={index} value={group}>{group}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        name="description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Brief description"
                      />
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Skills Question Modal */}
      {(showAddQuestion || editingQuestion) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingQuestion ? 'Edit Question' : 'Add New Question'}
            </h3>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              
              const questionData = {
                question: formData.get('question'),
                options: [
                  formData.get('option1'),
                  formData.get('option2'),
                  formData.get('option3'),
                  formData.get('option4')
                ].filter(opt => opt && opt.trim()),
                correct_answer: parseInt(formData.get('correct_answer')),
                category: formData.get('category'),
                explanation: formData.get('explanation'),
                difficulty: formData.get('difficulty')
              };

              try {
                if (editingQuestion) {
                  await adminAPI.updateSkillsQuestion(editingQuestion.id, questionData);
                  toast({ title: "Question updated successfully" });
                } else {
                  await adminAPI.addSkillsQuestion(selectedTrade, questionData);
                  toast({ title: "Question added successfully" });
                }
                
                setShowAddQuestion(false);
                setEditingQuestion(null);
                fetchData();
              } catch (error) {
                toast({ 
                  title: editingQuestion ? "Failed to update question" : "Failed to add question", 
                  variant: "destructive" 
                });
              }
            }}>
              <div className="space-y-4">
                {/* Question Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question *
                  </label>
                  <textarea
                    name="question"
                    required
                    defaultValue={editingQuestion?.question || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Enter the question text..."
                  />
                </div>

                {/* Answer Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Answer Options *
                  </label>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((num) => (
                      <div key={num} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="correct_answer"
                          value={num - 1}
                          defaultChecked={editingQuestion?.correct_answer === (num - 1)}
                          className="text-green-600"
                          required
                        />
                        <input
                          type="text"
                          name={`option${num}`}
                          defaultValue={editingQuestion?.options?.[num - 1] || ''}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={`Option ${num}`}
                          required={num <= 2}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Select the radio button next to the correct answer. At least 2 options required.
                  </p>
                </div>

                {/* Category and Difficulty */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      name="category"
                      defaultValue={editingQuestion?.category || 'Technical Knowledge'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Technical Knowledge">Technical Knowledge</option>
                      <option value="Safety Standards">Safety Standards</option>
                      <option value="Nigerian Building Code">Nigerian Building Code</option>
                      <option value="Materials & Tools">Materials & Tools</option>
                      <option value="Quality Control">Quality Control</option>
                      <option value="Climate Considerations">Climate Considerations</option>
                      <option value="Regional Considerations">Regional Considerations</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulty
                    </label>
                    <select
                      name="difficulty"
                      defaultValue={editingQuestion?.difficulty || 'Medium'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Explanation (Optional)
                  </label>
                  <textarea
                    name="explanation"
                    defaultValue={editingQuestion?.explanation || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Explain why this is the correct answer..."
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddQuestion(false);
                    setEditingQuestion(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {showJobDetailsModal && selectedJobDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">Job Details</h3>
              <button
                onClick={() => setShowJobDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Title:</strong> {selectedJobDetails.title}</div>
                    <div><strong>Category:</strong> {selectedJobDetails.category}</div>
                    <div><strong>Location:</strong> {selectedJobDetails.location}</div>
                    <div><strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs ${getJobStatusColor(selectedJobDetails.status)}`}>{selectedJobDetails.status}</span></div>
                    <div><strong>Timeline:</strong> {selectedJobDetails.timeline || 'Not specified'}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Budget & Fees</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Budget:</strong> {selectedJobDetails.budget_min && selectedJobDetails.budget_max ? `₦${selectedJobDetails.budget_min.toLocaleString()} - ₦${selectedJobDetails.budget_max.toLocaleString()}` : 'Negotiable'}</div>
                    <div><strong>Access Fee:</strong> ₦{selectedJobDetails.access_fee_naira?.toLocaleString() || '1,000'} ({selectedJobDetails.access_fee_coins || 10} coins)</div>
                    <div><strong>Interests:</strong> {selectedJobDetails.interests_count || 0} tradespeople</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {selectedJobDetails.description}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Homeowner Information</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {selectedJobDetails.homeowner?.name || 'Unknown'}</div>
                  <div><strong>Email:</strong> {selectedJobDetails.homeowner?.email || 'Not available'}</div>
                  <div><strong>Phone:</strong> {selectedJobDetails.homeowner?.phone || 'Not available'}</div>
                </div>
              </div>

              {selectedJobDetails.interested_tradespeople && selectedJobDetails.interested_tradespeople.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Interested Tradespeople</h4>
                  <div className="space-y-2">
                    {selectedJobDetails.interested_tradespeople.map((tp, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                        <div className="flex justify-between">
                          <span><strong>{tp.tradesperson_name}</strong> ({tp.tradesperson_email})</span>
                          <span className={`px-2 py-1 rounded text-xs ${tp.status === 'paid_access' ? 'bg-green-100 text-green-800' : tp.status === 'contact_shared' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {tp.status}
                          </span>
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          Applied: {new Date(tp.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {showEditJobModal && editingJobData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">Edit Job</h3>
              <button
                onClick={() => setShowEditJobModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const jobData = {
                title: formData.get('title'),
                description: formData.get('description'),
                category: formData.get('category'),
                location: formData.get('location'),
                timeline: formData.get('timeline'),
                budget_min: formData.get('budget_min') ? parseInt(formData.get('budget_min')) : null,
                budget_max: formData.get('budget_max') ? parseInt(formData.get('budget_max')) : null,
                access_fee_naira: formData.get('access_fee_naira') ? parseInt(formData.get('access_fee_naira')) : null,
                status: formData.get('status')
              };
              
              try {
                await adminAPI.updateJobAdmin(editingJobData.id, jobData);
                toast({
                  title: "Success",
                  description: "Job updated successfully",
                });
                setShowEditJobModal(false);
                fetchData();
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to update job",
                  variant: "destructive",
                });
              }
            }}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    name="title"
                    type="text"
                    defaultValue={editingJobData.title}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    rows={4}
                    defaultValue={editingJobData.description}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <input
                      name="category"
                      type="text"
                      defaultValue={editingJobData.category}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Location</label>
                    <input
                      name="location"
                      type="text"
                      defaultValue={editingJobData.location}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Timeline</label>
                  <input
                    name="timeline"
                    type="text"
                    defaultValue={editingJobData.timeline}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Budget (₦)</label>
                    <input
                      name="budget_min"
                      type="number"
                      defaultValue={editingJobData.budget_min}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Budget (₦)</label>
                    <input
                      name="budget_max"
                      type="number"
                      defaultValue={editingJobData.budget_max}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Access Fee (₦)</label>
                    <input
                      name="access_fee_naira"
                      type="number"
                      defaultValue={editingJobData.access_fee_naira}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      name="status"
                      defaultValue={editingJobData.status}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="expired">Expired</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 p-6 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditJobModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Update Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminDashboard;