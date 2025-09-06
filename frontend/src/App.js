import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import PostJobPage from "./pages/PostJobPage";
import MyJobsPage from "./pages/MyJobsPage";
import BrowseJobsPage from "./pages/BrowseJobsPage";
import ProfilePage from "./pages/ProfilePage";
import TradespersonPortfolioPage from "./pages/TradespersonPortfolioPage";
import NotificationPreferencesPage from "./pages/NotificationPreferencesPage";
import NotificationHistoryPage from "./pages/NotificationHistoryPage";
import ReviewsPage from "./pages/ReviewsPage";
import WalletPage from "./pages/WalletPage";
import AdminDashboard from "./pages/AdminDashboard";
import ReferralsPage from "./pages/ReferralsPage";
import VerifyAccountPage from "./pages/VerifyAccountPage";
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
            <Route path="/browse-jobs" element={<BrowseJobsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/tradesperson/:tradespersonId/portfolio" element={<TradespersonPortfolioPage />} />
            <Route path="/notifications/preferences" element={<NotificationPreferencesPage />} />
            <Route path="/notifications/history" element={<NotificationHistoryPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/reviews/:userId" element={<ReviewsPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;