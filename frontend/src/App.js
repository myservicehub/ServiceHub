import React, { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./components/HomePage";
import PostJobPage from "./pages/PostJobPage";
import MyJobsPage from "./pages/MyJobsPage";
import MyInterestsPage from "./pages/MyInterestsPage";
import CompletedJobsPage from "./pages/CompletedJobsPage";
import TradespersonProfilePage from "./pages/TradespersonProfilePage";
import BrowseTradespeopleePage from "./pages/BrowseTradespeopleePage";
import InterestedTradespeopleePage from "./pages/InterestedTradespeopleePage";
import BrowseJobsPage from "./pages/BrowseJobsPage";
import ProfilePage from "./pages/ProfilePage";
import TradespersonPortfolioPage from "./pages/TradespersonPortfolioPage";
import NotificationPreferencesPage from "./pages/NotificationPreferencesPage";
import NotificationHistoryPage from "./pages/NotificationHistoryPage";
import NotificationsPage from "./pages/NotificationsPage";
import ReviewsPage from "./pages/ReviewsPage";
import MyReviewsPage from "./pages/MyReviewsPage";
import MyReceivedReviewsPage from "./pages/MyReceivedReviewsPage";
import WalletPage from "./pages/WalletPage";
import AdminDashboard from "./pages/AdminDashboard";
import ReferralsPage from "./pages/ReferralsPage";
import VerifyAccountPage from "./pages/VerifyAccountPage";
import AboutUsPage from "./pages/AboutUsPage";
import ReviewsPolicyPage from "./pages/ReviewsPolicyPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import PartnershipPage from "./pages/PartnershipPage";
import TradeCategoriesPage from "./pages/TradeCategoriesPage";
import TradeCategoryDetailPage from "./pages/TradeCategoryDetailPage";
import HelpFAQsPage from "./pages/HelpFAQsPage";
import ContactUsPage from "./pages/ContactUsPage";
import JoinForFreePage from "./pages/JoinForFreePage";
import HelpCentrePage from "./pages/HelpCentrePage";
import BlogPage from "./pages/BlogPage";
import CareersPage from "./pages/CareersPage";
import TradespersonRegistrationDemo from "./pages/TradespersonRegistrationDemo";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import CookiePolicyPage from "./pages/CookiePolicyPage";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineIndicator from "./components/OfflineIndicator";
import { setupGlobalErrorHandling } from "./utils/errorHandler";


// Simple ProtectedRoute wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }
  return isAuthenticated() ? children : <Navigate to="/join-for-free" replace />;
};

// Role-based guard
const RoleGuard = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  // Allow admin route to render regardless of regular AuthContext state.
  // AdminDashboard itself handles login and stores admin_token/admin_info for subsequent API calls.
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname === '/admin';
  const hasAdminToken = typeof window !== 'undefined' && !!localStorage.getItem('admin_token');
  if (isAdminRoute) {
    // If admin token exists, proceed; otherwise, render AdminDashboard to show the admin login form.
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
  // Setup global error handling
  useEffect(() => {
    setupGlobalErrorHandling();
  }, []);
  // No watermark removal needed since badge markup was removed

  return (
    <div className="App">
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>

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
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/tradesperson/:tradespersonId/portfolio" element={<ProtectedRoute><TradespersonPortfolioPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/notifications/preferences" element={<ProtectedRoute><NotificationPreferencesPage /></ProtectedRoute>} />
              <Route path="/notifications/history" element={<ProtectedRoute><NotificationHistoryPage /></ProtectedRoute>} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/reviews/:userId" element={<ReviewsPage />} />
              <Route path="/my-reviews" element={<ProtectedRoute><MyReviewsPage /></ProtectedRoute>} />
              <Route path="/my-received-reviews" element={<ProtectedRoute><MyReceivedReviewsPage /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
              <Route path="/admin" element={<RoleGuard allowedRoles={["admin"]}><AdminDashboard /></RoleGuard>} />
              <Route path="/referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />
              <Route path="/verify-account" element={<ProtectedRoute><VerifyAccountPage /></ProtectedRoute>} />
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
            </Routes>
            <Toaster />

          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;





