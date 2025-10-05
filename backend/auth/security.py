from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
import secrets
import os

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

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
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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
        return True
    
    # Pattern 2: Starting with 0 - should be 11 digits total (08140120508)
    if clean_phone.startswith('0') and len(clean_phone) == 11:
        return True
    
    # Pattern 3: Starting with 7, 8, or 9 (without 0 prefix) - should be 10 digits total (8140120508)
    if (clean_phone.startswith('7') or clean_phone.startswith('8') or clean_phone.startswith('9')) and len(clean_phone) == 10:
        return True
    
    return False

def format_nigerian_phone(phone: str) -> str:
    """Format Nigerian phone number to standard +234 format."""
    # Remove all non-digit characters
    clean_phone = ''.join(filter(str.isdigit, phone))
    
    # If already in +234 format, return as is
    if clean_phone.startswith('234') and len(clean_phone) == 13:
        return f"+{clean_phone}"
    
    # If starts with 0, remove it and add +234
    if clean_phone.startswith('0') and len(clean_phone) == 11:
        return f"+234{clean_phone[1:]}"
    
    # If starts with 7, 8, or 9 (10 digits), add +234
    if (clean_phone.startswith('7') or clean_phone.startswith('8') or clean_phone.startswith('9')) and len(clean_phone) == 10:
        return f"+234{clean_phone}"
    
    # Return original if no valid pattern
    return phone