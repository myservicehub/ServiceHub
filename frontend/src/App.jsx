import React, { useEffect, Suspense, lazy } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomeownerDashboardLayout from "./layouts/HomeownerDashboardLayout";
import TradespersonLayout from "./layouts/TradespersonLayout";
import { DashboardOverview, DashboardMessages } from "./pages/dashboard/homeowner";

// Lazy load pages for performance optimization
const HomePage = lazy(() => import("./components/HomePage"));
const PostJobPage = lazy(() => import("./pages/PostJobPage"));
const MyJobsPage = lazy(() => import("./pages/MyJobsPage"));
const MyInterestsPage = lazy(() => import("./pages/MyInterestsPage"));
const CompletedJobsPage = lazy(() => import("./pages/CompletedJobsPage"));
const TradespersonProfilePage = lazy(() => import("./pages/TradespersonProfilePage"));
const BrowseTradespeopleePage = lazy(() => import("./pages/BrowseTradespeopleePage"));
const InterestedTradespeopleePage = lazy(() => import("./pages/InterestedTradespeopleePage"));
const BrowseJobsPage = lazy(() => import("./pages/BrowseJobsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const TradespersonPortfolioPage = lazy(() => import("./pages/TradespersonPortfolioPage"));
const NotificationPreferencesPage = lazy(() => import("./pages/NotificationPreferencesPage"));
const NotificationHistoryPage = lazy(() => import("./pages/NotificationHistoryPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const MyReviewsPage = lazy(() => import("./pages/MyReviewsPage"));
const MyReceivedReviewsPage = lazy(() => import("./pages/MyReceivedReviewsPage"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ReferralsPage = lazy(() => import("./pages/ReferralsPage"));
const VerifyAccountPage = lazy(() => import("./pages/VerifyAccountPage"));
const AboutUsPage = lazy(() => import("./pages/AboutUsPage"));
const ReviewsPolicyPage = lazy(() => import("./pages/ReviewsPolicyPage"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const PartnershipPage = lazy(() => import("./pages/PartnershipPage"));
const TradeCategoriesPage = lazy(() => import("./pages/TradeCategoriesPage"));
const TradeCategoryDetailPage = lazy(() => import("./pages/TradeCategoryDetailPage"));
const HelpFAQsPage = lazy(() => import("./pages/HelpFAQsPage"));
const ContactUsPage = lazy(() => import("./pages/ContactUsPage"));
const JoinForFreePage = lazy(() => import("./pages/JoinForFreePage"));
const HelpCentrePage = lazy(() => import("./pages/HelpCentrePage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const CareersPage = lazy(() => import("./pages/CareersPage"));
const TradespersonRegistrationDemo = lazy(() => import("./pages/TradespersonRegistrationDemo"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));
const ExternalReviewPage = lazy(() => import("./pages/ExternalReviewPage"));
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
  return isAuthenticated() ? children : <Navigate to="/join-for-free" replace />;
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
    return <Navigate to="/join-for-free" replace />;
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
                <Route path="/" element={<HomePage />} />
              <Route path="/post-job" element={<PostJobPage />} />
              <Route path="/my-jobs" element={<ProtectedRoute><MyJobsPage /></ProtectedRoute>} />
              <Route path="/my-interests" element={<ProtectedRoute><MyInterestsPage /></ProtectedRoute>} />
              <Route path="/completed-jobs" element={<ProtectedRoute><CompletedJobsPage /></ProtectedRoute>} />
              <Route path="/tradesperson/:id" element={<TradespersonProfilePage />} />
              <Route path="/browse-tradespeople" element={<BrowseTradespeopleePage />} />
              <Route path="/job/:jobId/interested-tradespeople" element={<ProtectedRoute><InterestedTradespeopleePage /></ProtectedRoute>} />
              <Route path="/browse-jobs" element={<BrowseJobsPage />} />
              <Route path="/profile" element={<ProtectedRoute><TradespersonLayout><ProfilePage /></TradespersonLayout></ProtectedRoute>} />
              <Route path="/tradesperson/:tradespersonId/portfolio" element={<ProtectedRoute><TradespersonPortfolioPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><TradespersonLayout><NotificationsPage /></TradespersonLayout></ProtectedRoute>} />
              <Route path="/notifications/preferences" element={<ProtectedRoute><NotificationPreferencesPage /></ProtectedRoute>} />
              <Route path="/notifications/history" element={<ProtectedRoute><NotificationHistoryPage /></ProtectedRoute>} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/reviews/:userId" element={<ReviewsPage />} />
              <Route path="/my-reviews" element={<ProtectedRoute><MyReviewsPage /></ProtectedRoute>} />
              <Route path="/my-received-reviews" element={<ProtectedRoute><MyReceivedReviewsPage /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><TradespersonLayout><WalletPage /></TradespersonLayout></ProtectedRoute>} />
              <Route path="/admin" element={<RoleGuard allowedRoles={["admin"]}><AdminDashboard /></RoleGuard>} />
              <Route path="/referrals" element={<ProtectedRoute><TradespersonLayout><ReferralsPage /></TradespersonLayout></ProtectedRoute>} />
              <Route path="/verify-account" element={<VerifyAccountPage />} />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path="/reviews-policy" element={<ReviewsPolicyPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/partnerships" element={<PartnershipPage />} />
              <Route path="/trade-categories" element={<TradeCategoriesPage />} />
              <Route path="/trade-categories/:categorySlug" element={<TradeCategoryDetailPage />} />
              <Route path="/help" element={<HelpFAQsPage />} />
              <Route path="/contact" element={<ContactUsPage />} />
              <Route path="/join-for-free" element={<JoinForFreePage />} />
              <Route path="/help-centre" element={<HelpCentrePage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/tradesperson-registration-demo" element={<TradespersonRegistrationDemo />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/privacy-policy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/cookie-policy" element={<CookiePolicyPage />} />
              <Route path="/review/external/:token" element={<ExternalReviewPage />} />

              {/* Homeowner Dashboard Portal */}
              <Route path="/dashboard" element={<HomeownerDashboardLayout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="jobs" element={<MyJobsPage />} />
                <Route path="jobs/:jobId/interested" element={<InterestedTradespeopleePage />} />
                <Route path="post-job" element={<PostJobPage />} />
                <Route path="messages" element={<DashboardMessages />} />
                <Route path="reviews" element={<MyReviewsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="wallet" element={<WalletPage />} />
                <Route path="referrals" element={<ReferralsPage />} />
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
