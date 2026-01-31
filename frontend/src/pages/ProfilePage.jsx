import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
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
  Maximize2
} from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import AuthenticatedImage from '../components/common/AuthenticatedImage';
import { authAPI, portfolioAPI, statsAPI } from '../api/services';
import { reviewsAPI } from '../api/reviews';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import ImageUpload from '../components/portfolio/ImageUpload';
import PortfolioGallery from '../components/portfolio/PortfolioGallery';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '../components/ui/input-otp';
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
      setPortfolioItems(response.items || []);
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
    setPortfolioItems(prev => [newItem, ...prev]);
    setShowUploadForm(false);
  };

  const handlePortfolioUpdate = (updatedItem) => {
    setPortfolioItems(prev => 
      prev.map(item => item.id === updatedItem.id ? updatedItem : item)
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{borderColor: '#34D164'}}></div>
            <p className="text-gray-600 font-lato">Loading your profile...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated() || !profileData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
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
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Page Header */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                  My Profile
                </h1>
                <p className="text-lg text-gray-600 font-lato">
                  Manage your account information and preferences
                </p>
              </div>
              
              <div className="flex space-x-3">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleEditToggle}
                      className="font-lato"
                    >
                      <X size={16} className="mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={loading}
                      className="text-white font-lato"
                      style={{backgroundColor: '#34D164'}}
                    >
                      <Save size={16} className="mr-2" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleEditToggle}
                    className="text-white font-lato"
                    style={{backgroundColor: '#34D164'}}
                  >
                    <Edit3 size={16} className="mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              {/* Navigation Dropdown */}
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold font-montserrat text-gray-900">Profile Management</h1>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center space-x-2 px-4 py-2">
                      <span>{getTabDisplayText(activeTab)}</span>
                      <ChevronDown size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {getAvailableTabs().map((tab) => (
                      <DropdownMenuItem 
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`cursor-pointer ${activeTab === tab.value ? 'bg-gray-100' : ''}`}
                      >
                        <div className="flex items-center space-x-2">
                          {tab.value === 'profile' && <User size={16} />}
                          {tab.value === 'portfolio' && <Briefcase size={16} />}
                          {tab.value === 'reviews' && <Star size={16} />}
                          {tab.value === 'account' && <Settings size={16} />}
                          {tab.value === 'activity' && <Clock size={16} />}
                          <span>{tab.label}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Profile Information Tab */}
              <TabsContent value="profile" className="space-y-6">
                {/* Basic Information Card */}
                <Card id="basic-info-card">
                  <CardHeader>
                    <CardTitle className="flex items-center font-montserrat" style={{color: '#121E3C'}}>
                      <User size={20} className="mr-2" style={{color: '#34D164'}} />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name Field */}
                      <div>
                        <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                          Full Name
                        </label>
                        {isEditing ? (
                          <Input
                            value={editData.name}
                            onChange={(e) => setEditData({...editData, name: e.target.value})}
                            className="font-lato"
                            placeholder="Enter your full name"
                          />
                        ) : (
                          <p className="text-gray-700 font-lato py-2">{profileData.name}</p>
                        )}
                      </div>

                      {/* User ID Field (Read-only) */}
                      <div>
                        <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                          User ID
                        </label>
                        <p className="text-gray-700 font-lato py-2">{profileData.user_id || profileData.public_id || profileData.id}</p>
                      </div>

                      {/* Email Field (Read-only) */}
                      <div>
                        <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                          Email Address
                        </label>
                        <div className="flex items-center space-x-2">
                          <p className="text-gray-700 font-lato py-2">{profileData.email}</p>
                          {profileData.email_verified ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>
                          ) : (
                            <>
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">Unverified</Badge>
                              <Button size="sm" variant="outline" onClick={handleSendEmailOTP} disabled={emailOtpSending}>
                                {emailOtpSending ? 'Sending…' : 'Verify Email'}
                              </Button>
                            </>
                          )}
                        </div>
                        {!profileData.email_verified && emailOtpMode && (
                          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mt-2">
                            <div className="w-full sm:w-auto">
                              <InputOTP
                                maxLength={6}
                                value={emailOtpCode}
                                onChange={(val) => setEmailOtpCode(val)}
                              >
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                  <InputOTPSeparator />
                                  <InputOTPSlot index={3} />
                                  <InputOTPSlot index={4} />
                                  <InputOTPSlot index={5} />
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                            <Button size="sm" className="w-full sm:w-auto" onClick={handleVerifyEmailOTP} disabled={emailOtpVerifying || emailOtpCode.length !== 6}>
                              {emailOtpVerifying ? 'Verifying…' : 'Verify'}
                            </Button>
                            <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={handleSendEmailOTP} disabled={emailOtpSending}>
                              {emailOtpSending ? 'Sending…' : 'Resend'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Phone Field */}
                      <div>
                        <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                          Phone Number
                        </label>
                        {isEditing ? (
                          <Input
                            value={editData.phone}
                            onChange={(e) => setEditData({...editData, phone: e.target.value})}
                            className="font-lato"
                            placeholder="e.g., 08123456789"
                          />
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <p className="text-gray-700 font-lato py-2">{profileData.phone}</p>
                              {profileData.phone_verified ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>
                              ) : (
                                <>
                                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">Unverified</Badge>
                                  <Button size="sm" variant="outline" onClick={handleSendPhoneOTP} disabled={otpSending}>
                                    {otpSending ? 'Sending…' : 'Verify Phone'}
                                  </Button>
                                </>
                              )}
                            </div>
                            {!profileData.phone_verified && otpMode && (
                              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                                <div className="w-full sm:w-auto">
                                  <InputOTP
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(val) => setOtpCode(val)}
                                  >
                                    <InputOTPGroup>
                                      <InputOTPSlot index={0} />
                                      <InputOTPSlot index={1} />
                                      <InputOTPSlot index={2} />
                                      <InputOTPSeparator />
                                      <InputOTPSlot index={3} />
                                      <InputOTPSlot index={4} />
                                      <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                  </InputOTP>
                                </div>
                                <Button size="sm" className="w-full sm:w-auto" onClick={handleVerifyPhoneOTP} disabled={otpVerifying || otpCode.length !== 6}>
                                  {otpVerifying ? 'Verifying…' : 'Verify'}
                                </Button>
                                <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={handleSendPhoneOTP} disabled={otpSending}>
                                  {otpSending ? 'Sending…' : 'Resend'}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Location Field */}
                      <div>
                        <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                          Location
                        </label>
                        {isEditing ? (
                          <Input
                            value={editData.location}
                            onChange={(e) => setEditData({...editData, location: e.target.value})}
                            className="font-lato"
                            placeholder="e.g., Lagos, Nigeria"
                          />
                        ) : (
                          <p className="text-gray-700 font-lato py-2">{profileData.location}</p>
                        )}
                      </div>

                      {/* Zipcode Field */}
                      <div>
                        <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                          Zipcode
                        </label>
                        {isEditing ? (
                          <Input
                            value={editData.postcode}
                            onChange={(e) => setEditData({...editData, postcode: e.target.value})}
                            className="font-lato"
                            placeholder="e.g., 101001"
                          />
                        ) : (
                          <p className="text-gray-700 font-lato py-2">{profileData.postcode && profileData.postcode !== '000000' ? profileData.postcode : 'Not set'}</p>
                        )}
                      </div>

                      {/* Role Badge */}
                      <div>
                        <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                          Account Type
                        </label>
                        <Badge className="bg-blue-100 text-blue-800 text-sm py-1 px-3">
                          {profileData.role === 'homeowner' ? 'Homeowner' : 'Tradesperson'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tradesperson Specific Fields */}
                {isTradesperson() && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center font-montserrat" style={{color: '#121E3C'}}>
                          <Briefcase size={20} className="mr-2" style={{color: '#34D164'}} />
                          Professional Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Company Name */}
                          <div>
                            <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                              Company Name
                            </label>
                            {isEditing ? (
                              <Input
                                value={editData.company_name}
                                onChange={(e) => setEditData({...editData, company_name: e.target.value})}
                                className="font-lato"
                                placeholder="Enter company name (optional)"
                              />
                            ) : (
                              <p className="text-gray-700 font-lato py-2">{profileData.company_name || 'Not specified'}</p>
                            )}
                          </div>

                          {/* Experience Years */}
                          <div>
                            <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                              Years of Experience
                            </label>
                            {isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                max="50"
                                value={editData.experience_years}
                                onChange={(e) => setEditData({...editData, experience_years: e.target.value})}
                                className="font-lato"
                                placeholder="Years of experience"
                              />
                            ) : (
                              <p className="text-gray-700 font-lato py-2">{profileData.experience_years} years</p>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                            Professional Description
                          </label>
                          {isEditing ? (
                            <Textarea
                              value={editData.description}
                              onChange={(e) => setEditData({...editData, description: e.target.value})}
                              className="font-lato"
                              rows={4}
                              placeholder="Describe your professional background and expertise..."
                            />
                          ) : (
                            <p className="text-gray-700 font-lato py-2 break-words whitespace-pre-wrap">{profileData.description}</p>
                          )}
                        </div>

                        {/* Trade Categories */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                              Skills & Expertise
                            </label>
                            <div>
                              <Button
                                onClick={() => {
                                  setSelectedSkill('');
                                  setShowSkillTest(false);
                                  setAddSkillOpen(true);
                                }}
                                disabled={(profileData.trade_categories || []).length >= 5}
                                size="sm"
                                className="ml-2"
                              >
                                Add Skill
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {profileData.trade_categories?.map((category, index) => (
                              <Badge key={index} variant="outline" className="text-sm">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Rating and Reviews */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 mb-1">
                              <Star size={16} className="text-yellow-400 fill-current" />
                              <span className="text-lg font-bold font-montserrat" style={{color: '#34D164'}}>
                                {profileData.average_rating?.toFixed(1) || '0.0'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 font-lato">Average Rating</p>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold font-montserrat mb-1" style={{color: '#34D164'}}>
                              {profileData.total_reviews || 0}
                            </div>
                            <p className="text-sm text-gray-600 font-lato">Total Reviews</p>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold font-montserrat mb-1" style={{color: '#34D164'}}>
                              {profileData.total_jobs || 0}
                            </div>
                            <p className="text-sm text-gray-600 font-lato">Jobs Completed</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Certifications Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center font-montserrat" style={{color: '#121E3C'}}>
                          <Award size={20} className="mr-2" style={{color: '#34D164'}} />
                          Certifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
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
                                    if (url.startsWith('http')) return url;
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
                                              src={image_url} 
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
                      </CardContent>
                    </Card>
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                            {reviewStats.totalReviews}
                          </div>
                          <div className="text-sm text-gray-600 font-lato">Total Reviews</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                            <div className="text-2xl font-bold font-montserrat text-yellow-600">
                              {reviewStats.averageRating}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 font-lato">Average Rating</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold font-montserrat text-green-600">
                            {reviewStats.fiveStars}
                          </div>
                          <div className="text-sm text-gray-600 font-lato">5-Star Reviews</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 font-lato mb-1">Rating Breakdown</div>
                          <div className="text-xs text-gray-500 font-lato">
                            <div>5★: {reviewStats.fiveStars} • 4★: {reviewStats.fourStars}</div>
                            <div>3★: {reviewStats.threeStars} • 2★: {reviewStats.twoStars} • 1★: {reviewStats.oneStar}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Reviews List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center font-montserrat" style={{color: '#121E3C'}}>
                        <Star size={20} className="mr-2" style={{color: '#34D164'}} />
                        Customer Reviews
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
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
                          {reviews.map((review) => (
                            <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-600" />
                                  </div>
                                  <div>
                                    <div className="font-semibold font-montserrat" style={{color: '#121E3C'}}>
                                      {review.reviewer_name || 'Anonymous Homeowner'}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="flex">
                                        {Array.from({ length: 5 }, (_, index) => (
                                          <Star
                                            key={index}
                                            className={`h-4 w-4 ${
                                              index < review.rating 
                                                ? 'text-yellow-400 fill-yellow-400' 
                                                : 'text-gray-300'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <Badge className={`
                                        ${review.rating >= 4.5 ? 'bg-green-100 text-green-800' : ''}
                                        ${review.rating >= 3.5 && review.rating < 4.5 ? 'bg-blue-100 text-blue-800' : ''}
                                        ${review.rating >= 2.5 && review.rating < 3.5 ? 'bg-yellow-100 text-yellow-800' : ''}
                                        ${review.rating < 2.5 ? 'bg-red-100 text-red-800' : ''}
                                      `}>
                                        {review.rating} Stars
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right text-sm text-gray-500 font-lato">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              
                              {(review.content || review.comment) && (
                                <div className="mb-3">
                                  <p className="text-gray-700 font-lato leading-relaxed bg-gray-50 p-3 rounded-lg">
                                    "{review.content || review.comment}"
                                  </p>
                                </div>
                              )}
                              
                              {review.title && (
                                <div className="mb-2">
                                  <h4 className="font-semibold text-gray-800 font-montserrat">
                                    "{review.title}"
                                  </h4>
                                </div>
                              )}
                              
                              {review.job_title && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-lato">
                                  <Briefcase className="h-4 w-4" />
                                  <span>Job: {review.job_title}</span>
                                  {review.job_location && (
                                    <>
                                      <span>•</span>
                                      <MapPin className="h-4 w-4" />
                                      <span>{review.job_location}</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Account Settings Tab */}
              <TabsContent value="account" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center font-montserrat" style={{color: '#121E3C'}}>
                      <Settings size={20} className="mr-2" style={{color: '#34D164'}} />
                      Account Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                          Account Status
                        </h3>
                        <div className="flex items-center space-x-2">
                          <Shield size={16} style={{color: '#34D164'}} />
                          <span className="text-gray-700 font-lato capitalize">{profileData.status}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                          Verification Status
                        </h3>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Mail size={14} />
                            <span className="text-sm font-lato">Email: </span>
                            {profileData.email_verified ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">Unverified</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone size={14} />
                            <span className="text-sm font-lato">Phone: </span>
                            {profileData.phone_verified ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">Unverified</Badge>
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
                                    <InputOTPGroup>
                                      <InputOTPSlot index={0} />
                                      <InputOTPSlot index={1} />
                                      <InputOTPSlot index={2} />
                                      <InputOTPSeparator />
                                      <InputOTPSlot index={3} />
                                      <InputOTPSlot index={4} />
                                      <InputOTPSlot index={5} />
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
                  </CardContent>
                </Card>
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center font-montserrat" style={{color: '#121E3C'}}>
                      <AlertTriangle size={20} className="mr-2 text-red-600" />
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-red-700">Deleting your account is permanent and cannot be undone.</p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={deleteLoading}>
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
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center font-montserrat" style={{color: '#121E3C'}}>
                      <Clock size={20} className="mr-2" style={{color: '#34D164'}} />
                      Account Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center space-x-2">
                          <Calendar size={16} style={{color: '#34D164'}} />
                          <span className="font-lato">Member since</span>
                        </div>
                        <span className="text-gray-600 font-lato">{formatDate(profileData.created_at)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center space-x-2">
                          <Clock size={16} style={{color: '#34D164'}} />
                          <span className="font-lato">Last login</span>
                        </div>
                        <span className="text-gray-600 font-lato">{formatDate(profileData.last_login)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-2">
                          <Edit3 size={16} style={{color: '#34D164'}} />
                          <span className="font-lato">Profile updated</span>
                        </div>
                        <span className="text-gray-600 font-lato">{formatDate(profileData.updated_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

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

      <Footer />
    </div>
  );
};

export default ProfilePage;
