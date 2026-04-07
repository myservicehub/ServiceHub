import React, { useEffect, Suspense, lazy } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomeownerDashboardLayout from "./layouts/HomeownerDashboardLayout";
import TradespersonDashboardLayout from "./layouts/TradespersonDashboardLayout";
import { DashboardOverview, DashboardMessages } from "./pages/dashboard/homeowner";
import { TradespersonOverview, TradespersonMessages } from "./pages/dashboard/tradesperson";

// Lazy load pages for performance optimization
// Public Pages
const HomePage = lazy(() => import("./components/HomePage"));
const AboutUsPage = lazy(() => import("./pages/AboutUsPage"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const PartnershipPage = lazy(() => import("./pages/PartnershipPage"));
const ReviewsPolicyPage = lazy(() => import("./pages/ReviewsPolicyPage"));
const TradeCategoriesPage = lazy(() => import("./pages/TradeCategoriesPage"));
const TradeCategoryDetailPage = lazy(() => import("./pages/TradeCategoryDetailPage"));
const BrowseTradespeopleePage = lazy(() => import("./pages/BrowseTradespeopleePage"));
const TradespersonProfilePage = lazy(() => import("./pages/TradespersonProfilePage"));
const TradespersonPortfolioPage = lazy(() => import("./pages/TradespersonPortfolioPage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));

// Help & Support
const HelpFAQsPage = lazy(() => import("./pages/HelpFAQsPage"));
const ContactUsPage = lazy(() => import("./pages/ContactUsPage"));

// Auth & Account
const JoinForFreePage = lazy(() => import("./pages/JoinForFreePage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const VerifyAccountPage = lazy(() => import("./pages/VerifyAccountPage"));

// Legal Pages
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));

// Blog & Careers
const BlogPage = lazy(() => import("./pages/BlogPage"));
const CareersPage = lazy(() => import("./pages/CareersPage"));

// External/Misc
const ExternalReviewPage = lazy(() => import("./pages/ExternalReviewPage"));
const TradespersonRegistrationDemo = lazy(() => import("./pages/TradespersonRegistrationDemo"));
const ComingSoonPage = lazy(() => import("./pages/ComingSoonPage"));

// Admin
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Dashboard Pages (used in both portals)
const PostJobPage = lazy(() => import("./pages/PostJobPage"));
const MyJobsPage = lazy(() => import("./pages/MyJobsPage"));
const InterestedTradespeopleePage = lazy(() => import("./pages/InterestedTradespeopleePage"));
const MyReviewsPage = lazy(() => import("./pages/MyReviewsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const NotificationPreferencesPage = lazy(() => import("./pages/NotificationPreferencesPage"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const ReferralsPage = lazy(() => import("./pages/ReferralsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const BrowseJobsPage = lazy(() => import("./pages/BrowseJobsPage"));
const MyInterestsPage = lazy(() => import("./pages/MyInterestsPage"));
const CompletedJobsPage = lazy(() => import("./pages/CompletedJobsPage"));
const MyReceivedReviewsPage = lazy(() => import("./pages/MyReceivedReviewsPage"));
import { Toaster } from "./components/ui/toaster";
import ScrollToTop from "./components/ScrollToTop";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import SessionTimeoutManager from "./components/auth/SessionTimeoutManager";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineIndicator from "./components/OfflineIndicator";
import { setupGlobalErrorHandling } from "./utils/errorHandler";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }
  return isAuthenticated() ? children : <Navigate to="/?promo=tradesperson" replace />;
};

const RoleGuard = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname === '/admin';
  const hasAdminToken = typeof window !== 'undefined' && !!localStorage.getItem('admin_token');
  if (isAdminRoute) {
    return children;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/?promo=tradesperson" replace />;
  }
  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  useEffect(() => {
    setupGlobalErrorHandling();
  }, []);

  return (
    <div className="App">
      <ErrorBoundary>
        <AuthProvider>
          <SessionTimeoutManager />
          <BrowserRouter>
            <ScrollToTop smooth={true} />

            <Suspense fallback={
              <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
              </div>
            }>
              <Routes>
                {/* ==================== PUBLIC ROUTES ==================== */}
                {/* Homepage */}
                <Route path="/" element={<HomePage />} />
                
                {/* Public Pages */}
                <Route path="/about" element={<AboutUsPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/partnerships" element={<PartnershipPage />} />
                <Route path="/reviews-policy" element={<ReviewsPolicyPage />} />
                <Route path="/trade-categories" element={<TradeCategoriesPage />} />
                <Route path="/trade-categories/:categorySlug" element={<TradeCategoryDetailPage />} />
                <Route path="/browse-tradespeople" element={<BrowseTradespeopleePage />} />
                <Route path="/tradesperson/:id" element={<TradespersonProfilePage />} />
                <Route path="/tradesperson/:tradespersonId/portfolio" element={<TradespersonPortfolioPage />} />
                <Route path="/reviews" element={<ReviewsPage />} />
                <Route path="/reviews/:userId" element={<ReviewsPage />} />
                
                {/* Help & Support */}
                <Route path="/help" element={<HelpFAQsPage />} />
                <Route path="/help-centre" element={<HelpFAQsPage />} />
                <Route path="/contact" element={<ContactUsPage />} />
                
                {/* Authentication & Account */}
                <Route path="/join-for-free" element={<JoinForFreePage />} />
                <Route path="/signup" element={<Navigate to="/?promo=tradesperson" replace />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-account" element={<VerifyAccountPage />} />
                <Route path="/dashboard/verify-account" element={<Navigate to="/verify-account" replace />} />
                
                {/* Legal Pages */}
                <Route path="/privacy-policy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/cookie-policy" element={<CookiePolicyPage />} />
                
                {/* Blog & Careers */}
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPage />} />
                <Route path="/careers" element={<CareersPage />} />
                <Route path="/coming-soon" element={<ComingSoonPage />} />
                
                {/* External Review (for email links) */}
                <Route path="/review/external/:token" element={<ExternalReviewPage />} />
                
                {/* Post Job (public access - redirects to dashboard if authenticated) */}
                <Route path="/post-job" element={<PostJobPage />} />
                
                {/* Redirect legacy routes */}
                <Route path="/my-jobs" element={<Navigate to="/dashboard/jobs" replace />} />
                <Route path="/my-interests" element={<Navigate to="/trades/interests" replace />} />
                <Route path="/messages/:id" element={<Navigate to="/dashboard/messages" replace />} />
                <Route path="/browse-jobs" element={<Navigate to="/trades/browsejobs" replace />} />

                {/* Demo/Dev Routes */}
                <Route path="/tradesperson-registration-demo" element={<TradespersonRegistrationDemo />} />
                
                {/* ==================== ADMIN ROUTE ==================== */}
                <Route path="/admin" element={<RoleGuard allowedRoles={["admin"]}><AdminDashboard /></RoleGuard>} />

                {/* ==================== HOMEOWNER DASHBOARD PORTAL ==================== */}
                {/* Protected by HomeownerDashboardLayout - redirects non-homeowners to /join-for-free */}
                <Route path="/dashboard" element={<HomeownerDashboardLayout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="jobs" element={<MyJobsPage />} />
                <Route path="jobs/:jobId/interested" element={<InterestedTradespeopleePage />} />
                <Route path="post-job" element={<PostJobPage />} />
                <Route path="messages" element={<DashboardMessages />} />
                <Route path="reviews" element={<MyReviewsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="notifications/preferences" element={<NotificationPreferencesPage />} />
                <Route path="wallet" element={<WalletPage />} />
                <Route path="referrals" element={<ReferralsPage />} />
                <Route path="settings" element={<ProfilePage />} />
              </Route>

                {/* ==================== TRADESPERSON DASHBOARD PORTAL ==================== */}
                {/* Protected by TradespersonDashboardLayout - redirects non-tradespeople to /join-for-free */}
                <Route path="/trades" element={<TradespersonDashboardLayout />}>
                <Route index element={<TradespersonOverview />} />
                <Route path="overview" element={<TradespersonOverview />} />
                <Route path="browsejobs" element={<BrowseJobsPage />} />
                <Route path="interests" element={<MyInterestsPage />} />
                <Route path="completed" element={<CompletedJobsPage />} />
                <Route path="messages" element={<TradespersonMessages />} />
                <Route path="wallet" element={<WalletPage />} />
                <Route path="reviews" element={<MyReceivedReviewsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="notifications/preferences" element={<NotificationPreferencesPage />} />
                <Route path="referrals" element={<ReferralsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<ProfilePage />} />
              </Route>
            </Routes>
            </Suspense>
            <Toaster />

          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
