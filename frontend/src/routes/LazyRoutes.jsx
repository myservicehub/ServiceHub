import { createLazyRoute } from '../utils/lazyLoading';
import LoadingSpinner from '../components/LoadingSpinner';

// Create loading fallback component
const RouteLoadingFallback = () => (
  <LoadingSpinner 
    fullScreen 
    text="Loading page..." 
    size="lg" 
  />
);

// Lazy load main pages
export const LazyHomePage = createLazyRoute(
  () => import('../pages/HomePage'),
  <RouteLoadingFallback />
);

export const LazyLoginPage = createLazyRoute(
  () => import('../pages/LoginPage'),
  <RouteLoadingFallback />
);

export const LazyRegisterPage = createLazyRoute(
  () => import('../pages/RegisterPage'),
  <RouteLoadingFallback />
);

export const LazyDashboardPage = createLazyRoute(
  () => import('../pages/DashboardPage'),
  <RouteLoadingFallback />
);

export const LazyJobsPage = createLazyRoute(
  () => import('../pages/JobsPage'),
  <RouteLoadingFallback />
);

export const LazyMyJobsPage = createLazyRoute(
  () => import('../pages/MyJobsPage'),
  <RouteLoadingFallback />
);

export const LazyProfilePage = createLazyRoute(
  () => import('../pages/ProfilePage'),
  <RouteLoadingFallback />
);

export const LazyMessagesPage = createLazyRoute(
  () => import('../pages/MessagesPage'),
  <RouteLoadingFallback />
);

export const LazyNotificationsPage = createLazyRoute(
  () => import('../pages/NotificationsPage'),
  <RouteLoadingFallback />
);

export const LazyPaymentPage = createLazyRoute(
  () => import('../pages/PaymentPage'),
  <RouteLoadingFallback />
);

export const LazyReviewsPage = createLazyRoute(
  () => import('../pages/ReviewsPage'),
  <RouteLoadingFallback />
);

export const LazySettingsPage = createLazyRoute(
  () => import('../pages/SettingsPage'),
  <RouteLoadingFallback />
);

export const LazyHelpPage = createLazyRoute(
  () => import('../pages/HelpPage'),
  <RouteLoadingFallback />
);

export const LazyAboutPage = createLazyRoute(
  () => import('../pages/AboutPage'),
  <RouteLoadingFallback />
);

export const LazyContactPage = createLazyRoute(
  () => import('../pages/ContactPage'),
  <RouteLoadingFallback />
);

export const LazyPrivacyPage = createLazyRoute(
  () => import('../pages/PrivacyPage'),
  <RouteLoadingFallback />
);

export const LazyTermsPage = createLazyRoute(
  () => import('../pages/TermsPage'),
  <RouteLoadingFallback />
);

export const LazyVerifyAccountPage = createLazyRoute(
  () => import('../pages/VerifyAccountPage'),
  <RouteLoadingFallback />
);

export const LazyMyInterestsPage = createLazyRoute(
  () => import('../pages/MyInterestsPage'),
  <RouteLoadingFallback />
);

export const LazyInterestedTradespeopleePage = createLazyRoute(
  () => import('../pages/InterestedTradespeopleePage'),
  <RouteLoadingFallback />
);

export const LazyNotificationPreferencesPage = createLazyRoute(
  () => import('../pages/NotificationPreferencesPage'),
  <RouteLoadingFallback />
);

export const LazyWalletPage = createLazyRoute(
  () => import('../pages/WalletPage'),
  <RouteLoadingFallback />
);

export const LazyCompletedJobsPage = createLazyRoute(
  () => import('../pages/CompletedJobsPage'),
  <RouteLoadingFallback />
);

export const LazyJobDetailsPage = createLazyRoute(
  () => import('../pages/JobDetailsPage'),
  <RouteLoadingFallback />
);

export const LazyBlogPage = createLazyRoute(
  () => import('../pages/BlogPage'),
  <RouteLoadingFallback />
);

export const LazyCareersPage = createLazyRoute(
  () => import('../pages/CareersPage'),
  <RouteLoadingFallback />
);

// Export all lazy routes as a single object for easier importing
export const LazyRoutes = {
  HomePage: LazyHomePage,
  LoginPage: LazyLoginPage,
  RegisterPage: LazyRegisterPage,
  DashboardPage: LazyDashboardPage,
  JobsPage: LazyJobsPage,
  MyJobsPage: LazyMyJobsPage,
  ProfilePage: LazyProfilePage,
  MessagesPage: LazyMessagesPage,
  NotificationsPage: LazyNotificationsPage,
  PaymentPage: LazyPaymentPage,
  ReviewsPage: LazyReviewsPage,
  SettingsPage: LazySettingsPage,
  HelpPage: LazyHelpPage,
  AboutPage: LazyAboutPage,
  ContactPage: LazyContactPage,
  PrivacyPage: LazyPrivacyPage,
  TermsPage: LazyTermsPage,
  VerifyAccountPage: LazyVerifyAccountPage,
  MyInterestsPage: LazyMyInterestsPage,
  InterestedTradespeopleePage: LazyInterestedTradespeopleePage,
  NotificationPreferencesPage: LazyNotificationPreferencesPage,
  WalletPage: LazyWalletPage,
  CompletedJobsPage: LazyCompletedJobsPage,
  JobDetailsPage: LazyJobDetailsPage,
  BlogPage: LazyBlogPage,
  CareersPage: LazyCareersPage,
};

export default LazyRoutes;