from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
import secrets
import os

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"])  # Removed deprecated="auto" to avoid deprecated configuration

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days for refresh tokens

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT refresh token with longer expiry."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_type = payload.get("type")
        if token_type and token_type != "access":
            # Only access tokens are valid for protected endpoints
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, jwt.DecodeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def verify_refresh_token(token: str) -> dict:
    """Verify and decode a JWT refresh token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_type = payload.get("type")
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, jwt.DecodeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def validate_password_strength(password: str) -> bool:
    """Validate password meets minimum requirements: 8+ chars, uppercase, lowercase, number, special char."""
    if len(password) < 8:
        return False
    
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    
    return has_upper and has_lower and has_digit and has_special

def validate_nigerian_phone(phone: str) -> bool:
    """Validate Nigerian phone number format."""
    # Remove all non-digit characters
    clean_phone = ''.join(filter(str.isdigit, phone))
    
    # Pattern 1: Starting with 234 (country code) - should be 13 digits total
    if clean_phone.startswith('234') and len(clean_phone) == 13:
        # Validate that the number after 234 starts with valid Nigerian mobile prefixes
        mobile_part = clean_phone[3:]  # Remove 234
        if mobile_part.startswith(('70', '80', '81', '90', '91')):
            return True
    
    # Pattern 2: Common mistake - 234 + 0 + mobile number (14 digits)
    # Handle cases like +23408140120508 which should be +2348140120508
    if clean_phone.startswith('2340') and len(clean_phone) == 14:
        # Check if removing the extra 0 makes it valid
        corrected_phone = '234' + clean_phone[4:]  # Remove the extra 0
        mobile_part = corrected_phone[3:]
        if mobile_part.startswith(('70', '80', '81', '90', '91')):
            return True
    
    # Pattern 3: Starting with 0 - should be 11 digits total (08140120508)
    if clean_phone.startswith('0') and len(clean_phone) == 11:
        # Validate that it starts with valid Nigerian mobile prefixes
        mobile_part = clean_phone[1:]  # Remove leading 0
        if mobile_part.startswith(('70', '80', '81', '90', '91')):
            return True
    
    # Pattern 4: Starting with 7, 8, or 9 (without 0 prefix) - should be 10 digits total (8140120508)
    if (clean_phone.startswith('7') or clean_phone.startswith('8') or clean_phone.startswith('9')) and len(clean_phone) == 10:
        # Validate that it starts with valid Nigerian mobile prefixes
        if clean_phone.startswith(('70', '80', '81', '90', '91')):
            return True
    
    return False

def format_nigerian_phone(phone: str) -> str:
    """Format Nigerian phone number to standard +234 format."""
    # Remove all non-digit characters
    clean_phone = ''.join(filter(str.isdigit, phone))
    
    # If already in correct +234 format, return as is
    if clean_phone.startswith('234') and len(clean_phone) == 13:
        mobile_part = clean_phone[3:]
        if mobile_part.startswith(('70', '80', '81', '90', '91')):
            return f"+{clean_phone}"
    
    # Handle common mistake: 234 + 0 + mobile number (14 digits)
    if clean_phone.startswith('2340') and len(clean_phone) == 14:
        # Remove the extra 0 and format correctly
        corrected_phone = '234' + clean_phone[4:]
        mobile_part = corrected_phone[3:]
        if mobile_part.startswith(('70', '80', '81', '90', '91')):
            return f"+{corrected_phone}"
    
    # If starts with 0, remove it and add +234
    if clean_phone.startswith('0') and len(clean_phone) == 11:
        mobile_part = clean_phone[1:]
        if mobile_part.startswith(('70', '80', '81', '90', '91')):
            return f"+234{clean_phone[1:]}"
    
    # If starts with 7, 8, or 9 (10 digits), add +234
    if (clean_phone.startswith('7') or clean_phone.startswith('8') or clean_phone.startswith('9')) and len(clean_phone) == 10:
        if clean_phone.startswith(('70', '80', '81', '90', '91')):
            return f"+234{clean_phone}"
    
    # Return original if no valid pattern
    return phone

def create_password_reset_token(user_id: str, email: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT token for password reset."""
    to_encode = {
        "sub": user_id,
        "email": email,
        "type": "password_reset"
    }
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Default: 1 hour expiration for password reset tokens
        expire = datetime.utcnow() + timedelta(hours=1)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password_reset_token(token: str) -> dict:
    """Verify and decode a password reset token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_type = payload.get("type")
        if token_type != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type"
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired"
        )
    except (jwt.InvalidTokenError, jwt.DecodeError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token"
        )

def create_email_verification_token(user_id: str, email: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT token for email verification via link."""
    to_encode = {
        "sub": user_id,
        "email": email,
        "type": "email_verification"
    }
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_email_verification_token(token: str) -> dict:
    """Verify and decode an email verification token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_type = payload.get("type")
        if token_type != "email_verification":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type"
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email verification token has expired"
        )
    except (jwt.InvalidTokenError, jwt.DecodeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email verification token"
        )