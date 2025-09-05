# Models package
from .base import (
    JobCreate, Job, JobsResponse, JobStatus,
    TradespersonCreate, Tradesperson, TradespeopleResponse,
    QuoteCreate, Quote, QuotesResponse, QuoteStatus,
    ReviewCreate, Review, ReviewsResponse,
    StatsResponse, Category,
    Homeowner, Location,
    PortfolioItemCreate, PortfolioItem, PortfolioResponse, PortfolioItemCategory,
    InterestCreate, Interest, InterestedTradesperson, InterestResponse, InterestStatus, ContactDetails
)

from .auth import (
    User, UserRole, UserStatus,
    HomeownerRegistration, TradespersonRegistration,
    UserLogin, LoginResponse,
    UserProfile, UserProfileUpdate, TradespersonProfileUpdate,
    Token, TokenData,
    PasswordResetRequest, PasswordReset
)

# Re-export all models for easy importing
__all__ = [
    # Base models
    'JobCreate', 'Job', 'JobsResponse', 'JobStatus',
    'TradespersonCreate', 'Tradesperson', 'TradespeopleResponse',
    'QuoteCreate', 'Quote', 'QuotesResponse', 'QuoteStatus',
    'ReviewCreate', 'Review', 'ReviewsResponse',
    'StatsResponse', 'Category',
    'Homeowner', 'Location',
    'PortfolioItemCreate', 'PortfolioItem', 'PortfolioResponse', 'PortfolioItemCategory',
    'InterestCreate', 'Interest', 'InterestedTradesperson', 'InterestResponse', 'InterestStatus', 'ContactDetails',
    # Auth models
    'User', 'UserRole', 'UserStatus',
    'HomeownerRegistration', 'TradespersonRegistration',
    'UserLogin', 'LoginResponse',
    'UserProfile', 'UserProfileUpdate', 'TradespersonProfileUpdate',
    'Token', 'TokenData',
    'PasswordResetRequest', 'PasswordReset'
]