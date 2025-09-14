# Models package
from .base import (
    JobCreate, Job, JobsResponse, JobStatus, JobUpdate, JobCloseRequest,
    TradespersonCreate, Tradesperson, TradespeopleResponse,
    QuoteCreate, Quote, QuotesResponse, QuoteStatus,
    ReviewCreate, Review, ReviewsResponse,
    StatsResponse, Category,
    Homeowner, Location,
    PortfolioItemCreate, PortfolioItem, PortfolioResponse, PortfolioItemCategory,
    InterestCreate, Interest, InterestedTradesperson, InterestResponse, InterestStatus, ContactDetails, ShareContactResponse,
    # Trade Category Questions
    QuestionType, QuestionOption, TradeCategoryQuestionCreate, TradeCategoryQuestion, 
    TradeCategoryQuestionUpdate, QuestionAnswer, JobQuestionAnswer, TradeCategoryQuestionsResponse
)

from .auth import (
    User, UserRole, UserStatus,
    HomeownerRegistration, TradespersonRegistration,
    UserLogin, LoginResponse,
    UserProfile, UserProfileUpdate, TradespersonProfileUpdate,
    Token, TokenData,
    PasswordResetRequest, PasswordReset
)

from .notifications import (
    NotificationType, NotificationChannel, NotificationStatus,
    NotificationPreferences, NotificationTemplate, Notification,
    NotificationRequest, NotificationResponse, NotificationHistory,
    UpdatePreferencesRequest, NotificationStatsResponse
)

# Re-export all models for easy importing
__all__ = [
    # Base models
    'JobCreate', 'Job', 'JobsResponse', 'JobStatus', 'JobUpdate', 'JobCloseRequest',
    'TradespersonCreate', 'Tradesperson', 'TradespeopleResponse',
    'QuoteCreate', 'Quote', 'QuotesResponse', 'QuoteStatus',
    'ReviewCreate', 'Review', 'ReviewsResponse',
    'StatsResponse', 'Category',
    'Homeowner', 'Location',
    'PortfolioItemCreate', 'PortfolioItem', 'PortfolioResponse', 'PortfolioItemCategory',
    'InterestCreate', 'Interest', 'InterestedTradesperson', 'InterestResponse', 'InterestStatus', 'ContactDetails', 'ShareContactResponse',
    # Trade Category Questions
    'QuestionType', 'QuestionOption', 'TradeCategoryQuestionCreate', 'TradeCategoryQuestion', 
    'TradeCategoryQuestionUpdate', 'QuestionAnswer', 'JobQuestionAnswer', 'TradeCategoryQuestionsResponse',
    # Auth models
    'User', 'UserRole', 'UserStatus',
    'HomeownerRegistration', 'TradespersonRegistration',
    'UserLogin', 'LoginResponse',
    'UserProfile', 'UserProfileUpdate', 'TradespersonProfileUpdate',
    'Token', 'TokenData',
    'PasswordResetRequest', 'PasswordReset',
    # Notification models
    'NotificationType', 'NotificationChannel', 'NotificationStatus',
    'NotificationPreferences', 'NotificationTemplate', 'Notification',
    'NotificationRequest', 'NotificationResponse', 'NotificationHistory',
    'UpdatePreferencesRequest', 'NotificationStatsResponse'
]