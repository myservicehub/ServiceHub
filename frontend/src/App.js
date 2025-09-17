import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./contexts/AuthContext";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/post-job" element={<PostJobPage />} />
            <Route path="/my-jobs" element={<MyJobsPage />} />
            <Route path="/my-interests" element={<MyInterestsPage />} />
            <Route path="/tradesperson/:id" element={<TradespersonProfilePage />} />
            <Route path="/browse-tradespeople" element={<BrowseTradespeopleePage />} />
            <Route path="/job/:jobId/interested-tradespeople" element={<InterestedTradespeopleePage />} />
            <Route path="/browse-jobs" element={<BrowseJobsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/tradesperson/:tradespersonId/portfolio" element={<TradespersonPortfolioPage />} />
            <Route path="/notifications/preferences" element={<NotificationPreferencesPage />} />
            <Route path="/notifications/history" element={<NotificationHistoryPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/reviews/:userId" element={<ReviewsPage />} />
            <Route path="/my-reviews" element={<MyReviewsPage />} />
            <Route path="/my-received-reviews" element={<MyReceivedReviewsPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/referrals" element={<ReferralsPage />} />
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
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;