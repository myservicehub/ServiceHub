import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api/wallet';
import { adminReferralsAPI } from '../api/referrals';
import { useToast } from '../hooks/use-toast';
import ContactManagementTab from './ContactManagementTab';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AdminDataTable from '../components/admin/AdminDataTable';
import BulkActionsBar from '../components/admin/BulkActionsBar';
import ConfirmDeleteModal from '../components/admin/ConfirmDeleteModal';
import InlineEditForm from '../components/admin/InlineEditForm';

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
  
  // Enhanced CRUD state
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, items: [], type: 'single' });
  const [editingInline, setEditingInline] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Notification Management state
  const [notifications, setNotifications] = useState([]);
  const [notificationTemplates, setNotificationTemplates] = useState([]);
  const [userPreferences, setUserPreferences] = useState([]);
  const [notificationStats, setNotificationStats] = useState({});
  const [notificationFilters, setNotificationFilters] = useState({
    type: '',
    status: '',
    channel: '',
    date_from: '',
    date_to: ''
  });
  const [activeNotificationTab, setActiveNotificationTab] = useState('notifications');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Job Approval Management state
  const [pendingJobs, setPendingJobs] = useState([]);
  const [approvalStats, setApprovalStats] = useState({});
  const [selectedJob, setSelectedJob] = useState(null);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);
  
  // Enhanced Job Editing state
  const [editJobModal, setEditJobModal] = useState(null);
  const [editJobForm, setEditJobForm] = useState({});
  const [processingEdit, setProcessingEdit] = useState(false);
  const [editJobErrors, setEditJobErrors] = useState({});
  
  // Job Access Fees Management state
  const [jobsWithFees, setJobsWithFees] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [editingJobFee, setEditingJobFee] = useState(null);
  const [feeUpdateInProgress, setFeeUpdateInProgress] = useState(false);
  const [feesLoading, setFeesLoading] = useState(false);
  
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
  }, [isLoggedIn, activeTab, activeLocationTab]);

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
          console.log('Loading trade categories data...');
          const data = await adminAPI.getAllTrades();
          console.log('Trade data received:', data);
          setTrades(data.trades || []);
          // Extract group names from the groups object
          const groupNames = data.groups ? Object.keys(data.groups) : [];
          console.log('Extracted group names:', groupNames);
          setTradeGroups(groupNames);
        }
      } else if (activeTab === 'skills') {
        // Load both skills questions and available trade categories
        const [questionsData, tradesData] = await Promise.all([
          adminAPI.getAllSkillsQuestions(),
          adminAPI.getAllTrades()
        ]);
        
        setSkillsQuestions(questionsData.questions || {});
        setQuestionStats(questionsData.stats || {});
        setTrades(tradesData.trades || []); // Use trades for dropdown options
        // Extract group names from the groups object for skills questions context
        setTradeGroups(tradesData.groups ? Object.keys(tradesData.groups) : []);
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

  // User Management Handlers
  const handleViewUserDetails = async (user) => {
    try {
      setSelectedUser(user);
      
      // Fetch detailed user information from API
      const detailedUser = await adminAPI.getUserDetails(user.id);
      if (detailedUser) {
        setSelectedUser({...user, ...detailedUser});
      }
      
      setShowUserDetailsModal(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      // Still show basic user info if detailed fetch fails
      setSelectedUser(user);
      setShowUserDetailsModal(true);
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setDeletingUser(true);
      
      await adminAPI.deleteUser(userToDelete.id);
      
      toast({
        title: "Success",
        description: `User ${userToDelete.name || userToDelete.email} has been deleted successfully.`,
      });
      
      setShowDeleteConfirmModal(false);
      setUserToDelete(null);
      fetchData(); // Refresh the user list
      
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(false);
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

  const handleEditJob = async (job) => {
    try {
      setLoading(true);
      
      // Get detailed job information including access fees
      const response = await adminAPI.getJobDetailsAdmin(job.id);
      const jobDetails = response.job;
      
      setEditingJobData(jobDetails);
      setShowEditJobModal(true);
      
    } catch (error) {
      console.error('Failed to load job details:', error);
      toast({
        title: "Error",
        description: "Failed to load job details for editing",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
    if (isLoggedIn && activeTab === 'notifications') {
      handleNotificationDataLoad();
    }
    if (isLoggedIn && activeTab === 'approvals') {
      handleJobApprovalsDataLoad();
    }
    if (isLoggedIn && activeTab === 'fees') {
      handleJobAccessFeesDataLoad();
    }
  }, [isLoggedIn, activeTab]);

  // ==========================================
  // JOB APPROVAL MANAGEMENT FUNCTIONS
  // ==========================================

  const handleJobApprovalsDataLoad = async () => {
    setLoading(true);
    try {
      // Load pending jobs
      const pendingJobsData = await adminAPI.getPendingJobs();
      setPendingJobs(pendingJobsData.jobs || []);
      
      // Get approval statistics
      const statsData = await adminAPI.getJobStatistics();
      setApprovalStats(statsData.statistics || {});
      
    } catch (error) {
      console.error('Failed to load job approvals data:', error);
      toast({
        title: "Error",
        description: "Failed to load job approvals data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveJob = async (jobId, action, notes = '') => {
    if (!window.confirm(`Are you sure you want to ${action} this job?`)) {
      return;
    }
    
    try {
      setProcessingApproval(true);
      
      await adminAPI.approveJob(jobId, {
        action: action,
        notes: notes
      });
      
      toast({
        title: "Success",
        description: `Job ${action}d successfully. Homeowner has been notified.`
      });
      
      // Refresh pending jobs
      handleJobApprovalsDataLoad();
      setSelectedJob(null);
      setApprovalNotes('');
      
    } catch (error) {
      console.error(`Failed to ${action} job:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} job`,
        variant: "destructive"
      });
    } finally {
      setProcessingApproval(false);
    }
  };

  const getJobPriorityLevel = (job) => {
    // Calculate priority based on budget, location, and homeowner history
    const budget = (job.budget_min || 0) + (job.budget_max || 0);
    const totalJobs = job.homeowner?.total_jobs || 0;
    
    if (budget > 500000 || totalJobs > 5) return 'high';
    if (budget > 200000 || totalJobs > 2) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // ==========================================
  // ENHANCED JOB EDITING FUNCTIONS
  // ==========================================

  const handleOpenJobEditor = async (job) => {
    try {
      setLoading(true);
      
      // Get detailed job information
      const response = await adminAPI.getJobDetailsAdmin(job.id);
      const jobDetails = response.job;
      
      // Initialize edit form with current values
      setEditJobForm({
        title: jobDetails.title || '',
        description: jobDetails.description || '',
        category: jobDetails.category || '',
        state: jobDetails.state || '',
        lga: jobDetails.lga || '',
        town: jobDetails.town || '',
        zip_code: jobDetails.zip_code || '',
        home_address: jobDetails.home_address || '',
        budget_min: jobDetails.budget_min || '',
        budget_max: jobDetails.budget_max || '',
        timeline: jobDetails.timeline || '',
        access_fee_naira: jobDetails.access_fees?.naira || 1000,
        access_fee_coins: jobDetails.access_fees?.coins || 10,
        admin_notes: ''
      });
      
      setEditJobModal(jobDetails);
      setEditJobErrors({});
      
    } catch (error) {
      console.error('Failed to load job details:', error);
      toast({
        title: "Error",
        description: "Failed to load job details for editing",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJobChanges = async () => {
    if (!editJobModal) return;
    
    // Validate form
    const errors = {};
    
    if (editJobForm.title && editJobForm.title.length < 5) {
      errors.title = 'Title must be at least 5 characters';
    }
    
    if (editJobForm.description && editJobForm.description.length < 20) {
      errors.description = 'Description must be at least 20 characters';
    }
    
    if (editJobForm.access_fee_naira && (editJobForm.access_fee_naira < 500 || editJobForm.access_fee_naira > 10000)) {
      errors.access_fee_naira = 'Access fee must be between ₦500 and ₦10,000';
    }
    
    if (editJobForm.access_fee_coins && (editJobForm.access_fee_coins < 5 || editJobForm.access_fee_coins > 100)) {
      errors.access_fee_coins = 'Access fee must be between 5 and 100 coins';
    }
    
    if (editJobForm.budget_min && editJobForm.budget_max && 
        parseInt(editJobForm.budget_min) > parseInt(editJobForm.budget_max)) {
      errors.budget_max = 'Maximum budget must be greater than minimum budget';
    }
    
    if (Object.keys(errors).length > 0) {
      setEditJobErrors(errors);
      return;
    }
    
    try {
      setProcessingEdit(true);
      
      // Prepare update data (only include changed fields)
      const updateData = {};
      const originalJob = editJobModal;
      
      Object.keys(editJobForm).forEach(key => {
        const newValue = editJobForm[key];
        const originalValue = key === 'access_fee_naira' ? originalJob.access_fees?.naira :
                             key === 'access_fee_coins' ? originalJob.access_fees?.coins :
                             originalJob[key];
        
        // Include field if it's different and not empty
        if (newValue !== '' && newValue != originalValue) {
          updateData[key] = newValue;
        }
      });
      
      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No Changes",
          description: "No changes were made to the job",
        });
        setEditJobModal(null);
        return;
      }
      
      await adminAPI.editJobAdmin(editJobModal.id, updateData);
      
      toast({
        title: "Success",
        description: `Job updated successfully. Homeowner has been notified of the changes.`
      });
      
      // Refresh jobs list
      handleJobApprovalsDataLoad();
      setEditJobModal(null);
      setEditJobForm({});
      
    } catch (error) {
      console.error('Failed to update job:', error);
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive"
      });
    } finally {
      setProcessingEdit(false);
    }
  };

  const handleJobEditFormChange = (field, value) => {
    setEditJobForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (editJobErrors[field]) {
      setEditJobErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // ==========================================
  // JOB ACCESS FEES MANAGEMENT FUNCTIONS
  // ==========================================

  const handleJobAccessFeesDataLoad = async () => {
    setFeesLoading(true);
    try {
      const feesData = await adminAPI.getJobsWithAccessFees();
      setJobsWithFees(feesData.jobs || []);
      
    } catch (error) {
      console.error('Failed to load job access fees data:', error);
      toast({
        title: "Error",
        description: "Failed to load job access fees data",
        variant: "destructive"
      });
    } finally {
      setFeesLoading(false);
    }
  };

  const handleUpdateJobAccessFee = async (jobId, newFee) => {
    if (!newFee || newFee < 500 || newFee > 10000) {
      toast({
        title: "Invalid Fee",
        description: "Access fee must be between ₦500 and ₦10,000",
        variant: "destructive"
      });
      return;
    }

    try {
      setFeeUpdateInProgress(true);
      
      await adminAPI.updateJobAccessFee(jobId, newFee);
      
      toast({
        title: "Success",
        description: "Job access fee updated successfully"
      });
      
      // Refresh the jobs list
      handleJobAccessFeesDataLoad();
      setEditingJobFee(null);
      
    } catch (error) {
      console.error('Failed to update job access fee:', error);
      toast({
        title: "Error",
        description: "Failed to update job access fee",
        variant: "destructive"
      });
    } finally {
      setFeeUpdateInProgress(false);
    }
  };

  // ==========================================
  // ENHANCED CRUD OPERATIONS

  // ==========================================
  // NOTIFICATION MANAGEMENT FUNCTIONS
  // ==========================================

  const handleNotificationDataLoad = async () => {
    setLoading(true);
    try {
      // Load notifications with current filters
      const notificationsData = await adminAPI.getAllNotifications(notificationFilters);
      setNotifications(notificationsData.notifications || []);
      setNotificationStats(notificationsData.stats || {});
      
      // Load templates and preferences based on active tab
      if (activeNotificationTab === 'templates') {
        const templatesData = await adminAPI.getNotificationTemplates();
        setNotificationTemplates(templatesData.templates || []);
      } else if (activeNotificationTab === 'preferences') {
        const preferencesData = await adminAPI.getUserNotificationPreferences();
        setUserPreferences(preferencesData.preferences || []);
      }
    } catch (error) {
      console.error('Failed to load notification data:', error);
      toast({
        title: "Error",
        description: "Failed to load notification data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotificationStatus = async (notificationId, status, adminNotes = '') => {
    try {
      setIsProcessing(true);
      await adminAPI.updateNotificationStatus(notificationId, status, adminNotes);
      
      toast({
        title: "Success",
        description: `Notification status updated to ${status}`
      });
      
      // Refresh notifications
      handleNotificationDataLoad();
    } catch (error) {
      console.error('Failed to update notification status:', error);
      toast({
        title: "Error",
        description: "Failed to update notification status",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendNotification = async (notificationId) => {
    try {
      setIsProcessing(true);
      await adminAPI.resendNotification(notificationId);
      
      toast({
        title: "Success",
        description: "Notification queued for resending"
      });
      
      // Refresh notifications
      handleNotificationDataLoad();
    } catch (error) {
      console.error('Failed to resend notification:', error);
      toast({
        title: "Error",
        description: "Failed to resend notification",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsProcessing(true);
      await adminAPI.deleteNotification(notificationId);
      
      toast({
        title: "Success",
        description: "Notification deleted successfully"
      });
      
      // Refresh notifications
      handleNotificationDataLoad();
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateTemplate = async (templateId, templateData) => {
    try {
      setIsProcessing(true);
      await adminAPI.updateNotificationTemplate(templateId, templateData);
      
      toast({
        title: "Success",
        description: "Template updated successfully"
      });
      
      // Refresh templates
      const templatesData = await adminAPI.getNotificationTemplates();
      setNotificationTemplates(templatesData.templates || []);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Failed to update template:', error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestTemplate = async (templateId, testData) => {
    try {
      const result = await adminAPI.testNotificationTemplate(templateId, testData);
      
      // Show test result in a modal or alert
      alert(`Template Test Result:\n\nSubject: ${result.rendered_subject}\n\nContent:\n${result.rendered_content}`);
    } catch (error) {
      console.error('Failed to test template:', error);
      toast({
        title: "Error",
        description: "Failed to test template",
        variant: "destructive"
      });
    }
  };

  const getNotificationStatusColor = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNotificationChannelIcon = (channel) => {
    switch (channel) {
      case 'email':
        return '📧';
      case 'sms':
        return '📱';
      case 'both':
        return '📧📱';
      default:
        return '🔔';
    }
  };

  // Enhanced CRUD Operations
  const handleInlineEdit = async (item, formData, entityType) => {
    setIsProcessing(true);
    try {
      let success = false;
      
      switch (entityType) {
        case 'state':
          success = await adminAPI.updateState(item.name, formData.name, formData.region, formData.postcode_samples);
          break;
        case 'lga':
          success = await adminAPI.updateLGA(formData.state_name, item.name, formData.name, formData.zip_codes);
          break;
        case 'town':
          success = await adminAPI.updateTown(formData.state_name, formData.lga_name, item.name, formData.name, formData.zip_code);
          break;
        case 'trade':
          success = await adminAPI.updateTrade(item.name, formData.name, formData.group, formData.description);
          break;
        case 'contact':
          success = await adminAPI.updateContact(item.id, formData);
          break;
        case 'policy':
          success = await adminAPI.updatePolicy(item.id, formData);
          break;
        case 'user':
          success = await adminAPI.updateUserStatus(item.id, formData.status, formData.admin_notes);
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }
      
      if (success) {
        toast({
          title: "Success",
          description: `${entityType} updated successfully`
        });
        fetchData(); // Refresh the data
        setEditingInline(null);
      }
    } catch (error) {
      console.error(`Failed to update ${entityType}:`, error);
      toast({
        title: "Error",
        description: `Failed to update ${entityType}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSingleDelete = async (item, entityType) => {
    setIsProcessing(true);
    try {
      let success = false;
      
      switch (entityType) {
        case 'state':
          success = await adminAPI.deleteState(item.name);
          break;
        case 'lga':
          success = await adminAPI.deleteLGA(item.state_name, item.name);
          break;
        case 'town':
          success = await adminAPI.deleteTown(item.state_name, item.lga_name, item.name);
          break;
        case 'trade':
          success = await adminAPI.deleteTrade(item.name);
          break;
        case 'contact':
          success = await adminAPI.deleteContact(item.id);
          break;
        case 'policy':
          success = await adminAPI.deletePolicy(item.id);
          break;
        case 'job':
          success = await adminAPI.deleteJob(item.id);
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }
      
      if (success) {
        toast({
          title: "Success",
          description: `${entityType} deleted successfully`
        });
        fetchData(); // Refresh the data
      }
    } catch (error) {
      console.error(`Failed to delete ${entityType}:`, error);
      toast({
        title: "Error",
        description: `Failed to delete ${entityType}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setConfirmDelete({ isOpen: false, items: [], type: 'single' });
    }
  };

  const handleBulkDelete = async (items, entityType) => {
    setBulkActionInProgress(true);
    setIsProcessing(true);
    
    try {
      const results = await Promise.allSettled(
        items.map(async (item) => {
          switch (entityType) {
            case 'state':
              return await adminAPI.deleteState(item.name);
            case 'lga':
              return await adminAPI.deleteLGA(item.state_name, item.name);
            case 'town':
              return await adminAPI.deleteTown(item.state_name, item.lga_name, item.name);
            case 'trade':
              return await adminAPI.deleteTrade(item.name);
            case 'contact':
              return await adminAPI.deleteContact(item.id);
            case 'policy':
              return await adminAPI.deletePolicy(item.id);
            case 'job':
              return await adminAPI.deleteJob(item.id);
            default:
              throw new Error(`Unknown entity type: ${entityType}`);
          }
        })
      );
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;
      
      if (successful > 0) {
        toast({
          title: "Bulk Delete Completed",
          description: `${successful} ${entityType}${successful !== 1 ? 's' : ''} deleted successfully${failed > 0 ? `, ${failed} failed` : ''}`
        });
        fetchData(); // Refresh the data
        setSelectedItems([]); // Clear selection
      }
      
      if (failed > 0 && successful === 0) {
        toast({
          title: "Bulk Delete Failed",
          description: `Failed to delete ${failed} ${entityType}${failed !== 1 ? 's' : ''}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`Bulk delete failed:`, error);
      toast({
        title: "Error",
        description: "Bulk delete operation failed",
        variant: "destructive"
      });
    } finally {
      setBulkActionInProgress(false);
      setIsProcessing(false);
      setConfirmDelete({ isOpen: false, items: [], type: 'bulk' });
    }
  };

  const handleSelectionChange = (newSelection) => {
    setSelectedItems(newSelection);
  };

  const handleSelectAll = (entityType) => {
    let allItems = [];
    switch (entityType) {
      case 'states':
        allItems = states.map(state => ({ name: state }));
        break;
      case 'trades':
        allItems = trades.map(trade => ({ name: trade }));
        break;
      // Add more cases as needed
      default:
        allItems = [];
    }
    const allIds = allItems.map(item => item.name || item.id);
    setSelectedItems(allIds);
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
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
                  { id: 'fees', label: 'Job Access Fees', icon: '💳' },
                  { id: 'approvals', label: 'Job Approvals', icon: '✅' },
                  { id: 'verifications', label: 'ID Verifications', icon: '🆔' },
                  { id: 'users', label: 'User Management', icon: '👥' },
                  { id: 'locations', label: 'Locations & Trades', icon: '🗺️' },
                  { id: 'skills', label: 'Skills Questions', icon: '❓' },
                  { id: 'policies', label: 'Policy Management', icon: '📋' },
                  { id: 'contacts', label: 'Contact Management', icon: '📞' },
                  { id: 'notifications', label: 'Notifications', icon: '🔔' },
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

              {/* Job Access Fees Management Tab */}
              {activeTab === 'fees' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Job Access Fees Management</h2>
                    <button
                      onClick={handleJobAccessFeesDataLoad}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Access Fees Table */}
                  <div className="bg-white rounded-lg border">
                    <div className="px-6 py-4 border-b">
                      <h3 className="text-lg font-semibold">Jobs with Access Fees</h3>
                      <p className="text-sm text-gray-600">Manage access fees for individual job postings</p>
                    </div>
                    
                    {feesLoading ? (
                      <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-600">Loading job access fees...</p>
                      </div>
                    ) : jobsWithFees.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-4">💳</div>
                        <h4 className="text-lg font-medium mb-2">No jobs found</h4>
                        <p>No job access fees to manage at this time.</p>
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
                                Homeowner
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Current Access Fee
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {jobsWithFees.map((job) => (
                              <tr key={job.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="font-medium text-gray-900 mb-1">{job.title}</div>
                                    <div className="text-sm text-gray-600 line-clamp-2">{job.description}</div>
                                    <div className="mt-1">
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {job.category}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="font-medium text-gray-900">{job.homeowner_name || 'Unknown'}</div>
                                    <div className="text-sm text-gray-600">{job.homeowner_email || ''}</div>
                                    <div className="text-xs text-gray-500">{job.homeowner_total_jobs || 0} total jobs</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="text-lg font-bold text-green-600">
                                      ₦{job.access_fee_naira?.toLocaleString() || '1,000'}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {job.access_fee_coins || 10} coins
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getJobStatusColor(job.status)}`}>
                                    {job.status?.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex space-x-2">
                                    {editingJobFee === job.id ? (
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="number"
                                          min="500"
                                          max="10000"
                                          defaultValue={job.access_fee_naira || 1000}
                                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                          id={`fee-input-${job.id}`}
                                          disabled={feeUpdateInProgress}
                                        />
                                        <button
                                          onClick={() => {
                                            const newFee = parseInt(document.getElementById(`fee-input-${job.id}`).value);
                                            handleUpdateJobAccessFee(job.id, newFee);
                                          }}
                                          disabled={feeUpdateInProgress}
                                          className="text-green-600 hover:text-green-900 text-sm font-medium disabled:opacity-50"
                                        >
                                          {feeUpdateInProgress ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                          onClick={() => setEditingJobFee(null)}
                                          disabled={feeUpdateInProgress}
                                          className="text-gray-600 hover:text-gray-900 text-sm font-medium disabled:opacity-50"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setEditingJobFee(job.id)}
                                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                      >
                                        Edit Fee
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Access Fee Guidelines */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Access Fee Guidelines</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• <strong>Minimum Fee:</strong> ₦500 (5 coins)</p>
                      <p>• <strong>Maximum Fee:</strong> ₦10,000 (100 coins)</p>
                      <p>• <strong>Standard Fee:</strong> ₦1,000 (10 coins) for most jobs</p>
                      <p>• <strong>Premium Jobs:</strong> Higher fees for jobs with budgets &gt;₦500,000</p>
                      <p>• <strong>Conversion Rate:</strong> 1 Naira = 0.1 Coins</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Approval Management Tab */}
              {activeTab === 'approvals' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Job Approval Management</h2>
                    <button
                      onClick={handleJobApprovalsDataLoad}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Approval Statistics */}
                  {approvalStats && Object.keys(approvalStats).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-yellow-600">{approvalStats.pending_jobs || 0}</div>
                        <div className="text-sm text-gray-600">Pending Approval</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-green-600">{approvalStats.approved_today || 0}</div>
                        <div className="text-sm text-gray-600">Approved Today</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-red-600">{approvalStats.rejected_today || 0}</div>
                        <div className="text-sm text-gray-600">Rejected Today</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600">{approvalStats.total_jobs || 0}</div>
                        <div className="text-sm text-gray-600">Total Jobs</div>
                      </div>
                    </div>
                  )}

                  {/* Pending Jobs Table */}
                  <div className="bg-white rounded-lg border">
                    <div className="px-6 py-4 border-b">
                      <h3 className="text-lg font-semibold">Jobs Pending Approval ({pendingJobs.length})</h3>
                    </div>
                    
                    {loading ? (
                      <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-600">Loading pending jobs...</p>
                      </div>
                    ) : pendingJobs.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-4">🎉</div>
                        <h4 className="text-lg font-medium mb-2">All caught up!</h4>
                        <p>No jobs are currently pending approval.</p>
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
                                Homeowner
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Budget & Location
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Priority
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Submitted
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {pendingJobs.map((job) => {
                              const priority = getJobPriorityLevel(job);
                              return (
                                <tr key={job.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4">
                                    <div>
                                      <div className="font-medium text-gray-900 mb-1">{job.title}</div>
                                      <div className="text-sm text-gray-600 line-clamp-2">{job.description}</div>
                                      <div className="mt-1">
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                          {job.category}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div>
                                      <div className="font-medium text-gray-900">{job.homeowner?.name || 'Unknown'}</div>
                                      <div className="text-sm text-gray-600">{job.homeowner?.email}</div>
                                      <div className="text-xs text-gray-500">
                                        {job.homeowner?.total_jobs || 0} total jobs
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {job.budget_min && job.budget_max ? 
                                          `₦${job.budget_min?.toLocaleString()} - ₦${job.budget_max?.toLocaleString()}` : 
                                          'Budget not specified'
                                        }
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {job.state && job.lga ? `${job.lga}, ${job.state}` : job.location}
                                      </div>
                                      <div className="text-xs text-gray-500">{job.timeline}</div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(priority)}`}>
                                      {priority.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600">
                                    {new Date(job.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => setSelectedJob(job)}
                                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                      >
                                        Review
                                      </button>
                                      <button
                                        onClick={() => handleOpenJobEditor(job)}
                                        className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleApproveJob(job.id, 'approve')}
                                        disabled={processingApproval}
                                        className="text-green-600 hover:text-green-900 text-sm font-medium disabled:opacity-50"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => {
                                          const reason = prompt('Reason for rejection (required):');
                                          if (reason && reason.trim()) {
                                            handleApproveJob(job.id, 'reject', reason.trim());
                                          }
                                        }}
                                        disabled={processingApproval}
                                        className="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
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
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setShowAddForm(!showAddForm)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                            >
                              {showAddForm ? 'Cancel' : 'Add New State'}
                            </button>
                            <button
                              onClick={fetchData}
                              className="text-blue-600 hover:text-blue-700 px-3 py-2 border border-blue-600 rounded-lg text-sm"
                            >
                              Refresh
                            </button>
                          </div>
                        </div>

                        {/* Bulk Actions Bar */}
                        <BulkActionsBar
                          selectedItems={selectedItems}
                          totalItems={states.length}
                          onSelectAll={() => handleSelectAll('states')}
                          onClearSelection={handleClearSelection}
                          onBulkDelete={(items) => setConfirmDelete({ 
                            isOpen: true, 
                            items: items.map(id => ({ name: id })), 
                            type: 'bulk' 
                          })}
                          isProcessing={bulkActionInProgress}
                        />

                        {showAddForm && (
                          <div className="bg-white p-4 rounded-lg border">
                            <h4 className="font-semibold mb-3">Add New State</h4>
                            <form onSubmit={async (e) => {
                              e.preventDefault();
                              const formData = new FormData(e.target);
                              try {
                                setIsProcessing(true);
                                await adminAPI.addNewState(
                                  formData.get('state_name'),
                                  formData.get('region'),
                                  formData.get('postcode_samples')
                                );
                                toast({ title: "State added successfully" });
                                setShowAddForm(false);
                                fetchData();
                              } catch (error) {
                                console.error('Add state error:', error);
                                toast({ title: "Failed to add state", variant: "destructive" });
                              } finally {
                                setIsProcessing(false);
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Enter state name"
                                    disabled={isProcessing}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Region
                                  </label>
                                  <input
                                    type="text"
                                    name="region"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="e.g., South West"
                                    disabled={isProcessing}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sample Postcodes
                                  </label>
                                  <input
                                    type="text"
                                    name="postcode_samples"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="e.g., 100001, 100234"
                                    disabled={isProcessing}
                                  />
                                </div>
                              </div>
                              <div className="mt-4 flex justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setShowAddForm(false)}
                                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                  disabled={isProcessing}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? 'Adding...' : 'Add State'}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {/* Enhanced States Table */}
                        <AdminDataTable
                          data={states.map(state => ({ name: state, id: state }))}
                          columns={[
                            { key: 'name', title: 'State Name', sortable: true }
                          ]}
                          entityName="state"
                          entityNamePlural="states"
                          onEdit={(item, formData) => handleInlineEdit(item, formData, 'state')}
                          onDelete={(item) => setConfirmDelete({ 
                            isOpen: true, 
                            items: [item], 
                            type: 'single' 
                          })}
                          allowInlineEdit={true}
                          allowDelete={true}
                          showSelection={true}
                          selectedItems={selectedItems}
                          onSelectionChange={handleSelectionChange}
                          editFields={[
                            { name: 'name', label: 'State Name', type: 'text', required: true },
                            { name: 'region', label: 'Region', type: 'text' },
                            { name: 'postcode_samples', label: 'Sample Postcodes', type: 'text' }
                          ]}
                          validationRules={{
                            name: { minLength: 2, maxLength: 50 }
                          }}
                          isLoading={loading}
                        />
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
                                            <div className="text-sm text-gray-700">
                                              <div className="font-medium">{typeof town === 'string' ? town : town.name}</div>
                                              {typeof town === 'object' && town.zip_code && (
                                                <div className="text-xs text-gray-500">Zip: {town.zip_code}</div>
                                              )}
                                            </div>
                                            <button
                                              onClick={async () => {
                                                const townName = typeof town === 'string' ? town : town.name;
                                                if (window.confirm(`Delete town "${townName}" from ${lga}, ${state}?`)) {
                                                  try {
                                                    await adminAPI.deleteTown(state, lga, townName);
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
                              
                              // Debug: log form data
                              const tradeName = formData.get('trade_name');
                              const group = formData.get('group');
                              const description = formData.get('description');
                              
                              console.log('Form submission data:', {
                                tradeName,
                                group,
                                description
                              });
                              
                              try {
                                const result = await adminAPI.addNewTrade(
                                  tradeName,
                                  group,
                                  description
                                );
                                console.log('API response:', result);
                                
                                // Show success toast
                                console.log('Attempting to show success toast...');
                                toast({ 
                                  title: "Trade category added successfully",
                                  description: `Added "${tradeName}" to ${group}`,
                                  variant: "default"
                                });
                                
                                setShowAddForm(false);
                                await fetchData();
                                console.log('Form closed and data refreshed');
                              } catch (error) {
                                console.error('Form submission error:', error);
                                console.error('Error details:', error.response?.data);
                                
                                // Show error toast with more details
                                console.log('Attempting to show error toast...');
                                toast({ 
                                  title: "Failed to add trade category", 
                                  description: error.response?.data?.detail || error.message || "Unknown error",
                                  variant: "destructive" 
                                });
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
              {activeTab === 'skills' && (
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

              {/* Notifications Management Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Notifications Management</h2>
                    <button
                      onClick={handleNotificationDataLoad}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Sub-tabs for notifications */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex space-x-4 mb-6">
                      {[
                        { id: 'notifications', label: 'All Notifications', icon: '📋' },
                        { id: 'templates', label: 'Templates', icon: '📝' },
                        { id: 'preferences', label: 'User Preferences', icon: '⚙️' },
                        { id: 'analytics', label: 'Analytics', icon: '📊' }
                      ].map((subTab) => (
                        <button
                          key={subTab.id}
                          onClick={() => {
                            setActiveNotificationTab(subTab.id);
                            handleNotificationDataLoad();
                          }}
                          className={`py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                            activeNotificationTab === subTab.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <span className="mr-2">{subTab.icon}</span>
                          {subTab.label}
                        </button>
                      ))}
                    </div>

                    {/* All Notifications Tab */}
                    {activeNotificationTab === 'notifications' && (
                      <div className="space-y-4">
                        {/* Filters */}
                        <div className="bg-white p-4 rounded-lg border">
                          <h4 className="font-semibold mb-3">Filters</h4>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                              <select
                                value={notificationFilters.type}
                                onChange={(e) => setNotificationFilters(prev => ({...prev, type: e.target.value}))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="">All Types</option>
                                <option value="new_interest">New Interest</option>
                                <option value="contact_shared">Contact Shared</option>
                                <option value="payment_confirmation">Payment Confirmation</option>
                                <option value="new_message">New Message</option>
                                <option value="job_posted">Job Posted</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                              <select
                                value={notificationFilters.status}
                                onChange={(e) => setNotificationFilters(prev => ({...prev, status: e.target.value}))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="sent">Sent</option>
                                <option value="delivered">Delivered</option>
                                <option value="failed">Failed</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                              <select
                                value={notificationFilters.channel}
                                onChange={(e) => setNotificationFilters(prev => ({...prev, channel: e.target.value}))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="">All Channels</option>
                                <option value="email">Email</option>
                                <option value="sms">SMS</option>
                                <option value="both">Both</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                              <input
                                type="date"
                                value={notificationFilters.date_from}
                                onChange={(e) => setNotificationFilters(prev => ({...prev, date_from: e.target.value}))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                              <input
                                type="date"
                                value={notificationFilters.date_to}
                                onChange={(e) => setNotificationFilters(prev => ({...prev, date_to: e.target.value}))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          <div className="mt-4">
                            <button
                              onClick={handleNotificationDataLoad}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                            >
                              Apply Filters
                            </button>
                            <button
                              onClick={() => {
                                setNotificationFilters({
                                  type: '',
                                  status: '',
                                  channel: '',
                                  date_from: '',
                                  date_to: ''
                                });
                                handleNotificationDataLoad();
                              }}
                              className="ml-2 text-gray-600 hover:text-gray-800 px-4 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              Clear Filters
                            </button>
                          </div>
                        </div>

                        {/* Notifications Stats */}
                        {notificationStats && Object.keys(notificationStats).length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-lg border">
                              <div className="text-2xl font-bold text-blue-600">{notificationStats.total_notifications || 0}</div>
                              <div className="text-sm text-gray-600">Total Notifications</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border">
                              <div className="text-2xl font-bold text-green-600">{notificationStats.sent_count || 0}</div>
                              <div className="text-sm text-gray-600">Successfully Sent</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border">
                              <div className="text-2xl font-bold text-red-600">{notificationStats.failed_count || 0}</div>
                              <div className="text-sm text-gray-600">Failed</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border">
                              <div className="text-2xl font-bold text-yellow-600">{notificationStats.pending_count || 0}</div>
                              <div className="text-sm text-gray-600">Pending</div>
                            </div>
                          </div>
                        )}

                        {/* Notifications Table */}
                        <AdminDataTable
                          data={notifications}
                          columns={[
                            { 
                              key: 'type', 
                              title: 'Type', 
                              sortable: true,
                              render: (value) => (
                                <span className="font-medium">{value?.replace('_', ' ').toUpperCase()}</span>
                              )
                            },
                            { 
                              key: 'user_name', 
                              title: 'User', 
                              sortable: true,
                              render: (value, item) => (
                                <div>
                                  <div className="font-medium">{value}</div>
                                  <div className="text-xs text-gray-500">{item.user_email}</div>
                                </div>
                              )
                            },
                            { 
                              key: 'channel', 
                              title: 'Channel', 
                              sortable: true,
                              render: (value) => (
                                <span className="flex items-center">
                                  <span className="mr-1">{getNotificationChannelIcon(value)}</span>
                                  {value.toUpperCase()}
                                </span>
                              )
                            },
                            { 
                              key: 'status', 
                              title: 'Status', 
                              sortable: true,
                              render: (value) => (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getNotificationStatusColor(value)}`}>
                                  {value.toUpperCase()}
                                </span>
                              )
                            },
                            { 
                              key: 'subject', 
                              title: 'Subject', 
                              sortable: false,
                              render: (value) => (
                                <span className="truncate max-w-xs block" title={value}>
                                  {value || 'No subject'}
                                </span>
                              )
                            },
                            { 
                              key: 'created_at', 
                              title: 'Created', 
                              sortable: true,
                              render: (value) => new Date(value).toLocaleDateString()
                            }
                          ]}
                          entityName="notification"
                          entityNamePlural="notifications"
                          onView={(notification) => setSelectedNotification(notification)}
                          onDelete={(notification) => handleDeleteNotification(notification.id)}
                          allowInlineEdit={false}
                          allowDelete={true}
                          allowView={true}
                          customActions={[
                            {
                              id: 'resend',
                              icon: ({ className }) => <span className={className}>🔄</span>,
                              onClick: (notification) => handleResendNotification(notification.id),
                              title: 'Resend',
                              className: 'text-blue-600 hover:text-blue-900'
                            },
                            {
                              id: 'update_status',
                              icon: ({ className }) => <span className={className}>✏️</span>,
                              onClick: (notification) => {
                                const newStatus = prompt('Enter new status (pending, sent, delivered, failed, cancelled):', notification.status);
                                if (newStatus && ['pending', 'sent', 'delivered', 'failed', 'cancelled'].includes(newStatus)) {
                                  const adminNotes = prompt('Admin notes (optional):') || '';
                                  handleUpdateNotificationStatus(notification.id, newStatus, adminNotes);
                                }
                              },
                              title: 'Update Status',
                              className: 'text-green-600 hover:text-green-900'
                            }
                          ]}
                          isLoading={loading}
                        />
                      </div>
                    )}

                    {/* Templates Tab */}
                    {activeNotificationTab === 'templates' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Notification Templates</h3>
                        </div>

                        <AdminDataTable
                          data={notificationTemplates}
                          columns={[
                            { key: 'type', title: 'Type', sortable: true },
                            { key: 'channel', title: 'Channel', sortable: true },
                            { 
                              key: 'subject_template', 
                              title: 'Subject Template', 
                              sortable: false,
                              render: (value) => (
                                <span className="truncate max-w-xs block" title={value}>
                                  {value}
                                </span>
                              )
                            },
                            { 
                              key: 'variables', 
                              title: 'Variables', 
                              sortable: false,
                              render: (value) => (
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {value?.length || 0} vars
                                </span>
                              )
                            }
                          ]}
                          entityName="template"
                          entityNamePlural="templates"
                          onView={(template) => setEditingTemplate(template)}
                          allowInlineEdit={false}
                          allowDelete={false}
                          allowView={true}
                          customActions={[
                            {
                              id: 'test',
                              icon: ({ className }) => <span className={className}>🧪</span>,
                              onClick: (template) => {
                                const testData = {};
                                template.variables?.forEach(variable => {
                                  testData[variable] = prompt(`Enter value for ${variable}:`) || `[${variable}]`;
                                });
                                handleTestTemplate(template.id, testData);
                              },
                              title: 'Test Template',
                              className: 'text-purple-600 hover:text-purple-900'
                            }
                          ]}
                          isLoading={loading}
                        />
                      </div>
                    )}

                    {/* User Preferences Tab */}
                    {activeNotificationTab === 'preferences' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">User Notification Preferences</h3>
                        </div>

                        <AdminDataTable
                          data={userPreferences}
                          columns={[
                            { key: 'user_name', title: 'User Name', sortable: true },
                            { key: 'user_email', title: 'Email', sortable: true },
                            { key: 'user_role', title: 'Role', sortable: true },
                            { key: 'new_interest', title: 'New Interest', sortable: false },
                            { key: 'new_message', title: 'New Message', sortable: false },
                            { key: 'payment_confirmation', title: 'Payment', sortable: false }
                          ]}
                          entityName="preference"
                          entityNamePlural="preferences"
                          allowInlineEdit={false}
                          allowDelete={false}
                          allowView={true}
                          isLoading={loading}
                        />
                      </div>
                    )}

                    {/* Analytics Tab */}
                    {activeNotificationTab === 'analytics' && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Notification Analytics</h3>
                        </div>

                        <div className="bg-white p-6 rounded-lg border">
                          <h4 className="font-semibold mb-4">Coming Soon</h4>
                          <p className="text-gray-600">
                            Advanced analytics and reporting features will be available here, including:
                          </p>
                          <ul className="list-disc list-inside mt-2 text-gray-600 space-y-1">
                            <li>Delivery rates by channel and type</li>
                            <li>User engagement metrics</li>
                            <li>Failed notification trends</li>
                            <li>Performance optimization insights</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
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
      {editJobModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">Edit Job</h3>
              <button
                onClick={() => setEditJobModal(null)}
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
                state: formData.get('state'),
                lga: formData.get('lga'),
                town: formData.get('town'),
                zip_code: formData.get('zip_code'),
                home_address: formData.get('home_address'),
                timeline: formData.get('timeline'),
                budget_min: formData.get('budget_min') ? parseInt(formData.get('budget_min')) : null,
                budget_max: formData.get('budget_max') ? parseInt(formData.get('budget_max')) : null,
                access_fee_naira: formData.get('access_fee_naira') ? parseInt(formData.get('access_fee_naira')) : null,
                access_fee_coins: formData.get('access_fee_coins') ? parseInt(formData.get('access_fee_coins')) : null,
                admin_notes: formData.get('admin_notes')
              };
              
              try {
                // Use the new editJobAdmin API
                await adminAPI.editJobAdmin(editJobModal.id, jobData);
                toast({
                  title: "Success",
                  description: "Job updated successfully. Homeowner has been notified.",
                });
                setEditJobModal(null);
                fetchData();
              } catch (error) {
                toast({
                  title: "Error",
                  description: error.response?.data?.detail || "Failed to update job",
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
                    defaultValue={editJobModal.title}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    rows={4}
                    defaultValue={editJobModal.description}
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
                      defaultValue={editJobModal.category}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Timeline</label>
                    <input
                      name="timeline"
                      type="text"
                      defaultValue={editJobModal.timeline}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                {/* Enhanced Location Fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <input
                      name="state"
                      type="text"
                      defaultValue={editJobModal.state}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">LGA</label>
                    <input
                      name="lga"
                      type="text"
                      defaultValue={editJobModal.lga}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Town</label>
                    <input
                      name="town"
                      type="text"
                      defaultValue={editJobModal.town}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Zip Code</label>
                    <input
                      name="zip_code"
                      type="text"
                      defaultValue={editJobModal.zip_code}
                      className="w-full px-3 py-2 border rounded-md"
                      pattern="[0-9]{6}"
                      placeholder="6-digit postal code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Home Address</label>
                    <input
                      name="home_address"
                      type="text"
                      defaultValue={editJobModal.home_address}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Budget (₦)</label>
                    <input
                      name="budget_min"
                      type="number"
                      defaultValue={editJobModal.budget_min}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Budget (₦)</label>
                    <input
                      name="budget_max"
                      type="number"
                      defaultValue={editJobModal.budget_max}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                {/* Enhanced Access Fee Controls */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">Access Fee Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-blue-800">Access Fee (₦)</label>
                      <input
                        name="access_fee_naira"
                        type="number"
                        min="500"
                        max="10000"
                        defaultValue={editJobModal.access_fees?.naira || editJobModal.access_fee_naira || 1000}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-blue-600 mt-1">Range: ₦500 - ₦10,000</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-blue-800">Access Fee (Coins)</label>
                      <input
                        name="access_fee_coins"
                        type="number"
                        min="5"
                        max="100"
                        defaultValue={editJobModal.access_fees?.coins || editJobModal.access_fee_coins || 10}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-blue-600 mt-1">Range: 5 - 100 coins</p>
                    </div>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Admin Notes (Optional)</label>
                  <textarea
                    name="admin_notes"
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Optional notes about this edit that will be sent to the homeowner..."
                  />
                </div>

                {/* Status (if needed) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editJobModal.status}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="pending_approval">Pending Approval</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                    <option value="rejected">Rejected</option>
                  </select>
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

      {/* Job Review Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">Job Review - {selectedJob.title}</h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Job Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium mb-3">Job Details</h4>
                  <div className="space-y-2">
                    <div><strong>Title:</strong> {selectedJob.title}</div>
                    <div><strong>Category:</strong> 
                      <span className="inline-flex px-2 py-1 ml-2 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {selectedJob.category}
                      </span>
                    </div>
                    <div><strong>Status:</strong> 
                      <span className={`inline-flex px-2 py-1 ml-2 text-xs font-semibold rounded-full ${selectedJob.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {selectedJob.status}
                      </span>
                    </div>
                    <div><strong>Timeline:</strong> {selectedJob.timeline || 'Not specified'}</div>
                    <div><strong>Budget:</strong> {selectedJob.budget_min && selectedJob.budget_max ? 
                      `₦${selectedJob.budget_min?.toLocaleString()} - ₦${selectedJob.budget_max?.toLocaleString()}` : 
                      'Budget not specified'
                    }</div>
                    <div><strong>Submitted:</strong> {new Date(selectedJob.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-medium mb-3">Homeowner Info</h4>
                  <div className="space-y-2">
                    <div><strong>Name:</strong> {selectedJob.homeowner?.name || 'Unknown'}</div>
                    <div><strong>Email:</strong> {selectedJob.homeowner?.email || 'Not provided'}</div>
                    <div><strong>Total Jobs:</strong> {selectedJob.homeowner?.total_jobs || 0}</div>
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div>
                <h4 className="text-lg font-medium mb-3">Description</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{selectedJob.description}</p>
                </div>
              </div>

              {/* Location Details */}
              <div>
                <h4 className="text-lg font-medium mb-3">Location Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><strong>State:</strong> {selectedJob.state || 'Not specified'}</div>
                  <div><strong>LGA:</strong> {selectedJob.lga || 'Not specified'}</div>
                  <div><strong>Town:</strong> {selectedJob.town || 'Not specified'}</div>
                </div>
                {selectedJob.home_address && (
                  <div className="mt-2"><strong>Address:</strong> {selectedJob.home_address}</div>
                )}
                {selectedJob.zip_code && (
                  <div className="mt-2"><strong>Zip Code:</strong> {selectedJob.zip_code}</div>
                )}
              </div>

              {/* Access Fees */}
              {(selectedJob.access_fees || selectedJob.access_fee_naira) && (
                <div>
                  <h4 className="text-lg font-medium mb-3">Access Fees</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Naira Fee</div>
                      <div className="text-lg font-semibold text-green-600">
                        ₦{(selectedJob.access_fees?.naira || selectedJob.access_fee_naira || 1000).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Coins Fee</div>
                      <div className="text-lg font-semibold text-blue-600">
                        {selectedJob.access_fees?.coins || selectedJob.access_fee_coins || 10} coins
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    handleOpenJobEditor(selectedJob);
                  }}
                  className="px-4 py-2 text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200"
                >
                  Edit Job
                </button>
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    handleApproveJob(selectedJob.id, 'approve');
                  }}
                  disabled={processingApproval}
                  className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Reason for rejection (required):');
                    if (reason && reason.trim()) {
                      setSelectedJob(null);
                      handleApproveJob(selectedJob.id, 'reject', reason.trim());
                    }
                  }}
                  disabled={processingApproval}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, items: [], type: 'single' })}
        onConfirm={() => {
          if (confirmDelete.type === 'bulk') {
            handleBulkDelete(confirmDelete.items, activeLocationTab === 'states' ? 'state' : 'unknown');
          } else {
            handleSingleDelete(confirmDelete.items[0], activeLocationTab === 'states' ? 'state' : 'unknown');
          }
        }}
        items={confirmDelete.items}
        type={confirmDelete.type}
        entityName={activeLocationTab === 'states' ? 'state' : 'item'}
        isProcessing={isProcessing}
      />
      
      {/* Notification Details Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">Notification Details</h3>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700">Basic Information</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <div><strong>ID:</strong> {selectedNotification.id}</div>
                    <div><strong>Type:</strong> {selectedNotification.type}</div>
                    <div><strong>Channel:</strong> {selectedNotification.channel}</div>
                    <div>
                      <strong>Status:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getNotificationStatusColor(selectedNotification.status)}`}>
                        {selectedNotification.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-700">User Information</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <div><strong>Name:</strong> {selectedNotification.user_name}</div>
                    <div><strong>Email:</strong> {selectedNotification.user_email}</div>
                    <div><strong>Role:</strong> {selectedNotification.user_role}</div>
                    <div><strong>User ID:</strong> {selectedNotification.user_id}</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700">Recipient Details</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    {selectedNotification.recipient_email && (
                      <div><strong>Email:</strong> {selectedNotification.recipient_email}</div>
                    )}
                    {selectedNotification.recipient_phone && (
                      <div><strong>Phone:</strong> {selectedNotification.recipient_phone}</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-700">Timestamps</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <div><strong>Created:</strong> {new Date(selectedNotification.created_at).toLocaleString()}</div>
                    {selectedNotification.sent_at && (
                      <div><strong>Sent:</strong> {new Date(selectedNotification.sent_at).toLocaleString()}</div>
                    )}
                    {selectedNotification.delivered_at && (
                      <div><strong>Delivered:</strong> {new Date(selectedNotification.delivered_at).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700">Subject</h4>
                <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
                  {selectedNotification.subject || 'No subject'}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700">Content</h4>
                <div className="mt-2 p-3 bg-gray-50 rounded border text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedNotification.content || 'No content'}
                </div>
              </div>
              
              {selectedNotification.admin_notes && (
                <div>
                  <h4 className="font-semibold text-gray-700">Admin Notes</h4>
                  <div className="mt-2 p-3 bg-yellow-50 rounded border text-sm">
                    {selectedNotification.admin_notes}
                  </div>
                </div>
              )}
              
              {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700">Metadata</h4>
                  <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
                    <pre>{JSON.stringify(selectedNotification.metadata, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 p-6 border-t bg-gray-50">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {selectedNotification.status === 'failed' && (
                <button
                  onClick={() => {
                    handleResendNotification(selectedNotification.id);
                    setSelectedNotification(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Resend
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, items: [], type: 'single' })}
        onConfirm={() => {
          if (confirmDelete.type === 'bulk') {
            // Determine entity type based on active tab
            let entityType = 'item';
            if (activeTab === 'locations') {
              if (activeLocationTab === 'states') entityType = 'state';
              else if (activeLocationTab === 'lgas') entityType = 'lga';
              else if (activeLocationTab === 'towns') entityType = 'town';
              else if (activeLocationTab === 'trades') entityType = 'trade';
            } else if (activeTab === 'contacts') {
              entityType = 'contact';
            } else if (activeTab === 'policies') {
              entityType = 'policy';
            } else if (activeTab === 'jobs') {
              entityType = 'job';
            }
            
            handleBulkDelete(confirmDelete.items, entityType);
          } else {
            // Single delete
            let entityType = 'item';
            if (activeTab === 'locations') {
              if (activeLocationTab === 'states') entityType = 'state';
              else if (activeLocationTab === 'lgas') entityType = 'lga';
              else if (activeLocationTab === 'towns') entityType = 'town';
              else if (activeLocationTab === 'trades') entityType = 'trade';
            } else if (activeTab === 'contacts') {
              entityType = 'contact';
            } else if (activeTab === 'policies') {
              entityType = 'policy';
            } else if (activeTab === 'jobs') {
              entityType = 'job';
            }
            
            handleSingleDelete(confirmDelete.items[0], entityType);
          }
        }}
        title={confirmDelete.type === 'bulk' ? `Delete ${confirmDelete.items.length} Items` : 'Delete Item'}
        message={
          confirmDelete.type === 'bulk' 
            ? `Are you sure you want to delete ${confirmDelete.items.length} selected items? This action cannot be undone.`
            : 'Are you sure you want to delete this item? This action cannot be undone.'
        }
        itemName={
          confirmDelete.items.length === 1 
            ? confirmDelete.items[0]?.name || confirmDelete.items[0]?.title || confirmDelete.items[0]?.id
            : undefined
        }
        itemType={
          confirmDelete.type === 'bulk' 
            ? `${confirmDelete.items.length} items`
            : (confirmDelete.items[0]?.type || 'item')
        }
        isDeleting={isProcessing}
        dangerLevel="high"
      />
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;