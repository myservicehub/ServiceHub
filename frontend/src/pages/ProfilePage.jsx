import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../components/ui/dropdown-menu';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Star, 
  Calendar,
  Edit3,
  Save,
  X,
  Award,
  Briefcase,
  Clock,
  Shield,
  Settings,
  Camera,
  Plus,
  ChevronDown,
  ExternalLink,
  FileText,
  Eye,
  Maximize2,
  MessageSquare
} from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import AuthenticatedImage from '../components/common/AuthenticatedImage';
import { authAPI, portfolioAPI, statsAPI } from '../api/services';
import { reviewsAPI } from '../api/reviews';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import ImageUpload from '../components/portfolio/ImageUpload';
import PortfolioGallery from '../components/portfolio/PortfolioGallery';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as ModalTitle,
  DialogFooter,
} from '../components/ui/dialog';
import SkillsTestComponent from '../components/auth/SkillsTestComponent';

const ProfilePage = () => {
  const location = useLocation();
  
  // Check if we're inside the dashboard route
  const isInDashboard = location.pathname.startsWith('/trades') || location.pathname.startsWith('/dashboard');

  // Options loaded from backend for skill suggestions
  const [tradeCategoryOptions, setTradeCategoryOptions] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState("profile"); // Added state for active tab

  // Phone OTP states
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  
  // Email OTP states
  const [emailOtpMode, setEmailOtpMode] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [emailOtpVerifying, setEmailOtpVerifying] = useState(false);
  
  // Countdown timer states for resend (10 minutes = 600 seconds)
  const [phoneResendCountdown, setPhoneResendCountdown] = useState(0);
  const [emailResendCountdown, setEmailResendCountdown] = useState(0);
  
  // Countdown timer effects
  useEffect(() => {
    if (phoneResendCountdown <= 0) return;
    const timer = setInterval(() => {
      setPhoneResendCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phoneResendCountdown]);

  useEffect(() => {
    if (emailResendCountdown <= 0) return;
    const timer = setInterval(() => {
      setEmailResendCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [emailResendCountdown]);

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Portfolio states
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  // Reviews states
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    fiveStars: 0,
    fourStars: 0,
    threeStars: 0,
    twoStars: 0,
    oneStar: 0
  });
  
  const { user, loading: authLoading, isAuthenticated, isHomeowner, isTradesperson, updateUser, logout } = useAuth();
  const { toast } = useToast();

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedCertImage, setSelectedCertImage] = useState(null);
  const [showCertModal, setShowCertModal] = useState(false);
  // Add-skill modal / test states
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [showSkillTest, setShowSkillTest] = useState(false);
  const [skillFormData, setSkillFormData] = useState({ selectedTrades: [], skillsTestPassed: false, testScores: {} });
  // Combobox states for category selection
  const [comboOpen, setComboOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef(null);

  // Helper function to get tab display text
  const getTabDisplayText = (tabValue) => {
    switch (tabValue) {
      case 'profile':
        return 'Profile Information';
      case 'portfolio':
        return 'Portfolio';
      case 'reviews':
        return 'Reviews';
      case 'account':
        return 'Account Settings';
      case 'activity':
        return 'Activity';
      default:
        return 'Profile Information';
    }
  };

  const normalizePortfolioItem = useCallback((rawItem) => {
    if (!rawItem || typeof rawItem !== 'object') return null;
    const item = rawItem.item || rawItem.portfolio_item || rawItem.data || rawItem;
    if (!item || typeof item !== 'object') return null;
    const id = item.id || item._id;
    const imageUrl = item.image_url || item.image || item.file_url || item.url;
    if (!id || !imageUrl) return null;
    return {
      ...item,
      id,
      image_url: imageUrl,
      title: item.title || 'Portfolio Item',
      category: item.category || 'other',
      is_public: item.is_public ?? true,
      created_at: item.created_at || new Date().toISOString(),
    };
  }, []);

  // Get available tabs based on user role
  const getAvailableTabs = () => {
    const baseTabs = [
      { value: 'profile', label: 'Profile Information' },
      { value: 'account', label: 'Account Settings' },
      { value: 'activity', label: 'Activity' }
    ];

    if (isTradesperson()) {
      baseTabs.splice(1, 0, 
        { value: 'portfolio', label: 'Portfolio' },
        { value: 'reviews', label: 'Reviews' }
      );
    }

    return baseTabs;
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await authAPI.deleteAccount();
      toast({
        title: 'Account deleted',
        description: 'Your account and data have been permanently removed.',
      });
      logout();
      if (typeof window !== 'undefined') {
        window.location.replace('/join-for-free');
      }
    } catch (error) {
      const message = error?.response?.data?.detail || 'Failed to delete account. Please try again.';
      toast({ title: 'Delete failed', description: message, variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated() && user) {
      setProfileData(user);
      const normalizeCerts = (certs) => {
        const arr = Array.isArray(certs) ? certs : [];
        return arr.map((c) => {
          if (typeof c === 'string') return { name: c, image_url: '' };
          const name = c?.name ?? '';
          const image_url = c?.image_url ?? c?.image ?? '';
          return { name, image_url };
        });
      };
      setEditData({
        name: user.name || '',
        phone: user.phone || '',
        location: user.location || '',
        postcode: user.postcode || '',
        company_name: user.company_name || '',
        description: user.description || '',
        experience_years: user.experience_years || 0,
        trade_categories: user.trade_categories || [],
        certifications: normalizeCerts(user.certifications)
      });

      // Load portfolio if tradesperson
      if (isTradesperson()) {
        loadPortfolio();
        loadReceivedReviews();
      }
    }
  }, [user, isAuthenticated, isTradesperson]);

  const updateSkillFormData = (key, value) => {
    setSkillFormData(prev => ({ ...prev, [key]: value }));
  };

  // Load category options (preload on mount and when modal opens if needed)
  const loadCategories = async () => {
    // If already loaded, skip reload unless explicit
    if ((tradeCategoryOptions || []).length > 0) return;
    setLoadingCategories(true);
    try {
      // Prefer full list from admin trades (static + custom)
      let names = [];
      try {
        const { adminAPI } = await import('../api/wallet');
        const adminResp = await adminAPI.getAllTrades();
        if (adminResp && Array.isArray(adminResp.trades)) {
          names = adminResp.trades.filter(Boolean);
        }
      } catch (e) {
        // Fallback to stats categories if admin endpoint not accessible
        const cats = await statsAPI.getCategories();
        names = Array.isArray(cats) ? cats.map(c => (typeof c === 'string' ? c : c.name || '')).filter(Boolean) : [];
      }
      if (!names || names.length === 0) {
        // Final fallback to canonical 28 categories
        names = [
          'Building','Concrete Works','Tiling','Door & Window Installation','Air Conditioning & Refrigeration','Plumbing',
          'Home Extensions','Scaffolding','Flooring','Bathroom Fitting','Generator Services','Welding',
          'Renovations','Painting','Carpentry','Interior Design','Solar & Inverter Installation','Locksmithing',
          'Roofing','Plastering/POP','Furniture Making','Electrical Repairs','CCTV & Security Systems','General Handyman Work',
          'Cleaning','Relocation/Moving','Waste Disposal','Recycling'
        ];
      }
      setTradeCategoryOptions(names);
    } catch (err) {
      console.warn('Failed to load categories, falling back to inline list', err);
      setTradeCategoryOptions(['Plumbing', 'Electrical Repairs', 'Painting', 'Carpentry', 'Tiling', 'Roofing', 'Welding', 'Solar & Inverter Installation', 'Air Conditioning & Refrigeration', 'Locksmithing']);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    // Preload categories on mount for instant modal experience
    loadCategories();
  }, []);

  // Compute filtered options for the combobox
  const filteredOptions = useMemo(() => {
    const excluded = (profileData?.trade_categories || []);
    return (tradeCategoryOptions || [])
      .filter(s => !excluded.includes(s))
      .filter(s => selectedSkill === '' || s.toLowerCase().includes(selectedSkill.toLowerCase()));
  }, [tradeCategoryOptions, profileData, selectedSkill]);

  useEffect(() => {
    // reset highlight when options change
    setHighlightedIndex(0);
  }, [filteredOptions.length]);

  // close combobox when clicking outside
  useEffect(() => {
    const onDocMouse = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) {
        setComboOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouse);
    return () => document.removeEventListener('mousedown', onDocMouse);
  }, []);

  useEffect(() => {
    // Also ensure categories are loaded when modal opens (in case list changed)
    if (addSkillOpen) loadCategories();
  }, [addSkillOpen]);

  const handleSendPhoneOTP = async () => {
    try {
      setOtpSending(true);
      setOtpMode(true);
      const resp = await authAPI.sendPhoneOTP(profileData?.phone || null);
      if (resp?.debug_code) {
        setOtpCode(resp.debug_code);
        toast({ title: 'OTP sent', description: `Dev code: ${resp.debug_code}` });
      } else {
        toast({ title: 'OTP sent', description: 'Check your phone for the verification code.' });
      }
      // Start 10-minute countdown
      setPhoneResendCountdown(600);
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || 'Failed to send code';
      toast({ title: 'Failed to send code', description: msg, variant: 'destructive' });
      setOtpMode(true);
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyPhoneOTP = async () => {
    try {
      setOtpVerifying(true);
      await authAPI.verifyPhoneOTP(otpCode, profileData?.phone || null);
      toast({ title: 'Phone verified', description: 'Your phone number is now verified.' });
      setOtpMode(false);
      setOtpCode('');
      setProfileData((prev) => ({ ...prev, phone_verified: true }));
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || 'Invalid or expired code';
      toast({ title: 'Verification failed', description: msg, variant: 'destructive' });
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSendEmailOTP = async () => {
    try {
      setEmailOtpSending(true);
      setEmailOtpMode(true);
      const resp = await authAPI.sendEmailOTP(profileData?.email || null);
      if (resp?.debug_code) {
        setEmailOtpCode(resp.debug_code);
        toast({ title: 'OTP sent', description: `Dev code: ${resp.debug_code}` });
      } else {
        toast({ title: 'OTP sent', description: 'Check your email for the verification code.' });
      }
      // Start 10-minute countdown
      setEmailResendCountdown(600);
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || 'Failed to send code';
      toast({ title: 'Failed to send code', description: msg, variant: 'destructive' });
      setEmailOtpMode(true);
    } finally {
      setEmailOtpSending(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    try {
      setEmailOtpVerifying(true);
      await authAPI.verifyEmailOTP(emailOtpCode, profileData?.email || null);
      toast({ title: 'Email verified', description: 'Your email address is now verified.' });
      setEmailOtpMode(false);
      setEmailOtpCode('');
      setProfileData((prev) => ({ ...prev, email_verified: true }));
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || 'Invalid or expired code';
      toast({ title: 'Verification failed', description: msg, variant: 'destructive' });
    } finally {
      setEmailOtpVerifying(false);
    }
  };

  const loadPortfolio = async () => {
    try {
      setPortfolioLoading(true);
      const response = await portfolioAPI.getMyPortfolio();
      const normalizedItems = (response?.items || [])
        .map(normalizePortfolioItem)
        .filter(Boolean);
      setPortfolioItems(normalizedItems);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      toast({
        title: "Failed to load portfolio",
        description: "There was an error loading your portfolio items.",
        variant: "destructive",
      });
    } finally {
      setPortfolioLoading(false);
    }
  };

  const loadReceivedReviews = async () => {
    try {
      setReviewsLoading(true);
      console.log('📊 Loading received reviews for tradesperson profile...');
      
      const response = await reviewsAPI.getReceivedReviews({ limit: 50 });
      console.log('✅ Profile reviews loaded:', response);
      
      const reviewsData = response.reviews || [];
      setReviews(reviewsData);
      calculateReviewStats(reviewsData);
    } catch (error) {
      console.error('❌ Failed to load reviews:', error);
      toast({
        title: "Failed to load reviews",
        description: "There was an error loading your reviews.",
        variant: "destructive",
      });
    } finally {
      setReviewsLoading(false);
    }
  };

  const calculateReviewStats = (reviewsData) => {
    const total = reviewsData.length;
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalRating = 0;

    reviewsData.forEach(review => {
      const rating = review.rating;
      ratingCounts[rating]++;
      totalRating += rating;
    });

    const average = total > 0 ? (totalRating / total).toFixed(1) : 0;

    setReviewStats({
      totalReviews: total,
      averageRating: average,
      fiveStars: ratingCounts[5],
      fourStars: ratingCounts[4],
      threeStars: ratingCounts[3],
      twoStars: ratingCounts[2],
      oneStar: ratingCounts[1]
    });
  };

  const handlePortfolioUploadSuccess = (newItem) => {
    const normalized = normalizePortfolioItem(newItem);
    if (!normalized) {
      toast({
        title: "Upload completed with invalid data",
        description: "Please refresh your portfolio to view the latest item.",
        variant: "destructive",
      });
      return;
    }
    setPortfolioItems(prev => [normalized, ...prev.filter(Boolean)]);
    setShowUploadForm(false);
  };

  const handlePortfolioUpdate = (updatedItem) => {
    const normalized = normalizePortfolioItem(updatedItem);
    if (!normalized) return;
    setPortfolioItems(prev => 
      prev.map(item => item?.id === normalized.id ? normalized : item).filter(Boolean)
    );
  };

  const handlePortfolioDelete = (deletedItemId) => {
    setPortfolioItems(prev => prev.filter(item => item.id !== deletedItemId));
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset edit data to original values
      const normalizeCerts = (certs) => {
        const arr = Array.isArray(certs) ? certs : [];
        return arr.map((c) => {
          if (typeof c === 'string') return { name: c, image_url: '' };
          const name = c?.name ?? '';
          const image_url = c?.image_url ?? c?.image ?? '';
          return { name, image_url };
        });
      };
      setEditData({
        name: profileData.name || '',
        phone: profileData.phone || '',
        location: profileData.location || '',
        postcode: profileData.postcode || '',
        company_name: profileData.company_name || '',
        description: profileData.description || '',
        experience_years: profileData.experience_years || 0,
        trade_categories: profileData.trade_categories || [],
        certifications: normalizeCerts(profileData.certifications)
      });
    } else {
      // When entering edit mode, ensure user is on the Profile tab
      setActiveTab('profile');
      // Smoothly scroll to the Basic Information section for immediate feedback
      setTimeout(() => {
        const el = document.getElementById('basic-info-card');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 0);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Prepare update data - only send fields that have changed
      const updateData = {};
      if (editData.name !== profileData.name) updateData.name = editData.name;
      if (editData.phone !== profileData.phone) updateData.phone = editData.phone;
      if (editData.location !== profileData.location) updateData.location = editData.location;
      if (editData.postcode !== profileData.postcode) updateData.postcode = editData.postcode;

      let response;
      if (isTradesperson()) {
        // Include tradesperson-specific fields
        if (editData.company_name !== profileData.company_name) updateData.company_name = editData.company_name;
        if (editData.description !== profileData.description) updateData.description = editData.description;
        if (editData.experience_years !== profileData.experience_years) updateData.experience_years = parseInt(editData.experience_years);
        if (JSON.stringify(editData.trade_categories) !== JSON.stringify(profileData.trade_categories)) {
          updateData.trade_categories = editData.trade_categories;
        }
        if (JSON.stringify(editData.certifications) !== JSON.stringify(profileData.certifications)) {
          updateData.certifications = editData.certifications;
        }
        
        response = await authAPI.updateTradespersonProfile(updateData);
      } else {
        response = await authAPI.updateProfile(updateData);
      }

      // Update local state and auth context
      setProfileData(response);
      updateUser(response);
      setIsEditing(false);

      // Refresh full profile to ensure all fields (including nested certifications) are up to date
      try {
        const freshUser = await authAPI.getCurrentUser();
        if (freshUser) {
          setProfileData(freshUser);
          updateUser(freshUser);
          
          // Re-normalize certifications for editData
          const normalizeCerts = (certs) => {
            const arr = Array.isArray(certs) ? certs : [];
            return arr.map((c) => {
              if (typeof c === 'string') return { name: c, image_url: '' };
              const name = c?.name ?? '';
              const image_url = c?.image_url ?? c?.image ?? '';
              return { name, image_url };
            });
          };
          
          setEditData(prev => ({
            ...prev,
            certifications: normalizeCerts(freshUser.certifications)
          }));
        }
      } catch (refreshError) {
        console.warn('Failed to refresh profile after save:', refreshError);
      }

      toast({
        title: "Profile updated successfully!",
        description: "Your profile information has been saved.",
      });

    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Failed to update profile",
        description: error.response?.data?.detail || "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAddCertification = () => {
    setEditData({
      ...editData,
      certifications: [...(editData.certifications || []), { name: '', image_url: '' }]
    });
  };

  const handleRemoveCertification = (index) => {
    const newCertifications = (editData.certifications || []).filter((_, i) => i !== index);
    setEditData({
      ...editData,
      certifications: newCertifications
    });
  };

  const handleCertificationChange = (index, value) => {
    const list = [...(editData.certifications || [])];
    const item = list[index] || { name: '', image_url: '' };
    list[index] = { ...item, name: value };
    setEditData({ ...editData, certifications: list });
  };

  const handleCertificationFileChange = async (index, file) => {
    if (!file) return;
    try {
      const resp = await authAPI.uploadCertificationImage(file);
      const url = resp?.url;
      const list = [...(editData.certifications || [])];
      const item = list[index] || { name: '', image_url: '' };
      list[index] = { ...item, image_url: url };
      setEditData({ ...editData, certifications: list });
      toast({ title: 'Image added', description: 'Certification photo uploaded.' });
    } catch (error) {
      const msg = error?.response?.data?.detail || 'Failed to upload image';
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    }
  };

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{borderColor: '#34D164'}}></div>
          <p className="text-gray-600 font-lato">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated() || !profileData) {
    return (
      <div>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Sign In Required
            </h1>
            <p className="text-gray-600 font-lato mb-6">
              Please sign in to view your profile.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="text-white font-lato"
              style={{backgroundColor: '#34D164'}}
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isInDashboard ? "" : "min-h-screen bg-gray-50"}>
      
      {/* Page Header - Modern Design */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#121E3C]">My Profile</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
          </div>
          
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleEditToggle}
                  className="rounded-xl"
                >
                  <X size={16} className="mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-[#34D164] hover:bg-[#2ab854] text-white rounded-xl"
                >
                  <Save size={16} className="mr-2" />
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEditToggle}
                className="bg-[#34D164] hover:bg-[#2ab854] text-white rounded-xl"
              >
                <Edit3 size={16} className="mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation - Horizontal Pills */}
      <div className="bg-white rounded-2xl border border-gray-100 p-1.5 mb-6 inline-flex flex-wrap gap-1">
        {getAvailableTabs().map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === tab.value
                ? 'bg-[#121E3C] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.value === 'profile' && <User size={16} />}
            {tab.value === 'portfolio' && <Briefcase size={16} />}
            {tab.value === 'reviews' && <Star size={16} />}
            {tab.value === 'account' && <Settings size={16} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Content */}
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Profile Information Tab */}
              <TabsContent value="profile" className="space-y-6">
                {/* Basic Information Card */}
                <div id="basic-info-card" className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#34D164]/10 flex items-center justify-center">
                        <User size={20} className="text-[#34D164]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[#121E3C]">Basic Information</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Name Field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Full Name
                        </label>
                        {isEditing ? (
                          <Input
                            value={editData.name}
                            onChange={(e) => setEditData({...editData, name: e.target.value})}
                            className="font-lato h-11 rounded-xl border-gray-200"
                            placeholder="Enter your full name"
                          />
                        ) : (
                          <p className="text-[#121E3C] font-medium text-base">{profileData.name}</p>
                        )}
                      </div>

                      {/* User ID Field (Read-only) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          User ID
                        </label>
                        <p className="text-[#121E3C] font-medium text-base">{profileData.user_id || profileData.public_id || profileData.id}</p>
                      </div>

                      {/* Email Field (Read-only) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Email Address
                        </label>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[#121E3C] font-medium text-base">{profileData.email}</p>
                          {profileData.email_verified ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Verified</span>
                          ) : (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Unverified</span>
                              <Button size="sm" variant="outline" onClick={handleSendEmailOTP} disabled={emailOtpSending} className="h-7 text-xs rounded-lg">
                                {emailOtpSending ? 'Sending…' : 'Verify'}
                              </Button>
                            </>
                          )}
                        </div>
                        {!profileData.email_verified && emailOtpMode && (
                          <div className="space-y-3 mt-2">
                            <div className="w-full sm:w-auto">
                              <InputOTP
                                maxLength={6}
                                value={emailOtpCode}
                                onChange={(val) => setEmailOtpCode(val)}
                              >
                                <InputOTPGroup className="gap-2">
                                  <InputOTPSlot index={0} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                  <InputOTPSlot index={1} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                  <InputOTPSlot index={2} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                  <InputOTPSlot index={3} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                  <InputOTPSlot index={4} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                  <InputOTPSlot index={5} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                            <Button size="sm" className="w-full" onClick={handleVerifyEmailOTP} disabled={emailOtpVerifying || emailOtpCode.length !== 6}>
                              {emailOtpVerifying ? 'Verifying…' : 'Verify'}
                            </Button>
                            <div className="text-center">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-[#34D164]" 
                                onClick={handleSendEmailOTP} 
                                disabled={emailOtpSending || emailResendCountdown > 0}
                              >
                                {emailOtpSending ? 'Sending…' : 'Resend code'}
                              </Button>
                              {emailResendCountdown > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Resend available in {formatCountdown(emailResendCountdown)}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Phone Field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Phone Number
                        </label>
                        {isEditing ? (
                          <Input
                            value={editData.phone}
                            onChange={(e) => setEditData({...editData, phone: e.target.value})}
                            className="font-lato h-11 rounded-xl border-gray-200"
                            placeholder="e.g., 08123456789"
                          />
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[#121E3C] font-medium text-base">{profileData.phone}</p>
                              {profileData.phone_verified ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Verified</span>
                              ) : (
                                <>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Unverified</span>
                                  <Button size="sm" variant="outline" onClick={handleSendPhoneOTP} disabled={otpSending} className="h-7 text-xs rounded-lg">
                                    {otpSending ? 'Sending…' : 'Verify'}
                                  </Button>
                                </>
                              )}
                            </div>
                            {!profileData.phone_verified && otpMode && (
                              <div className="space-y-3">
                                <div className="w-full sm:w-auto">
                                  <InputOTP
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(val) => setOtpCode(val)}
                                  >
                                    <InputOTPGroup className="gap-2">
                                      <InputOTPSlot index={0} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                      <InputOTPSlot index={1} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                      <InputOTPSlot index={2} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                      <InputOTPSlot index={3} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                      <InputOTPSlot index={4} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                      <InputOTPSlot index={5} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                    </InputOTPGroup>
                                  </InputOTP>
                                </div>
                                <Button size="sm" className="w-full" onClick={handleVerifyPhoneOTP} disabled={otpVerifying || otpCode.length !== 6}>
                                  {otpVerifying ? 'Verifying…' : 'Verify'}
                                </Button>
                                <div className="text-center">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-[#34D164]" 
                                    onClick={handleSendPhoneOTP} 
                                    disabled={otpSending || phoneResendCountdown > 0}
                                  >
                                    {otpSending ? 'Sending…' : 'Resend code'}
                                  </Button>
                                  {phoneResendCountdown > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Resend available in {formatCountdown(phoneResendCountdown)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Location Field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Location
                        </label>
                        {isEditing ? (
                          <Input
                            value={editData.location}
                            onChange={(e) => setEditData({...editData, location: e.target.value})}
                            className="font-lato h-11 rounded-xl border-gray-200"
                            placeholder="e.g., Lagos, Nigeria"
                          />
                        ) : (
                          <p className="text-[#121E3C] font-medium text-base">{profileData.location}</p>
                        )}
                      </div>

                      {/* Zipcode Field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Zipcode
                        </label>
                        {isEditing ? (
                          <Input
                            value={editData.postcode}
                            onChange={(e) => setEditData({...editData, postcode: e.target.value})}
                            className="font-lato h-11 rounded-xl border-gray-200"
                            placeholder="e.g., 101001"
                          />
                        ) : (
                          <p className="text-[#121E3C] font-medium text-base">{profileData.postcode && profileData.postcode !== '000000' ? profileData.postcode : 'Not set'}</p>
                        )}
                      </div>

                      {/* Role Badge */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Account Type
                        </label>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#34D164]/10 text-[#34D164]">
                          {profileData.role === 'homeowner' ? 'Homeowner' : 'Tradesperson'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tradesperson Specific Fields */}
                {isTradesperson() && (
                  <>
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/50 to-white">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#121E3C]/10 flex items-center justify-center">
                            <Briefcase size={20} className="text-[#121E3C]" />
                          </div>
                          <h3 className="text-lg font-semibold text-[#121E3C]">Professional Information</h3>
                        </div>
                      </div>
                      <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Company Name */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Company Name
                            </label>
                            {isEditing ? (
                              <Input
                                value={editData.company_name}
                                onChange={(e) => setEditData({...editData, company_name: e.target.value})}
                                className="font-lato h-11 rounded-xl border-gray-200"
                                placeholder="Enter company name (optional)"
                              />
                            ) : (
                              <p className="text-[#121E3C] font-medium text-base">{profileData.company_name || 'Not specified'}</p>
                            )}
                          </div>

                          {/* Experience Years */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Years of Experience
                            </label>
                            {isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                max="50"
                                value={editData.experience_years}
                                onChange={(e) => setEditData({...editData, experience_years: e.target.value})}
                                className="font-lato h-11 rounded-xl border-gray-200"
                                placeholder="Years of experience"
                              />
                            ) : (
                              <p className="text-[#121E3C] font-medium text-base">{profileData.experience_years} years</p>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Professional Description
                          </label>
                          {isEditing ? (
                            <Textarea
                              value={editData.description}
                              onChange={(e) => setEditData({...editData, description: e.target.value})}
                              className="font-lato rounded-xl border-gray-200"
                              rows={4}
                              placeholder="Describe your professional background and expertise..."
                            />
                          ) : (
                            <p className="text-gray-600 text-sm leading-relaxed">{profileData.description}</p>
                          )}
                        </div>

                        {/* Trade Categories */}
                        <div className="space-y-3">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Skills & Expertise
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {profileData.trade_categories?.length > 0 ? (
                              profileData.trade_categories.map((category, index) => (
                                <span key={index} className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium bg-[#34D164]/10 text-[#121E3C] border border-[#34D164]/20">
                                  {category}
                                </span>
                              ))
                            ) : (
                              <p className="text-sm text-gray-400 italic">No skills added yet</p>
                            )}
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedSkill('');
                              setShowSkillTest(false);
                              setAddSkillOpen(true);
                            }}
                            disabled={(profileData.trade_categories || []).length >= 5}
                            size="sm"
                            variant="outline"
                            className="h-9 text-sm rounded-xl border-dashed border-gray-300 hover:border-[#34D164] hover:text-[#34D164] w-full mt-2"
                          >
                            + Add Skill {(profileData.trade_categories || []).length > 0 && `(${(profileData.trade_categories || []).length}/5)`}
                          </Button>
                        </div>

                        {/* Rating and Reviews Stats */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                          <div className="text-center p-3 rounded-xl bg-amber-50/50">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Star size={14} className="text-amber-500 fill-amber-500" />
                              <span className="text-xl font-bold text-[#121E3C]">
                                {profileData.average_rating?.toFixed(1) || '0.0'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">Average Rating</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-blue-50/50">
                            <div className="text-xl font-bold text-[#121E3C] mb-1">
                              {profileData.total_reviews || 0}
                            </div>
                            <p className="text-xs text-gray-500">Total Reviews</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-green-50/50">
                            <div className="text-xl font-bold text-[#121E3C] mb-1">
                              {profileData.total_jobs || 0}
                            </div>
                            <p className="text-xs text-gray-500">Jobs Completed</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Certifications Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/50 to-white">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100/50 flex items-center justify-center">
                            <Award size={20} className="text-amber-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-[#121E3C]">Certifications</h3>
                        </div>
                      </div>
                      <div className="p-6">
                        {isEditing ? (
                          <div className="space-y-4">
                            {(editData.certifications || []).map((cert, index) => (
                              <div key={index} className="flex flex-col space-y-4 p-3 sm:p-5 border-2 border-gray-100 rounded-2xl bg-white relative overflow-hidden shadow-sm">
                                <div className="flex flex-col space-y-3">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[10px] sm:text-xs font-bold text-[#121E3C] uppercase tracking-wider block">
                                      Certification Name
                                    </label>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveCertification(index)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2 flex items-center gap-1 border border-red-100 sm:border-none rounded-lg"
                                    >
                                      <X size={14} />
                                      <span className="text-[10px] font-bold">Remove</span>
                                    </Button>
                                  </div>
                                  <Input
                                    value={cert?.name || ''}
                                    onChange={(e) => handleCertificationChange(index, e.target.value)}
                                    placeholder="e.g. Licensed Electrician, COREN"
                                    className="w-full font-lato bg-gray-50/50 h-10 text-sm text-gray-900 border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]"
                                  />
                                </div>
                                
                                <div className="flex flex-col space-y-3">
                                  <div className="w-full">
                                    <label className="text-[10px] sm:text-xs font-bold text-[#121E3C] uppercase tracking-wider mb-1 block">
                                      Certificate File (Image or PDF)
                                    </label>
                                    <div className="relative group w-full">
                                      <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => handleCertificationFileChange(index, e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                      />
                                      <div className="flex items-center justify-center p-3 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30 group-hover:border-[#34D164] group-hover:bg-green-50/30 transition-all">
                                        <Plus size={16} className="text-gray-400 mr-2 group-hover:text-[#34D164]" />
                                        <span className="text-xs sm:text-sm font-medium text-gray-600 group-hover:text-[#34D164] truncate">
                                          {cert?.image_url ? 'Replace Document' : 'Upload Image or PDF'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {cert?.image_url && (
                                    <div className="flex items-center gap-4 p-3 bg-green-50/50 rounded-xl border border-green-100 shadow-sm w-full overflow-hidden">
                                      {cert.image_url.toLowerCase().endsWith('.pdf') ? (
                                        <div className="h-12 w-12 flex-shrink-0 flex items-center justify-center bg-white rounded-lg border border-red-100 shadow-sm">
                                          <FileText size={24} className="text-red-500" />
                                        </div>
                                      ) : (
                                        <div className="h-12 w-12 flex-shrink-0 rounded-lg border-2 border-white overflow-hidden bg-white shadow-sm">
                                          <AuthenticatedImage 
                                            src={cert.image_url} 
                                            alt="Preview" 
                                            className="h-full w-full object-cover" 
                                          />
                                        </div>
                                      )}
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-xs font-bold text-gray-900 truncate">Document ready</span>
                                        <button 
                                          type="button"
                                          onClick={() => window.open(cert.image_url.startsWith('http') ? cert.image_url : `${(import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')}${cert.image_url.startsWith('/') ? '' : '/'}${cert.image_url}`, '_blank')}
                                          className="text-[10px] text-[#34D164] hover:underline font-bold text-left flex items-center gap-1"
                                        >
                                          <Eye size={10} />
                                          View Full File
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              onClick={handleAddCertification}
                              className="w-full py-4 sm:py-6 border-dashed border-2 hover:border-[#34D164] hover:text-[#34D164] transition-all font-montserrat text-sm"
                            >
                              <Plus size={16} className="mr-2" />
                              Add Another Certification
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {Array.isArray(profileData.certifications) && profileData.certifications.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {profileData.certifications.map((c, index) => {
                                  const name = typeof c === 'string' ? c : (c?.name || '');
                                  const image_url = typeof c === 'string' ? '' : (c?.image_url || c?.image || '');
                                  const isPdf = image_url.toLowerCase().endsWith('.pdf');
                                  
                                  const getFullUrl = (url) => {
                                    if (!url) return '';
                                    if (url.startsWith('data:')) return url;
                                    if (url.startsWith('http')) return url;
                                    // Bare filename: point to certification image API
                                    if (!url.includes('/')) {
                                      return `/api/auth/certifications/image/${url}`;
                                    }
                                    // Already an API path
                                    if (url.startsWith('/api/')) return url;
                                    const baseUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
                                    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
                                  };

                                  return (
                                    <div 
                                      key={index} 
                                      className="group relative flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-[#34D164] hover:shadow-md transition-all cursor-pointer"
                                      onClick={() => {
                                        if (isPdf) {
                                          window.open(getFullUrl(image_url), '_blank');
                                        } else {
                                          setSelectedCertImage({ url: getFullUrl(image_url), name });
                                          setShowCertModal(true);
                                        }
                                      }}
                                    >
                                      {/* Thumbnail area */}
                                      <div className="aspect-square w-full bg-gray-50 flex items-center justify-center overflow-hidden">
                                        {image_url ? (
                                          isPdf ? (
                                            <div className="flex flex-col items-center">
                                              <FileText size={32} className="text-red-500 mb-1" />
                                              <span className="text-[10px] font-bold text-gray-400">PDF</span>
                                            </div>
                                          ) : (
                                            <AuthenticatedImage 
                                              src={getFullUrl(image_url)} 
                                              alt={name} 
                                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                            />
                                          )
                                        ) : (
                                          <Award size={24} className="text-gray-200" />
                                        )}
                                        
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          {isPdf ? <ExternalLink className="text-white" size={20} /> : <Maximize2 className="text-white" size={20} />}
                                        </div>
                                      </div>
                                      
                                      {/* Name area */}
                                      <div className="p-2 bg-white">
                                        <p className="text-[10px] sm:text-xs font-bold text-gray-700 truncate font-montserrat" title={name}>
                                          {name}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <Award className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                <p className="text-gray-500 font-lato">No certifications added yet</p>
                                <p className="text-xs text-gray-400 mt-1">Add your professional certifications to build trust</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Portfolio Tab - Only for Tradespeople */}
              {isTradesperson() && (
                <TabsContent value="portfolio" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center font-montserrat" style={{color: '#121E3C'}}>
                          <Camera size={20} className="mr-2" style={{color: '#34D164'}} />
                          My Portfolio
                        </CardTitle>
                        
                        <Button
                          onClick={() => setShowUploadForm(!showUploadForm)}
                          className="text-white font-lato"
                          style={{backgroundColor: '#34D164'}}
                        >
                          <Plus size={16} className="mr-2" />
                          Add Portfolio Item
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {showUploadForm && (
                        <div className="mb-6">
                          <ImageUpload
                            onUploadSuccess={handlePortfolioUploadSuccess}
                            onCancel={() => setShowUploadForm(false)}
                            userCategories={profileData?.trade_categories || []}
                          />
                        </div>
                      )}
                      
                      <PortfolioGallery
                        items={portfolioItems}
                        isOwner={true}
                        loading={portfolioLoading}
                        onUpdate={handlePortfolioUpdate}
                        onDelete={handlePortfolioDelete}
                        emptyMessage="Start building your portfolio"
                        emptyDescription="Showcase your best work to attract more clients. Upload photos of your completed projects."
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Reviews Tab - Only for Tradespeople */}
              {isTradesperson() && (
                <TabsContent value="reviews" className="space-y-6">
                  {/* Reviews Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Total Reviews */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
                      <div className="w-10 h-10 rounded-xl bg-blue-100/50 flex items-center justify-center mx-auto mb-3">
                        <MessageSquare size={18} className="text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-[#121E3C] mb-1">
                        {reviewStats.totalReviews}
                      </div>
                      <div className="text-xs text-gray-500">Total Reviews</div>
                    </div>
                    
                    {/* Average Rating */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
                      <div className="w-10 h-10 rounded-xl bg-amber-100/50 flex items-center justify-center mx-auto mb-3">
                        <Star size={18} className="text-amber-500 fill-amber-500" />
                      </div>
                      <div className="text-2xl font-bold text-amber-500 mb-1">
                        {reviewStats.averageRating}
                      </div>
                      <div className="text-xs text-gray-500">Average Rating</div>
                    </div>
                    
                    {/* 5-Star Reviews */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
                      <div className="w-10 h-10 rounded-xl bg-green-100/50 flex items-center justify-center mx-auto mb-3">
                        <Award size={18} className="text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {reviewStats.fiveStars}
                      </div>
                      <div className="text-xs text-gray-500">5-Star Reviews</div>
                    </div>
                    
                    {/* Rating Breakdown */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 text-center">Rating Breakdown</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">5★</span>
                          <div className="flex-1 mx-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{width: `${reviewStats.totalReviews > 0 ? (reviewStats.fiveStars / reviewStats.totalReviews * 100) : 0}%`}}></div>
                          </div>
                          <span className="text-gray-500 w-4 text-right">{reviewStats.fiveStars}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">4★</span>
                          <div className="flex-1 mx-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full" style={{width: `${reviewStats.totalReviews > 0 ? (reviewStats.fourStars / reviewStats.totalReviews * 100) : 0}%`}}></div>
                          </div>
                          <span className="text-gray-500 w-4 text-right">{reviewStats.fourStars}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">3★</span>
                          <div className="flex-1 mx-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{width: `${reviewStats.totalReviews > 0 ? (reviewStats.threeStars / reviewStats.totalReviews * 100) : 0}%`}}></div>
                          </div>
                          <span className="text-gray-500 w-4 text-right">{reviewStats.threeStars}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">2★</span>
                          <div className="flex-1 mx-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400 rounded-full" style={{width: `${reviewStats.totalReviews > 0 ? (reviewStats.twoStars / reviewStats.totalReviews * 100) : 0}%`}}></div>
                          </div>
                          <span className="text-gray-500 w-4 text-right">{reviewStats.twoStars}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">1★</span>
                          <div className="flex-1 mx-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{width: `${reviewStats.totalReviews > 0 ? (reviewStats.oneStar / reviewStats.totalReviews * 100) : 0}%`}}></div>
                          </div>
                          <span className="text-gray-500 w-4 text-right">{reviewStats.oneStar}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/50 to-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100/50 flex items-center justify-center">
                          <Star size={20} className="text-amber-500 fill-amber-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-[#121E3C]">Customer Reviews</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      {reviewsLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                          <p className="text-gray-600 font-lato">Loading your reviews...</p>
                        </div>
                      ) : reviews.length === 0 ? (
                        <div className="text-center py-12">
                          <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold font-montserrat mb-2">No Reviews Yet</h3>
                          <p className="text-gray-600 font-lato max-w-md mx-auto">
                            You haven't received any reviews from homeowners yet. 
                            Complete jobs and provide excellent service to start receiving reviews!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {reviews.map((review, index) => (
                            <div key={review.id} className={`${index !== reviews.length - 1 ? 'pb-5 mb-5 border-b border-gray-100' : ''}`}>
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-500" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-[#121E3C]">
                                      {review.reviewer_name || 'Anonymous Homeowner'}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="flex">
                                        {Array.from({ length: 5 }, (_, i) => (
                                          <Star
                                            key={i}
                                            className={`h-3.5 w-3.5 ${
                                              i < review.rating 
                                                ? 'text-amber-400 fill-amber-400' 
                                                : 'text-gray-200'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                        ${review.rating >= 4 ? 'bg-green-100 text-green-700' : ''}
                                        ${review.rating === 3 ? 'bg-amber-100 text-amber-700' : ''}
                                        ${review.rating < 3 ? 'bg-red-100 text-red-700' : ''}
                                      `}>
                                        {review.rating} Stars
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(review.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              
                              {(review.content || review.comment) && (
                                <div className="mb-3 ml-14">
                                  <p className="text-gray-600 text-sm leading-relaxed bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                                    "{review.content || review.comment}"
                                  </p>
                                </div>
                              )}
                              
                              {review.title && (
                                <div className="mb-2 ml-14">
                                  <h4 className="font-medium text-[#121E3C] text-sm">
                                    "{review.title}"
                                  </h4>
                                </div>
                              )}
                              
                              {review.job_title && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 ml-14">
                                  <Briefcase className="h-3.5 w-3.5" />
                                  <span>Job: {review.job_title}</span>
                                  {review.job_location && (
                                    <>
                                      <span>•</span>
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span>{review.job_location}</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* Account Settings Tab */}
              <TabsContent value="account" className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#34D164]/10 flex items-center justify-center">
                        <Settings size={20} className="text-[#34D164]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[#121E3C]">Account Settings</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Account Status */}
                      <div className="space-y-3">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Account Status
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-[#121E3C] font-medium capitalize">{profileData.status}</span>
                        </div>
                      </div>
                      
                      {/* Verification Status */}
                      <div className="space-y-3">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Verification Status
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-600">Email:</span>
                            {profileData.email_verified ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Verified</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Unverified</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-600">Phone:</span>
                            {profileData.phone_verified ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Verified</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Unverified</span>
                            )}
                          </div>
                          {!profileData.phone_verified && (
                            <div className="mt-3 space-y-3">
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={handleSendPhoneOTP} disabled={otpSending}>
                                  {otpSending ? 'Sending…' : 'Send Code'}
                                </Button>
                                {otpMode && (
                                  <Button size="sm" variant="ghost" onClick={handleSendPhoneOTP} disabled={otpSending}>
                                    {otpSending ? 'Sending…' : 'Resend'}
                                  </Button>
                                )}
                              </div>
                              {otpMode && (
                                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                                  <div className="w-full sm:w-auto">
                                  <InputOTP
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(val) => setOtpCode(val)}
                                  >
                                    <InputOTPGroup className="gap-2">
                                      <InputOTPSlot index={0} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                      <InputOTPSlot index={1} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                      <InputOTPSlot index={2} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                      <InputOTPSlot index={3} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                      <InputOTPSlot index={4} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                      <InputOTPSlot index={5} className="w-10 h-12 rounded-lg bg-gray-50 border-gray-200" />
                                    </InputOTPGroup>
                                  </InputOTP>
                                  </div>
                                  <Button size="sm" className="w-full sm:w-auto" onClick={handleVerifyPhoneOTP} disabled={otpVerifying || otpCode.length !== 6}>
                                    {otpVerifying ? 'Verifying…' : 'Verify'}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                          {isTradesperson() && (
                            <div className="flex items-center space-x-2">
                              <Award size={14} />
                              <span className="text-sm font-lato">Tradesperson: </span>
                              {profileData.verified_tradesperson ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">Unverified</Badge>
                              )}
                            </div>
                          )}
                          {isTradesperson() && !profileData.verified_tradesperson && (
                            <div className="mt-4">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => window.location.href = '/verify-account'}
                              >
                                Get Verified
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-red-50 bg-gradient-to-r from-red-50/30 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <AlertTriangle size={20} className="text-red-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-[#121E3C]">Danger Zone</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">Deleting your account is permanent and cannot be undone.</p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" disabled={deleteLoading}>
                          {deleteLoading ? 'Deleting…' : 'Delete Account'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action permanently removes your account and all associated data, including jobs, interests, messages, and reviews. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                            Proceed to delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100/50 flex items-center justify-center">
                        <Clock size={20} className="text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-[#121E3C]">Account Activity</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                            <Calendar size={16} className="text-green-600" />
                          </div>
                          <span className="text-[#121E3C] font-medium">Member since</span>
                        </div>
                        <span className="text-gray-500 text-sm">{formatDate(profileData.created_at)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Clock size={16} className="text-blue-600" />
                          </div>
                          <span className="text-[#121E3C] font-medium">Last login</span>
                        </div>
                        <span className="text-gray-500 text-sm">{formatDate(profileData.last_login)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Edit3 size={16} className="text-purple-600" />
                          </div>
                          <span className="text-[#121E3C] font-medium">Profile updated</span>
                        </div>
                        <span className="text-gray-500 text-sm">{formatDate(profileData.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

      {/* Add Skill Modal / Skills Test */}
      <Dialog open={addSkillOpen} onOpenChange={setAddSkillOpen}>
        <DialogContent>
          <DialogHeader>
            <ModalTitle>Add a new skill</ModalTitle>
          </DialogHeader>

          {!showSkillTest ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-700">Choose a skill to add to your profile (max 5). After selecting, you will take a short skills assessment for that skill.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Skill</label>

                {/* Combobox: typed input with a dropdown list, keyboard nav and quick-picks */}
                <div className="relative" ref={wrapperRef}>
                  <div className="relative">
                    <input
                      value={selectedSkill}
                      onChange={(e) => { setSelectedSkill(e.target.value); }}
                      onFocus={() => setComboOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
                          setComboOpen(true);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setHighlightedIndex((i) => Math.max(i - 1, 0));
                        } else if (e.key === 'Enter') {
                          if (comboOpen && filteredOptions[highlightedIndex]) {
                            e.preventDefault();
                            const v = filteredOptions[highlightedIndex];
                            setSelectedSkill(v);
                            setComboOpen(false);
                          }
                        } else if (e.key === 'Escape') {
                          setComboOpen(false);
                        }
                      }}
                      placeholder="Type or choose a skill"
                      className="block w-full rounded-md border border-gray-200 px-3 py-2 font-lato"
                    />
                  </div>

                  {/* Dropdown list */}
                  {comboOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow max-h-60 overflow-auto">
                      {loadingCategories ? (
                        <div className="p-3 text-sm text-gray-500">Loading skills…</div>
                      ) : filteredOptions.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">No matches</div>
                      ) : (
                        <ul>
                          {filteredOptions.slice(0, 50).map((opt, idx) => (
                            <li
                              key={opt}
                              onMouseDown={(e) => { e.preventDefault(); }}
                              onClick={() => { setSelectedSkill(opt); setComboOpen(false); }}
                              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${idx === highlightedIndex ? 'bg-gray-100' : ''}`}
                            >
                              {opt}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-2 text-sm text-gray-500">
                  {loadingCategories ? 'Loading skills…' : 'Start typing to see matching skills.'}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <Button variant="outline" onClick={() => setAddSkillOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (!selectedSkill || selectedSkill.trim() === '') {
                      toast({ title: 'Select a skill', description: 'Please choose a skill before starting the test.', variant: 'destructive' });
                      return;
                    }
                    if ((profileData.trade_categories || []).includes(selectedSkill)) {
                      toast({ title: 'Already added', description: 'This skill is already on your profile.' });
                      return;
                    }
                    if ((profileData.trade_categories || []).length >= 5) {
                      toast({ title: 'Limit reached', description: 'You may only have up to 5 skills.' });
                      return;
                    }
                    // prepare formData for SkillsTestComponent
                    setSkillFormData({ selectedTrades: [selectedSkill], skillsTestPassed: false, testScores: {} });
                    setShowSkillTest(true);
                  }}
                  className="bg-green-600 text-white"
                >
                  Start Skill Test
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <SkillsTestComponent
                formData={skillFormData}
                updateFormData={(k, v) => updateSkillFormData(k, v)}
                onTestComplete={async (results) => {
                  try {
                    if (results && results.passed) {
                      const existing = Array.isArray(profileData.trade_categories) ? profileData.trade_categories : [];
                      if (existing.includes(selectedSkill)) {
                        toast({ title: 'Skill exists', description: 'Skill already present on your profile.' });
                        setAddSkillOpen(false);
                        setShowSkillTest(false);
                        return;
                      }
                      if (existing.length >= 5) {
                        toast({ title: 'Limit reached', description: 'You already have 5 skills.' });
                        setAddSkillOpen(false);
                        setShowSkillTest(false);
                        return;
                      }

                      const newCategories = [...existing, selectedSkill];
                      const resp = await authAPI.updateTradespersonProfile({ trade_categories: newCategories });
                      // Update local state and auth context
                      setProfileData(resp);
                      updateUser(resp);
                      toast({ title: 'Skill added', description: `${selectedSkill} has been added to your profile.` });
                      setAddSkillOpen(false);
                      setShowSkillTest(false);
                    } else {
                      toast({ title: 'Test not passed', description: 'You did not pass the skills assessment. Please review and try again.', variant: 'destructive' });
                      // keep modal open for retry
                    }
                  } catch (err) {
                    console.error('Failed to add skill after test:', err);
                    toast({ title: 'Failed', description: err?.response?.data?.detail || 'Unable to add skill. Try again later.', variant: 'destructive' });
                  }
                }}
              />
            </div>
          )}

          <DialogFooter />
        </DialogContent>
      </Dialog>

      <Dialog open={showCertModal} onOpenChange={setShowCertModal}>
        <DialogContent className="sm:max-w-4xl p-0 bg-transparent border-none shadow-none">
          <div className="relative group">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowCertModal(false)}
              className="absolute -top-12 right-0 text-white hover:bg-white/20 z-50"
            >
              <X size={24} />
            </Button>
            
            {selectedCertImage && (
              <div className="flex flex-col items-center">
                <div className="bg-white rounded-2xl p-2 shadow-2xl overflow-hidden max-h-[85vh] w-full">
                  <AuthenticatedImage 
                    src={selectedCertImage.url} 
                    alt={selectedCertImage.name} 
                    className="w-full h-auto object-contain max-h-[80vh] rounded-xl"
                  />
                </div>
                <div className="mt-4 px-6 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/20">
                  <p className="text-white font-montserrat font-bold text-sm tracking-wide">
                    {selectedCertImage.name}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ProfilePage;
